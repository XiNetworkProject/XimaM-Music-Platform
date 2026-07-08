import 'server-only';
import { supabaseAdmin } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';
import { normalizeRemixTrackRef } from '@/lib/remixServer';

export type ChallengeContentType = 'clip' | 'variation' | 'track' | 'open';
export type ChallengeEntryContentType = 'clip' | 'variation' | 'track';
export type ChallengeStatus = 'upcoming' | 'active' | 'ended';
export type ChallengeClubSlug = 'feedback' | 'collab' | 'remix' | 'ai';

export type MusicChallengeSummary = {
  id: string;
  title: string;
  prompt: string;
  contentType: ChallengeContentType;
  startsAt: string;
  endsAt: string;
  status: ChallengeStatus;
  accentColor: string | null;
  coverUrl: string | null;
  sourceTrackId: string | null;
  sourceTrackType: 'track' | 'ai_track' | null;
  clubSlug: ChallengeClubSlug | null;
  entryCount: number;
};

export type ChallengeEntryDisplay = {
  id: string;
  userId: string;
  username: string;
  name: string;
  avatar: string | null;
  contentType: ChallengeEntryContentType;
  contentId: string;
  title: string;
  coverUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  href: string;
  createdAt: string;
};

export type MusicChallengeDetail = MusicChallengeSummary & {
  entries: ChallengeEntryDisplay[];
  userHasEntry: boolean;
};

function computeChallengeStatus(row: { starts_at: string; ends_at: string }, now = new Date()): ChallengeStatus {
  const start = new Date(row.starts_at).getTime();
  const end = new Date(row.ends_at).getTime();
  const time = now.getTime();
  if (Number.isFinite(end) && time > end) return 'ended';
  if (Number.isFinite(start) && time < start) return 'upcoming';
  return 'active';
}

/** Notifie une seule fois le proprietaire du morceau source qu'un defi lie a son morceau a demarre. */
async function notifyChallengeStartedIfDue(row: any) {
  if (row.started_notified_at || !row.source_track_id) return;
  const status = computeChallengeStatus(row);
  if (status !== 'active') return;

  const ref = normalizeRemixTrackRef(row.source_track_id, row.source_track_type);
  let ownerId: string | null = null;
  if (ref.type === 'ai_track') {
    const { data } = await supabaseAdmin
      .from('ai_tracks')
      .select('generation:ai_generations!inner(user_id)')
      .eq('id', ref.id)
      .maybeSingle();
    const generation = Array.isArray((data as any)?.generation) ? (data as any).generation[0] : (data as any)?.generation;
    ownerId = generation?.user_id ? String(generation.user_id) : null;
  } else {
    const { data } = await supabaseAdmin.from('tracks').select('creator_id').eq('id', ref.id).maybeSingle();
    ownerId = data?.creator_id ? String(data.creator_id) : null;
  }

  // Marque comme notifie avant tout, meme si le proprietaire est introuvable, pour ne
  // jamais retenter a chaque lecture suivante.
  await supabaseAdmin
    .from('music_challenges')
    .update({ started_notified_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('started_notified_at', null);

  if (!ownerId) return;
  await createNotification({
    userId: ownerId,
    type: 'general',
    title: 'Un defi demarre autour de ton morceau',
    message: `Le defi "${row.title}" vient de commencer.`,
    actionUrl: `/challenges/${row.id}`,
    relatedId: row.id,
    data: { surface: 'music_challenge', challengeId: row.id, kind: 'defi_started' },
    skipPrefCheck: true,
    dedupeOnRelatedId: true,
  }).catch((error) => console.error('[music-challenges] defi_started notification failed', error));
}

async function countRealEntries(challengeId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('challenge_entries')
    .select('id, content_type, content_id')
    .eq('challenge_id', challengeId);
  if (!data?.length) return 0;
  let count = 0;
  for (const entry of data) {
    const resolved = await resolveEntryContent(entry.content_type, entry.content_id);
    if (resolved) count += 1;
  }
  return count;
}

function toSummary(row: any, entryCount: number): MusicChallengeSummary {
  return {
    id: String(row.id),
    title: row.title,
    prompt: row.prompt,
    contentType: row.content_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: computeChallengeStatus(row),
    accentColor: row.accent_color || null,
    coverUrl: row.cover_url || null,
    sourceTrackId: row.source_track_id || null,
    sourceTrackType: row.source_track_type || null,
    clubSlug: row.club_slug || null,
    entryCount,
  };
}

export async function listMusicChallenges(options: { status?: ChallengeStatus } = {}): Promise<MusicChallengeSummary[]> {
  const { data, error } = await supabaseAdmin
    .from('music_challenges')
    .select('*')
    .order('starts_at', { ascending: false });
  if (error || !data) return [];

  const summaries = await Promise.all(
    data.map(async (row: any) => {
      notifyChallengeStartedIfDue(row).catch(() => {});
      const entryCount = await countRealEntries(row.id);
      return toSummary(row, entryCount);
    }),
  );

  if (options.status) return summaries.filter((challenge) => challenge.status === options.status);
  return summaries;
}

/**
 * Resout une entree vers un contenu reellement publie et son affichage. Renvoie null si
 * le contenu n'existe plus, n'est plus public/publie, ou (si expectedUserId est fourni)
 * n'appartient pas a l'utilisateur attendu. Jamais de confiance dans un statut mis en cache.
 */
export async function resolveEntryContent(
  contentType: ChallengeEntryContentType,
  contentId: string,
  expectedUserId?: string,
): Promise<{ ownerId: string; username: string; name: string; avatar: string | null; title: string; coverUrl: string | null; audioUrl: string | null; videoUrl: string | null; href: string } | null> {
  if (contentType === 'clip') {
    const { data } = await supabaseAdmin
      .from('music_clips')
      .select('*, creator:profiles!music_clips_creator_id_fkey(id, username, name, avatar)')
      .eq('id', contentId)
      .maybeSingle();
    if (!data || data.visibility !== 'published') return null;
    const ownerId = String((data as any).creator_id || '');
    if (expectedUserId && ownerId !== expectedUserId) return null;
    const creator = (data as any).creator || {};
    return {
      ownerId,
      username: creator.username || '',
      name: creator.name || creator.username || 'Createur Synaura',
      avatar: creator.avatar || null,
      title: data.caption || 'Clip Synaura',
      coverUrl: data.poster_url || null,
      audioUrl: null,
      videoUrl: data.video_url || null,
      // Pas de page de detail par clip individuel : les clips se consultent via le Scroll
      // filtre sur leur morceau source (meme convention que app/track/[id]/TrackPageClient.tsx).
      href: `/?filter=clips&sourceTrackId=${encodeURIComponent(String(data.source_track_id || ''))}`,
    };
  }

  if (contentType === 'variation') {
    const childRef = normalizeRemixTrackRef(contentId);
    const { data: remixRow } = await supabaseAdmin
      .from('track_remixes')
      .select('*')
      .eq('child_track_id', childRef.id)
      .eq('child_track_type', childRef.type)
      .eq('remix_type', 'ai_variation')
      .maybeSingle();
    if (!remixRow || (remixRow as any).status !== 'published') return null;
    const ownerId = String((remixRow as any).creator_id || '');
    if (expectedUserId && ownerId !== expectedUserId) return null;

    const childId = (remixRow as any).child_track_id;
    const childType = (remixRow as any).child_track_type;
    if (childType === 'ai_track') {
      const { data: track } = await supabaseAdmin
        .from('ai_tracks')
        .select('*, generation:ai_generations!inner(is_public, status)')
        .eq('id', childId)
        .maybeSingle();
      const generation = Array.isArray((track as any)?.generation) ? (track as any).generation[0] : (track as any)?.generation;
      if (!track || track.is_public !== true || generation?.status !== 'completed' || generation?.is_public !== true) return null;
      const { data: profile } = await supabaseAdmin.from('profiles').select('id, username, name, avatar').eq('id', ownerId).maybeSingle();
      return {
        ownerId,
        username: profile?.username || '',
        name: profile?.name || profile?.username || 'Createur Synaura',
        avatar: profile?.avatar || null,
        title: track.title || 'Variation IA',
        coverUrl: track.image_url || null,
        audioUrl: track.audio_url || track.stream_audio_url || null,
        videoUrl: null,
        href: `/track/ai-${childId}`,
      };
    }
    const { data: track } = await supabaseAdmin.from('tracks').select('*').eq('id', childId).maybeSingle();
    if (!track || track.is_public !== true) return null;
    const { data: profile } = await supabaseAdmin.from('profiles').select('id, username, name, avatar').eq('id', ownerId).maybeSingle();
    return {
      ownerId,
      username: profile?.username || '',
      name: profile?.name || profile?.username || 'Createur Synaura',
      avatar: profile?.avatar || null,
      title: track.title || 'Sans titre',
      coverUrl: track.cover_url || null,
      audioUrl: track.audio_url || null,
      videoUrl: null,
      href: `/track/${childId}`,
    };
  }

  // contentType === 'track'
  const ref = normalizeRemixTrackRef(contentId);
  if (ref.type === 'ai_track') {
    const { data: track } = await supabaseAdmin
      .from('ai_tracks')
      .select('*, generation:ai_generations!inner(user_id, is_public, status)')
      .eq('id', ref.id)
      .maybeSingle();
    const generation = Array.isArray((track as any)?.generation) ? (track as any).generation[0] : (track as any)?.generation;
    if (!track || track.is_public !== true || generation?.status !== 'completed' || generation?.is_public !== true) return null;
    const ownerId = String(generation?.user_id || '');
    if (expectedUserId && ownerId !== expectedUserId) return null;
    const { data: profile } = await supabaseAdmin.from('profiles').select('id, username, name, avatar').eq('id', ownerId).maybeSingle();
    return {
      ownerId,
      username: profile?.username || '',
      name: profile?.name || profile?.username || 'Createur Synaura',
      avatar: profile?.avatar || null,
      title: track.title || 'Sans titre',
      coverUrl: track.image_url || null,
      audioUrl: track.audio_url || track.stream_audio_url || null,
      videoUrl: null,
      href: `/track/ai-${ref.id}`,
    };
  }
  const { data: track } = await supabaseAdmin
    .from('tracks')
    .select('*, profiles:profiles!tracks_creator_id_fkey(id, username, name, avatar)')
    .eq('id', ref.id)
    .maybeSingle();
  if (!track || track.is_public !== true) return null;
  const ownerId = String((track as any).creator_id || '');
  if (expectedUserId && ownerId !== expectedUserId) return null;
  return {
    ownerId,
    username: (track as any).profiles?.username || '',
    name: (track as any).profiles?.name || (track as any).profiles?.username || 'Createur Synaura',
    avatar: (track as any).profiles?.avatar || null,
    title: track.title || 'Sans titre',
    coverUrl: track.cover_url || null,
    audioUrl: track.audio_url || null,
    videoUrl: null,
    href: `/track/${ref.id}`,
  };
}

export async function getMusicChallengeDetail(id: string, viewerId?: string | null): Promise<MusicChallengeDetail | null> {
  const { data: row, error } = await supabaseAdmin.from('music_challenges').select('*').eq('id', id).maybeSingle();
  if (error || !row) return null;

  notifyChallengeStartedIfDue(row).catch(() => {});

  const { data: rawEntries } = await supabaseAdmin
    .from('challenge_entries')
    .select('*')
    .eq('challenge_id', id)
    .order('created_at', { ascending: false });

  const entries: ChallengeEntryDisplay[] = [];
  let userHasEntry = false;
  for (const entry of rawEntries || []) {
    const resolved = await resolveEntryContent(entry.content_type, entry.content_id);
    if (!resolved) continue;
    if (viewerId && resolved.ownerId === viewerId) userHasEntry = true;
    entries.push({
      id: String(entry.id),
      userId: String(entry.user_id),
      username: resolved.username,
      name: resolved.name,
      avatar: resolved.avatar,
      contentType: entry.content_type,
      contentId: entry.content_id,
      title: resolved.title,
      coverUrl: resolved.coverUrl,
      audioUrl: resolved.audioUrl,
      videoUrl: resolved.videoUrl,
      href: resolved.href,
      createdAt: entry.created_at,
    });
  }

  return {
    ...toSummary(row, entries.length),
    entries,
    userHasEntry,
  };
}

export async function recordChallengeEntry(input: {
  challengeId: string;
  userId: string;
  contentType: ChallengeEntryContentType;
  contentId: string;
}): Promise<{ ok: true; created: boolean; entry: any } | { ok: false; status: number; error: string }> {
  const { data: challenge } = await supabaseAdmin.from('music_challenges').select('*').eq('id', input.challengeId).maybeSingle();
  if (!challenge) return { ok: false, status: 404, error: 'Defi introuvable.' };

  const status = computeChallengeStatus(challenge);
  if (status !== 'active') return { ok: false, status: 400, error: status === 'upcoming' ? "Ce defi n'a pas encore commence." : 'Ce defi est termine.' };

  if (challenge.content_type !== 'open' && challenge.content_type !== input.contentType) {
    return { ok: false, status: 400, error: 'Ce type de contenu ne correspond pas a ce defi.' };
  }

  const resolved = await resolveEntryContent(input.contentType, input.contentId, input.userId);
  if (!resolved) return { ok: false, status: 403, error: "Ce contenu n'est pas publie ou ne t'appartient pas." };

  const { data: existing } = await supabaseAdmin
    .from('challenge_entries')
    .select('id')
    .eq('challenge_id', input.challengeId)
    .eq('user_id', input.userId)
    .eq('content_type', input.contentType)
    .eq('content_id', input.contentId)
    .maybeSingle();

  const { data: entry, error } = await supabaseAdmin
    .from('challenge_entries')
    .upsert(
      {
        challenge_id: input.challengeId,
        user_id: input.userId,
        content_type: input.contentType,
        content_id: input.contentId,
      },
      { onConflict: 'challenge_id,user_id,content_type,content_id' },
    )
    .select('*')
    .maybeSingle();
  if (error || !entry) return { ok: false, status: 500, error: 'Participation impossible.' };

  const created = !existing;
  if (created && challenge.source_track_id) {
    const ref = normalizeRemixTrackRef(challenge.source_track_id, challenge.source_track_type);
    let sourceOwnerId: string | null = null;
    if (ref.type === 'ai_track') {
      const { data } = await supabaseAdmin
        .from('ai_tracks')
        .select('generation:ai_generations!inner(user_id)')
        .eq('id', ref.id)
        .maybeSingle();
      const generation = Array.isArray((data as any)?.generation) ? (data as any).generation[0] : (data as any)?.generation;
      sourceOwnerId = generation?.user_id ? String(generation.user_id) : null;
    } else {
      const { data } = await supabaseAdmin.from('tracks').select('creator_id').eq('id', ref.id).maybeSingle();
      sourceOwnerId = data?.creator_id ? String(data.creator_id) : null;
    }
    if (sourceOwnerId && sourceOwnerId !== input.userId) {
      createNotification({
        userId: sourceOwnerId,
        type: 'general',
        title: 'Nouvelle participation a ton defi',
        message: `${resolved.name} a participe au defi "${challenge.title}".`,
        actionUrl: `/challenges/${challenge.id}`,
        relatedId: entry.id,
        data: { surface: 'music_challenge', challengeId: challenge.id, kind: 'defi_entry_published' },
        skipPrefCheck: true,
        dedupeOnRelatedId: true,
      }).catch((error2) => console.error('[music-challenges] defi_entry_published notification failed', error2));
    }
  }

  return { ok: true, created, entry };
}
