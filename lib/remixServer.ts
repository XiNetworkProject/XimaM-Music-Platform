import { supabaseAdmin } from '@/lib/supabase';
import { remixPermissionsFromRow, type RemixVisibility } from '@/lib/remixPermissions';

export type RemixTrackType = 'track' | 'ai_track';
export type RemixStatus = 'draft' | 'pending_approval' | 'published' | 'rejected';

export type RemixSourceSummary = {
  sourceTrackId: string;
  sourceTrackType: RemixTrackType;
  title: string;
  artist: string;
  artistUsername: string;
  artistId: string | null;
  coverUrl: string | null;
  trackUrl: string;
  isPublic: boolean;
  allowAiVariation: boolean;
  remixApprovalRequired: boolean;
  remixVisibility: RemixVisibility;
  canRemixAiVariation: boolean;
  prefill: {
    genre: string[];
    mood: string | null;
    bpm: number | null;
    tags: string[];
    description: string | null;
    prompt: string | null;
  };
};

export function normalizeRemixTrackRef(id: string, explicitType?: string | null): { id: string; type: RemixTrackType } {
  const raw = String(id || '').trim();
  const explicit = explicitType === 'ai_track' || explicitType === 'track' ? explicitType : null;
  if (explicit === 'ai_track') return { id: raw.replace(/^ai-/, ''), type: 'ai_track' };
  if (explicit === 'track') return { id: raw.replace(/^track-/, ''), type: 'track' };
  if (raw.startsWith('ai-')) return { id: raw.slice(3), type: 'ai_track' };
  return { id: raw, type: 'track' };
}

function toStringArray(value: any): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
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

export async function getRemixSourceSummary(input: {
  sourceTrackId: string;
  sourceTrackType?: string | null;
  userId?: string | null;
}): Promise<RemixSourceSummary | null> {
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
    const isPublic = data.is_public === true && (data as any).generation?.status === 'completed';
    const isOwner = Boolean(input.userId && creatorId && String(input.userId) === creatorId);
    const follows = permissions.remixVisibility === 'followers' ? await isFollower(input.userId, creatorId) : false;
    const canRemixAiVariation = Boolean(
      isPublic &&
      permissions.allowAiVariation &&
      permissions.remixVisibility !== 'disabled' &&
      (permissions.remixVisibility === 'everyone' || isOwner || follows),
    );
    const tags = toStringArray(data.tags);
    const metadata = (data as any).generation?.metadata || {};

    return {
      sourceTrackId: data.id,
      sourceTrackType: 'ai_track',
      title: data.title || metadata.title || 'Creation IA',
      artist: profile?.name || profile?.username || 'Artiste Synaura',
      artistUsername: profile?.username || '',
      artistId: creatorId || null,
      coverUrl: data.image_url || null,
      trackUrl: `/track/ai-${data.id}`,
      isPublic,
      ...permissions,
      canRemixAiVariation,
      prefill: {
        genre: toStringArray(data.style || tags[0]),
        mood: metadata.mood ? String(metadata.mood) : null,
        bpm: Number.isFinite(Number(metadata.bpm)) ? Number(metadata.bpm) : null,
        tags,
        description: metadata.description ? String(metadata.description) : null,
        prompt: data.prompt || (data as any).generation?.prompt || null,
      },
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
  const follows = permissions.remixVisibility === 'followers' ? await isFollower(input.userId, creatorId) : false;
  const canRemixAiVariation = Boolean(
    isPublic &&
    permissions.allowAiVariation &&
    permissions.remixVisibility !== 'disabled' &&
    (permissions.remixVisibility === 'everyone' || isOwner || follows),
  );
  const dataJson = typeof data.data === 'object' && data.data ? data.data : {};
  const tags = toStringArray(data.tags || dataJson.tags);

  return {
    sourceTrackId: data.id,
    sourceTrackType: 'track',
    title: data.title || 'Sans titre',
    artist: data.profiles?.name || data.profiles?.username || data.artist_name || data.creator_name || 'Artiste Synaura',
    artistUsername: data.profiles?.username || '',
    artistId: creatorId || null,
    coverUrl: data.cover_url || null,
    trackUrl: `/track/${data.id}`,
    isPublic,
    ...permissions,
    canRemixAiVariation,
    prefill: {
      genre: toStringArray(data.genre),
      mood: data.mood || dataJson.mood || null,
      bpm: Number.isFinite(Number(data.bpm || dataJson.bpm)) ? Number(data.bpm || dataJson.bpm) : null,
      tags,
      description: data.description || dataJson.description || null,
      prompt: data.prompt || dataJson.prompt || data.description || null,
    },
  };
}

export async function assertCanCreateAiVariation(input: {
  sourceTrackId: string;
  sourceTrackType?: string | null;
  userId: string;
}) {
  const source = await getRemixSourceSummary(input);
  if (!source) return { ok: false as const, status: 404, error: 'Morceau source introuvable' };
  if (!source.canRemixAiVariation) return { ok: false as const, status: 403, error: 'Variation IA non autorisee pour ce morceau' };
  return { ok: true as const, source };
}

export async function upsertDraftRemixesForGeneration(generationId: string, userId: string) {
  const { data: generation } = await supabaseAdmin
    .from('ai_generations')
    .select('id, user_id, metadata')
    .eq('id', generationId)
    .maybeSingle();
  const remixSource = (generation?.metadata as any)?.remixSource;
  if (!generation || String(generation.user_id) !== String(userId) || !remixSource?.sourceTrackId) return;

  const source = await assertCanCreateAiVariation({
    sourceTrackId: String(remixSource.sourceTrackId),
    sourceTrackType: remixSource.sourceTrackType,
    userId,
  });
  if (!source.ok) return;

  const { data: tracks } = await supabaseAdmin
    .from('ai_tracks')
    .select('id')
    .eq('generation_id', generationId);
  const rows = (tracks || []).map((track: any) => ({
    source_track_id: source.source.sourceTrackId,
    source_track_type: source.source.sourceTrackType,
    child_track_id: track.id,
    child_track_type: 'ai_track',
    creator_id: userId,
    remix_type: 'ai_variation',
    status: 'draft',
    updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return;
  await supabaseAdmin.from('track_remixes').upsert(rows, { onConflict: 'child_track_id,child_track_type,remix_type' });
}

export async function applyRemixPublicationGuard(input: {
  childTrackIds: string[];
  userId: string;
  requestedPublic: boolean;
}) {
  const ids = input.childTrackIds.map((id) => String(id || '').trim()).filter(Boolean);
  if (!ids.length) return { effectivePublic: input.requestedPublic, remixStatus: null as RemixStatus | null };
  const { data: remixes } = await supabaseAdmin
    .from('track_remixes')
    .select('*')
    .in('child_track_id', ids)
    .eq('child_track_type', 'ai_track')
    .eq('remix_type', 'ai_variation');
  if (!remixes?.length) return { effectivePublic: input.requestedPublic, remixStatus: null as RemixStatus | null };

  if (!input.requestedPublic) {
    await supabaseAdmin.from('track_remixes').update({ status: 'draft', updated_at: new Date().toISOString() }).in('id', remixes.map((r: any) => r.id));
    return { effectivePublic: false, remixStatus: 'draft' as RemixStatus };
  }

  const first = remixes[0] as any;
  const permission = await assertCanCreateAiVariation({
    sourceTrackId: first.source_track_id,
    sourceTrackType: first.source_track_type,
    userId: input.userId,
  });
  if (!permission.ok) throw new Error(permission.error);

  const nextStatus: RemixStatus = permission.source.remixApprovalRequired ? 'pending_approval' : 'published';
  await supabaseAdmin
    .from('track_remixes')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .in('id', remixes.map((r: any) => r.id));

  return { effectivePublic: nextStatus === 'published', remixStatus: nextStatus };
}

export async function getRemixAttributionForChildren(children: Array<{ id: string; type: RemixTrackType }>) {
  const result = new Map<string, any>();
  if (!children.length) return result;

  const aiIds = children.filter((child) => child.type === 'ai_track').map((child) => child.id);
  const trackIds = children.filter((child) => child.type === 'track').map((child) => child.id);
  let rows: any[] = [];
  if (aiIds.length) {
    const { data } = await supabaseAdmin.from('track_remixes').select('*').eq('child_track_type', 'ai_track').in('child_track_id', aiIds).eq('status', 'published');
    rows = rows.concat(data || []);
  }
  if (trackIds.length) {
    const { data } = await supabaseAdmin.from('track_remixes').select('*').eq('child_track_type', 'track').in('child_track_id', trackIds).eq('status', 'published');
    rows = rows.concat(data || []);
  }

  for (const row of rows) {
    const source = await getRemixSourceSummary({ sourceTrackId: row.source_track_id, sourceTrackType: row.source_track_type });
    // Le morceau source a pu devenir privé depuis la création du remix : l'attribution
    // publique ne doit alors plus exposer son titre, sa cover ou son lien.
    if (!source || !source.isPublic) continue;
    result.set(`${row.child_track_type}:${row.child_track_id}`, {
      sourceTrackId: source.sourceTrackType === 'ai_track' ? `ai-${source.sourceTrackId}` : source.sourceTrackId,
      sourceTrackType: source.sourceTrackType,
      title: source.title,
      artist: source.artist,
      artistUsername: source.artistUsername,
      coverUrl: source.coverUrl,
      trackUrl: source.trackUrl,
      label: `Inspire de ${source.title}`,
      credit: `Creation originale par @${source.artistUsername || source.artist}`,
    });
  }
  return result;
}

export async function getPublishedVariationCounts(sources: Array<{ id: string; type: RemixTrackType }>) {
  const result = new Map<string, number>();
  for (const source of sources) {
    const { count } = await supabaseAdmin
      .from('track_remixes')
      .select('id', { count: 'exact', head: true })
      .eq('source_track_id', source.id)
      .eq('source_track_type', source.type)
      .eq('status', 'published');
    if ((count || 0) > 0) result.set(`${source.type}:${source.id}`, count || 0);
  }
  return result;
}
