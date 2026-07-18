import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { applyPublicAiTrackFilter, applyPublicTrackFilter } from '@/lib/publicTracks';
import { remixPermissionsFromRow } from '@/lib/remixPermissions';
import { computeTrackDiscoveryMetrics, globalDiscoveryScore } from '@/lib/ranking';
import type { RecommendedTrack } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_CANDIDATE_LIMIT = 240;
const POPULAR_CANDIDATE_LIMIT = 100;
const CATALOG_CANDIDATE_LIMIT = 100;
const QUALITY_CANDIDATE_LIMIT = 120;
const AI_CANDIDATE_LIMIT = 160;
const NORMAL_TRACK_SELECT = `
  *,
  profiles:profiles!tracks_creator_id_fkey (
    id, username, name, avatar, bio, is_artist, artist_name, is_verified,
    follower_count, created_at
  )
`;

function readJsonObject(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function one<T = any>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value || undefined;
}

function normalTrackVideoMeta(track: any) {
  const data = readJsonObject(track?.data);
  return {
    coverVideoUrl: track?.cover_video_url || data.cover_video_url || data.coverVideoUrl || null,
    coverVideoPosterUrl: track?.cover_video_poster_url || data.cover_video_poster_url || data.coverVideoPosterUrl || track?.cover_url || null,
    visualUrl: data.visual_url || data.visualUrl || null,
    visualType: data.visual_type || data.visualType || null,
    dominantColors: Array.isArray(data.dominant_colors) ? data.dominant_colors : Array.isArray(data.dominantColors) ? data.dominantColors : [],
    auraVisualEnabled: data.aura_visual_enabled !== false && data.auraVisualEnabled !== false,
  };
}

function aiTrackVideoMeta(track: any) {
  const sourceLinks = readJsonObject(track?.source_links);
  return {
    coverVideoUrl: null,
    coverVideoPosterUrl: track?.cover_video_poster_url || sourceLinks.cover_video_poster_url || sourceLinks.coverVideoPosterUrl || track?.image_url || null,
    musicVideoUrl: track?.music_video_url || sourceLinks.music_video_url || sourceLinks.musicVideoUrl || track?.cover_video_url || sourceLinks.cover_video_url || sourceLinks.coverVideoUrl || null,
    musicVideoPosterUrl: track?.music_video_poster_url || sourceLinks.music_video_poster_url || sourceLinks.musicVideoPosterUrl || track?.cover_video_poster_url || sourceLinks.cover_video_poster_url || sourceLinks.coverVideoPosterUrl || track?.image_url || null,
    visualUrl: sourceLinks.visual_url || sourceLinks.visualUrl || null,
    visualType: sourceLinks.visual_type || sourceLinks.visualType || null,
    dominantColors: Array.isArray(sourceLinks.dominant_colors) ? sourceLinks.dominant_colors : Array.isArray(sourceLinks.dominantColors) ? sourceLinks.dominantColors : [],
    auraVisualEnabled: sourceLinks.aura_visual_enabled !== false && sourceLinks.auraVisualEnabled !== false,
  };
}

async function optionalRows<T>(run: () => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  try {
    const { data, error } = await run();
    return error ? [] : data || [];
  } catch {
    return [];
  }
}

function increment(map: Map<string, number>, key: unknown) {
  const id = String(key || '');
  if (id) map.set(id, (map.get(id) || 0) + 1);
}

function statsKey(row: any) {
  const id = String(row?.track_id || '');
  if (!id) return '';
  return row?.is_ai_track && !id.startsWith('ai-') ? `ai-${id}` : id;
}

function buildMomentum(events: any[], now: number) {
  const byTrack = new Map<string, { actors: Map<string, number>; anonymous: number }>();
  const weights: Record<string, number> = {
    view: 0.08,
    play_start: 0.42,
    play_progress: 0.7,
    play_complete: 1.45,
    like: 1.9,
    favorite: 2.1,
    share: 2.6,
    add_to_playlist: 2.35,
  };

  for (const event of events) {
    const id = statsKey(event);
    const weight = weights[String(event?.event_type || '')] || 0;
    if (!id || weight <= 0) continue;
    const created = event.created_at ? new Date(event.created_at).getTime() : now;
    const ageHours = Math.max(0, (now - created) / 3_600_000);
    const contribution = weight * Math.exp(-ageHours * Math.LN2 / 36);
    const entry = byTrack.get(id) || { actors: new Map<string, number>(), anonymous: 0 };
    const actor = String(event.user_id || event.session_id || '');
    if (actor) entry.actors.set(actor, Math.min(4, (entry.actors.get(actor) || 0) + contribution));
    else entry.anonymous = Math.min(3, entry.anonymous + contribution * 0.2);
    byTrack.set(id, entry);
  }

  const result = new Map<string, number>();
  byTrack.forEach((entry, id) => {
    const actorScore = Array.from(entry.actors.values()).reduce((sum, value) => sum + value, 0);
    const raw = actorScore + entry.anonymous + Math.log1p(entry.actors.size) * 1.8;
    result.set(id, Number((10 * raw / (raw + 9)).toFixed(4)));
  });
  return result;
}

async function loadGlobalTrackCandidatesUncached(includeAi: boolean): Promise<RecommendedTrack[]> {
  const now = Date.now();
  const since7d = new Date(now - 7 * DAY_MS).toISOString();
  const countResult = await applyPublicTrackFilter(supabaseAdmin
    .from('tracks')
    .select('id', { count: 'exact', head: true }));
  const publicTrackCount = Math.max(0, Number(countResult.count || 0));
  const maxCatalogOffset = Math.max(0, publicTrackCount - CATALOG_CANDIDATE_LIMIT);
  const dayNumber = Math.floor(now / DAY_MS);
  const catalogOffset = maxCatalogOffset > 0
    ? (dayNumber * CATALOG_CANDIDATE_LIMIT) % (maxCatalogOffset + 1)
    : 0;
  const normalQuery = applyPublicTrackFilter(supabaseAdmin
    .from('tracks')
    .select(NORMAL_TRACK_SELECT))
    .order('created_at', { ascending: false })
    .limit(RECENT_CANDIDATE_LIMIT);
  const popularQuery = applyPublicTrackFilter(supabaseAdmin
    .from('tracks')
    .select(NORMAL_TRACK_SELECT))
    .order('plays', { ascending: false, nullsFirst: false })
    .limit(POPULAR_CANDIDATE_LIMIT);
  const catalogQuery = applyPublicTrackFilter(supabaseAdmin
    .from('tracks')
    .select(NORMAL_TRACK_SELECT))
    .order('created_at', { ascending: true })
    .range(catalogOffset, catalogOffset + CATALOG_CANDIDATE_LIMIT - 1);
  const aiQuery = includeAi
    ? applyPublicAiTrackFilter(supabaseAdmin
        .from('ai_tracks')
        .select(`
          *,
          generation:ai_generations!inner (user_id, is_public, status)
        `))
        .not('audio_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(AI_CANDIDATE_LIMIT)
    : Promise.resolve({ data: [], error: null } as any);

  const [normalResult, popularRows, catalogRows, aiResult, statsRows, recentEvents, boosts] = await Promise.all([
    normalQuery,
    optionalRows<any>(() => popularQuery),
    optionalRows<any>(() => catalogQuery),
    aiQuery,
    optionalRows<any>(() => supabaseAdmin
      .from('track_stats_rolling_30d')
      .select('*')
      .order('plays_30d', { ascending: false })
      .limit(1500)),
    optionalRows<any>(() => supabaseAdmin
      .from('track_events')
      .select('track_id, event_type, created_at, user_id, session_id, is_ai_track')
      .gte('created_at', since7d)
      .in('event_type', ['view', 'play_start', 'play_progress', 'play_complete', 'like', 'favorite', 'share', 'add_to_playlist'])
      .order('created_at', { ascending: false })
      .limit(12000)),
    optionalRows<any>(() => supabaseAdmin
      .from('active_track_boosts')
      .select('track_id, multiplier, expires_at')
      .gt('expires_at', new Date(now).toISOString())
      .limit(1000)),
  ]);
  if (normalResult.error) throw normalResult.error;
  if (aiResult.error) throw aiResult.error;

  const qualityIds = statsRows
    .filter((row: any) => !row?.is_ai_track && row?.track_id)
    .sort((a: any, b: any) => {
      const score = (row: any) => Number(row.completes_30d || 0) * 3
        + Number(row.likes_30d || 0) * 2
        + Number(row.favorites_30d || 0) * 3
        + Number(row.shares_30d || 0) * 2;
      return score(b) - score(a);
    })
    .slice(0, QUALITY_CANDIDATE_LIMIT)
    .map((row: any) => String(row.track_id));
  const qualityRows = qualityIds.length
    ? await optionalRows<any>(() => applyPublicTrackFilter(supabaseAdmin
        .from('tracks')
        .select(NORMAL_TRACK_SELECT))
        .in('id', qualityIds))
    : [];
  const normalById = new Map<string, any>();
  for (const row of [...(normalResult.data || []), ...popularRows, ...catalogRows, ...qualityRows]) {
    if (row?.id && !normalById.has(String(row.id))) normalById.set(String(row.id), row);
  }
  const normalRows = Array.from(normalById.values());
  const aiRows = aiResult.data || [];
  const normalIds = normalRows.map((row: any) => String(row.id));
  const allIds = [
    ...normalIds,
    ...aiRows.map((row: any) => `ai-${row.id}`),
  ];
  const aiOwnerIds = Array.from(new Set(aiRows.map((row: any) => one(row.generation)?.user_id).filter(Boolean)));
  const since30d = new Date(now - 30 * DAY_MS).toISOString();

  const [aiProfiles, commentRows, saveRows, reactionRows] = await Promise.all([
    aiOwnerIds.length
      ? optionalRows<any>(() => supabaseAdmin
          .from('profiles')
          .select('id, username, name, avatar, bio, is_verified, follower_count, created_at')
          .in('id', aiOwnerIds))
      : Promise.resolve([]),
    allIds.length
      ? optionalRows<any>(() => supabaseAdmin.from('comments').select('track_id').in('track_id', allIds).gte('created_at', since30d).limit(10000))
      : Promise.resolve([]),
    normalIds.length
      ? optionalRows<any>(() => supabaseAdmin.from('playlist_tracks').select('track_id').in('track_id', normalIds).gte('added_at', since30d).limit(10000))
      : Promise.resolve([]),
    allIds.length
      ? optionalRows<any>(() => supabaseAdmin.from('track_moment_reactions').select('track_id').in('track_id', allIds).gte('created_at', since30d).limit(10000))
      : Promise.resolve([]),
  ]);

  const statsMap = new Map(statsRows.map((row: any) => [statsKey(row), row]).filter(([key]) => Boolean(key)) as Array<[string, any]>);
  const momentumMap = buildMomentum(recentEvents, now);
  const profilesMap = new Map(aiProfiles.map((profile: any) => [String(profile.id), profile]));
  const commentsMap = new Map<string, number>();
  const savesMap = new Map<string, number>();
  const reactionsMap = new Map<string, number>();
  const boostsMap = new Map<string, number>();
  for (const row of commentRows) increment(commentsMap, row.track_id);
  for (const row of saveRows) increment(savesMap, row.track_id);
  for (const row of reactionRows) increment(reactionsMap, row.track_id);
  for (const row of boosts) {
    const id = String(row.track_id || '');
    if (id) boostsMap.set(id, Math.max(boostsMap.get(id) || 1, Number(row.multiplier || 1)));
  }

  const metricsFor = (id: string, row: any, profile: any, isAI: boolean) => {
    const stats = statsMap.get(id) || {};
    const created = row.created_at ? new Date(row.created_at).getTime() : now;
    const ageHours = Math.max(0, (now - created) / 3_600_000);
    return computeTrackDiscoveryMetrics({
      plays_30d: Number(stats.plays_30d || (isAI ? row.play_count : row.plays) || 0),
      completes_30d: Number(stats.completes_30d || 0),
      likes_30d: Number(stats.likes_30d || (isAI ? row.like_count : row.likes_count ?? row.likes) || 0),
      shares_30d: Number(stats.shares_30d || 0),
      favorites_30d: Number(stats.favorites_30d || 0),
      listen_ms_30d: Number(stats.listen_ms_30d || 0),
      unique_listeners_30d: Number(stats.unique_listeners_30d || 0),
      retention_complete_rate_30d: Number(stats.retention_complete_rate_30d || 0),
      ageHours,
      momentumScore: momentumMap.get(id) || 0,
      creatorFollowers: Number(profile?.follower_count || 0),
      comments30d: commentsMap.get(id) || 0,
      reactions30d: reactionsMap.get(id) || 0,
      playlistSaves30d: savesMap.get(id) || 0,
    });
  };

  const normalTracks = normalRows.map((track: any) => {
    const profile = one(track.profiles) || {};
    const metrics = metricsFor(String(track.id), track, profile, false);
    const boostMultiplier = boostsMap.get(String(track.id)) || 1;
    return {
      _id: String(track.id),
      title: track.title,
      artist: {
        _id: track.creator_id,
        username: profile.username,
        name: profile.name,
        avatar: profile.avatar,
        isArtist: profile.is_artist,
        artistName: profile.artist_name,
        bio: profile.bio,
        followersCount: Number(profile.follower_count || 0),
        createdAt: profile.created_at,
      },
      duration: track.duration || 0,
      coverUrl: track.cover_url,
      ...normalTrackVideoMeta(track),
      audioUrl: track.audio_url,
      album: track.album || null,
      genre: track.genre || [],
      lyrics: track.lyrics || null,
      likes: [],
      likesCount: Number(track.likes_count ?? track.likes ?? metrics.likes30d),
      commentsCount: metrics.comments30d,
      savesCount: metrics.saves30d,
      reactionsCount: metrics.reactions30d,
      completionRate: Math.round(metrics.completionRate30d),
      plays: Number(track.plays || 0),
      createdAt: track.created_at,
      isFeatured: Boolean(track.is_featured),
      isVerified: Boolean(profile.is_verified),
      rankingScore: globalDiscoveryScore(metrics),
      discoveryMetrics: metrics,
      isAI: false,
      isLiked: false,
      isBoosted: boostMultiplier > 1,
      boostMultiplier: boostMultiplier > 1 ? boostMultiplier : undefined,
      isFresh: metrics.freshnessScore >= 4.8,
      radarScore: Math.round(metrics.emergingScore * 10),
      ...remixPermissionsFromRow(track),
    } as RecommendedTrack;
  });

  const aiTracks = aiRows.map((track: any) => {
    const generation = one(track.generation) || {};
    const profile = profilesMap.get(String(generation.user_id)) || {};
    const id = `ai-${track.id}`;
    const metrics = metricsFor(id, track, profile, true);
    return {
      _id: id,
      title: track.title || 'Titre IA',
      artist: {
        _id: generation.user_id,
        username: profile.username,
        name: profile.name || profile.username,
        avatar: profile.avatar,
        isArtist: true,
        artistName: profile.name || profile.username,
        bio: profile.bio,
        followersCount: Number(profile.follower_count || 0),
        createdAt: profile.created_at,
      },
      duration: track.duration || 0,
      coverUrl: track.image_url || '/default-cover.svg',
      ...aiTrackVideoMeta(track),
      audioUrl: track.audio_url,
      genre: Array.isArray(track.tags) ? track.tags : [],
      lyrics: track.lyrics || null,
      likes: [],
      likesCount: Number(track.like_count || metrics.likes30d),
      commentsCount: metrics.comments30d,
      savesCount: metrics.saves30d,
      reactionsCount: metrics.reactions30d,
      completionRate: Math.round(metrics.completionRate30d),
      plays: Number(track.play_count || 0),
      createdAt: track.created_at,
      isFeatured: false,
      isVerified: Boolean(profile.is_verified),
      rankingScore: globalDiscoveryScore(metrics),
      discoveryMetrics: metrics,
      isAI: true,
      isLiked: false,
      isBoosted: false,
      isFresh: metrics.freshnessScore >= 4.8,
      radarScore: Math.round(metrics.emergingScore * 10),
      ...remixPermissionsFromRow(track),
    } as RecommendedTrack;
  });

  return [...normalTracks, ...aiTracks].filter((track) => track._id && track.audioUrl);
}

export const loadGlobalTrackCandidates = unstable_cache(
  loadGlobalTrackCandidatesUncached,
  ['synaura-discovery-v3-candidates'],
  { revalidate: 45, tags: ['synaura-discovery-candidates'] },
);
