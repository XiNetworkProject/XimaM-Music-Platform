import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { getRecommendationSeenIds, getRecommendationSessionId, rememberRecommendationImpressions } from '@/feed/recommendationSession';
import type {
  Creator,
  CityEventDetail,
  CommunityClubAggregate,
  CommunityFaq,
  CommunityPost,
  CommunityReply,
  CommunityStats,
  SynauraCityData,
  FeedResponse,
  FeedStrategy,
  HomeComment,
  HomeData,
  HomePost,
  LibraryStats,
  MusicChallenge,
  MusicChallengeDetail,
  MusicChallengeStatus,
  MusicClip,
  MusicClipSource,
  NotificationCenterData,
  Playlist,
  PendingVariation,
  RankingFeedChunk,
  RemixPermissions,
  RemixSource,
  SearchResults,
  UserVariation,
  SynauraNotification,
  Track,
  TrackWaveformData,
  MomentReaction,
  MomentReactionType,
  DiscoverPage,
  DiscoverOverview,
} from './types';
import { DEFAULT_REMIX_PERMISSIONS } from './types';
import type {
  CreatorAudienceStats,
  CreatorPostStats,
  CreatorStatsDashboard,
  CreatorStatsOverview,
  CreatorStatsRange,
  CreatorTrackDetail,
  CreatorTrackPoint,
  CreatorTrackStat,
} from '@/stats/types';

const fallbackBaseUrl = 'https://xima-m-music-platform.vercel.app';
const fallbackCover = 'https://xima-m-music-platform.vercel.app/default-cover.svg';
const tints = ['#8B5CF6', '#38BDF8', '#FB7185', '#F59E0B', '#14B8A6', '#EF4444'];
let authTokenProvider: (() => string | null) | null = null;
let authRefreshHandler: (() => Promise<boolean>) | null = null;

export const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  fallbackBaseUrl;
const MOBILE_RELEASE_MANIFEST_URL =
  (Constants.expoConfig?.extra?.mobileReleaseManifestUrl as string | undefined) ||
  process.env.EXPO_PUBLIC_MOBILE_RELEASE_MANIFEST_URL;

export type MobileAppRelease = {
  platform: 'android';
  versionName: string;
  versionCode: number;
  minimumVersionCode: number;
  title: string;
  releaseNotes: string[];
  mandatory: boolean;
  apkUrl: string;
  sha256: string;
  sizeBytes: number;
  publishedAt: string;
};

export type MobileAppReleaseResponse = {
  available: boolean;
  release: MobileAppRelease | null;
};

export function setAuthTokenProvider(provider: () => string | null) {
  authTokenProvider = provider;
}

export function setAuthRefreshHandler(handler: (() => Promise<boolean>) | null) {
  authRefreshHandler = handler;
}

function safeString(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function compact(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value || 0);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return '0';
  if (numberValue >= 1_000_000) return `${(numberValue / 1_000_000).toFixed(1)}M`;
  if (numberValue >= 1_000) return `${(numberValue / 1_000).toFixed(1)}K`;
  return String(numberValue);
}

function countArrayOrNumber(value: unknown) {
  if (Array.isArray(value)) return value.length;
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function readObject(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeDominantColors(...values: unknown[]) {
  const raw = values.find((value) => Array.isArray(value)) as unknown[] | undefined;
  if (!raw) return [];
  return raw
    .map((entry) => String(entry || '').trim())
    .filter((entry) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(entry) || /^rgba?\(/i.test(entry))
    .slice(0, 4);
}

function relativeTime(dateLike?: string) {
  if (!dateLike) return 'maintenant';
  const time = new Date(dateLike).getTime();
  if (!Number.isFinite(time)) return 'maintenant';
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "a l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} j`;
  return new Date(dateLike).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function pickTint(seed: string) {
  let total = 0;
  for (const char of seed) total += char.charCodeAt(0);
  return tints[total % tints.length];
}

function absoluteAsset(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return url;
}

function isLikelyExpiredMobileAIMedia(url: unknown, createdAt?: unknown) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) return true;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    const temporary = host === 'musicfile.api.box' || host === 'tempfile.aiquickdraw.com' || host.endsWith('.removeai.ai');
    if (!temporary) return false;
    const created = typeof createdAt === 'string' ? Date.parse(createdAt) : Number.NaN;
    return !Number.isFinite(created) || Date.now() - created > 14 * 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

function firstPlayableMobileAIMedia(values: unknown[], createdAt?: unknown) {
  for (const value of values) {
    if (typeof value !== 'string' || !value.trim()) continue;
    if (!isLikelyExpiredMobileAIMedia(value, createdAt)) return value.trim();
  }
  return '';
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = authTokenProvider?.();
  return {
    Accept: 'application/json',
    'Cache-Control': 'no-store',
    ...(token ? { Authorization: `Bearer ${token}`, 'X-Auth-Token': token } : {}),
    ...(extra || {}),
  };
}

function artistName(raw: any) {
  return (
    raw?.artist?.artistName ||
    raw?.artist?.name ||
    raw?.artist?.username ||
    raw?.artist_name ||
    raw?.creator_name ||
    'Artiste inconnu'
  );
}

function normalizeTrack(raw: any): Track | null {
  const id = raw?._id || raw?.id;
  const audioUrl = raw?.audioUrl || raw?.audio_url || raw?.stream_audio_url;
  if (!id || !audioUrl) return null;

  const trackData = readObject(raw?.data);
  const sourceLinks = readObject(raw?.source_links);
  const label = artistName(raw);
  const genre = Array.isArray(raw?.genre)
    ? raw.genre.filter(Boolean).map((entry: unknown) => String(entry))
    : Array.isArray(raw?.tags)
      ? raw.tags.filter(Boolean).map((entry: unknown) => String(entry))
      : typeof raw?.genre === 'string' && raw.genre.trim()
        ? [raw.genre.trim()]
        : [];

  return {
    ...raw,
    _id: String(id),
    title: String(raw?.title || 'Sans titre'),
    artist: {
      _id: String(raw?.artist?._id || raw?.artist?.id || raw?.creator_id || ''),
      name: safeString(raw?.artist?.name || raw?.artist?.artistName || label, label),
      username: safeString(raw?.artist?.username, ''),
      avatar: raw?.artist?.avatar || null,
      artistName: safeString(raw?.artist?.artistName || label, label),
      followersCount: Number(raw?.artist?.followersCount ?? raw?.artist?.follower_count ?? 0),
    },
    audioUrl: String(audioUrl),
    coverUrl: absoluteAsset(raw?.coverUrl || raw?.cover_url || raw?.imageUrl || raw?.image_url) || fallbackCover,
    coverVideoUrl: absoluteAsset(raw?.coverVideoUrl || raw?.cover_video_url || raw?.video_url) || null,
    coverVideoPosterUrl: absoluteAsset(raw?.coverVideoPosterUrl || raw?.cover_video_poster_url) || null,
    musicVideoUrl: absoluteAsset(raw?.musicVideoUrl || raw?.music_video_url) || null,
    musicVideoPosterUrl: absoluteAsset(raw?.musicVideoPosterUrl || raw?.music_video_poster_url) || null,
    visualUrl: absoluteAsset(raw?.visualUrl || raw?.visual_url || trackData.visualUrl || trackData.visual_url || sourceLinks.visualUrl || sourceLinks.visual_url) || null,
    visualType: ['image', 'video', 'generated', 'none'].includes(raw?.visualType || raw?.visual_type || trackData.visualType || trackData.visual_type || sourceLinks.visualType || sourceLinks.visual_type)
      ? (raw?.visualType || raw?.visual_type || trackData.visualType || trackData.visual_type || sourceLinks.visualType || sourceLinks.visual_type)
      : undefined,
    dominantColors: normalizeDominantColors(raw?.dominantColors, raw?.dominant_colors, trackData.dominantColors, trackData.dominant_colors, sourceLinks.dominantColors, sourceLinks.dominant_colors),
    auraVisualEnabled: (raw?.auraVisualEnabled ?? raw?.aura_visual_enabled ?? trackData.auraVisualEnabled ?? trackData.aura_visual_enabled ?? sourceLinks.auraVisualEnabled ?? sourceLinks.aura_visual_enabled) !== false,
    lyrics: typeof raw?.lyrics === 'string' && raw.lyrics.trim() ? String(raw.lyrics) : null,
    duration: Number(raw?.duration || 0),
    likes: Array.isArray(raw?.likes) ? raw.likes : [],
    comments: Array.isArray(raw?.comments) ? raw.comments : [],
    likesCount: Number(raw?.likes_count ?? raw?.likesCount ?? countArrayOrNumber(raw?.likes)),
    commentsCount: Number(raw?.comments_count ?? raw?.commentsCount ?? countArrayOrNumber(raw?.comments)),
    savesCount: Number(raw?.saves_count ?? raw?.savesCount ?? 0),
    reactionsCount: Number(raw?.reactions_count ?? raw?.reactionsCount ?? 0),
    completionRate: Number(raw?.completion_rate ?? raw?.completionRate ?? 0),
    radarScore: Number(raw?.radar_score ?? raw?.radarScore ?? 0),
    radarReasons: Array.isArray(raw?.radarReasons)
      ? raw.radarReasons.filter(Boolean).map((entry: unknown) => String(entry))
      : Array.isArray(raw?.radar_reasons)
        ? raw.radar_reasons.filter(Boolean).map((entry: unknown) => String(entry))
        : [],
    radarSignalLabel: typeof (raw?.radar_signal_label ?? raw?.radarSignalLabel) === 'string'
      ? String(raw?.radar_signal_label ?? raw?.radarSignalLabel)
      : undefined,
    isRadar: Boolean(raw?.is_radar ?? raw?.isRadar),
    isNewThisWeek: Boolean(raw?.is_new_this_week ?? raw?.isNewThisWeek),
    shares: Number(raw?.shares ?? 0),
    sharesCount: Number(raw?.shares_count ?? raw?.sharesCount ?? raw?.shares ?? 0),
    isLiked: Boolean(raw?.isLiked || raw?.is_liked),
    isAI: Boolean(raw?.isAI || raw?.is_ai || String(id).startsWith('ai-')),
    isBoosted: Boolean(raw?.isBoosted || raw?.is_boosted),
    plays: Number(raw?.plays || raw?.play_count || 0),
    genre,
    tags: Array.isArray(raw?.tags) ? raw.tags.filter(Boolean).map((t: unknown) => String(t)) : [],
    album: raw?.album || null,
    createdAt: raw?.createdAt || raw?.created_at,
    tint: pickTint(String(id)),
    style: genre[0] || raw?.style || raw?.prompt || 'Track Synaura',
    allowClips: Boolean(raw?.allowClips ?? raw?.allow_clips),
    allowAudioRemix: Boolean(raw?.allowAudioRemix ?? raw?.allow_audio_remix),
    allowAiVariation: Boolean(raw?.allowAiVariation ?? raw?.allow_ai_variation),
    remixApprovalRequired: Boolean(raw?.remixApprovalRequired ?? raw?.remix_approval_required),
    remixVisibility: ['everyone', 'followers', 'disabled'].includes(raw?.remixVisibility ?? raw?.remix_visibility)
      ? (raw?.remixVisibility ?? raw?.remix_visibility)
      : 'disabled',
    canRemixAiVariation: Boolean(raw?.canRemixAiVariation ?? raw?.can_remix_ai_variation),
    remixAttribution: raw?.remixAttribution || raw?.remix_attribution || null,
    variationsCount: Number(raw?.variationsCount ?? raw?.variations_count ?? 0),
    musicClipsCount: Number(raw?.musicClipsCount ?? raw?.music_clips_count ?? 0),
    recommendationScore: Number(raw?.recommendationScore ?? raw?.recommendation_score ?? 0),
    recommendationReasons: Array.isArray(raw?.recommendationReasons ?? raw?.recommendation_reasons)
      ? (raw?.recommendationReasons ?? raw?.recommendation_reasons).map((reason: unknown) => String(reason || '').trim()).filter(Boolean)
      : [],
  };
}

function normalizeClipSource(raw: any): MusicClipSource | null {
  const track = normalizeTrack({
    ...raw,
    _id: raw?._id || raw?.id || raw?.sourceTrackId,
    id: raw?._id || raw?.id || raw?.sourceTrackId,
    audioUrl: raw?.audioUrl || raw?.audio_url || raw?.trackUrl || raw?.track_url,
    coverUrl: raw?.coverUrl || raw?.cover_url,
  });
  if (!track) return null;
  return {
    ...track,
    sourceTrackId: String(raw?.sourceTrackId || raw?.source_track_id || track._id.replace(/^ai-/, '')),
    sourceTrackType: raw?.sourceTrackType === 'ai_track' || raw?.source_track_type === 'ai_track' || track._id.startsWith('ai-') ? 'ai_track' : 'track',
    trackUrl: raw?.trackUrl || raw?.track_url,
    canCreateClip: Boolean(raw?.canCreateClip ?? raw?.can_create_clip),
  };
}

function normalizeMusicClip(raw: any): MusicClip | null {
  const id = raw?.id;
  const source = normalizeClipSource(raw?.sourceTrack || raw?.source_track);
  if (!id || !source) return null;
  return {
    id: String(id),
    creatorId: String(raw?.creatorId || raw?.creator_id || ''),
    creator: {
      id: String(raw?.creator?.id || raw?.creatorId || raw?.creator_id || ''),
      username: safeString(raw?.creator?.username, ''),
      name: safeString(raw?.creator?.name || raw?.creator?.username, 'Createur Synaura'),
      avatar: raw?.creator?.avatar || null,
    },
    videoUrl: absoluteAsset(raw?.videoUrl || raw?.video_url),
    videoPublicId: raw?.videoPublicId || raw?.video_public_id || null,
    posterUrl: absoluteAsset(raw?.posterUrl || raw?.poster_url || raw?.thumbnailUrl || raw?.thumbnail_url),
    caption: typeof raw?.caption === 'string' && raw.caption.trim() ? raw.caption.trim() : null,
    tags: Array.isArray(raw?.tags) ? raw.tags.map((tag: unknown) => String(tag)).filter(Boolean) : [],
    sourceTrackId: String(raw?.sourceTrackId || raw?.source_track_id || source.sourceTrackId),
    sourceTrackType: raw?.sourceTrackType === 'ai_track' || raw?.source_track_type === 'ai_track' ? 'ai_track' : 'track',
    sourceTrackOffsetSeconds: Number(raw?.sourceTrackOffsetSeconds ?? raw?.source_track_offset_seconds ?? 0),
    sourceTrackDurationSeconds: Number(raw?.sourceTrackDurationSeconds ?? raw?.source_track_duration_seconds ?? 30),
    visibility: ['draft', 'published', 'hidden'].includes(raw?.visibility) ? raw.visibility : 'draft',
    likesCount: Number(raw?.likesCount ?? raw?.likes_count ?? 0),
    commentsCount: Number(raw?.commentsCount ?? raw?.comments_count ?? 0),
    isLiked: Boolean(raw?.isLiked ?? raw?.is_liked),
    createdAt: raw?.createdAt || raw?.created_at || new Date().toISOString(),
    updatedAt: raw?.updatedAt || raw?.updated_at || raw?.createdAt || raw?.created_at || new Date().toISOString(),
    sourceTrack: source,
    recommendationScore: Number(raw?.recommendationScore ?? raw?.recommendation_score ?? 0),
    recommendationReasons: Array.isArray(raw?.recommendationReasons)
      ? raw.recommendationReasons.map(String)
      : Array.isArray(raw?.recommendation_reasons)
        ? raw.recommendation_reasons.map(String)
        : [],
  };
}

function collectTracks(payload: FeedResponse): Track[] {
  const rawTracks = [
    ...(Array.isArray(payload.tracks) ? payload.tracks : []),
    ...(Array.isArray(payload.dailyMix) ? payload.dailyMix : []),
    ...(Array.isArray(payload.weeklyTop) ? payload.weeklyTop : []),
    ...(Array.isArray(payload.items) ? payload.items.map((item) => item?.track).filter(Boolean) : []),
  ];

  const byId = new Map<string, Track>();
  rawTracks.forEach((raw) => {
    const track = normalizeTrack(raw);
    if (track && !byId.has(track._id)) byId.set(track._id, track);
  });
  return Array.from(byId.values());
}

const API_REQUEST_TIMEOUT_MS = 15000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  try {
    const perform = () => fetch(`${API_BASE_URL}${path}`, {
        ...init,
        signal: init?.signal || controller.signal,
        headers: authHeaders({
          ...(!isForm ? { 'Content-Type': 'application/json' } : {}),
          ...(init?.headers || {}),
        }),
      });
    let res = await perform();
    if (res.status === 401 && authRefreshHandler && await authRefreshHandler()) {
      res = await perform();
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || json?.message || `Erreur API ${res.status}`);
    return json;
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('Le serveur met trop de temps a repondre. Reessaie.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function optionalRequest<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return await request<T>(path, init);
  } catch {
    return null;
  }
}

const EMPTY_POST_STATS: CreatorPostStats = {
  totalPosts: 0,
  postsInRange: 0,
  likes: 0,
  comments: 0,
  engagement: 0,
  byType: {},
  series: [],
  bestPost: null,
  posts: [],
};

const EMPTY_AUDIENCE_STATS: CreatorAudienceStats = {
  countries: {},
  devices: {},
  os: {},
  browsers: {},
};

export async function getCreatorStatsDashboard(
  range: CreatorStatsRange,
  trackId = 'all',
  compareTrackId = '',
): Promise<CreatorStatsDashboard> {
  const query = `range=${encodeURIComponent(range)}`;
  const trackQuery = `${query}&track=${encodeURIComponent(trackId || 'all')}`;
  const [overview, tracksPayload, trackSeries, posts, audience, heatmapPayload, trackDetail, compareSeries] = await Promise.all([
    optionalRequest<CreatorStatsOverview>(`/api/stats/overview?${query}`),
    optionalRequest<{ tracks?: CreatorTrackStat[] }>('/api/stats/all-tracks'),
    optionalRequest<CreatorTrackPoint[]>(`/api/stats/timeseries?${trackQuery}`),
    optionalRequest<CreatorPostStats>(`/api/stats/posts?${query}`),
    optionalRequest<CreatorAudienceStats>(`/api/stats/audience?${trackQuery}`),
    optionalRequest<{ matrix?: number[][] }>(`/api/stats/heatmap?${trackQuery}`),
    trackId && trackId !== 'all'
      ? optionalRequest<CreatorTrackDetail>(`/api/stats/tracks?track_id=${encodeURIComponent(trackId)}`)
      : Promise.resolve(null),
    compareTrackId
      ? optionalRequest<CreatorTrackPoint[]>(`/api/stats/timeseries?${query}&track=${encodeURIComponent(compareTrackId)}`)
      : Promise.resolve(null),
  ]);

  if (!overview) throw new Error('Impossible de charger tes statistiques pour le moment.');
  return {
    overview,
    tracks: Array.isArray(tracksPayload?.tracks) ? tracksPayload.tracks : [],
    trackSeries: Array.isArray(trackSeries) ? trackSeries : [],
    compareSeries: Array.isArray(compareSeries) ? compareSeries : [],
    posts: posts || EMPTY_POST_STATS,
    audience: audience || EMPTY_AUDIENCE_STATS,
    heatmap: Array.isArray(heatmapPayload?.matrix) ? heatmapPayload.matrix : [],
    trackDetail,
  };
}

export async function getLatestAppRelease(versionCode: number): Promise<MobileAppReleaseResponse> {
  try {
    return await request<MobileAppReleaseResponse>(`/api/mobile/releases/latest?versionCode=${Math.max(0, versionCode)}`);
  } catch (apiError) {
    if (!MOBILE_RELEASE_MANIFEST_URL) throw apiError;
    const response = await fetch(MOBILE_RELEASE_MANIFEST_URL, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw apiError;
    const release = await response.json() as MobileAppRelease;
    const available = Number(release?.versionCode || 0) > Math.max(0, versionCode);
    return {
      available,
      release: available ? release : null,
    };
  }
}

function uniqueTracks(tracks: Track[]) {
  const byId = new Map<string, Track>();
  tracks.forEach((track) => {
    if (!byId.has(track._id)) byId.set(track._id, track);
  });
  return Array.from(byId.values());
}

function normalizePlaylist(raw: any, fallbackCovers: string[]): Playlist | null {
  const id = String(raw?._id || raw?.id || '');
  if (!id) return null;
  const collection = raw?.editorialCollection || raw?.collection || null;
  const cover = absoluteAsset(collection?.coverUrl || raw?.coverUrl || raw?.cover_url) || fallbackCover;
  const bannerUrl = absoluteAsset(collection?.bannerUrl || raw?.bannerUrl || raw?.banner_url) || null;
  const covers = [cover, ...fallbackCovers].slice(0, 4);
  while (covers.length < 4) covers.push(cover);
  const trackCount = Array.isArray(raw?.tracks) ? raw.tracks.length : Number(raw?.trackCount || 0);
  const themeColors = Array.isArray(collection?.themeColors)
    ? collection.themeColors.filter(Boolean).map((entry: unknown) => String(entry))
    : Array.isArray(raw?.themeColors)
      ? raw.themeColors.filter(Boolean).map((entry: unknown) => String(entry))
      : undefined;

  return {
    id,
    title: safeString(collection?.title || raw?.name || raw?.title, 'Playlist'),
    curator: safeString(raw?.creator?.artistName || raw?.creator?.name || (collection ? 'Synaura' : 'Synaura Picks'), 'Synaura Picks'),
    covers,
    tracks: `${trackCount || 0} sons`,
    vibe: safeString(collection?.subtitle || raw?.description, 'selection communautaire'),
    slug: collection?.slug || raw?.slug,
    bannerUrl,
    coverUrl: cover,
    isEditorial: Boolean(collection || raw?.isEditorial),
    badge: collection?.badge || raw?.badge,
    themeColors,
    downloadEnabled: collection?.downloadEnabled ?? raw?.downloadEnabled,
    commentsEnabled: collection?.commentsEnabled ?? raw?.commentsEnabled,
    collection: collection ? {
      id: String(collection.id || ''),
      playlistId: String(collection.playlistId || id),
      slug: String(collection.slug || ''),
      title: safeString(collection.title, 'Collection Synaura'),
      subtitle: safeString(collection.subtitle, ''),
      description: safeString(collection.description, ''),
      kind: safeString(collection.kind, 'collection'),
      bannerUrl,
      coverUrl: absoluteAsset(collection.coverUrl) || cover,
      themeColors: themeColors || ['#8B5CF6', '#EC4899', '#22D3EE'],
      badge: safeString(collection.badge, 'Synaura Originals'),
      isFeatured: collection.isFeatured !== false,
      isPublished: collection.isPublished === true,
      downloadEnabled: collection.downloadEnabled !== false,
      commentsEnabled: collection.commentsEnabled !== false,
    } : null,
  };
}

function normalizeCreator(raw: any): Creator | null {
  const id = String(raw?._id || raw?.id || '');
  if (!id) return null;
  const name = safeString(raw?.name || raw?.artistName || raw?.username, 'Createur');
  const username = safeString(raw?.username, '');
  const totalPlays = Number(raw?.totalPlays || 0);
  const trackCount = Number(raw?.trackCount || 0);

  return {
    id,
    name,
    handle: username ? `@${username}` : '@synaura',
    avatar: absoluteAsset(raw?.avatar || raw?.image || raw?.profileImage) || name.slice(0, 1).toUpperCase(),
    tag: trackCount > 0 ? `${trackCount} titres` : raw?.isTrending ? 'En tendance' : 'Actif sur Synaura',
    followers: `${compact(totalPlays)} ecoutes`,
    tint: pickTint(id),
  };
}

function normalizePost(raw: any): HomePost | null {
  const id = String(raw?.id || raw?._id || '');
  if (!id) return null;

  const author = safeString(raw?.creator?.name || raw?.creator?.username, 'Membre');
  const username = safeString(raw?.creator?.username, '');
  const type = raw?.type === 'track_share' ? 'track_share' : raw?.type === 'photo' ? 'photo' : raw?.type === 'repost' ? 'repost' : 'text';
  const track = raw?.track
    ? normalizeTrack({
        _id: raw.track.id || raw.track._id,
        title: raw.track.title,
        artist: {
          _id: raw.track.artist_id || '',
          name: raw.track.artist_name || raw.track.artist?.name,
          username: raw.track.artist?.username || '',
          artistName: raw.track.artist_name || raw.track.artist?.artistName,
        },
        audioUrl: raw.track.audio_url || raw.track.audioUrl,
        coverUrl: raw.track.cover_url || raw.track.coverUrl,
        coverVideoUrl: raw.track.cover_video_url || raw.track.coverVideoUrl,
        coverVideoPosterUrl: raw.track.cover_video_poster_url || raw.track.coverVideoPosterUrl,
        duration: raw.track.duration,
        plays: raw.track.plays,
        genre: raw.track.genre,
      })
    : null;

  return {
    id,
    type,
    creatorId: String(raw?.creator?.id || raw?.creator?._id || raw?.creator_id || ''),
    author,
    handle: username ? `@${username}` : '@synaura',
    avatar: absoluteAsset(raw?.creator?.avatar || raw?.creator?.image || raw?.avatar) || author.slice(0, 1).toUpperCase(),
    time: relativeTime(raw?.created_at || raw?.createdAt),
    mood: type === 'track_share' ? 'partage de son' : type === 'photo' ? 'post image' : 'discussion',
    text: safeString(raw?.content, track?.title || 'Publication Synaura'),
    imageUrl: type === 'photo' ? absoluteAsset(raw?.image_url || raw?.imageUrl) || undefined : undefined,
    likesCount: Number(raw?.likes_count || raw?.likesCount || 0),
    commentsCount: Number(raw?.comments_count || raw?.commentsCount || 0),
    isLiked: Boolean(raw?.isLiked),
    track: track || undefined,
  };
}

export async function getHomeFeed(): Promise<Track[]> {
  const sessionId = await getRecommendationSessionId();
  const endpoints = [
    `/api/ranking/feed?limit=80&ai=1&strategy=reco&session=${encodeURIComponent(sessionId)}`,
    `/api/recommendations/feed?limit=60&session=${encodeURIComponent(sessionId)}`,
    `/api/tracks/trending?limit=60&session=${encodeURIComponent(sessionId)}`,
  ];

  const results = await Promise.allSettled(endpoints.map((endpoint) => request<FeedResponse>(endpoint)));
  const merged = new Map<string, Track>();
  results.forEach((result) => {
    if (result.status !== 'fulfilled') return;
    collectTracks(result.value).forEach((track) => {
      if (!merged.has(track._id)) merged.set(track._id, track);
    });
  });
  return Array.from(merged.values());
}

export async function getHomeData(): Promise<HomeData> {
  const sessionId = await getRecommendationSessionId();
  const [feed, trending, recent, boosted, playlists, featuredCollections, artists, libraryPlaylists, libraryFavorites, libraryRecent] = await Promise.allSettled([
    request<FeedResponse>(`/api/recommendations/feed?limit=24&session=${encodeURIComponent(sessionId)}`),
    request<FeedResponse>(`/api/tracks/trending?limit=18&session=${encodeURIComponent(sessionId)}`),
    request<FeedResponse>(`/api/tracks/recent?limit=18&session=${encodeURIComponent(sessionId)}`),
    request<FeedResponse>(`/api/tracks/boosted?limit=8&session=${encodeURIComponent(sessionId)}`),
    request<FeedResponse>('/api/playlists/popular?limit=8'),
    optionalRequest<FeedResponse>('/api/editorial-collections/featured'),
    request<FeedResponse>('/api/artists?sort=trending&limit=8'),
    optionalRequest<FeedResponse>('/api/playlists'),
    optionalRequest<FeedResponse>('/api/tracks?liked=true&limit=60'),
    optionalRequest<FeedResponse>('/api/tracks?recent=true&limit=40'),
  ]);

  const feedPayload = feed.status === 'fulfilled' ? feed.value : {};
  const trendingPayload = trending.status === 'fulfilled' ? trending.value : {};
  const recentPayload = recent.status === 'fulfilled' ? recent.value : {};
  const boostedPayload = boosted.status === 'fulfilled' ? boosted.value : {};
  const playlistsPayload = playlists.status === 'fulfilled' ? playlists.value : {};
  const featuredCollectionsPayload = featuredCollections.status === 'fulfilled' ? featuredCollections.value : {};
  const artistsPayload = artists.status === 'fulfilled' ? artists.value : {};
  const libraryPlaylistsPayload = libraryPlaylists.status === 'fulfilled' ? libraryPlaylists.value : null;
  const libraryFavoritesPayload = libraryFavorites.status === 'fulfilled' ? libraryFavorites.value : null;
  const libraryRecentPayload = libraryRecent.status === 'fulfilled' ? libraryRecent.value : null;

  const forYou = uniqueTracks(collectTracks(feedPayload));
  const trendingTracks = uniqueTracks(collectTracks(trendingPayload));
  const recentTracks = uniqueTracks(collectTracks(recentPayload));
  const boostedTracks = uniqueTracks(collectTracks(boostedPayload));
  const fallbackCovers = uniqueTracks([...forYou, ...trendingTracks, ...recentTracks]).slice(0, 4).map((track) => track.coverUrl || fallbackCover);

  const libraryStats: LibraryStats | null = libraryPlaylistsPayload || libraryFavoritesPayload || libraryRecentPayload
    ? {
        playlists: Array.isArray(libraryPlaylistsPayload?.playlists) ? libraryPlaylistsPayload?.playlists?.length || 0 : 0,
        favorites: collectTracks(libraryFavoritesPayload || {}).length,
        recent: collectTracks(libraryRecentPayload || {}).length,
        ai: collectTracks(libraryRecentPayload || {}).filter((track) => track.isAI || track._id.startsWith('ai-')).length,
      }
    : null;
  const normalizedPlaylists = [
    ...(Array.isArray((featuredCollectionsPayload as any).collections)
      ? ((featuredCollectionsPayload as any).collections || []).map((collection: any) => ({
          _id: collection.playlistId,
          id: collection.playlistId,
          name: collection.title,
          title: collection.title,
          description: collection.subtitle || collection.description,
          coverUrl: collection.coverUrl || collection.bannerUrl,
          bannerUrl: collection.bannerUrl,
          publicUrl: collection.publicUrl || `/playlists/${collection.slug || collection.playlistId}`,
          isEditorial: true,
          trackCount: collection.trackCount || 0,
          editorialCollection: collection,
          collection,
          creator: { name: 'Synaura', artistName: 'Synaura', username: 'synaura' },
        }))
      : []),
    ...(Array.isArray(libraryPlaylistsPayload?.playlists) ? libraryPlaylistsPayload?.playlists || [] : []),
    ...(Array.isArray(playlistsPayload.playlists) ? playlistsPayload.playlists : []),
  ]
    .map((playlist) => normalizePlaylist(playlist, fallbackCovers))
    .filter((playlist): playlist is Playlist => Boolean(playlist));
  const playlistsById = new Map(normalizedPlaylists.map((playlist) => [playlist.id, playlist]));

  return {
    forYou,
    trending: trendingTracks,
    recent: recentTracks,
    boosted: boostedTracks,
    playlists: Array.from(playlistsById.values()),
    creators: (Array.isArray(artistsPayload.artists) ? artistsPayload.artists : [])
      .map(normalizeCreator)
      .filter((creator): creator is Creator => Boolean(creator)),
    posts: (Array.isArray(feedPayload.posts) ? feedPayload.posts : [])
      .map(normalizePost)
      .filter((post): post is HomePost => Boolean(post)),
    libraryStats,
    nextCursor: feedPayload.nextCursor == null ? null : String(feedPayload.nextCursor),
    hasMore: Boolean(feedPayload.hasMore),
  };
}

export async function getDiscoverPage(input: { page?: number; profilePage?: number; sort?: string; category?: string; limit?: number; profileLimit?: number } = {}): Promise<DiscoverPage> {
  const params = new URLSearchParams({
    page: String(input.page || 0),
    profilePage: String(input.profilePage ?? input.page ?? 0),
    sort: input.sort || 'trending',
    category: input.category || 'all',
    limit: String(input.limit || 24),
    profileLimit: String(input.profileLimit || 12),
    session: await getRecommendationSessionId(),
  });
  const payload = await request<any>(`/api/discover?${params.toString()}`);
  return {
    tracks: (Array.isArray(payload?.tracks) ? payload.tracks : []).map(normalizeTrack).filter((track: Track | null): track is Track => Boolean(track)),
    artists: (Array.isArray(payload?.artists) ? payload.artists : []).map(normalizeCreator).filter((creator: Creator | null): creator is Creator => Boolean(creator)),
    page: Number(payload?.page || 0),
    nextPage: Number(payload?.nextPage || 1),
    hasMore: Boolean(payload?.hasMore),
    total: Number(payload?.total || 0),
    profilePage: Number(payload?.profilePage || 0),
    nextProfilePage: Number(payload?.nextProfilePage || 1),
    hasMoreProfiles: Boolean(payload?.hasMoreProfiles),
    totalArtists: Number(payload?.totalArtists || 0),
  };
}

export async function getTrendingTracks(): Promise<Track[]> {
  const sessionId = await getRecommendationSessionId();
  const payload = await request<FeedResponse>(`/api/tracks/trending?limit=80&session=${encodeURIComponent(sessionId)}`);
  return collectTracks(payload);
}

export async function getRecentTracks(): Promise<Track[]> {
  const sessionId = await getRecommendationSessionId();
  const payload = await request<FeedResponse>(`/api/tracks/recent?limit=80&session=${encodeURIComponent(sessionId)}`);
  return collectTracks(payload);
}

export async function getPopularTracks(): Promise<Track[]> {
  const sessionId = await getRecommendationSessionId();
  const payload = await request<FeedResponse>(`/api/tracks/popular?limit=80&session=${encodeURIComponent(sessionId)}`);
  return collectTracks(payload);
}

export async function searchTracks(query: string): Promise<Track[]> {
  const q = query.trim();
  if (!q) return [];
  const payload = await request<any>(`/api/search?q=${encodeURIComponent(q)}&type=tracks&limit=50`);
  const raw =
    Array.isArray(payload?.tracks) ? payload.tracks :
    Array.isArray(payload?.results) ? payload.results :
    Array.isArray(payload?.items) ? payload.items.map((item: any) => item?.track || item).filter(Boolean) :
    [];

  const byId = new Map<string, Track>();
  raw.forEach((item: any) => {
    const track = normalizeTrack(item?.track || item);
    if (track && !byId.has(track._id)) byId.set(track._id, track);
  });
  return Array.from(byId.values());
}

export async function searchEverything(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < 2) return { tracks: [], posts: [], artists: [], playlists: [] };
  const [searchJson, postsJson] = await Promise.all([
    optionalRequest<any>(`/api/search?query=${encodeURIComponent(q)}&filter=all&limit=8`),
    optionalRequest<any>(`/api/posts?limit=5&query=${encodeURIComponent(q)}`),
  ]);
  const rawTracks = Array.isArray(searchJson?.tracks) ? searchJson.tracks : [];
  const rawArtists = Array.isArray(searchJson?.artists) ? searchJson.artists : [];
  const rawPlaylists = Array.isArray(searchJson?.playlists) ? searchJson.playlists : [];
  const rawPosts = [
    ...(Array.isArray(searchJson?.posts) ? searchJson.posts : []),
    ...(Array.isArray(postsJson?.posts) ? postsJson.posts : []),
  ];
  const fallbackCovers = rawTracks.map((track: any) => absoluteAsset(track?.coverUrl || track?.cover_url)).filter(Boolean) as string[];
  return {
    tracks: rawTracks.map((item: any) => normalizeTrack(item?.track || item)).filter((track: Track | null): track is Track => Boolean(track)),
    posts: rawPosts.map(normalizePost).filter((post: HomePost | null): post is HomePost => Boolean(post)),
    artists: rawArtists.map(normalizeCreator).filter((creator: Creator | null): creator is Creator => Boolean(creator)),
    playlists: rawPlaylists.map((playlist: any) => normalizePlaylist(playlist, fallbackCovers)).filter((playlist: Playlist | null): playlist is Playlist => Boolean(playlist)),
  };
}

export async function getTrackById(trackId: string): Promise<Track | null> {
  const json = await optionalRequest<any>(`/api/tracks/${encodeURIComponent(trackId)}`);
  return json ? normalizeTrack(json?.track || json) : null;
}

export async function getDiscoverOverview(): Promise<DiscoverOverview> {
  const session = await getRecommendationSessionId();
  const payload = await request<any>(`/api/mobile/discover?session=${encodeURIComponent(session)}`);
  const tracks = (value: unknown) => (Array.isArray(value) ? value : [])
    .map(normalizeTrack)
    .filter((track: Track | null): track is Track => Boolean(track));
  return {
    newest: tracks(payload?.newest),
    popular: tracks(payload?.popular),
    hidden: tracks(payload?.hidden),
    radar: tracks(payload?.radar),
    collections: Array.isArray(payload?.collections) ? payload.collections : [],
    totalTracks: Number(payload?.totalTracks || 0),
    generatedAt: typeof payload?.generatedAt === 'string' ? payload.generatedAt : undefined,
  };
}

export async function getSimilarTracks(trackId: string, limit = 8): Promise<{ tracks: Track[]; contextLabel: string }> {
  if (!trackId || trackId.startsWith('ai-') || trackId.startsWith('radio-')) return { tracks: [], contextLabel: '' };
  const json = await optionalRequest<any>(`/api/tracks/similar?trackId=${encodeURIComponent(trackId)}&limit=${Math.max(1, Math.min(20, limit))}`);
  const tracks = (Array.isArray(json?.tracks) ? json.tracks : [])
    .map(normalizeTrack)
    .filter((track: Track | null): track is Track => Boolean(track) && track!._id !== trackId);
  return {
    tracks,
    contextLabel: typeof json?.contextLabel === 'string' ? json.contextLabel : '',
  };
}

export async function getMusicClips(input: { limit?: number; cursor?: number; sourceTrackId?: string; sourceTrackType?: 'track' | 'ai_track'; creatorId?: string; creatorUsername?: string; clipId?: string; excludeIds?: string[] } = {}): Promise<{ clips: MusicClip[]; nextCursor: number; hasMore: boolean }> {
  const params = new URLSearchParams();
  params.set('limit', String(input.limit || 20));
  if (input.cursor) params.set('cursor', String(input.cursor));
  if (input.sourceTrackId) params.set('sourceTrackId', input.sourceTrackId);
  if (input.sourceTrackType) params.set('sourceTrackType', input.sourceTrackType);
  if (input.creatorId) params.set('creatorId', input.creatorId);
  if (input.creatorUsername) params.set('creatorUsername', input.creatorUsername);
  if (input.clipId) params.set('clipId', input.clipId);
  if (!input.sourceTrackId && !input.creatorId && !input.creatorUsername && !input.clipId) {
    const excluded = new Set([...(await getRecommendationSeenIds('clip')), ...(input.excludeIds || [])]);
    if (excluded.size) params.set('exclude', Array.from(excluded).slice(-120).join(','));
  }
  params.set('session', await getRecommendationSessionId());
  params.set('_fresh', String(Date.now()));
  const json = await request<any>(`/api/music-clips?${params.toString()}`);
  return {
    clips: (Array.isArray(json?.clips) ? json.clips : []).map(normalizeMusicClip).filter((clip: MusicClip | null): clip is MusicClip => Boolean(clip)),
    nextCursor: Number(json?.nextCursor || 0),
    hasMore: Boolean(json?.hasMore),
  };
}

export async function getProfileMusicClips(input: {
  creatorUsername: string;
  creatorId?: string;
  limit?: number;
  cursor?: number;
}): Promise<{ clips: MusicClip[]; nextCursor: number; hasMore: boolean }> {
  const creatorUsername = input.creatorUsername.trim().replace(/^@/, '');
  let usernameError: unknown = null;

  if (creatorUsername) {
    try {
      const byUsername = await getMusicClips({
        creatorUsername,
        limit: input.limit,
        cursor: input.cursor,
      });
      if (byUsername.clips.length > 0 || input.cursor || !input.creatorId) return byUsername;
    } catch (error) {
      usernameError = error;
    }
  }

  if (input.creatorId) {
    return getMusicClips({
      creatorId: input.creatorId,
      limit: input.limit,
      cursor: input.cursor,
    });
  }

  if (usernameError) throw usernameError;
  return { clips: [], nextCursor: 0, hasMore: false };
}

export async function getMusicClipLikeStatus(clipId: string): Promise<{ liked: boolean; likesCount: number }> {
  const json = await request<any>(`/api/music-clips/${encodeURIComponent(clipId)}/like`);
  return {
    liked: Boolean(json?.liked),
    likesCount: Number(json?.likesCount ?? json?.likes_count ?? 0),
  };
}

export async function setMusicClipLike(clipId: string, like: boolean): Promise<{ liked: boolean; likesCount: number }> {
  const json = await request<any>(`/api/music-clips/${encodeURIComponent(clipId)}/like`, {
    method: like ? 'POST' : 'DELETE',
  });
  return {
    liked: Boolean(json?.liked ?? like),
    likesCount: Number(json?.likesCount ?? json?.likes_count ?? 0),
  };
}

function normalizeRemixSource(raw: any): RemixSource | null {
  const sourceTrackId = String(raw?.sourceTrackId || raw?.source_track_id || '');
  if (!sourceTrackId) return null;
  return {
    sourceTrackId,
    sourceTrackType: raw?.sourceTrackType === 'ai_track' || raw?.source_track_type === 'ai_track' ? 'ai_track' : 'track',
    title: safeString(raw?.title, 'Creation Synaura'),
    artist: safeString(raw?.artist, 'Artiste Synaura'),
    artistUsername: safeString(raw?.artistUsername, ''),
    coverUrl: absoluteAsset(raw?.coverUrl) || null,
  };
}

/** Morceaux Synaura publics autorisant la variation IA, pour le selecteur "Creer une variation". */
export async function getRemixSources(): Promise<RemixSource[]> {
  const json = await request<any>('/api/remixes/sources?limit=80');
  return (Array.isArray(json?.sources) ? json.sources : [])
    .map(normalizeRemixSource)
    .filter((source: RemixSource | null): source is RemixSource => Boolean(source));
}

/** Variations IA d'un createur, pour l'onglet "Variations" de son profil. */
export async function getUserVariations(username: string): Promise<UserVariation[]> {
  const json = await request<any>(`/api/users/${encodeURIComponent(username)}/variations`);
  return Array.isArray(json?.variations) ? json.variations : [];
}

/** Variations IA en attente d'approbation pour les morceaux source possedes par
 * l'utilisateur connecte ("Variations a valider"). */
export async function getPendingApprovals(): Promise<PendingVariation[]> {
  const json = await request<any>('/api/remixes/pending');
  return Array.isArray(json?.variations) ? json.variations : [];
}

/** Decision (approve/reject) du proprietaire du morceau source sur une variation
 * en attente. */
export async function decideRemix(remixId: string, decision: 'approve' | 'reject'): Promise<void> {
  await request<any>(`/api/remixes/${encodeURIComponent(remixId)}/decision`, {
    method: 'PATCH',
    body: JSON.stringify({ decision }),
  });
}

export async function getMusicClipSources(input: { sourceTrackId?: string; sourceTrackType?: 'track' | 'ai_track'; query?: string; limit?: number; scope?: 'all' | 'mine' } = {}): Promise<MusicClipSource[]> {
  const params = new URLSearchParams({ limit: String(Math.min(60, Math.max(1, input.limit || 24))) });
  if (input.sourceTrackId) params.set('sourceTrackId', input.sourceTrackId);
  if (input.sourceTrackType) params.set('sourceTrackType', input.sourceTrackType);
  if (input.query?.trim()) params.set('query', input.query.trim());
  if (input.scope === 'mine') params.set('scope', 'mine');
  const json = await request<any>(`/api/music-clips/sources?${params.toString()}`);
  return (Array.isArray(json?.sources) ? json.sources : [])
    .map(normalizeClipSource)
    .filter((source: MusicClipSource | null): source is MusicClipSource => Boolean(source));
}

export async function createMusicClipDraft(input: { sourceTrackId: string; sourceTrackType: 'track' | 'ai_track' }): Promise<MusicClip> {
  const json = await request<any>('/api/music-clips', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const clip = normalizeMusicClip(json?.clip);
  if (!clip) throw new Error('Brouillon clip invalide');
  return clip;
}

export async function updateMusicClip(clipId: string, input: Record<string, unknown>): Promise<MusicClip> {
  const json = await request<any>(`/api/music-clips/${encodeURIComponent(clipId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  const clip = normalizeMusicClip(json?.clip);
  if (!clip) throw new Error('Clip invalide');
  return clip;
}

export async function deleteMusicClip(clipId: string): Promise<void> {
  await request(`/api/music-clips/${encodeURIComponent(clipId)}`, {
    method: 'DELETE',
  });
}

export async function getPostDetail(postId: string): Promise<HomePost> {
  const json = await request<any>(`/api/posts/${encodeURIComponent(postId)}`);
  const post = normalizePost(json?.post || json);
  if (!post) throw new Error('Post introuvable');
  return post;
}

export type PlaylistDetail = Playlist & {
  description?: string;
  tracksList: Track[];
  duration?: number;
};

export async function getPlaylistDetail(playlistId: string): Promise<PlaylistDetail> {
  const json = await request<any>(`/api/playlists/${encodeURIComponent(playlistId)}`);
  const raw = json?.playlist || json;
  const tracks = (Array.isArray(raw?.tracks) ? raw.tracks : [])
    .map((item: any) => normalizeTrack(item?.track || item))
    .filter((track: Track | null): track is Track => Boolean(track));
  const fallbackCovers = tracks.map((track: Track) => track.coverUrl || fallbackCover).filter(Boolean) as string[];
  const base = normalizePlaylist(raw, fallbackCovers);
  if (!base) throw new Error('Playlist introuvable');
  return {
    ...base,
    description: raw?.description || '',
    tracksList: tracks,
    duration: Number(raw?.duration || 0),
  };
}

export type MessagingUser = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  isVerified: boolean;
  lastSeen: string | null;
};

export type MessagingReactionName = 'heart' | 'fire' | 'wow' | 'support' | 'laugh';

export type MessagingAttachment = {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  previewUrl: string | null;
  mimeType: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  waveform: number[];
  position: number;
  metadata: Record<string, string | number>;
};

export type MessagingMessage = {
  id: string;
  clientId: string | null;
  sender: MessagingUser;
  type: 'text' | 'image' | 'audio' | 'video' | 'track' | 'clip' | 'post' | 'playlist' | 'deleted';
  content: string;
  mediaUrl: string | null;
  attachments: MessagingAttachment[];
  sharedEntityType: string | null;
  sharedEntityId: string | null;
  metadata: Record<string, string | number>;
  replyToId: string | null;
  replyTo: {
    id: string;
    senderId: string;
    senderName: string;
    type: string;
    content: string;
  } | null;
  roomId: string | null;
  seenBy: string[];
  reactions: Array<{ userId: string; reaction: MessagingReactionName }>;
  createdAt: string;
  editedAt: string | null;
  pinned: boolean;
  deleted: boolean;
  localState?: 'sending' | 'sent' | 'failed';
  localError?: string | null;
};

export type MessagingConversationPreferences = {
  nickname: string | null;
  themeKey: 'aura' | 'ocean' | 'coral' | 'rose' | 'graphite';
  accentColor: '#7357C6' | '#4A9EAA' | '#D96D63' | '#C85D82' | '#111111';
  backgroundKey: 'quiet' | 'aurora' | 'cover' | 'midnight';
  wallpaperUrl: string | null;
  bubbleEnabled: boolean;
};

export type MessagingRoom = {
  id: string;
  name: string;
  type: 'text' | 'voice_notes';
  position: number;
  createdBy: string | null;
  createdAt: string;
};

export type MessagingConversation = {
  id: string;
  name: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  ownerId?: string | null;
  type: 'direct' | 'group';
  participants: MessagingUser[];
  otherUser: MessagingUser | null;
  lastMessage: {
    id: string;
    content: string;
    type: string;
    mediaUrl: string | null;
    metadata: Record<string, string | number>;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
  canMessage: boolean;
  blocked: boolean;
  muted: boolean;
  archived: boolean;
  preferences: MessagingConversationPreferences;
  participantRoles?: Array<{ userId: string; role: 'owner' | 'moderator' | 'member'; nickname: string | null }>;
  rooms?: MessagingRoom[];
  activeRoomId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MessagingRequest = {
  id: string;
  direction: 'received' | 'sent';
  user: MessagingUser;
  message: string | null;
  status: string;
  createdAt: string;
};

export type MessagingContact = {
  friendshipId: string;
  user: MessagingUser;
  conversationId: string | null;
  friendsSince: string;
};

export type MessagingBlock = {
  id: string;
  user: MessagingUser;
  createdAt: string;
};

export type MessagingRelationship = {
  relationship: 'self' | 'blocked' | 'friends' | 'incoming' | 'outgoing' | 'none';
  status: string;
  conversationId?: string | null;
  requestId?: string | null;
  blockedByMe?: boolean;
  blockedMe?: boolean;
};

function normalizeMessagingUser(raw: any): MessagingUser {
  return {
    id: safeString(raw?.id || raw?._id, ''),
    name: safeString(raw?.name, raw?.username || 'Utilisateur Synaura'),
    username: safeString(raw?.username, 'utilisateur'),
    avatar: absoluteAsset(raw?.avatar || raw?.image || null),
    isVerified: Boolean(raw?.isVerified ?? raw?.is_verified),
    lastSeen: raw?.lastSeen || raw?.last_seen || null,
  };
}

function normalizeMessagingMessage(raw: any): MessagingMessage {
  const type = safeString(raw?.type || raw?.message_type, 'text') as MessagingMessage['type'];
  const metadata = readObject(raw?.metadata);
  if (typeof metadata.coverUrl === 'string') metadata.coverUrl = absoluteAsset(metadata.coverUrl) || metadata.coverUrl;
  return {
    id: safeString(raw?.id || raw?._id, ''),
    clientId: raw?.clientId || raw?.client_id || null,
    sender: normalizeMessagingUser(raw?.sender || {}),
    type,
    content: typeof raw?.content === 'string' ? raw.content : '',
    mediaUrl: absoluteAsset(raw?.mediaUrl || raw?.media_url || null),
    attachments: (Array.isArray(raw?.attachments) ? raw.attachments : []).map((attachment: any, index: number): MessagingAttachment => ({
      id: safeString(attachment?.id, `attachment-${index}`),
      type: ['image', 'video', 'audio', 'file'].includes(attachment?.type || attachment?.attachment_type)
        ? (attachment.type || attachment.attachment_type)
        : 'file',
      url: absoluteAsset(attachment?.url) || '',
      previewUrl: absoluteAsset(attachment?.previewUrl || attachment?.preview_url || null),
      mimeType: attachment?.mimeType || attachment?.mime_type || null,
      fileName: attachment?.fileName || attachment?.file_name || null,
      sizeBytes: Number.isFinite(Number(attachment?.sizeBytes ?? attachment?.size_bytes)) ? Number(attachment?.sizeBytes ?? attachment?.size_bytes) : null,
      width: Number.isFinite(Number(attachment?.width)) ? Number(attachment.width) : null,
      height: Number.isFinite(Number(attachment?.height)) ? Number(attachment.height) : null,
      durationMs: Number.isFinite(Number(attachment?.durationMs ?? attachment?.duration_ms)) ? Number(attachment?.durationMs ?? attachment?.duration_ms) : null,
      waveform: (Array.isArray(attachment?.waveform) ? attachment.waveform : []).map(Number).filter(Number.isFinite).slice(0, 160),
      position: Math.max(0, Number(attachment?.position ?? index) || 0),
      metadata: readObject(attachment?.metadata),
    })).filter((attachment: MessagingAttachment) => Boolean(attachment.url)),
    sharedEntityType: raw?.sharedEntityType || raw?.shared_entity_type || null,
    sharedEntityId: raw?.sharedEntityId || raw?.shared_entity_id || null,
    metadata,
    replyToId: raw?.replyToId || raw?.reply_to_id || null,
    replyTo: raw?.replyTo ? {
      id: safeString(raw.replyTo.id, ''),
      senderId: safeString(raw.replyTo.senderId || raw.replyTo.sender_id, ''),
      senderName: safeString(raw.replyTo.senderName || raw.replyTo.sender_name, 'Message'),
      type: safeString(raw.replyTo.type || raw.replyTo.message_type, 'text'),
      content: typeof raw.replyTo.content === 'string' ? raw.replyTo.content : '',
    } : null,
    roomId: raw?.roomId || raw?.room_id || null,
    seenBy: Array.isArray(raw?.seenBy) ? raw.seenBy.map(String) : [],
    reactions: (Array.isArray(raw?.reactions) ? raw.reactions : []).map((entry: any) => ({
      userId: safeString(entry?.userId || entry?.user_id, ''),
      reaction: safeString(entry?.reaction, 'heart') as MessagingReactionName,
    })).filter((entry: { userId: string }) => Boolean(entry.userId)),
    createdAt: raw?.createdAt || raw?.created_at || new Date().toISOString(),
    editedAt: raw?.editedAt || raw?.edited_at || null,
    pinned: Boolean(raw?.pinned),
    deleted: Boolean(raw?.deleted || raw?.deleted_at || type === 'deleted'),
    localState: raw?.localState,
    localError: raw?.localError || null,
  };
}

export async function getMessagingRealtimeConfig(): Promise<{ url: string; publishableKey: string }> {
  const payload = await request<any>('/api/messages/realtime');
  const url = safeString(payload?.url, '');
  const publishableKey = safeString(payload?.publishableKey, '');
  if (!url || !publishableKey) throw new Error('Temps reel indisponible');
  return { url, publishableKey };
}

function normalizeConversationPreferences(raw: any): MessagingConversationPreferences {
  return {
    nickname: typeof raw?.nickname === 'string' && raw.nickname.trim() ? raw.nickname.trim() : null,
    themeKey: ['aura', 'ocean', 'coral', 'rose', 'graphite'].includes(raw?.themeKey) ? raw.themeKey : 'aura',
    accentColor: ['#7357C6', '#4A9EAA', '#D96D63', '#C85D82', '#111111'].includes(raw?.accentColor) ? raw.accentColor : '#7357C6',
    backgroundKey: ['quiet', 'aurora', 'cover', 'midnight'].includes(raw?.backgroundKey) ? raw.backgroundKey : 'quiet',
    wallpaperUrl: absoluteAsset(raw?.wallpaperUrl || null),
    bubbleEnabled: Boolean(raw?.bubbleEnabled),
  };
}

function normalizeMessagingRooms(raw: any): MessagingRoom[] {
  return (Array.isArray(raw) ? raw : []).map((room: any): MessagingRoom => ({
    id: safeString(room?.id, ''),
    name: safeString(room?.name, 'salon'),
    type: room?.type === 'voice_notes' ? 'voice_notes' : 'text',
    position: Number(room?.position || 0),
    createdBy: room?.createdBy || null,
    createdAt: room?.createdAt || new Date().toISOString(),
  })).filter((room: MessagingRoom) => Boolean(room.id));
}

export async function getMessageConversations(): Promise<{ conversations: MessagingConversation[]; unread: number }> {
  const payload = await request<any>('/api/messages/conversations');
  return {
    conversations: (Array.isArray(payload?.conversations) ? payload.conversations : []).map((raw: any) => ({
      ...raw,
      id: safeString(raw?.id || raw?._id, ''),
      participants: (Array.isArray(raw?.participants) ? raw.participants : []).map(normalizeMessagingUser),
      otherUser: raw?.otherUser ? normalizeMessagingUser(raw.otherUser) : null,
      lastMessage: raw?.lastMessage ? {
        ...raw.lastMessage,
        id: safeString(raw.lastMessage.id || raw.lastMessage._id, ''),
        mediaUrl: absoluteAsset(raw.lastMessage.mediaUrl || null),
        metadata: readObject(raw.lastMessage.metadata),
      } : null,
      unreadCount: Math.max(0, Number(raw?.unreadCount || 0)),
      canMessage: Boolean(raw?.canMessage),
      blocked: Boolean(raw?.blocked),
      muted: Boolean(raw?.muted),
      archived: Boolean(raw?.archived),
      preferences: normalizeConversationPreferences(raw?.preferences),
      rooms: normalizeMessagingRooms(raw?.rooms),
      avatarUrl: absoluteAsset(raw?.avatarUrl || null),
    })).filter((conversation: MessagingConversation) => Boolean(conversation.id)),
    unread: Math.max(0, Number(payload?.unread || 0)),
  };
}

export async function getMessageRequests(): Promise<{ received: MessagingRequest[]; sent: MessagingRequest[] }> {
  const payload = await request<any>('/api/messages/requests');
  const normalize = (raw: any, direction: 'received' | 'sent'): MessagingRequest => ({
    id: safeString(raw?.id || raw?._id, ''),
    direction,
    user: normalizeMessagingUser(raw?.user || raw?.from || {}),
    message: typeof raw?.message === 'string' && raw.message.trim() ? raw.message : null,
    status: safeString(raw?.status, 'pending'),
    createdAt: raw?.createdAt || raw?.created_at || new Date().toISOString(),
  });
  return {
    received: (Array.isArray(payload?.received) ? payload.received : []).map((raw: any) => normalize(raw, 'received')),
    sent: (Array.isArray(payload?.sent) ? payload.sent : []).map((raw: any) => normalize(raw, 'sent')),
  };
}

export async function getMessageContacts(): Promise<MessagingContact[]> {
  const payload = await request<any>('/api/messages/contacts');
  return (Array.isArray(payload?.contacts) ? payload.contacts : []).map((raw: any) => ({
    friendshipId: safeString(raw?.friendshipId, ''),
    user: normalizeMessagingUser(raw?.user || {}),
    conversationId: raw?.conversationId || null,
    friendsSince: raw?.friendsSince || new Date().toISOString(),
  })).filter((contact: MessagingContact) => Boolean(contact.friendshipId && contact.user.id));
}

export async function getMessageUnreadSummary(): Promise<{ messages: number; requests: number; total: number }> {
  const payload = await request<any>('/api/messages/unread');
  return {
    messages: Math.max(0, Number(payload?.messages || 0)),
    requests: Math.max(0, Number(payload?.requests || 0)),
    total: Math.max(0, Number(payload?.total || 0)),
  };
}

export async function getMessagingRelationship(targetId: string): Promise<MessagingRelationship> {
  return request<MessagingRelationship>(`/api/messages/requests/status?targetId=${encodeURIComponent(targetId)}`);
}

export async function sendMessageRequest(targetId: string, message?: string | null): Promise<{ requestId?: string; conversationId?: string | null; alreadyConnected?: boolean; autoAccepted?: boolean; alreadySent?: boolean }> {
  return request('/api/messages/requests', {
    method: 'POST',
    body: JSON.stringify({ targetId, message: message?.trim() || null }),
  });
}

export async function mutateMessageRequest(requestId: string, action: 'accept' | 'reject' | 'cancel'): Promise<{ conversationId?: string | null }> {
  return request(`/api/messages/requests/${encodeURIComponent(requestId)}`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

export async function createDirectConversation(participantId: string): Promise<string> {
  const payload = await request<any>('/api/messages/conversations', {
    method: 'POST',
    body: JSON.stringify({ participantId }),
  });
  const id = safeString(payload?.id || payload?._id, '');
  if (!id) throw new Error('Conversation introuvable');
  return id;
}

export async function createGroupConversation(name: string, participantIds: string[], description?: string): Promise<string> {
  const payload = await request<any>('/api/messages/conversations', {
    method: 'POST',
    body: JSON.stringify({ name, participantIds, description: description?.trim() || null }),
  });
  const id = safeString(payload?.id || payload?._id, '');
  if (!id) throw new Error('Groupe introuvable');
  return id;
}

export async function getConversationMessages(conversationId: string, before?: string | null, roomId?: string | null): Promise<{ conversation: Omit<MessagingConversation, 'lastMessage' | 'unreadCount' | 'createdAt' | 'updatedAt'>; messages: MessagingMessage[]; hasMore: boolean; nextCursor: string | null }> {
  const params = new URLSearchParams({ limit: '50' });
  if (before) params.set('before', before);
  if (roomId) params.set('roomId', roomId);
  const payload = await request<any>(`/api/messages/${encodeURIComponent(conversationId)}?${params.toString()}`);
  return {
    conversation: {
      ...payload.conversation,
      id: safeString(payload?.conversation?.id, conversationId),
      participants: (Array.isArray(payload?.conversation?.participants) ? payload.conversation.participants : []).map(normalizeMessagingUser),
      otherUser: payload?.conversation?.otherUser ? normalizeMessagingUser(payload.conversation.otherUser) : null,
      canMessage: Boolean(payload?.conversation?.canMessage),
      blocked: Boolean(payload?.conversation?.blocked),
      muted: Boolean(payload?.conversation?.muted),
      archived: Boolean(payload?.conversation?.archived),
      preferences: normalizeConversationPreferences(payload?.conversation?.preferences),
      rooms: normalizeMessagingRooms(payload?.conversation?.rooms),
      activeRoomId: payload?.conversation?.activeRoomId || null,
      avatarUrl: absoluteAsset(payload?.conversation?.avatarUrl || null),
    },
    messages: (Array.isArray(payload?.messages) ? payload.messages : []).map(normalizeMessagingMessage).filter((message: MessagingMessage) => Boolean(message.id)),
    hasMore: Boolean(payload?.hasMore),
    nextCursor: payload?.nextCursor || null,
  };
}

export type SendConversationMessageInput = {
  type: MessagingMessage['type'];
  content?: string;
  mediaUrl?: string;
  sharedEntityId?: string;
  metadata?: Record<string, string | number>;
  replyToId?: string | null;
  roomId?: string | null;
  clientId?: string | null;
  attachments?: Array<{
    type: MessagingAttachment['type'];
    url: string;
    previewUrl?: string | null;
    mimeType?: string | null;
    fileName?: string | null;
    sizeBytes?: number | null;
    width?: number | null;
    height?: number | null;
    durationMs?: number | null;
    waveform?: number[];
    metadata?: Record<string, string | number>;
  }>;
};

export async function sendConversationMessage(conversationId: string, input: SendConversationMessageInput): Promise<MessagingMessage> {
  const payload = await request<any>(`/api/messages/${encodeURIComponent(conversationId)}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return normalizeMessagingMessage(payload?.message);
}

export type MessageMediaType = 'image' | 'video' | 'audio';

export type MessageMediaUpload = {
  url: string;
  publicId: string;
  duration?: number;
  bytes?: number;
};

export async function uploadMessageMedia(
  asset: UploadAsset,
  type: MessageMediaType,
  options: { onProgress?: (progress: number) => void } = {},
): Promise<MessageMediaUpload> {
  let assetSize = Number(asset.size || 0);
  if (!assetSize) {
    const fileInfo = await FileSystem.getInfoAsync(asset.uri).catch(() => null);
    assetSize = fileInfo?.exists && 'size' in fileInfo ? Number(fileInfo.size || 0) : 0;
  }
  if (assetSize > 25 * 1024 * 1024) throw new Error('La limite est de 25 Mo.');
  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `message_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const signature = await request<any>('/api/messages/upload', {
    method: 'POST',
    body: JSON.stringify({ timestamp, publicId, type }),
  });
  if (!signature?.cloudName || !signature?.apiKey || !signature?.signature) {
    throw new Error('Préparation de l’envoi impossible');
  }

  const parameters: Record<string, string> = {
    folder: String(signature.folder),
    public_id: String(signature.publicId || publicId),
    timestamp: String(signature.timestamp || timestamp),
    api_key: String(signature.apiKey),
    signature: String(signature.signature),
  };
  if (type === 'audio') parameters.format = 'mp3';

  const fallbackMime = type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : 'audio/mp4';
  const uploadTask = FileSystem.createUploadTask(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType}/upload`,
    asset.uri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: asset.type || fallbackMime,
      parameters,
    },
    ({ totalBytesExpectedToSend, totalBytesSent }) => {
      if (totalBytesExpectedToSend > 0) options.onProgress?.(Math.min(1, totalBytesSent / totalBytesExpectedToSend));
    },
  );
  const response = await uploadTask.uploadAsync();
  if (!response) throw new Error('L’envoi a été interrompu.');
  let uploaded: any = null;
  try { uploaded = JSON.parse(response.body || '{}'); } catch { /* reponse invalide */ }
  if (response.status < 200 || response.status >= 300 || !uploaded?.secure_url) {
    const message = String(uploaded?.error?.message || `Téléversement impossible (${response.status})`);
    if (/signature|timestamp/i.test(message)) throw new Error('La session d’envoi a expiré. Réessaie.');
    if (/too large|file size|maximum|entity too large|413/i.test(message)) throw new Error('La limite est de 25 Mo.');
    throw new Error(message);
  }
  options.onProgress?.(1);
  return {
    url: String(uploaded.secure_url),
    publicId: String(uploaded.public_id || parameters.public_id),
    duration: Number(uploaded.duration || 0) || undefined,
    bytes: Number(uploaded.bytes || assetSize || 0) || undefined,
  };
}

export async function uploadMessageImage(uri: string, name = `synaura-message-${Date.now()}.jpg`, mimeType = 'image/jpeg'): Promise<string> {
  const uploaded = await uploadMessageMedia({ uri, name, type: mimeType }, 'image');
  return uploaded.url;
}

export async function markConversationSeen(conversationId: string): Promise<void> {
  await request(`/api/messages/${encodeURIComponent(conversationId)}/seen`, { method: 'PUT' });
}

export async function reactToConversationMessage(conversationId: string, messageId: string, reaction: MessagingReactionName | null): Promise<void> {
  await request(`/api/messages/${encodeURIComponent(conversationId)}/${encodeURIComponent(messageId)}/reactions`, {
    method: reaction ? 'POST' : 'DELETE',
    body: reaction ? JSON.stringify({ reaction }) : undefined,
  });
}

export async function deleteConversationMessage(conversationId: string, messageId: string): Promise<void> {
  await request(`/api/messages/${encodeURIComponent(conversationId)}/${encodeURIComponent(messageId)}`, { method: 'DELETE' });
}

export async function hideConversationMessage(conversationId: string, messageId: string): Promise<void> {
  await request(`/api/messages/${encodeURIComponent(conversationId)}/${encodeURIComponent(messageId)}?scope=me`, { method: 'DELETE' });
}

export async function editConversationMessage(conversationId: string, messageId: string, content: string): Promise<{ content: string; editedAt: string }> {
  return request(`/api/messages/${encodeURIComponent(conversationId)}/${encodeURIComponent(messageId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'edit', content }),
  });
}

export async function pinConversationMessage(conversationId: string, messageId: string, pinned: boolean): Promise<void> {
  await request(`/api/messages/${encodeURIComponent(conversationId)}/${encodeURIComponent(messageId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: pinned ? 'pin' : 'unpin' }),
  });
}

export async function getConversationMessageReactions(conversationId: string, messageId: string): Promise<Array<{
  userId: string;
  reaction: MessagingReactionName;
  createdAt: string;
  user: { id: string; name: string; username: string; avatar: string | null } | null;
}>> {
  const payload = await request<any>(`/api/messages/${encodeURIComponent(conversationId)}/${encodeURIComponent(messageId)}/reactions`);
  return (Array.isArray(payload?.reactions) ? payload.reactions : []).map((entry: any) => ({
    userId: safeString(entry?.userId, ''),
    reaction: safeString(entry?.reaction, 'heart') as MessagingReactionName,
    createdAt: entry?.createdAt || new Date().toISOString(),
    user: entry?.user ? {
      id: safeString(entry.user.id, ''),
      name: safeString(entry.user.name, entry.user.username || 'Utilisateur'),
      username: safeString(entry.user.username, 'utilisateur'),
      avatar: absoluteAsset(entry.user.avatar || null),
    } : null,
  })).filter((entry: { userId: string }) => Boolean(entry.userId));
}

export async function updateConversationState(conversationId: string, action: 'archive' | 'unarchive' | 'mute' | 'unmute'): Promise<void> {
  await request(`/api/messages/${encodeURIComponent(conversationId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
}

export async function updateConversationGroup(conversationId: string, changes: { name?: string; description?: string | null; avatarUrl?: string | null }): Promise<void> {
  await request(`/api/messages/${encodeURIComponent(conversationId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'update_group', ...changes }),
  });
}

export async function updateConversationPreferences(conversationId: string, preferences: MessagingConversationPreferences): Promise<MessagingConversationPreferences> {
  const payload = await request<any>(`/api/messages/${encodeURIComponent(conversationId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'customize', preferences }),
  });
  return normalizeConversationPreferences(payload?.preferences);
}

export async function createConversationRoom(conversationId: string, name: string, type: MessagingRoom['type']): Promise<MessagingRoom> {
  const payload = await request<any>(`/api/messages/${encodeURIComponent(conversationId)}/rooms`, {
    method: 'POST',
    body: JSON.stringify({ name, type }),
  });
  const [room] = normalizeMessagingRooms(payload?.room ? [payload.room] : []);
  if (!room) throw new Error('Salon introuvable');
  return room;
}

export async function updateConversationRoom(conversationId: string, roomId: string, changes: { name?: string; type?: MessagingRoom['type'] }): Promise<MessagingRoom> {
  const payload = await request<any>(`/api/messages/${encodeURIComponent(conversationId)}/rooms/${encodeURIComponent(roomId)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
  const [room] = normalizeMessagingRooms(payload?.room ? [payload.room] : []);
  if (!room) throw new Error('Salon introuvable');
  return room;
}

export async function deleteConversationRoom(conversationId: string, roomId: string): Promise<string> {
  const payload = await request<any>(`/api/messages/${encodeURIComponent(conversationId)}/rooms/${encodeURIComponent(roomId)}`, { method: 'DELETE' });
  return safeString(payload?.replacementRoomId, '');
}

export async function removeMessageContact(targetId: string): Promise<void> {
  await request('/api/messages/contacts', { method: 'DELETE', body: JSON.stringify({ targetId }) });
}

export async function blockMessageUser(targetId: string): Promise<void> {
  await request('/api/messages/blocks', { method: 'POST', body: JSON.stringify({ targetId }) });
}

export async function getBlockedMessageUsers(): Promise<MessagingBlock[]> {
  const payload = await request<any>('/api/messages/blocks');
  return (Array.isArray(payload?.blocks) ? payload.blocks : []).map((raw: any) => ({
    id: safeString(raw?.id, ''),
    user: normalizeMessagingUser(raw?.user || {}),
    createdAt: raw?.createdAt || new Date().toISOString(),
  })).filter((block: MessagingBlock) => Boolean(block.id && block.user.id));
}

export async function unblockMessageUser(targetId: string): Promise<void> {
  await request('/api/messages/blocks', { method: 'DELETE', body: JSON.stringify({ targetId }) });
}

function normalizeNotification(raw: any): SynauraNotification | null {
  const id = Number(raw?.id);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    type: safeString(raw?.type, 'general'),
    title: safeString(raw?.title, 'Notification'),
    message: safeString(raw?.message, ''),
    category: safeString(raw?.category || raw?.data?.category, 'general'),
    isRead: Boolean(raw?.is_read),
    actionUrl: raw?.action_url || raw?.data?.action_url || null,
    createdAt: raw?.created_at || new Date().toISOString(),
  };
}

export async function getNotifications(category = 'all'): Promise<NotificationCenterData> {
  const query = category !== 'all' ? `?limit=30&category=${encodeURIComponent(category)}` : '?limit=30';
  const json = await request<any>(`/api/notifications${query}`);
  return {
    notifications: (Array.isArray(json?.notifications) ? json.notifications : [])
      .map(normalizeNotification)
      .filter((item: SynauraNotification | null): item is SynauraNotification => Boolean(item)),
    unread: Number(json?.unread || 0),
    total: Number(json?.total || 0),
  };
}

export async function getNotificationUnreadCount(): Promise<number> {
  const json = await request<any>('/api/notifications?countOnly=true');
  return Math.max(0, Number(json?.unread || 0));
}

export async function markNotificationRead(notificationId: number) {
  await request('/api/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'mark_read', notificationId }),
  });
}

export async function markAllNotificationsRead() {
  await request('/api/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'mark_all_read' }),
  });
}

export async function deleteNotification(notificationId: number) {
  await request('/api/notifications', {
    method: 'DELETE',
    body: JSON.stringify({ notificationId }),
  });
}

export async function registerNativePushToken(input: {
  token: string;
  platform: string;
  deviceName?: string | null;
  appVersion?: string | null;
}) {
  return request<{ ok: boolean; registered: boolean; database: string; transport: string }>('/api/notifications/push/native', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getNativePushRegistration() {
  return request<{ registered: boolean; devices: number; database: string; transport: string }>('/api/notifications/push/native');
}

export async function unregisterNativePushToken(token: string) {
  await request('/api/notifications/push/native', {
    method: 'DELETE',
    body: JSON.stringify({ token }),
  });
}

export async function sendNativePushTest() {
  return request<{ ok: boolean; database: string; transport: string; pushRequested: boolean }>('/api/notifications/push/native', { method: 'PATCH' });
}

function normalizeCommunityAuthor(raw: any) {
  const author = raw?.author || raw?.profile || raw?.profiles || {};
  return {
    id: String(author?.id || raw?.user_id || ''),
    name: safeString(author?.name || author?.username, 'Membre Synaura'),
    username: safeString(author?.username, ''),
    avatar: absoluteAsset(author?.avatar) || null,
  };
}

function normalizeCommunityPost(raw: any): CommunityPost | null {
  const id = raw?.id;
  if (!id) return null;
  return {
    id: String(id),
    title: safeString(raw?.title, 'Discussion'),
    content: safeString(raw?.content, ''),
    category: safeString(raw?.category, 'general'),
    createdAt: String(raw?.createdAt || raw?.created_at || new Date().toISOString()),
    likesCount: Number(raw?.likes_count ?? raw?.likesCount ?? 0),
    isLiked: Boolean(raw?.is_liked ?? raw?.isLiked),
    repliesCount: Number(raw?.replies_count ?? raw?.repliesCount ?? 0),
    author: normalizeCommunityAuthor(raw),
    track: normalizeTrack(raw?.track),
  };
}

export async function getCommunityPosts(category = 'all', page = 1, limit = 12): Promise<{ posts: CommunityPost[]; hasMore: boolean }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), sort: 'recent' });
  if (category !== 'all') params.set('category', category);
  const json = await request<any>(`/api/community/posts?${params.toString()}`);
  const posts = (Array.isArray(json?.posts) ? json.posts : [])
    .map(normalizeCommunityPost)
    .filter((post: CommunityPost | null): post is CommunityPost => Boolean(post));
  return { posts, hasMore: page < Number(json?.pagination?.totalPages || 1) };
}

export async function getDiscoverMoodTracks(moodId: string, limit = 40): Promise<{ tracks: Track[]; hasEnough: boolean }> {
  const json = await request<any>(`/api/discover/moods?mood=${encodeURIComponent(moodId)}&limit=${limit}`);
  const tracks = (Array.isArray(json?.tracks) ? json.tracks : [])
    .map(normalizeTrack)
    .filter((track: Track | null): track is Track => Boolean(track));
  return { tracks, hasEnough: Boolean(json?.hasEnough) };
}

export async function getDiscoverRadar(limit = 16): Promise<Track[]> {
  const json = await request<any>(`/api/discover/radar?limit=${limit}`);
  return (Array.isArray(json?.tracks) ? json.tracks : [])
    .map(normalizeTrack)
    .filter((track: Track | null): track is Track => Boolean(track));
}

export async function getCommunityClubs(): Promise<CommunityClubAggregate[]> {
  const json = await request<any>('/api/community/clubs');
  return (Array.isArray(json?.clubs) ? json.clubs : []).map((club: any) => ({
    slug: String(club?.slug || ''),
    postsCount: Number(club?.postsCount || 0),
    latestPost: club?.latestPost ? normalizeCommunityPost(club.latestPost) : null,
  }));
}

export async function getCommunityStats(): Promise<CommunityStats> {
  const json = await request<any>('/api/community/stats');
  return {
    resolvedQuestions: Number(json?.resolvedQuestions || 0),
    forumPosts: Number(json?.forumPosts || 0),
    activeMembers: Number(json?.activeMembers || 0),
    implementedSuggestions: Number(json?.implementedSuggestions || 0),
  };
}

export async function getCommunityFaq(limit = 20): Promise<CommunityFaq[]> {
  const json = await request<any>(`/api/community/faq?limit=${limit}&sort=popular`);
  return (Array.isArray(json?.faqs) ? json.faqs : []).map((raw: any) => ({
    id: String(raw?.id || raw?.question || Math.random()),
    question: safeString(raw?.question, 'Question'),
    answer: safeString(raw?.answer, ''),
    category: safeString(raw?.category, 'general'),
    helpfulCount: Number(raw?.helpful_count || 0),
  }));
}

export async function createCommunityPost(input: { title: string; content: string; category: string; trackId?: string | null }): Promise<CommunityPost | null> {
  const json = await request<any>('/api/community/posts', {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      content: input.content,
      category: input.category,
      track_id: input.trackId || undefined,
    }),
  });
  return normalizeCommunityPost(json?.post || json);
}

export async function likeCommunityPost(postId: string, like: boolean) {
  await request(`/api/community/posts/likes${like ? '' : `?post_id=${encodeURIComponent(postId)}`}`, {
    method: like ? 'POST' : 'DELETE',
    body: like ? JSON.stringify({ post_id: postId }) : undefined,
  });
}

export async function getCommunityReplies(postId: string): Promise<CommunityReply[]> {
  const json = await request<any>(`/api/community/posts/replies?post_id=${encodeURIComponent(postId)}`);
  return (Array.isArray(json) ? json : []).map((raw: any) => ({
    id: String(raw?.id || Math.random()),
    content: safeString(raw?.content, ''),
    createdAt: String(raw?.created_at || new Date().toISOString()),
    author: normalizeCommunityAuthor(raw),
  }));
}

export async function createCommunityReply(postId: string, content: string): Promise<CommunityReply> {
  const raw = await request<any>('/api/community/posts/replies', {
    method: 'POST',
    body: JSON.stringify({ post_id: postId, content }),
  });
  return {
    id: String(raw?.id || Math.random()),
    content: safeString(raw?.content, content),
    createdAt: String(raw?.created_at || new Date().toISOString()),
    author: normalizeCommunityAuthor(raw),
  };
}

export type FeedLoadMoreResult = {
  items: Array<{ kind: 'track'; track: Track; strategy: 'reco' | 'trending' } | { kind: 'post'; post: HomePost }>;
  nextCursor: string | null;
  hasMore: boolean;
};

export async function loadUnifiedFeed(
  cursor?: string | null,
  exclusions: { trackIds?: string[]; postIds?: string[] } = {},
): Promise<FeedLoadMoreResult> {
  const params = new URLSearchParams({ limit: '22', session: await getRecommendationSessionId() });
  if (cursor) params.set('cursor', cursor);
  const excludedTracks = new Set([...(await getRecommendationSeenIds('track')), ...(exclusions.trackIds || [])]);
  const excludedPosts = new Set([...(await getRecommendationSeenIds('post')), ...(exclusions.postIds || [])]);
  if (excludedTracks.size) params.set('excludeTracks', Array.from(excludedTracks).slice(-120).join(','));
  if (excludedPosts.size) params.set('excludePosts', Array.from(excludedPosts).slice(-120).join(','));
  const json = await request<any>(`/api/recommendations/feed?${params.toString()}`);
  const items = Array.isArray(json?.items)
    ? json.items.flatMap((item: any) => {
        const type = item?.type || item?.kind;
        if (type === 'post' || item?.post) {
          const post = normalizePost(item?.post || item?.data || item);
          return post ? [{ kind: 'post' as const, post }] : [];
        }
        const track = normalizeTrack(item?.track || item?.data || item);
        return track ? [{ kind: 'track' as const, track, strategy: 'reco' as const }] : [];
      })
    : collectTracks(json).map((track) => ({ kind: 'track' as const, track, strategy: 'reco' as const }));
  return {
    items,
    nextCursor: json?.nextCursor == null ? null : String(json.nextCursor),
    hasMore: Boolean(json?.hasMore),
  };
}

export async function loadMixedPosts(cursor?: string | null, excludeIds: string[] = []): Promise<FeedLoadMoreResult> {
  const sessionId = await getRecommendationSessionId();
  const params = new URLSearchParams({ limit: '6', session: sessionId });
  if (cursor) params.set('cursor', cursor);
  const excluded = new Set([...(await getRecommendationSeenIds('post')), ...excludeIds]);
  if (excluded.size) params.set('exclude', Array.from(excluded).slice(-120).join(','));
  const json = await request<any>(`/api/recommendations/mixed?${params.toString()}`);
  const posts = (Array.isArray(json?.posts) ? json.posts : []).map(normalizePost).filter((post: HomePost | null): post is HomePost => Boolean(post));
  return {
    items: posts.map((post: HomePost) => ({ kind: 'post' as const, post })),
    nextCursor: json?.nextCursor == null ? null : String(json.nextCursor),
    hasMore: Boolean(json?.hasMore),
  };
}

export async function loadRankingTracks(strategy: 'reco' | 'trending', cursor = 0): Promise<FeedLoadMoreResult> {
  const initial = cursor === 0;
  const limit = initial ? 12 : 18;
  const sessionId = await getRecommendationSessionId();
  const json = await request<any>(`/api/ranking/feed?limit=${limit}&ai=1&strategy=${strategy}&cursor=${cursor}&session=${encodeURIComponent(sessionId)}`);
  return {
    items: collectTracks(json).map((track) => ({ kind: 'track' as const, track, strategy })),
    nextCursor: json?.nextCursor == null ? String(cursor + limit) : String(json.nextCursor),
    hasMore: Boolean(json?.hasMore),
  };
}

export async function sendRecommendationImpressions(impressions: Array<{ id: string; kind: 'track' | 'post' | 'clip'; position?: number; score?: number; reasons?: string[] }>) {
  if (!impressions.length) return;
  await rememberRecommendationImpressions(impressions);
  const sessionId = await getRecommendationSessionId();
  await optionalRequest('/api/recommendations/impressions', {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      impressions: impressions.map((item) => ({
        contentId: item.id,
        contentType: item.kind,
        rank: item.position,
        score: item.score,
        reasons: item.reasons,
        source: 'mobile-scroll',
      })),
    }),
  });
}

export async function toggleTrackLike(trackId: string) {
  const path = `/api/tracks/${encodeURIComponent(trackId)}/like`;
  const current = await request<any>(path);
  return request<any>(path, { method: current?.liked || current?.isLiked ? 'DELETE' : 'POST' });
}

export async function togglePostLike(postId: string) {
  return request<any>(`/api/posts/${encodeURIComponent(postId)}/like`, { method: 'POST' });
}

export type TrackEventTelemetry = {
  positionSeconds?: number;
  durationSeconds?: number;
  progressPct?: number;
  source?: string;
};

export async function recordTrackEvent(
  trackId: string,
  eventType: string,
  extra?: Record<string, unknown>,
  telemetry: TrackEventTelemetry = {},
) {
  if (!trackId || trackId.startsWith('radio-')) return;
  const sessionId = await getRecommendationSessionId();
  const positionMs = Number.isFinite(telemetry.positionSeconds) ? Math.max(0, Math.round(Number(telemetry.positionSeconds) * 1000)) : null;
  const durationMs = Number.isFinite(telemetry.durationSeconds) ? Math.max(0, Math.round(Number(telemetry.durationSeconds) * 1000)) : null;
  const derivedProgress = durationMs && positionMs != null ? (positionMs / durationMs) * 100 : null;
  await optionalRequest(`/api/tracks/${encodeURIComponent(trackId)}/events`, {
    method: 'POST',
    body: JSON.stringify({
      event_type: eventType,
      position_ms: positionMs,
      duration_ms: durationMs,
      progress_pct: Number.isFinite(telemetry.progressPct) ? telemetry.progressPct : derivedProgress,
      source: telemetry.source || 'mobile-player',
      platform: 'mobile',
      session_id: sessionId,
      is_ai_track: trackId.startsWith('ai-'),
      extra,
    }),
  });
}

export type RecommendationTasteAction = 'more' | 'less' | 'hide_artist' | 'show_artist';

export async function setRecommendationTaste(input: {
  action: RecommendationTasteAction;
  trackId?: string;
  artistId?: string;
  source?: string;
}) {
  return request<{ ok: boolean; action: RecommendationTasteAction; hiddenArtistIds: string[] }>('/api/recommendations/taste', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function clearHiddenRecommendationArtists() {
  return request<{ ok: boolean; hiddenArtistIds: string[]; hiddenArtistsCount: number }>('/api/recommendations/taste', {
    method: 'DELETE',
  });
}

export type ClipFunnelStep = 'clip_use_sound_started' | 'clip_composer_opened' | 'clip_draft_created' | 'clip_published';

/**
 * Mesure produit du funnel "Utiliser ce son" -> Clip publié. Réutilise l'event_type
 * 'remix' déjà accepté par /api/tracks/[id]/events (track_event_type est un enum
 * Postgres : ajouter de vraies valeurs demanderait une migration) et encode l'étape
 * dans extra.kind. Pas de compteur public, best-effort.
 */
export async function recordClipFunnelEvent(trackId: string, kind: ClipFunnelStep) {
  await recordTrackEvent(trackId, 'remix', { kind });
}

function normalizeComment(raw: any): HomeComment | null {
  const id = String(raw?.id || raw?._id || '');
  if (!id) return null;
  const user = raw?.user || raw?.profiles || raw?.author || {};
  const name = safeString(user?.name || user?.username, 'Membre');
  return {
    id,
    content: safeString(raw?.content || raw?.text, ''),
    createdAt: raw?.createdAt || raw?.created_at || new Date().toISOString(),
    timestampSeconds: raw?.timestampSeconds != null || raw?.timestamp_seconds != null
      ? Number(raw?.timestampSeconds ?? raw?.timestamp_seconds)
      : null,
    likesCount: Number(raw?.likesCount ?? raw?.likes_count ?? 0),
    isLiked: Boolean(raw?.isLiked ?? raw?.is_liked),
    user: {
      id: String(user?.id || user?._id || raw?.user_id || ''),
      username: safeString(user?.username, 'synaura'),
      name,
      avatar: user?.avatar || null,
    },
    replies: (Array.isArray(raw?.replies) ? raw.replies : []).map(normalizeComment).filter((comment: HomeComment | null): comment is HomeComment => Boolean(comment)),
  };
}

export type CommentsPage = {
  comments: HomeComment[];
  nextCursor: string | number | null;
  hasMore: boolean;
};

export async function getCommentsPage(
  kind: 'track' | 'post' | 'clip',
  id: string,
  cursor: string | number | null = null,
): Promise<CommentsPage> {
  const path = kind === 'track'
    ? `/api/tracks/${encodeURIComponent(id)}/comments?limit=8&offset=${typeof cursor === 'number' ? cursor : 0}`
    : kind === 'clip'
      ? `/api/music-clips/${encodeURIComponent(id)}/comments?limit=8&offset=${typeof cursor === 'number' ? cursor : 0}`
      : `/api/posts/${encodeURIComponent(id)}/comments?limit=8${typeof cursor === 'string' ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
  const json = await request<any>(path);
  const raw = Array.isArray(json?.comments) ? json.comments : Array.isArray(json) ? json : [];
  return {
    comments: raw.map(normalizeComment).filter((comment: HomeComment | null): comment is HomeComment => Boolean(comment)),
    nextCursor: kind === 'track' || kind === 'clip'
      ? (typeof json?.nextOffset === 'number' ? json.nextOffset : null)
      : (typeof json?.nextCursor === 'string' ? json.nextCursor : null),
    hasMore: kind === 'track' || kind === 'clip' ? Boolean(json?.hasMore) : Boolean(json?.nextCursor),
  };
}

export async function getComments(kind: 'track' | 'post' | 'clip', id: string): Promise<HomeComment[]> {
  return (await getCommentsPage(kind, id)).comments;
}

export async function getTimestampedComments(trackId: string): Promise<HomeComment[]> {
  if (!trackId) return [];
  const json = await optionalRequest<any>(`/api/tracks/${encodeURIComponent(trackId)}/comments?timestampedOnly=1`);
  const raw = Array.isArray(json?.comments) ? json.comments : [];
  return raw
    .map(normalizeComment)
    .filter((comment: HomeComment | null): comment is HomeComment => comment !== null && comment.timestampSeconds != null);
}

export async function createComment(
  kind: 'track' | 'post' | 'clip',
  id: string,
  content: string,
  options?: { timestampSeconds?: number | null },
): Promise<HomeComment> {
  const path = kind === 'track'
    ? `/api/tracks/${encodeURIComponent(id)}/comments`
    : kind === 'clip'
      ? `/api/music-clips/${encodeURIComponent(id)}/comments`
      : `/api/posts/${encodeURIComponent(id)}/comments`;
  const timestampSeconds = kind === 'track' && options?.timestampSeconds != null && Number.isFinite(Number(options.timestampSeconds))
    ? Math.max(0, Number(options.timestampSeconds))
    : undefined;
  const json = await request<any>(path, {
    method: 'POST',
    body: JSON.stringify({ content, ...(timestampSeconds !== undefined ? { timestampSeconds } : {}) }),
  });
  const comment = normalizeComment(json?.comment || json);
  if (!comment) throw new Error('Commentaire invalide');
  return comment;
}

function sanitizePeaks(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const n = Number(entry);
      return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
    })
    .filter((entry) => Number.isFinite(entry));
}

export async function getTrackWaveform(trackId: string): Promise<TrackWaveformData | null> {
  if (!trackId) return null;
  const json = await optionalRequest<any>(`/api/tracks/${encodeURIComponent(trackId)}/waveform`);
  const peaks = sanitizePeaks(json?.peaks);
  const duration = Number(json?.duration || 0);
  if (!peaks.length || !Number.isFinite(duration) || duration <= 0) return null;
  return { duration, peaks };
}

const MOMENT_REACTION_TYPES: MomentReactionType[] = ['drop', 'emotional', 'mindblown', 'favorite', 'vocals', 'production'];

function normalizeMomentReaction(raw: any): MomentReaction | null {
  const id = String(raw?.id || raw?._id || '');
  const reactionType = raw?.reactionType || raw?.reaction_type;
  const timestampSeconds = Number(raw?.timestampSeconds ?? raw?.timestamp_seconds);
  if (!id || !MOMENT_REACTION_TYPES.includes(reactionType) || !Number.isFinite(timestampSeconds) || timestampSeconds < 0) return null;
  return { id, reactionType, timestampSeconds };
}

export async function getMomentReactions(trackId: string): Promise<MomentReaction[]> {
  if (!trackId) return [];
  const json = await optionalRequest<any>(`/api/tracks/${encodeURIComponent(trackId)}/reactions`);
  const raw = Array.isArray(json?.reactions) ? json.reactions : [];
  return raw.map(normalizeMomentReaction).filter((reaction: MomentReaction | null): reaction is MomentReaction => Boolean(reaction));
}

export async function addMomentReaction(trackId: string, reactionType: MomentReactionType, timestampSeconds: number): Promise<MomentReaction> {
  const json = await request<any>(`/api/tracks/${encodeURIComponent(trackId)}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ reactionType, timestampSeconds: Math.max(0, Math.round(timestampSeconds || 0)) }),
  });
  const reaction = normalizeMomentReaction(json?.reaction || json);
  if (!reaction) throw new Error('Reaction invalide');
  return reaction;
}

export async function deleteComment(kind: 'track' | 'post' | 'clip', targetId: string, commentId: string) {
  const path = kind === 'track'
    ? `/api/tracks/${encodeURIComponent(targetId)}/comments/${encodeURIComponent(commentId)}`
    : kind === 'clip'
      ? `/api/music-clips/${encodeURIComponent(targetId)}/comments/${encodeURIComponent(commentId)}`
      : `/api/posts/${encodeURIComponent(targetId)}/comments?comment_id=${encodeURIComponent(commentId)}`;
  await request(path, { method: 'DELETE' });
}

export async function createPost(input: { content: string; imageUrl?: string | null; trackId?: string | null; type?: 'text' | 'photo' | 'track_share' }): Promise<HomePost> {
  const json = await request<any>('/api/posts', {
    method: 'POST',
    body: JSON.stringify({
      content: input.content,
      image_url: input.imageUrl || undefined,
      track_id: input.trackId || undefined,
      type: input.type || (input.imageUrl ? 'photo' : input.trackId ? 'track_share' : 'text'),
    }),
  });
  const post = normalizePost(json?.post || json);
  if (!post) throw new Error('Post invalide');
  return post;
}

export async function uploadPostImage(uri: string, name = 'synaura-mobile.jpg'): Promise<string> {
  const form = new FormData();
  form.append('file', {
    uri,
    name,
    type: 'image/jpeg',
  } as any);
  const json = await request<any>('/api/posts/upload-image', {
    method: 'POST',
    body: form,
  });
  const url = json?.url || json?.imageUrl || json?.secure_url;
  if (!url) throw new Error('Upload image impossible');
  return absoluteAsset(url) || url;
}

export type UploadAsset = {
  uri: string;
  name: string;
  type: string;
  size?: number | null;
};

export type CloudinaryResourceType = 'image' | 'video';

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
  duration?: number;
  bytes?: number;
};

export type CreateUploadedTrackInput = {
  audioUrl: string;
  audioPublicId: string;
  audioBytes?: number;
  coverUrl?: string | null;
  coverPublicId?: string | null;
  coverBytes?: number;
  coverVideoUrl?: string | null;
  coverVideoPublicId?: string | null;
  coverVideoPosterUrl?: string | null;
  duration?: number;
  trackData: {
    title: string;
    description?: string;
    lyrics?: string | null;
    genre?: string[];
    isExplicit?: boolean;
    isPublic?: boolean;
    album?: string | null;
    copyright?: {
      owner: string;
      year: number;
      rights: string;
    };
  };
  mood?: string | null;
  language?: string | null;
  tags?: string[];
  credits?: Record<string, string>;
  featuring?: Array<{ id?: string; name: string; isExternal?: boolean }>;
  releaseType?: 'single' | 'ep' | 'album';
  scheduledAt?: string | null;
  visibility?: 'public' | 'private' | 'unlisted';
  remixPermissions?: RemixPermissions;
};

function cloudinaryPosterUrl(videoUrl?: string | null) {
  if (!videoUrl) return null;
  const withTransform = videoUrl.replace('/video/upload/', '/video/upload/so_0,f_jpg/');
  return withTransform.replace(/\.(mp4|webm|mov|m4v)(\?.*)?$/i, '.jpg$2');
}

export function isUploadCoverVideo(asset: UploadAsset | null | undefined) {
  const type = asset?.type || '';
  const name = asset?.name || asset?.uri || '';
  return type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(name);
}

export function getCoverVideoPosterUrl(videoUrl?: string | null) {
  return cloudinaryPosterUrl(videoUrl);
}

export async function uploadToCloudinaryMobile(
  asset: UploadAsset,
  resourceType: CloudinaryResourceType,
  folder?: string,
  options: { onProgress?: (progress: number) => void } = {},
): Promise<CloudinaryUploadResult> {
  const timestamp = Math.round(Date.now() / 1000);
  const stem = resourceType === 'video' ? 'track' : 'cover';
  const publicId = `${stem}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const uploadFolder = folder || (resourceType === 'video' ? 'ximam/audio' : 'ximam/images');

  const signature = await request<any>('/api/upload/signature', {
    method: 'POST',
    body: JSON.stringify({
      timestamp,
      publicId,
      resourceType,
      folder: uploadFolder,
    }),
  });

  const cloudName = signature?.cloudName;
  const apiKey = signature?.apiKey;
  if (!cloudName || !apiKey || !signature?.signature) throw new Error('Signature Cloudinary invalide');
  const signedTimestamp = Number(signature.timestamp || timestamp);
  const signedPublicId = String(signature.publicId || publicId);
  const signedFolder = String(signature.folder || uploadFolder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const uploadTask = FileSystem.createUploadTask(
    uploadUrl,
    asset.uri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: asset.type || (resourceType === 'image' ? 'image/jpeg' : 'video/mp4'),
      parameters: {
        folder: signedFolder,
        public_id: signedPublicId,
        timestamp: String(signedTimestamp),
        api_key: String(apiKey),
        signature: String(signature.signature),
      },
    },
    ({ totalBytesExpectedToSend, totalBytesSent }) => {
      if (totalBytesExpectedToSend > 0) {
        options.onProgress?.(Math.min(1, totalBytesSent / totalBytesExpectedToSend));
      }
    },
  );
  const result = await uploadTask.uploadAsync();
  if (!result) throw new Error('L’envoi a été interrompu. Réessaie depuis le Flow.');
  let json: any = null;
  try { json = JSON.parse(result.body || '{}'); } catch { /* reponse invalide */ }
  if (result.status < 200 || result.status >= 300 || !json?.secure_url) {
    const message = String(json?.error?.message || `Envoi vidéo impossible (${result.status})`);
    if (/signature|timestamp/i.test(message)) throw new Error('La session d’envoi a expiré. Réessaie depuis le Flow.');
    if (/too large|file size|maximum|entity too large|413/i.test(message)) {
      throw new Error('Cette vidéo dépasse 95 Mo. Choisis une version plus légère.');
    }
    throw new Error(message);
  }
  options.onProgress?.(1);

  return {
    secureUrl: String(json.secure_url),
    publicId: String(json.public_id || signedPublicId),
    duration: Number(json.duration || 0) || undefined,
    bytes: Number(json.bytes || asset.size || 0) || undefined,
  };
}

export async function createUploadedTrack(input: CreateUploadedTrackInput): Promise<{ success: boolean; trackId: string; message?: string }> {
  const json = await request<any>('/api/upload', {
    method: 'POST',
    body: JSON.stringify({
      audioUrl: input.audioUrl,
      audioPublicId: input.audioPublicId,
      audioBytes: input.audioBytes || 0,
      coverUrl: input.coverUrl || null,
      coverPublicId: input.coverPublicId || null,
      coverBytes: input.coverBytes || 0,
      coverVideoUrl: input.coverVideoUrl || null,
      coverVideoPublicId: input.coverVideoPublicId || null,
      coverVideoPosterUrl: input.coverVideoPosterUrl || null,
      duration: input.duration || 0,
      trackData: input.trackData,
      mood: input.mood || null,
      language: input.language || null,
      tags: input.tags || [],
      credits: input.credits || {},
      featuring: input.featuring || [],
      release_type: input.releaseType || 'single',
      scheduled_at: input.scheduledAt || null,
      visibility: input.visibility || 'public',
      remixPermissions: input.remixPermissions || DEFAULT_REMIX_PERMISSIONS,
    }),
  });
  return {
    success: Boolean(json?.success),
    trackId: String(json?.trackId || ''),
    message: json?.message,
  };
}

export async function createAlbumPlaylistMobile(input: {
  name: string;
  description?: string;
  isPublic: boolean;
  coverUrl?: string | null;
}): Promise<{ id: string }> {
  const json = await request<any>('/api/playlists', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      title: input.name,
      description: input.description || '',
      isPublic: input.isPublic,
      is_public: input.isPublic,
      coverUrl: input.coverUrl || null,
      cover_url: input.coverUrl || null,
      is_album: true,
    }),
  });
  const id = String(json?._id || json?.id || json?.playlist?._id || json?.playlist?.id || '');
  if (!id) throw new Error('Album créé mais identifiant introuvable');
  return { id };
}

export async function addTrackToPlaylistMobile(playlistId: string, trackId: string) {
  await request<any>(`/api/playlists/${encodeURIComponent(playlistId)}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ trackId }),
  });
}

export async function cleanupUploadMobile(input: { audioPublicId?: string; coverPublicId?: string; coverVideoPublicId?: string }) {
  await optionalRequest<any>('/api/upload/cleanup', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export type MobileProfileTrack = Track & {
  id: string;
  rawId?: string;
  description?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
  createdAt?: string;
};

export type MobileProfilePlaylist = {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string | null;
  tracksCount: number;
  isAlbum?: boolean;
  createdAt?: string;
};

export type MobileProfile = {
  id: string;
  username: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
  banner?: string | null;
  bio?: string;
  location?: string;
  website?: string;
  isArtist: boolean;
  artistName?: string;
  genre: string[];
  isVerified: boolean;
  role?: string;
  totalPlays: number;
  totalLikes: number;
  tracksCount: number;
  playlistsCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing?: boolean;
  socialLinks: Record<string, string>;
  badges: string[];
  featuredTrackId?: string | null;
  pinnedPostId?: string | null;
  tracks: MobileProfileTrack[];
  playlists: MobileProfilePlaylist[];
  createdAt?: string;
  updatedAt?: string;
};

export type NotificationPrefs = {
  push_enabled: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;
  new_follower: boolean;
  new_like: boolean;
  like_milestone: boolean;
  new_comment: boolean;
  new_message: boolean;
  new_track_followed: boolean;
  view_milestone: boolean;
  boost_reminder: boolean;
  admin_broadcast: boolean;
  weekly_recap: boolean;
};

export type ReferralData = {
  referralCode?: string;
  referralLink?: string;
  totalReferrals: number;
  maxReferrals: number;
  remainingSlots: number;
  totalCreditsEarned: number;
  referrals: Array<{ id: string; username: string; name?: string; avatar?: string | null; creditsGranted?: number; date?: string }>;
};

export type SubscriptionUsage = {
  plan: string;
  tracks: { used: number; limit: number; percentage: number };
  playlists: { used: number; limit: number; percentage: number };
};

export type SubscriptionPlan = {
  id: 'free' | 'starter' | 'pro';
  name: string;
  label: string;
  description: string;
  price: number;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  interval: string;
  badge?: string | null;
  features: string[];
  creditsMonthly: number;
  popular?: boolean;
  recommended?: boolean;
  stripePriceIds: { month: string; year: string };
  limits: {
    maxTracks: number;
    maxPlaylists: number;
    audioQuality: string;
    fileMaxMb: number;
    ads: boolean;
    analytics: boolean;
    collaborations: boolean;
    apiAccess: boolean;
    support: string;
  };
};

export type CurrentSubscription = {
  hasSubscription: boolean;
  subscription: { id: string; name: string; price: number; currency: string; interval: string } | null;
  userSubscription: { status: string; currentPeriodEnd?: string | null } | null;
};

export type UpdateProfileInput = {
  name?: string;
  bio?: string;
  location?: string;
  website?: string;
  isArtist?: boolean;
  artistName?: string;
  genre?: string[];
};

function normalizeProfileTrack(raw: any, profile?: any): MobileProfileTrack | null {
  const track = normalizeTrack({
    ...raw,
    artist: raw?.artist || {
      name: profile?.artistName || profile?.artist_name || profile?.name || profile?.username,
      username: profile?.username,
      avatar: profile?.avatar,
    },
  });
  if (!track) return null;
  return {
    ...track,
    id: track._id,
    rawId: raw?.raw_id || raw?.id,
    description: raw?.description || '',
    isPublic: raw?.isPublic ?? raw?.is_public,
    isFeatured: raw?.isFeatured ?? raw?.is_featured,
    createdAt: raw?.createdAt || raw?.created_at,
  };
}

function normalizeMobileProfile(raw: any): MobileProfile {
  const genre = Array.isArray(raw?.genre) ? raw.genre.filter(Boolean).map((item: unknown) => String(item)) : [];
  const baseProfile = {
    artistName: raw?.artistName || raw?.artist_name,
    name: raw?.name,
    username: raw?.username,
    avatar: absoluteAsset(raw?.avatar),
  };
  const preferences = raw?.preferences && typeof raw.preferences === 'object' ? raw.preferences : {};
  const socialLinks = preferences?.socialLinks && typeof preferences.socialLinks === 'object' ? preferences.socialLinks : {};
  const badges = Array.isArray(preferences?.profileBadges)
    ? preferences.profileBadges.filter(Boolean).map((item: unknown) => String(item))
    : [];
  return {
    id: String(raw?.id || raw?._id || ''),
    username: safeString(raw?.username, 'user'),
    name: safeString(raw?.name || raw?.artistName || raw?.artist_name || raw?.username, 'Compte Synaura'),
    email: raw?.email || null,
    avatar: absoluteAsset(raw?.avatar),
    banner: absoluteAsset(raw?.banner),
    bio: raw?.bio || '',
    location: raw?.location || '',
    website: raw?.website || '',
    isArtist: Boolean(raw?.isArtist || raw?.is_artist),
    artistName: raw?.artistName || raw?.artist_name || '',
    genre,
    isVerified: Boolean(raw?.isVerified || raw?.is_verified),
    role: raw?.role || 'user',
    totalPlays: Number(raw?.totalPlays || raw?.total_plays || 0),
    totalLikes: Number(raw?.totalLikes || raw?.total_likes || 0),
    tracksCount: Number(raw?.tracksCount || raw?.tracks_count || countArrayOrNumber(raw?.tracks)),
    playlistsCount: Number(raw?.playlistsCount || raw?.playlists_count || countArrayOrNumber(raw?.playlists)),
    followerCount: Number(raw?.followerCount || raw?.follower_count || 0),
    followingCount: Number(raw?.followingCount || raw?.following_count || 0),
    isFollowing: Boolean(raw?.isFollowing || raw?.is_following),
    socialLinks,
    badges,
    featuredTrackId: preferences?.featuredTrackId ? String(preferences.featuredTrackId) : null,
    pinnedPostId: preferences?.pinnedPostId ? String(preferences.pinnedPostId) : null,
    tracks: (Array.isArray(raw?.tracks) ? raw.tracks : [])
      .map((item: any) => normalizeProfileTrack(item, baseProfile))
      .filter((item: MobileProfileTrack | null): item is MobileProfileTrack => Boolean(item)),
    playlists: (Array.isArray(raw?.playlists) ? raw.playlists : []).map((playlist: any) => ({
      id: String(playlist?._id || playlist?.id || ''),
      title: safeString(playlist?.name || playlist?.title, 'Playlist'),
      description: playlist?.description || '',
      coverUrl: absoluteAsset(playlist?.coverUrl || playlist?.cover_url) || null,
      tracksCount: Array.isArray(playlist?.tracks) ? playlist.tracks.length : Number(playlist?.trackCount || playlist?.tracks_count || 0),
      isAlbum: Boolean(playlist?.is_album || playlist?.isAlbum),
      createdAt: playlist?.createdAt || playlist?.created_at,
    })).filter((playlist: MobileProfilePlaylist) => Boolean(playlist.id)),
    createdAt: raw?.createdAt || raw?.created_at,
    updatedAt: raw?.updatedAt || raw?.updated_at,
  };
}

export async function getPublicProfile(username: string): Promise<MobileProfile> {
  const json = await request<any>(`/api/users/${encodeURIComponent(username)}`);
  return normalizeMobileProfile(json);
}

export async function getUserPostsPage(creatorId: string, limit = 20, cursor?: string | null): Promise<{ posts: HomePost[]; nextCursor: string | null; hasMore: boolean }> {
  if (!creatorId) return { posts: [], nextCursor: null, hasMore: false };
  const params = new URLSearchParams({ creator_id: creatorId, limit: String(Math.min(30, Math.max(1, limit))) });
  if (cursor) params.set('cursor', cursor);
  const json = await request<any>(`/api/posts?${params.toString()}`);
  const posts = (Array.isArray(json?.posts) ? json.posts : [])
    .map(normalizePost)
    .filter((post: HomePost | null): post is HomePost => Boolean(post));
  return {
    posts,
    nextCursor: json?.nextCursor ? String(json.nextCursor) : null,
    hasMore: Boolean(json?.hasMore),
  };
}

export async function getUserPosts(creatorId: string, limit = 30): Promise<HomePost[]> {
  return (await getUserPostsPage(creatorId, limit)).posts;
}

export async function getTrackPosts(trackId: string, limit = 12): Promise<HomePost[]> {
  if (!trackId) return [];
  const json = await request<any>(`/api/posts?track_id=${encodeURIComponent(trackId)}&limit=${Math.min(30, Math.max(1, limit))}`);
  return (Array.isArray(json?.posts) ? json.posts : [])
    .map(normalizePost)
    .filter((post: HomePost | null): post is HomePost => Boolean(post));
}

export async function getMyProfile(username?: string | null): Promise<MobileProfile> {
  if (!username) {
    const me = await request<any>('/api/auth/mobile/me');
    const user = me?.user || me?.data?.user;
    if (!user?.username) throw new Error('Profil mobile introuvable');
    return getPublicProfile(user.username);
  }
  return getPublicProfile(username);
}

export async function updateProfile(username: string, input: UpdateProfileInput): Promise<MobileProfile> {
  const json = await request<any>(`/api/users/${encodeURIComponent(username)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return normalizeMobileProfile({ ...json, username });
}

export async function getUserPreferences(): Promise<Record<string, any>> {
  const json = await request<any>('/api/user/preferences');
  return json?.preferences && typeof json.preferences === 'object' ? json.preferences : {};
}

export async function updateUserPreferences(input: Record<string, unknown>): Promise<Record<string, any>> {
  const json = await request<any>('/api/user/preferences', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return json?.preferences && typeof json.preferences === 'object' ? json.preferences : {};
}

export async function pinPost(postId: string): Promise<void> {
  await updateUserPreferences({ pinnedPostId: postId });
}

export async function unpinPost(): Promise<void> {
  await updateUserPreferences({ pinnedPostId: null });
}

export async function setFeaturedTrack(trackId: string): Promise<void> {
  await updateUserPreferences({ featuredTrackId: trackId });
}

export async function removeFeaturedTrack(): Promise<void> {
  await updateUserPreferences({ featuredTrackId: null });
}

export async function uploadProfileImage(username: string, type: 'avatar' | 'banner', asset: UploadAsset): Promise<string> {
  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `${username}_${type}_${timestamp}`;
  const signature = await request<any>(`/api/users/${encodeURIComponent(username)}/upload-image`, {
    method: 'POST',
    body: JSON.stringify({ timestamp, publicId, type }),
  });
  const cloudName = signature?.cloudName;
  const apiKey = signature?.apiKey;
  if (!cloudName || !apiKey || !signature?.signature) throw new Error('Signature image invalide');

  const form = new FormData();
  form.append('file', { uri: asset.uri, name: asset.name, type: asset.type || 'image/jpeg' } as any);
  form.append('timestamp', String(timestamp));
  form.append('public_id', publicId);
  form.append('folder', `ximam/profiles/${username}`);
  form.append('resource_type', 'image');
  form.append('api_key', apiKey);
  form.append('signature', signature.signature);

  const upload = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
  const uploadJson = await upload.json().catch(() => null);
  if (!upload.ok || !uploadJson?.secure_url) throw new Error(uploadJson?.error?.message || 'Upload image profil impossible');

  const saved = await request<any>(`/api/users/${encodeURIComponent(username)}/save-image`, {
    method: 'POST',
    body: JSON.stringify({ imageUrl: uploadJson.secure_url, type, publicId }),
  });
  return absoluteAsset(saved?.imageUrl || uploadJson.secure_url) || uploadJson.secure_url;
}

export async function followUser(username: string): Promise<{ isFollowing: boolean; action: 'followed' | 'unfollowed' }> {
  const json = await request<any>(`/api/users/${encodeURIComponent(username)}/follow`, { method: 'POST' });
  const action = json?.action === 'unfollowed' ? 'unfollowed' : 'followed';
  return { action, isFollowing: action === 'followed' };
}

export async function getFollowingCreators(): Promise<Creator[]> {
  const json = await request<any>('/api/users/following?limit=60');
  return (Array.isArray(json?.following) ? json.following : [])
    .map(normalizeCreator)
    .filter((creator: Creator | null): creator is Creator => Boolean(creator));
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const json = await request<any>('/api/notifications/preferences');
  return json?.preferences || json;
}

export async function updateNotificationPrefs(input: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
  const json = await request<any>('/api/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return json?.preferences || json;
}

export async function getReferralData(): Promise<ReferralData | null> {
  return optionalRequest<ReferralData>('/api/referral');
}

export async function getSubscriptionUsage(): Promise<SubscriptionUsage | null> {
  return optionalRequest<SubscriptionUsage>('/api/subscriptions/usage');
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const json = await request<any>('/api/subscriptions');
  return (Array.isArray(json?.plans) ? json.plans : []).map((raw: any) => {
    const id = ['starter', 'pro'].includes(String(raw?.id)) ? String(raw.id) as 'starter' | 'pro' : 'free';
    const monthly = Number(raw?.priceMonthly ?? raw?.price ?? 0) || 0;
    const yearlyFallback = id === 'starter' ? 47.88 : id === 'pro' ? 143.88 : 0;
    return {
      ...raw,
      id,
      name: String(raw?.name || id),
      label: String(raw?.label || raw?.name || id).replace(/^./, (char) => char.toUpperCase()),
      description: String(raw?.description || ''),
      price: monthly,
      priceMonthly: monthly,
      priceYearly: Number(raw?.priceYearly ?? yearlyFallback) || 0,
      currency: String(raw?.currency || 'EUR'),
      interval: String(raw?.interval || 'mois'),
      features: Array.isArray(raw?.features) ? raw.features.map(String) : [],
      creditsMonthly: Number(raw?.creditsMonthly || 0),
      stripePriceIds: {
        month: String(raw?.stripePriceIds?.month || ''),
        year: String(raw?.stripePriceIds?.year || ''),
      },
      limits: {
        maxTracks: Number(raw?.limits?.maxTracks ?? 0),
        maxPlaylists: Number(raw?.limits?.maxPlaylists ?? 0),
        audioQuality: String(raw?.limits?.audioQuality || '128kbps'),
        fileMaxMb: Number(raw?.limits?.fileMaxMb ?? 80),
        ads: Boolean(raw?.limits?.ads),
        analytics: Boolean(raw?.limits?.analytics),
        collaborations: Boolean(raw?.limits?.collaborations),
        apiAccess: Boolean(raw?.limits?.apiAccess),
        support: String(raw?.limits?.support || 'Communautaire'),
      },
    } satisfies SubscriptionPlan;
  });
}

export async function getCurrentSubscription(): Promise<CurrentSubscription | null> {
  return optionalRequest<CurrentSubscription>('/api/subscriptions/my-subscription');
}

export async function refreshSubscription(): Promise<void> {
  await request('/api/subscriptions/refresh', { method: 'POST' });
}

export async function createSubscriptionCheckout(priceId: string): Promise<{ checkoutUrl: string; sessionId: string }> {
  return request('/api/billing/create-subscription', {
    method: 'POST',
    body: JSON.stringify({ priceId }),
  });
}

export async function cancelSubscription(): Promise<void> {
  await request('/api/billing/cancel-subscription', { method: 'POST' });
}

export async function downgradeSubscriptionToFree(): Promise<void> {
  await request('/api/billing/downgrade-to-free', { method: 'POST' });
}

export async function deleteAccount(): Promise<void> {
  await request<any>('/api/account/delete', { method: 'POST' });
}

export async function updateTrackMetadata(trackId: string, input: {
  title?: string;
  description?: string;
  genre?: string[];
  tags?: string[];
  isPublic?: boolean;
  coverUrl?: string;
  coverPublicId?: string;
  remixPermissions?: RemixPermissions;
}): Promise<MobileProfileTrack | null> {
  const json = await request<any>(`/api/tracks/${encodeURIComponent(trackId)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return normalizeProfileTrack(json);
}

export async function deleteTrack(trackId: string): Promise<void> {
  await request<any>(`/api/tracks/${encodeURIComponent(trackId)}`, { method: 'DELETE' });
}

/* ─────────────────────────────────────────────
   TikTok Player feed (parite avec le web)
   ───────────────────────────────────────────── */

function injectBoosted(regular: Track[], boosted: Track[], interval: number): Track[] {
  const ids = new Set(regular.map((t) => t._id));
  const available = boosted.filter((t) => !ids.has(t._id));
  if (!available.length) return regular;
  const result: Track[] = [];
  let bIdx = 0;
  for (let i = 0; i < regular.length; i++) {
    result.push(regular[i]);
    if ((i + 1) % interval === 0 && bIdx < available.length) {
      result.push(available[bIdx++]);
    }
  }
  return result;
}

export async function getBoostedTracks(limit = 10): Promise<Track[]> {
  const json = await optionalRequest<any>(`/api/tracks/boosted?limit=${limit}`);
  if (!json) return [];
  const list = (Array.isArray(json?.tracks) ? json.tracks : [])
    .map(normalizeTrack)
    .filter((t: Track | null): t is Track => Boolean(t));
  return list.map((track: Track) => ({ ...track, isBoosted: true }));
}

/** Artistes populaires réels (utilisés pour les cartes "mise en avant" du Scroll). */
export async function getPopularArtists(limit = 20): Promise<any[]> {
  const json = await optionalRequest<any>(`/api/users/popular?limit=${limit}`);
  return Array.isArray(json?.users) ? json.users : [];
}

/** Collections éditoriales réellement publiées (utilisées pour les cartes "collection" du Scroll). */
export async function getEditorialCollections(): Promise<any[]> {
  const json = await optionalRequest<any>('/api/editorial-collections/featured');
  return Array.isArray(json?.collections) ? json.collections : [];
}

export async function fetchRankingFeedChunk(
  strategy: FeedStrategy,
  cursor = 0,
  seedGenre: string | null = null,
  options: { excludeIds?: string[]; limit?: number } = {},
): Promise<RankingFeedChunk> {
  const initial = cursor === 0;
  const params = new URLSearchParams({ limit: String(options.limit || (initial ? 12 : 24)), ai: '1', cursor: String(Math.max(0, cursor)) });
  params.set('session', await getRecommendationSessionId());
  const excluded = new Set([...(await getRecommendationSeenIds('track')), ...(options.excludeIds || [])]);
  if (excluded.size) params.set('exclude', Array.from(excluded).slice(-120).join(','));
  if (strategy === 'trending') {
    params.set('strategy', 'trending');
  } else if (strategy === 'boost') {
    params.set('strategy', 'boosted');
  } else {
    params.set('strategy', 'reco');
    if (seedGenre) params.set('seedGenre', seedGenre);
  }

  const feedRes = await optionalRequest<any>(`/api/ranking/feed?${params.toString()}`);

  const feedTracks = (Array.isArray(feedRes?.tracks) ? feedRes.tracks : [])
    .map(normalizeTrack)
    .filter((t: Track | null): t is Track => Boolean(t));

  const cursorVal = typeof feedRes?.nextCursor === 'number' ? feedRes.nextCursor : cursor + feedTracks.length;
  return {
    tracks: uniqueTracks(feedTracks),
    nextCursor: cursorVal,
    hasMore: Boolean(feedRes?.hasMore),
  };
}

export async function getCommentsCount(trackIds: string[]): Promise<Record<string, number>> {
  const usable = trackIds.filter((id) => id && !id.startsWith('radio-') && !id.startsWith('ai-'));
  if (!usable.length) return {};
  const json = await optionalRequest<any>('/api/tracks/comments-count', {
    method: 'POST',
    body: JSON.stringify({ trackIds: usable }),
  });
  return json?.counts && typeof json.counts === 'object' ? (json.counts as Record<string, number>) : {};
}

export async function getTrackLikeStatus(trackId: string): Promise<{ liked: boolean; likesCount: number } | null> {
  const json = await optionalRequest<any>(`/api/tracks/${encodeURIComponent(trackId)}/like`);
  if (!json) return null;
  return {
    liked: Boolean(json?.liked || json?.isLiked),
    likesCount: Number(json?.likesCount ?? json?.likes_count ?? 0),
  };
}

export async function setTrackLike(trackId: string, like: boolean): Promise<{ liked: boolean; likesCount: number } | null> {
  const sessionId = await getRecommendationSessionId();
  const json = await optionalRequest<any>(`/api/tracks/${encodeURIComponent(trackId)}/like`, {
    method: like ? 'POST' : 'DELETE',
    headers: { 'X-Synaura-Session': sessionId },
  });
  if (!json) return null;
  return {
    liked: Boolean(json?.liked ?? like),
    likesCount: Number(json?.likesCount ?? json?.likes_count ?? 0),
  };
}

export async function toggleArtistFollow(username: string): Promise<{ following: boolean } | null> {
  if (!username) return null;
  const json = await optionalRequest<any>(`/api/users/${encodeURIComponent(username)}/follow`, {
    method: 'POST',
  });
  if (!json) return null;
  return {
    following: Boolean(
      json?.following ??
      json?.isFollowing ??
      (json?.action === 'followed'),
    ),
  };
}

export async function getArtistFollowState(username: string): Promise<boolean> {
  if (!username) return false;
  const json = await optionalRequest<any>(`/api/users/${encodeURIComponent(username)}/follow`);
  return Boolean(json?.isFollowing ?? json?.following);
}

export async function shareTrackToFeed(trackId: string, content?: string): Promise<HomePost | null> {
  if (!trackId) return null;
  const json = await optionalRequest<any>('/api/posts', {
    method: 'POST',
    body: JSON.stringify({
      type: 'track_share',
      track_id: trackId,
      content: content?.trim() || undefined,
    }),
  });
  return json ? normalizePost(json?.post || json) : null;
}

export function buildShareUrls(track: Track | null): { trackUrl: string; shareText: string } {
  if (!track) return { trackUrl: '', shareText: '' };
  const trackUrl = `${API_BASE_URL}/track/${track._id}`;
  const artist = track.artist?.name || track.artist?.username || 'Synaura';
  return {
    trackUrl,
    shareText: `Ecoute ${track.title} de ${artist} sur Synaura\n${trackUrl}`,
  };
}

export type ShareCardFormatId = 'story' | 'square' | 'banner';

export const SHARE_CARD_FORMATS: Array<{ id: ShareCardFormatId; label: string; ratioLabel: string; width: number; height: number }> = [
  { id: 'story', label: 'Story', ratioLabel: '9:16', width: 1080, height: 1920 },
  { id: 'square', label: 'Carre', ratioLabel: '1:1', width: 1080, height: 1080 },
  { id: 'banner', label: 'Banniere', ratioLabel: '16:9', width: 1600, height: 900 },
];

function sanitizeShareCardText(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 112);
}

export function buildShareCardImageUrl(track: Track | null, format: ShareCardFormatId = 'square', text = ''): string {
  if (!track?._id) return '';
  const params = new URLSearchParams({ format });
  const cleanText = sanitizeShareCardText(text);
  if (cleanText) params.set('text', cleanText);
  return `${API_BASE_URL}/api/share-card/${encodeURIComponent(track._id)}?${params.toString()}`;
}

export type AIStudioTrack = {
  id: string;
  suno_id?: string;
  title: string;
  audio_url: string;
  stream_audio_url?: string;
  image_url?: string;
  cover_video_url?: string;
  cover_video_poster_url?: string;
  music_video_url?: string;
  music_video_poster_url?: string;
  music_video_task_id?: string;
  source_links?: string | Record<string, unknown>;
  library_folder?: string;
  duration: number;
  prompt?: string;
  lyrics?: string;
  style?: string;
  tags?: string[];
  model_name?: string;
  created_at?: string;
  is_favorite?: boolean;
  is_public?: boolean;
  is_liked?: boolean;
  generation_id?: string;
  generation?: Partial<AIStudioGeneration>;
  allow_clips?: boolean;
  allow_audio_remix?: boolean;
  allow_ai_variation?: boolean;
  remix_approval_required?: boolean;
  remix_visibility?: 'everyone' | 'followers' | 'disabled';
};

export type AIStudioGeneration = {
  id: string;
  task_id: string;
  prompt: string;
  model: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  is_favorite?: boolean;
  is_public?: boolean;
  is_trashed?: boolean;
  metadata?: { title?: string; style?: string; instrumental?: boolean; [key: string]: unknown };
  tracks?: AIStudioTrack[];
};

export type AIStudioQuota = {
  plan_type: string;
  monthly_limit: number;
  used_this_month: number;
  remaining: number;
  reset_date?: string;
  aiGenerationEnabled?: boolean;
  monthlyCredits?: number;
  creditBalance?: number;
  availableModels?: string[];
};

export type StartAIGenerationInput = {
  customMode: boolean;
  instrumental: boolean;
  model: string;
  title?: string;
  style?: string;
  prompt: string;
  negativeTags?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  durationHint?: string;
  remixSource?: {
    sourceTrackId: string;
    sourceTrackType: 'track' | 'ai_track';
  };
  remixType?: string;
  remixPrompt?: string;
  remixPromptVisibility?: 'private' | 'public';
  challengeId?: string;
};

export type RemixSourceResponse = {
  source: {
    sourceTrackId: string;
    sourceTrackType: 'track' | 'ai_track';
    title: string;
    artist: string;
    artistUsername: string;
    coverUrl: string | null;
    trackUrl: string;
    remixApprovalRequired: boolean;
    canRemixAiVariation: boolean;
    prefill?: {
      genre?: string[];
      mood?: string | null;
      bpm?: number | null;
      tags?: string[];
      description?: string | null;
      prompt?: string | null;
    };
  };
};

export type AIStatusTrack = {
  id: string;
  title: string;
  audio?: string;
  stream?: string;
  image?: string;
  duration?: number;
  raw?: Record<string, unknown>;
};

function parseAIStudioSourceLinks(value: unknown): Record<string, any> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeAIStudioTrack(raw: any): AIStudioTrack | null {
  const id = String(raw?.id || raw?.suno_id || raw?.audioId || raw?.trackId || '');
  if (!id) return null;
  const sourceLinks = parseAIStudioSourceLinks(raw?.source_links || raw?.sourceLinks);
  const mediaCreatedAt = sourceLinks.provider_urls_refreshed_at || sourceLinks.media_cached_at || raw?.media_fetched_at || raw?.created_at || raw?.createdAt;
  const imageCandidate = firstPlayableMobileAIMedia([
    sourceLinks.cached_image_url,
    sourceLinks.image_url,
    sourceLinks.cover,
    raw?.image_url,
    raw?.imageUrl,
    raw?.image,
    sourceLinks.provider_image_url,
    raw?.music_video_poster_url,
    sourceLinks.music_video_poster_url,
    raw?.cover_video_poster_url,
    sourceLinks.cover_video_poster_url,
  ], mediaCreatedAt);
  return {
    ...raw,
    id,
    suno_id: raw?.suno_id || raw?.sunoId || raw?.audioId,
    title: safeString(raw?.title, 'Création Synaura'),
    audio_url: String(raw?.audio_url || raw?.audioUrl || raw?.audio || ''),
    stream_audio_url: raw?.stream_audio_url || raw?.streamAudioUrl || raw?.stream || undefined,
    image_url: absoluteAsset(typeof imageCandidate === 'string' ? imageCandidate : undefined) || undefined,
    cover_video_url: raw?.cover_video_url || sourceLinks.cover_video_url || undefined,
    cover_video_poster_url: raw?.cover_video_poster_url || sourceLinks.cover_video_poster_url || undefined,
    music_video_url: raw?.music_video_url || sourceLinks.music_video_url || undefined,
    music_video_poster_url: raw?.music_video_poster_url || sourceLinks.music_video_poster_url || undefined,
    music_video_task_id: raw?.music_video_task_id || sourceLinks.music_video_task_id || undefined,
    source_links: raw?.source_links || raw?.sourceLinks || sourceLinks,
    library_folder: String(sourceLinks.library_folder || raw?.library_folder || '').trim() || undefined,
    duration: Number(raw?.duration || 0),
    prompt: raw?.prompt || undefined,
    lyrics: raw?.lyrics || undefined,
    style: raw?.style || undefined,
    tags: Array.isArray(raw?.tags) ? raw.tags.map(String) : typeof raw?.tags === 'string' ? raw.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
    model_name: raw?.model_name || raw?.modelName || undefined,
    created_at: raw?.created_at || raw?.createdAt || raw?.createTime || undefined,
    is_favorite: Boolean(raw?.is_favorite || raw?.isFavorite || raw?.is_liked),
    is_liked: Boolean(raw?.is_liked || raw?.isLiked || raw?.is_favorite),
    is_public: Boolean(raw?.is_public || raw?.isPublic),
    generation_id: raw?.generation_id || raw?.generationId || raw?.generation?.id,
    generation: raw?.generation,
  };
}

function normalizeAIStudioGeneration(raw: any): AIStudioGeneration | null {
  const id = String(raw?.id || raw?.task_id || raw?.taskId || '');
  if (!id) return null;
  const tracks = (Array.isArray(raw?.tracks) ? raw.tracks : [])
    .map(normalizeAIStudioTrack)
    .filter((track: AIStudioTrack | null): track is AIStudioTrack => Boolean(track));
  return {
    ...raw,
    id,
    task_id: String(raw?.task_id || raw?.taskId || id),
    prompt: String(raw?.prompt || raw?.description || ''),
    model: String(raw?.model || raw?.model_name || raw?.modelName || 'V4_5'),
    status: String(raw?.status || 'pending').toLowerCase() as AIStudioGeneration['status'],
    created_at: String(raw?.created_at || raw?.createdAt || new Date().toISOString()),
    is_favorite: Boolean(raw?.is_favorite || raw?.isFavorite),
    is_public: Boolean(raw?.is_public || raw?.isPublic),
    is_trashed: Boolean(raw?.is_trashed || raw?.isTrashed),
    metadata: {
      ...(raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : {}),
      ...(raw?.title ? { title: raw.title } : {}),
      ...(raw?.style ? { style: raw.style } : {}),
    },
    tracks,
  };
}

export async function getAIStudioLibrary(search = ''): Promise<AIStudioGeneration[]> {
  const query = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
  const trackQuery = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  const fetchTracks = async () => {
    try {
      return await request<any>(`/api/ai/library/tracks${trackQuery}`);
    } catch {
      return request<any>('/api/ai/library/tracks', {
        method: 'POST',
        body: JSON.stringify({ accessToken: authTokenProvider?.() || undefined, search: search.trim(), limit: 100, offset: 0 }),
      });
    }
  };
  const [libraryResult, generationsResult, tracksResult] = await Promise.allSettled([
    request<any>(`/api/ai/library?limit=100&offset=0${query}`),
    request<any>('/api/ai/generations'),
    fetchTracks(),
  ]);

  const byId = new Map<string, AIStudioGeneration>();
  const addGeneration = (raw: any) => {
    const generation = normalizeAIStudioGeneration(raw);
    if (!generation) return;
    const key = generation.id || generation.task_id;
    const previous = byId.get(key);
    byId.set(key, {
      ...previous,
      ...generation,
      tracks: uniqueById([...(previous?.tracks || []), ...(generation.tracks || [])]),
    });
  };

  if (libraryResult.status === 'fulfilled') {
    (Array.isArray(libraryResult.value?.generations) ? libraryResult.value.generations : []).forEach(addGeneration);
  }
  if (generationsResult.status === 'fulfilled') {
    (Array.isArray(generationsResult.value?.generations) ? generationsResult.value.generations : []).forEach(addGeneration);
  }
  if (tracksResult.status === 'fulfilled') {
    for (const rawTrack of Array.isArray(tracksResult.value?.tracks) ? tracksResult.value.tracks : []) {
      const track = normalizeAIStudioTrack(rawTrack);
      if (!track) continue;
      const rawGeneration = rawTrack?.generation || {};
      const generationId = String(track.generation_id || rawGeneration?.id || rawGeneration?.task_id || rawGeneration?.taskId || `track-${track.id}`);
      const previous = byId.get(generationId);
      const base = previous || normalizeAIStudioGeneration({ ...rawGeneration, id: generationId, tracks: [] });
      if (!base) continue;
      byId.set(generationId, { ...base, tracks: uniqueById([...(base.tracks || []), track]) });
    }
  }

  const results = Array.from(byId.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  if (!results.length && [libraryResult, generationsResult, tracksResult].every((result) => result.status === 'rejected')) {
    const rejected = [libraryResult, generationsResult, tracksResult].find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;
    if (rejected) throw rejected.reason;
  }
  return results;
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const map = new Map<string, T>();
  items.forEach((item) => map.set(item.id, { ...(map.get(item.id) || {}), ...item }));
  return Array.from(map.values());
}

export async function getAIStudioCredits(): Promise<number> {
  let json;
  try {
    json = await request<any>('/api/ai/credits');
  } catch {
    json = await request<any>('/api/ai/credits', {
      method: 'POST',
      body: JSON.stringify({ accessToken: authTokenProvider?.() || undefined }),
    });
  }
  return Number(json?.balance || 0);
}

export async function getAIStudioQuota(): Promise<AIStudioQuota | null> {
  return optionalRequest<AIStudioQuota>('/api/ai/quota');
}

export async function startAIGeneration(input: StartAIGenerationInput): Promise<{ taskId: string; model: string; requestedModel?: string; modelAdjusted?: boolean; credits?: { balance?: number } }> {
  return request('/api/suno/generate', { method: 'POST', body: JSON.stringify(input) });
}

export async function getRemixSource(sourceTrackId: string, sourceTrackType?: 'track' | 'ai_track'): Promise<RemixSourceResponse['source']> {
  const params = new URLSearchParams({ sourceTrackId });
  if (sourceTrackType) params.set('sourceTrackType', sourceTrackType);
  const json = await request<RemixSourceResponse>(`/api/remixes/source?${params.toString()}`);
  return json.source;
}

export async function startAIRemix(input: StartAIGenerationInput & { uploadUrl: string; sourceDurationSec?: number }): Promise<{ taskId: string; model: string; requestedModel?: string; modelAdjusted?: boolean; credits?: { balance?: number } }> {
  return request('/api/suno/upload-cover', { method: 'POST', body: JSON.stringify(input) });
}

export async function getAIGenerationStatus(taskId: string): Promise<{ taskId: string; status: string; tracks: AIStatusTrack[] }> {
  const json = await request<any>(`/api/suno/status?taskId=${encodeURIComponent(taskId)}`);
  return {
    taskId,
    status: String(json?.status || 'pending'),
    tracks: Array.isArray(json?.tracks) ? json.tracks : [],
  };
}

export async function saveAIGenerationTracks(taskId: string, tracks: AIStatusTrack[]): Promise<void> {
  await request('/api/suno/save-tracks', {
    method: 'POST',
    body: JSON.stringify({ taskId, tracks, status: 'completed' }),
  });
}

export async function getAIStudioLibraryTracks(search = ''): Promise<AIStudioTrack[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  let json;
  try {
    json = await request<any>(`/api/ai/library/tracks${query}`);
  } catch {
    json = await request<any>('/api/ai/library/tracks', {
      method: 'POST',
      body: JSON.stringify({ accessToken: authTokenProvider?.() || undefined, search: search.trim(), limit: 100, offset: 0 }),
    });
  }
  return (Array.isArray(json?.tracks) ? json.tracks : [])
    .map(normalizeAIStudioTrack)
    .filter((track: AIStudioTrack | null): track is AIStudioTrack => Boolean(track));
}

export async function setAIGenerationTrashed(generationId: string, isTrashed: boolean): Promise<boolean> {
  const json = await request<any>(`/api/ai/generations/${encodeURIComponent(generationId)}/trash`, {
    method: 'POST',
    body: JSON.stringify({ is_trashed: isTrashed }),
  });
  return Boolean(json?.is_trashed);
}

export async function setAITrackFavorite(trackId: string, isFavorite: boolean): Promise<boolean> {
  const json = await request<any>(`/api/ai/tracks/${encodeURIComponent(trackId)}/favorite`, {
    method: 'POST',
    body: JSON.stringify({ is_favorite: isFavorite }),
  });
  return Boolean(json?.is_favorite);
}

export async function setAITrackPublic(
  trackId: string,
  isPublic: boolean,
  remixPermissions?: RemixPermissions,
): Promise<{ isPublic: boolean; remixStatus: 'draft' | 'pending_approval' | 'published' | null }> {
  const json = await request<any>(`/api/ai/tracks/${encodeURIComponent(trackId)}/visibility`, {
    method: 'PATCH',
    body: JSON.stringify({ isPublic, remixPermissions: remixPermissions || DEFAULT_REMIX_PERMISSIONS }),
  });
  return { isPublic: Boolean(json?.isPublic), remixStatus: json?.remixStatus || null };
}

export async function setAITrackFolder(trackId: string, libraryFolder: string): Promise<string | null> {
  const json = await request<any>(`/api/ai/tracks/${encodeURIComponent(trackId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ libraryFolder }),
  });
  return typeof json?.libraryFolder === 'string' && json.libraryFolder.trim() ? json.libraryFolder.trim() : null;
}

export async function repairAIStudioMedia(limit = 80): Promise<{ scannedGenerations: number; updatedTracks: number; errors?: string[] }> {
  return request('/api/suno/repair-tracks', {
    method: 'POST',
    body: JSON.stringify({ limit }),
  });
}

export type AITimestampedLyrics = {
  alignedWords: Array<{ word?: string; startS?: number; endS?: number; start?: number; end?: number; [key: string]: unknown }>;
  waveformData: number[];
  hootCer: number | null;
  isStreamed: boolean;
};

export async function getTimestampedAILyrics(taskId: string, audioId: string): Promise<AITimestampedLyrics> {
  return request('/api/suno/timestamped-lyrics', {
    method: 'POST',
    body: JSON.stringify({ taskId, audioId }),
  });
}

export async function generateAIMusicVideo(trackId: string, taskId: string, audioId: string): Promise<{ success: boolean; taskId?: string; credits?: { balance?: number } }> {
  return request('/api/suno/generate-music-video', {
    method: 'POST',
    body: JSON.stringify({ trackId, taskId, audioId }),
  });
}

export type CreditPackId = 'petit' | 'moyen' | 'populaire' | 'best_value';

export async function createCreditsCheckout(packId: CreditPackId): Promise<{ checkoutUrl: string; sessionId: string }> {
  const accessToken = authTokenProvider?.() || undefined;
  return request('/api/billing/credits/checkout', {
    method: 'POST',
    body: JSON.stringify({ packId, accessToken, mobile: true }),
  });
}

export async function generateAILyrics(prompt: string): Promise<{ taskId?: string; status: string; best?: string | null; variants?: Array<{ text: string; title?: string }> }> {
  return request('/api/suno/generate-lyrics', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}

function normalizeCityTrack<T extends Record<string, any>>(raw: T): T & Track {
  const normalized = normalizeTrack(raw);
  return { ...raw, ...(normalized || raw) } as T & Track;
}

export async function getSynauraCity(): Promise<SynauraCityData> {
  const city = await request<any>('/api/city');
  const pulse = (Array.isArray(city?.pulse) ? city.pulse : []).map(normalizeCityTrack);
  const radar = (Array.isArray(city?.radar) ? city.radar : []).map(normalizeCityTrack);
  const premieres = (Array.isArray(city?.premieres) ? city.premieres : []).map(normalizeCityTrack);
  return {
    ...city,
    pulse,
    radar,
    premieres,
    showcase: (Array.isArray(city?.showcase) ? city.showcase : []).map((item: any) => ({ ...item, track: normalizeCityTrack(item.track) })),
    spotlightArtists: (Array.isArray(city?.spotlightArtists) ? city.spotlightArtists : []).map((artist: any) => ({
      ...artist,
      featuredTrack: artist?.featuredTrack ? normalizeCityTrack(artist.featuredTrack) : null,
    })),
    events: (Array.isArray(city?.events) ? city.events : []).map((event: any) => ({
      ...event,
      tracks: (Array.isArray(event?.tracks) ? event.tracks : []).map(normalizeCityTrack),
      participants: (Array.isArray(event?.participants) ? event.participants : []).map((participant: any) => ({
        ...participant,
        track: participant?.track ? normalizeCityTrack(participant.track) : null,
      })),
      userParticipation: event?.userParticipation
        ? { ...event.userParticipation, track: event.userParticipation.track ? normalizeCityTrack(event.userParticipation.track) : null }
        : null,
      winners: (Array.isArray(event?.winners) ? event.winners : []).map((winner: any) => ({
        ...winner,
        track: winner?.track ? normalizeCityTrack(winner.track) : null,
      })),
    })),
    voteSessions: (Array.isArray(city?.voteSessions) ? city.voteSessions : []).map((event: any) => ({
      ...event,
      tracks: (Array.isArray(event?.tracks) ? event.tracks : []).map(normalizeCityTrack),
      participants: (Array.isArray(event?.participants) ? event.participants : []).map((participant: any) => ({
        ...participant,
        track: participant?.track ? normalizeCityTrack(participant.track) : null,
      })),
    })),
    currentVoteSession: city?.currentVoteSession ? {
      ...city.currentVoteSession,
      tracks: (Array.isArray(city.currentVoteSession?.tracks) ? city.currentVoteSession.tracks : []).map(normalizeCityTrack),
      participants: (Array.isArray(city.currentVoteSession?.participants) ? city.currentVoteSession.participants : []).map((participant: any) => ({
        ...participant,
        track: participant?.track ? normalizeCityTrack(participant.track) : null,
      })),
    } : null,
    nextVoteSession: city?.nextVoteSession ? {
      ...city.nextVoteSession,
      tracks: (Array.isArray(city.nextVoteSession?.tracks) ? city.nextVoteSession.tracks : []).map(normalizeCityTrack),
      participants: (Array.isArray(city.nextVoteSession?.participants) ? city.nextVoteSession.participants : []).map((participant: any) => ({
        ...participant,
        track: participant?.track ? normalizeCityTrack(participant.track) : null,
      })),
    } : null,
    hallOfFame: (Array.isArray(city?.hallOfFame) ? city.hallOfFame : []).map((award: any) => ({
      ...award,
      track: award?.track ? normalizeCityTrack(award.track) : null,
      artist: award?.artist
        ? { ...award.artist, featuredTrack: award.artist.featuredTrack ? normalizeCityTrack(award.artist.featuredTrack) : null }
        : null,
    })),
    creatorCard: city?.creatorCard
      ? { ...city.creatorCard, featuredTrack: city.creatorCard.featuredTrack ? normalizeCityTrack(city.creatorCard.featuredTrack) : null }
      : null,
  } as SynauraCityData;
}

export async function voteSynauraCityBattle(battleId: string, trackId: string): Promise<void> {
  await request('/api/city/vote', {
    method: 'POST',
    body: JSON.stringify({ battleId, trackId }),
  });
}

export async function getCityEvent(eventId: string): Promise<CityEventDetail> {
  return request<CityEventDetail>(`/api/city/events/${encodeURIComponent(eventId)}`);
}

export async function participateCityEvent(eventId: string, trackId: string): Promise<void> {
  await request(`/api/city/events/${encodeURIComponent(eventId)}/participate`, {
    method: 'POST',
    body: JSON.stringify({ trackId }),
  });
}

export type CityRewardClaimResult = {
  success: true;
  message: string;
  boost: {
    trackId: string;
    multiplier: number;
    expiresAt: string;
    source: 'city_winner';
  };
};

export async function claimCityEventReward(eventId: string): Promise<CityRewardClaimResult> {
  return request<CityRewardClaimResult>(`/api/city/events/${encodeURIComponent(eventId)}/claim`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getMusicChallenges(status?: MusicChallengeStatus): Promise<MusicChallenge[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const payload = await request<{ challenges?: MusicChallenge[] }>(`/api/challenges${query}`);
  return Array.isArray(payload?.challenges) ? payload.challenges : [];
}

export async function getMusicChallenge(challengeId: string): Promise<MusicChallengeDetail> {
  const payload = await request<{ challenge: MusicChallengeDetail }>(`/api/challenges/${encodeURIComponent(challengeId)}`);
  return payload.challenge;
}

export async function participateInChallenge(
  challengeId: string,
  input: { contentType: 'clip' | 'variation' | 'track'; contentId: string },
): Promise<void> {
  await request(`/api/challenges/${encodeURIComponent(challengeId)}/participate`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export type MyTrackSummary = {
  id: string;
  title: string;
  coverUrl: string | null;
  coverVideoPosterUrl: string | null;
  createdAt: string | null;
};

export async function getMyTracks(): Promise<MyTrackSummary[]> {
  const payload = await request<{ tracks?: any[] }>('/api/users/tracks');
  return (Array.isArray(payload?.tracks) ? payload.tracks : []).map((track) => ({
    id: String(track.id),
    title: String(track.title || 'Sans titre'),
    coverUrl: track.coverUrl || null,
    coverVideoPosterUrl: track.coverVideoPosterUrl || null,
    createdAt: track.createdAt || null,
  }));
}
