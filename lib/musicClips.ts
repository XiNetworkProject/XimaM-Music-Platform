import { supabaseAdmin } from '@/lib/supabase';
import { remixPermissionsFromRow, type RemixVisibility } from '@/lib/remixPermissions';
import { normalizeRemixTrackRef, type RemixTrackType } from '@/lib/remixServer';
import { canCreateClip } from '@/lib/clipPermissions';

export const MUSIC_CLIP_MIN_SECONDS = 15;
export const MUSIC_CLIP_MAX_SECONDS = 60;
export const MUSIC_CLIP_MAX_BYTES = 95 * 1024 * 1024;

export type MusicClipVisibility = 'draft' | 'published' | 'hidden';

export type MusicClipSource = {
  _id: string;
  sourceTrackId: string;
  sourceTrackType: RemixTrackType;
  title: string;
  artist: { _id: string; name: string; username: string; avatar?: string | null };
  audioUrl: string;
  coverUrl?: string | null;
  duration: number;
  genre?: string[];
  trackUrl: string;
  allowClips: boolean;
  remixVisibility: RemixVisibility;
  canCreateClip: boolean;
  /** Le morceau source est-il actuellement public ? (peut devenir false après coup) */
  isPublic: boolean;
};

export type MusicClip = {
  id: string;
  creatorId: string;
  creator: { id: string; username: string; name: string; avatar?: string | null };
  videoUrl: string | null;
  videoPublicId?: string | null;
  posterUrl: string | null;
  caption: string | null;
  tags: string[];
  sourceTrackId: string;
  sourceTrackType: RemixTrackType;
  sourceTrackOffsetSeconds: number;
  sourceTrackDurationSeconds: number;
  visibility: MusicClipVisibility;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
  sourceTrack: MusicClipSource;
  recommendationScore?: number;
  recommendationReasons?: string[];
};

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function safeDuration(value: unknown) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? Math.max(0, Math.round(numberValue)) : 0;
}

function one<T = any>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value || undefined;
}

function publicTrackId(source: MusicClipSource) {
  return source.sourceTrackType === 'ai_track' ? `ai-${source.sourceTrackId}` : source.sourceTrackId;
}

async function isFollower(userId: string | null | undefined, creatorId: string | null | undefined) {
  if (!userId || !creatorId) return false;
  const { data } = await supabaseAdmin
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('following_id', creatorId)
    .maybeSingle();
  return Boolean(data?.following_id);
}

export function cloudinaryVideoPosterUrl(videoUrl?: string | null) {
  if (!videoUrl) return null;
  const withTransform = videoUrl.replace('/video/upload/', '/video/upload/so_0,w_720,h_1280,c_fill,f_jpg/');
  return withTransform.replace(/\.(mp4|webm|mov|m4v)(\?.*)?$/i, '.jpg$2');
}

export async function getClipSourceSummary(input: {
  sourceTrackId: string;
  sourceTrackType?: string | null;
  userId?: string | null;
}): Promise<MusicClipSource | null> {
  const ref = normalizeRemixTrackRef(input.sourceTrackId, input.sourceTrackType);
  if (!ref.id) return null;

  if (ref.type === 'ai_track') {
    const { data } = await supabaseAdmin
      .from('ai_tracks')
      .select('*, generation:ai_generations!inner(id, user_id, prompt, metadata, is_public, status)')
      .eq('id', ref.id)
      .maybeSingle();
    if (!data) return null;

    const creatorId = String((data as any).generation?.user_id || '');
    const { data: profile } = creatorId
      ? await supabaseAdmin.from('profiles').select('id, username, name, avatar').eq('id', creatorId).maybeSingle()
      : { data: null as any };
    const permissions = remixPermissionsFromRow(data);
    const isPublic = data.is_public === true
      && (data as any).generation?.status === 'completed'
      && (data as any).generation?.is_public === true;
    const isOwner = Boolean(input.userId && creatorId && String(input.userId) === creatorId);
    const follows = !isOwner && permissions.remixVisibility === 'followers' ? await isFollower(input.userId, creatorId) : false;
    const canCreateClipValue = canCreateClip({
      isPublic,
      isOwner,
      allowClips: permissions.allowClips,
      remixVisibility: permissions.remixVisibility,
      isFollower: follows,
    });

    return {
      _id: `ai-${data.id}`,
      sourceTrackId: data.id,
      sourceTrackType: 'ai_track',
      title: data.title || (data as any).generation?.metadata?.title || 'Creation IA',
      artist: {
        _id: creatorId,
        name: profile?.name || profile?.username || 'Artiste Synaura',
        username: profile?.username || '',
        avatar: profile?.avatar || null,
      },
      audioUrl: data.audio_url || data.stream_audio_url || '',
      coverUrl: data.image_url || null,
      duration: safeDuration(data.duration),
      genre: toStringArray(data.tags),
      trackUrl: `/track/ai-${data.id}`,
      allowClips: permissions.allowClips,
      remixVisibility: permissions.remixVisibility,
      canCreateClip: canCreateClipValue,
      isPublic,
    };
  }

  const { data } = await supabaseAdmin
    .from('tracks')
    .select('*, profiles:profiles!tracks_creator_id_fkey(id, username, name, avatar)')
    .eq('id', ref.id)
    .maybeSingle();
  if (!data) return null;

  const creatorId = String((data as any).creator_id || '');
  const permissions = remixPermissionsFromRow(data);
  const isPublic = data.is_public === true;
  const isOwner = Boolean(input.userId && creatorId && String(input.userId) === creatorId);
  const follows = !isOwner && permissions.remixVisibility === 'followers' ? await isFollower(input.userId, creatorId) : false;
  const canCreateClipValue = canCreateClip({
    isPublic,
    isOwner,
    allowClips: permissions.allowClips,
    remixVisibility: permissions.remixVisibility,
    isFollower: follows,
  });

  return {
    _id: data.id,
    sourceTrackId: data.id,
    sourceTrackType: 'track',
    title: data.title || 'Sans titre',
    artist: {
      _id: creatorId,
      name: data.profiles?.name || data.profiles?.username || data.artist_name || data.creator_name || 'Artiste Synaura',
      username: data.profiles?.username || '',
      avatar: data.profiles?.avatar || null,
    },
    audioUrl: data.audio_url || '',
    coverUrl: data.cover_url || null,
    duration: safeDuration(data.duration),
    genre: toStringArray(data.genre),
    trackUrl: `/track/${data.id}`,
    allowClips: permissions.allowClips,
    remixVisibility: permissions.remixVisibility,
    canCreateClip: canCreateClipValue,
    isPublic,
  };
}

export async function assertCanCreateClip(input: {
  sourceTrackId: string;
  sourceTrackType?: string | null;
  userId: string;
}) {
  const source = await getClipSourceSummary(input);
  if (!source) return { ok: false as const, status: 404, error: 'Morceau source introuvable' };
  if (!source.canCreateClip) return { ok: false as const, status: 403, error: 'Clips non autorises pour ce morceau' };
  if (!source.audioUrl) return { ok: false as const, status: 422, error: 'Le morceau source n est pas lisible' };
  return { ok: true as const, source };
}

export function sanitizeClipTags(value: unknown) {
  return toStringArray(value)
    .map((tag) => tag.replace(/^#/, '').trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function clampClipDuration(value: unknown) {
  const seconds = safeDuration(value);
  return Math.min(MUSIC_CLIP_MAX_SECONDS, Math.max(MUSIC_CLIP_MIN_SECONDS, seconds || 30));
}

export function sanitizeClipOffset(value: unknown) {
  const seconds = safeDuration(value);
  return Math.max(0, seconds);
}

export async function formatMusicClip(
  row: any,
  options: { viewerId?: string | null } = {},
  resolvedSource?: MusicClipSource | null,
): Promise<MusicClip | null> {
  if (!row) return null;
  const source = resolvedSource === undefined
    ? await getClipSourceSummary({
        sourceTrackId: row.source_track_id,
        sourceTrackType: row.source_track_type,
        userId: options.viewerId,
      })
    : resolvedSource;
  if (!source) return null;
  // Le morceau source a pu devenir privé depuis la publication du Clip : dans ce cas
  // le Clip ne doit plus apparaître nulle part (sauf pour son propre créateur), et ne
  // doit jamais exposer ce morceau.
  const isOwnClip = Boolean(options.viewerId && String(options.viewerId) === String(row.creator_id));
  if (!source.isPublic && !isOwnClip) return null;
  return {
    id: String(row.id),
    creatorId: String(row.creator_id || ''),
    creator: {
      id: String(row.creator?.id || row.profiles?.id || row.creator_id || ''),
      username: String(row.creator?.username || row.profiles?.username || ''),
      name: String(row.creator?.name || row.creator?.username || row.profiles?.name || row.profiles?.username || 'Createur Synaura'),
      avatar: row.creator?.avatar || row.profiles?.avatar || null,
    },
    videoUrl: row.video_url || null,
    videoPublicId: row.video_public_id || null,
    posterUrl: row.poster_url || cloudinaryVideoPosterUrl(row.video_url),
    caption: row.caption || null,
    tags: toStringArray(row.tags),
    sourceTrackId: publicTrackId(source),
    sourceTrackType: source.sourceTrackType,
    sourceTrackOffsetSeconds: safeDuration(row.source_track_offset_seconds),
    sourceTrackDurationSeconds: clampClipDuration(row.source_track_duration_seconds),
    visibility: row.visibility || 'draft',
    likesCount: Number(row.likes_count || 0),
    commentsCount: Number(row.comments_count || 0),
    isLiked: Boolean(row.is_liked ?? row.isLiked),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceTrack: source,
  };
}

async function getClipSourceSummaries(rows: any[], viewerId?: string | null) {
  const refs = Array.from(new Map((rows || []).map((row) => {
    const ref = normalizeRemixTrackRef(row?.source_track_id, row?.source_track_type);
    return [`${ref.type}:${ref.id}`, ref];
  })).values()).filter((ref) => ref.id);
  const normalIds = refs.filter((ref) => ref.type === 'track').map((ref) => ref.id);
  const aiIds = refs.filter((ref) => ref.type === 'ai_track').map((ref) => ref.id);
  const [normalResult, aiResult] = await Promise.all([
    normalIds.length
      ? supabaseAdmin
          .from('tracks')
          .select('*, profiles:profiles!tracks_creator_id_fkey(id, username, name, avatar)')
          .in('id', normalIds)
      : Promise.resolve({ data: [] } as any),
    aiIds.length
      ? supabaseAdmin
          .from('ai_tracks')
          .select('*, generation:ai_generations!inner(id, user_id, prompt, metadata, is_public, status)')
          .in('id', aiIds)
      : Promise.resolve({ data: [] } as any),
  ]);
  const normalRows = normalResult.data || [];
  const aiRows = aiResult.data || [];
  const aiOwnerIds = Array.from(new Set(aiRows.map((row: any) => one(row.generation)?.user_id).filter(Boolean)));
  const { data: aiProfiles } = aiOwnerIds.length
    ? await supabaseAdmin.from('profiles').select('id, username, name, avatar').in('id', aiOwnerIds)
    : { data: [] as any[] };
  const profileMap = new Map((aiProfiles || []).map((profile: any) => [String(profile.id), profile]));
  const creatorIds = Array.from(new Set([
    ...normalRows.map((row: any) => String(row.creator_id || '')),
    ...aiRows.map((row: any) => String(one(row.generation)?.user_id || '')),
  ].filter(Boolean)));
  const followed = new Set<string>();
  if (viewerId && creatorIds.length) {
    const { data } = await supabaseAdmin
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', viewerId)
      .in('following_id', creatorIds);
    for (const row of data || []) followed.add(String(row.following_id));
  }

  const sources = new Map<string, MusicClipSource>();
  for (const data of normalRows) {
    const profile = one((data as any).profiles) || {};
    const creatorId = String((data as any).creator_id || '');
    const permissions = remixPermissionsFromRow(data);
    const isPublic = data.is_public === true;
    const isOwner = Boolean(viewerId && creatorId === String(viewerId));
    const canCreateClipValue = canCreateClip({
      isPublic,
      isOwner,
      allowClips: permissions.allowClips,
      remixVisibility: permissions.remixVisibility,
      isFollower: followed.has(creatorId),
    });
    const source: MusicClipSource = {
      _id: String(data.id),
      sourceTrackId: String(data.id),
      sourceTrackType: 'track',
      title: data.title || 'Sans titre',
      artist: {
        _id: creatorId,
        name: profile.name || profile.username || (data as any).artist_name || (data as any).creator_name || 'Artiste Synaura',
        username: profile.username || '',
        avatar: profile.avatar || null,
      },
      audioUrl: data.audio_url || '',
      coverUrl: data.cover_url || null,
      duration: safeDuration(data.duration),
      genre: toStringArray(data.genre),
      trackUrl: `/track/${data.id}`,
      allowClips: permissions.allowClips,
      remixVisibility: permissions.remixVisibility,
      canCreateClip: canCreateClipValue,
      isPublic,
    };
    sources.set(`track:${data.id}`, source);
  }

  for (const data of aiRows) {
    const generation = one((data as any).generation) || {};
    const creatorId = String(generation.user_id || '');
    const profile = profileMap.get(creatorId) || {};
    const permissions = remixPermissionsFromRow(data);
    const isPublic = data.is_public === true && generation.status === 'completed' && generation.is_public === true;
    const isOwner = Boolean(viewerId && creatorId === String(viewerId));
    const canCreateClipValue = canCreateClip({
      isPublic,
      isOwner,
      allowClips: permissions.allowClips,
      remixVisibility: permissions.remixVisibility,
      isFollower: followed.has(creatorId),
    });
    const source: MusicClipSource = {
      _id: `ai-${data.id}`,
      sourceTrackId: String(data.id),
      sourceTrackType: 'ai_track',
      title: data.title || generation.metadata?.title || 'Creation IA',
      artist: {
        _id: creatorId,
        name: profile.name || profile.username || 'Artiste Synaura',
        username: profile.username || '',
        avatar: profile.avatar || null,
      },
      audioUrl: data.audio_url || data.stream_audio_url || '',
      coverUrl: data.image_url || null,
      duration: safeDuration(data.duration),
      genre: toStringArray(data.tags),
      trackUrl: `/track/ai-${data.id}`,
      allowClips: permissions.allowClips,
      remixVisibility: permissions.remixVisibility,
      canCreateClip: canCreateClipValue,
      isPublic,
    };
    sources.set(`ai_track:${data.id}`, source);
  }
  return sources;
}

export async function formatMusicClips(rows: any[], options: { viewerId?: string | null } = {}) {
  const sources = await getClipSourceSummaries(rows, options.viewerId);
  const clips = await Promise.all((rows || []).map((row) => {
    const ref = normalizeRemixTrackRef(row?.source_track_id, row?.source_track_type);
    const key = `${ref.type}:${ref.id}`;
    return formatMusicClip(row, options, sources.get(key) || null);
  }));
  return clips.filter((clip): clip is MusicClip => Boolean(clip));
}

export async function getPublishedClipCounts(sources: Array<{ id: string; type: RemixTrackType }>) {
  const result = new Map<string, number>();
  for (const source of sources) {
    const { count } = await supabaseAdmin
      .from('music_clips')
      .select('id', { count: 'exact', head: true })
      .eq('source_track_id', source.id)
      .eq('source_track_type', source.type)
      .eq('visibility', 'published');
    if ((count || 0) > 0) result.set(`${source.type}:${source.id}`, count || 0);
  }
  return result;
}
