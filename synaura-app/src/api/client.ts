import Constants from 'expo-constants';
import type {
  Creator,
  FeedResponse,
  FeedStrategy,
  HomeComment,
  HomeData,
  HomePost,
  LibraryStats,
  NotificationCenterData,
  Playlist,
  RadioItem,
  RadioMeta,
  RadioStation,
  RankingFeedChunk,
  SearchResults,
  SynauraNotification,
  Track,
} from './types';

const fallbackBaseUrl = 'https://xima-m-music-platform.vercel.app';
const fallbackCover = 'https://xima-m-music-platform.vercel.app/default-cover.svg';
const radioMixxCover = 'https://xima-m-music-platform.vercel.app/mixxparty1.png';
const radioXimamCover = 'https://xima-m-music-platform.vercel.app/ximam-radio-x.svg';
const tints = ['#8B5CF6', '#38BDF8', '#FB7185', '#F59E0B', '#14B8A6', '#EF4444'];
let authTokenProvider: (() => string | null) | null = null;

export const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  fallbackBaseUrl;

export function setAuthTokenProvider(provider: () => string | null) {
  authTokenProvider = provider;
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

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = authTokenProvider?.();
  return {
    Accept: 'application/json',
    'Cache-Control': 'no-store',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    },
    audioUrl: String(audioUrl),
    coverUrl: absoluteAsset(raw?.coverUrl || raw?.cover_url || raw?.imageUrl || raw?.image_url) || fallbackCover,
    coverVideoUrl: absoluteAsset(raw?.coverVideoUrl || raw?.cover_video_url || raw?.video_url) || null,
    coverVideoPosterUrl: absoluteAsset(raw?.coverVideoPosterUrl || raw?.cover_video_poster_url) || null,
    musicVideoUrl: absoluteAsset(raw?.musicVideoUrl || raw?.music_video_url) || null,
    musicVideoPosterUrl: absoluteAsset(raw?.musicVideoPosterUrl || raw?.music_video_poster_url) || null,
    lyrics: typeof raw?.lyrics === 'string' && raw.lyrics.trim() ? String(raw.lyrics) : null,
    duration: Number(raw?.duration || 0),
    likes: Array.isArray(raw?.likes) ? raw.likes : [],
    comments: Array.isArray(raw?.comments) ? raw.comments : [],
    likesCount: Number(raw?.likes_count ?? raw?.likesCount ?? countArrayOrNumber(raw?.likes)),
    commentsCount: Number(raw?.comments_count ?? raw?.commentsCount ?? countArrayOrNumber(raw?.comments)),
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: authHeaders({
      ...(!isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || json?.message || `Erreur API ${res.status}`);
  return json;
}

async function optionalRequest<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return await request<T>(path, init);
  } catch {
    return null;
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
  const cover = absoluteAsset(raw?.coverUrl || raw?.cover_url) || fallbackCover;
  const covers = [cover, ...fallbackCovers].slice(0, 4);
  while (covers.length < 4) covers.push(cover);
  const trackCount = Array.isArray(raw?.tracks) ? raw.tracks.length : Number(raw?.trackCount || 0);

  return {
    id,
    title: safeString(raw?.name || raw?.title, 'Playlist'),
    curator: safeString(raw?.creator?.artistName || raw?.creator?.name || 'Synaura Picks', 'Synaura Picks'),
    covers,
    tracks: `${trackCount || 0} sons`,
    vibe: safeString(raw?.description, 'selection communautaire'),
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

function buildRadioTrack(id: string, title: string, artist: string, streamUrl: string, coverUrl: string, genre: string[]): Track {
  return {
    _id: id,
    title,
    artist: {
      _id: `artist-${id}`,
      name: artist,
      username: artist.toLowerCase().replace(/\s+/g, ''),
      artistName: artist,
    },
    audioUrl: streamUrl,
    coverUrl,
    duration: 0,
    likes: [],
    comments: [],
    plays: 0,
    genre,
    album: 'Radio Synaura',
  };
}

async function getRadioItems(): Promise<RadioItem[]> {
  const [mixx, ximam] = await Promise.allSettled([
    request<any>('/api/radio/status?station=mixx_party'),
    request<any>('/api/radio/status?station=ximam'),
  ]);
  const mixxData = mixx.status === 'fulfilled' ? mixx.value?.data : null;
  const ximamData = ximam.status === 'fulfilled' ? ximam.value?.data : null;

  return [
    {
      id: 'radio-mixx',
      title: safeString(mixxData?.name || 'Mixx Party Radio', 'Mixx Party Radio'),
      subtitle: safeString(mixxData?.description || 'radio live en continu', 'radio live en continu'),
      station: 'Mixx Party',
      listeners: compact(mixxData?.stats?.listeners || 0),
      color: '#EF4444',
      track: buildRadioTrack(
        'radio-mixx-party',
        safeString(mixxData?.currentTrack?.title || 'Mixx Party Radio', 'Mixx Party Radio'),
        safeString(mixxData?.currentTrack?.artist || 'Mixx Party', 'Mixx Party'),
        safeString(mixxData?.streamUrl, 'https://manager11.streamradio.fr:2425/stream'),
        radioMixxCover,
        ['Electronic', 'Dance'],
      ),
    },
    {
      id: 'radio-ximam',
      title: safeString(ximamData?.name || 'XimaM Music Radio', 'XimaM Music Radio'),
      subtitle: safeString(ximamData?.description || 'radio createur en continu', 'radio createur en continu'),
      station: 'XimaM Radio',
      listeners: compact(ximamData?.stats?.listeners || 0),
      color: '#8B5CF6',
      track: buildRadioTrack(
        'radio-ximam',
        safeString(ximamData?.currentTrack?.title || 'XimaM Music Radio', 'XimaM Music Radio'),
        safeString(ximamData?.currentTrack?.artist || 'XimaM', 'XimaM'),
        safeString(ximamData?.streamUrl, 'https://manager11.streamradio.fr:2745/stream'),
        radioXimamCover,
        ['Creator Radio', 'Synaura'],
      ),
    },
  ];
}

export async function getHomeFeed(): Promise<Track[]> {
  const endpoints = [
    '/api/ranking/feed?limit=80&ai=1&strategy=reco',
    '/api/recommendations/feed?limit=60',
    '/api/tracks/trending?limit=60',
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
  const [feed, trending, recent, boosted, playlists, artists, radios, libraryPlaylists, libraryFavorites, libraryRecent] = await Promise.allSettled([
    request<FeedResponse>('/api/recommendations/feed?limit=24'),
    request<FeedResponse>('/api/tracks/trending?limit=18'),
    request<FeedResponse>('/api/tracks/recent?limit=18'),
    request<FeedResponse>('/api/tracks/boosted?limit=8'),
    request<FeedResponse>('/api/playlists/popular?limit=8'),
    request<FeedResponse>('/api/artists?sort=trending&limit=8'),
    getRadioItems(),
    optionalRequest<FeedResponse>('/api/playlists'),
    optionalRequest<FeedResponse>('/api/tracks?liked=true&limit=60'),
    optionalRequest<FeedResponse>('/api/tracks?recent=true&limit=40'),
  ]);

  const feedPayload = feed.status === 'fulfilled' ? feed.value : {};
  const trendingPayload = trending.status === 'fulfilled' ? trending.value : {};
  const recentPayload = recent.status === 'fulfilled' ? recent.value : {};
  const boostedPayload = boosted.status === 'fulfilled' ? boosted.value : {};
  const playlistsPayload = playlists.status === 'fulfilled' ? playlists.value : {};
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

  return {
    forYou,
    trending: trendingTracks,
    recent: recentTracks,
    boosted: boostedTracks,
    playlists: (Array.isArray(playlistsPayload.playlists) ? playlistsPayload.playlists : [])
      .map((playlist) => normalizePlaylist(playlist, fallbackCovers))
      .filter((playlist): playlist is Playlist => Boolean(playlist)),
    creators: (Array.isArray(artistsPayload.artists) ? artistsPayload.artists : [])
      .map(normalizeCreator)
      .filter((creator): creator is Creator => Boolean(creator)),
    posts: (Array.isArray(feedPayload.posts) ? feedPayload.posts : [])
      .map(normalizePost)
      .filter((post): post is HomePost => Boolean(post)),
    radios: radios.status === 'fulfilled' ? radios.value : [],
    libraryStats,
    nextCursor: feedPayload.nextCursor == null ? null : String(feedPayload.nextCursor),
    hasMore: Boolean(feedPayload.hasMore),
  };
}

export async function getTrendingTracks(): Promise<Track[]> {
  const payload = await request<FeedResponse>('/api/tracks/trending?limit=80');
  return collectTracks(payload);
}

export async function getRecentTracks(): Promise<Track[]> {
  const payload = await request<FeedResponse>('/api/tracks/recent?limit=80');
  return collectTracks(payload);
}

export async function getPopularTracks(): Promise<Track[]> {
  const payload = await request<FeedResponse>('/api/tracks/popular?limit=80');
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

export async function getPostDetail(postId: string): Promise<HomePost> {
  const json = await request<any>(`/api/posts/${encodeURIComponent(postId)}`);
  const post = normalizePost(json?.post || json);
  if (!post) throw new Error('Post introuvable');
  return post;
}

export type PlaylistDetail = Playlist & {
  description?: string;
  tracksList: Track[];
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
  };
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

export type FeedLoadMoreResult = {
  items: Array<{ kind: 'track'; track: Track; strategy: 'reco' | 'trending' } | { kind: 'post'; post: HomePost }>;
  nextCursor: string | null;
  hasMore: boolean;
};

export async function loadUnifiedFeed(cursor?: string | null): Promise<FeedLoadMoreResult> {
  const path = cursor
    ? `/api/recommendations/feed?limit=22&cursor=${encodeURIComponent(cursor)}`
    : '/api/recommendations/feed?limit=22';
  const json = await request<any>(path);
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

export async function loadMixedPosts(cursor?: string | null): Promise<FeedLoadMoreResult> {
  const path = cursor
    ? `/api/recommendations/mixed?limit=6&cursor=${encodeURIComponent(cursor)}`
    : '/api/recommendations/mixed?limit=6';
  const json = await request<any>(path);
  const posts = (Array.isArray(json?.posts) ? json.posts : []).map(normalizePost).filter((post: HomePost | null): post is HomePost => Boolean(post));
  return {
    items: posts.map((post: HomePost) => ({ kind: 'post' as const, post })),
    nextCursor: json?.nextCursor == null ? null : String(json.nextCursor),
    hasMore: Boolean(json?.hasMore),
  };
}

export async function loadRankingTracks(strategy: 'reco' | 'trending', cursor = 0): Promise<FeedLoadMoreResult> {
  const json = await request<any>(`/api/ranking/feed?limit=18&ai=1&strategy=${strategy}&cursor=${cursor}`);
  return {
    items: collectTracks(json).map((track) => ({ kind: 'track' as const, track, strategy })),
    nextCursor: json?.nextCursor == null ? String(cursor + 18) : String(json.nextCursor),
    hasMore: Boolean(json?.hasMore),
  };
}

export async function sendRecommendationImpressions(impressions: Array<{ id: string; kind: 'track' | 'post'; position?: number }>) {
  if (!impressions.length) return;
  await optionalRequest('/api/recommendations/impressions', {
    method: 'POST',
    body: JSON.stringify({
      impressions: impressions.map((item) => ({
        contentId: item.id,
        contentType: item.kind,
        rank: item.position,
        source: 'mobile-home',
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

export async function recordTrackEvent(trackId: string, eventType: string, extra?: Record<string, unknown>) {
  if (!trackId || trackId.startsWith('radio-')) return;
  await optionalRequest(`/api/tracks/${encodeURIComponent(trackId)}/events`, {
    method: 'POST',
    body: JSON.stringify({
      event_type: eventType,
      source: 'mobile-player',
      platform: 'mobile',
      is_ai_track: trackId.startsWith('ai-'),
      extra,
    }),
  });
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
  kind: 'track' | 'post',
  id: string,
  cursor: string | number | null = null,
): Promise<CommentsPage> {
  const path = kind === 'track'
    ? `/api/tracks/${encodeURIComponent(id)}/comments?limit=8&offset=${typeof cursor === 'number' ? cursor : 0}`
    : `/api/posts/${encodeURIComponent(id)}/comments?limit=8${typeof cursor === 'string' ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
  const json = await request<any>(path);
  const raw = Array.isArray(json?.comments) ? json.comments : Array.isArray(json) ? json : [];
  return {
    comments: raw.map(normalizeComment).filter((comment: HomeComment | null): comment is HomeComment => Boolean(comment)),
    nextCursor: kind === 'track'
      ? (typeof json?.nextOffset === 'number' ? json.nextOffset : null)
      : (typeof json?.nextCursor === 'string' ? json.nextCursor : null),
    hasMore: kind === 'track' ? Boolean(json?.hasMore) : Boolean(json?.nextCursor),
  };
}

export async function getComments(kind: 'track' | 'post', id: string): Promise<HomeComment[]> {
  return (await getCommentsPage(kind, id)).comments;
}

export async function createComment(kind: 'track' | 'post', id: string, content: string): Promise<HomeComment> {
  const path = kind === 'track'
    ? `/api/tracks/${encodeURIComponent(id)}/comments`
    : `/api/posts/${encodeURIComponent(id)}/comments`;
  const json = await request<any>(path, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  const comment = normalizeComment(json?.comment || json);
  if (!comment) throw new Error('Commentaire invalide');
  return comment;
}

export async function deleteComment(kind: 'track' | 'post', targetId: string, commentId: string) {
  const path = kind === 'track'
    ? `/api/tracks/${encodeURIComponent(targetId)}/comments/${encodeURIComponent(commentId)}`
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

  const form = new FormData();
  form.append('file', {
    uri: asset.uri,
    name: asset.name,
    type: asset.type || (resourceType === 'image' ? 'image/jpeg' : 'video/mp4'),
  } as any);
  form.append('folder', uploadFolder);
  form.append('public_id', publicId);
  form.append('resource_type', resourceType);
  form.append('timestamp', String(timestamp));
  form.append('api_key', apiKey);
  form.append('signature', signature.signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: 'POST',
    body: form,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.secure_url) {
    throw new Error(json?.error?.message || 'Upload Cloudinary impossible');
  }

  return {
    secureUrl: String(json.secure_url),
    publicId: String(json.public_id || publicId),
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

export const RADIO_TRACKS: Track[] = [
  buildRadioTrack(
    'radio-mixx-party',
    'Mixx Party Radio',
    'Mixx Party',
    'https://manager11.streamradio.fr:2425/stream',
    radioMixxCover,
    ['Electronic', 'Dance'],
  ),
  buildRadioTrack(
    'radio-ximam',
    'XimaM Music Radio',
    'XimaM',
    'https://manager11.streamradio.fr:2745/stream',
    radioXimamCover,
    ['Electronic'],
  ),
];

export function isRadioTrackId(id: string | null | undefined) {
  return !!id && String(id).startsWith('radio-');
}

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

export async function fetchRankingFeedChunk(
  strategy: FeedStrategy,
  cursor = 0,
  seedGenre: string | null = null,
): Promise<RankingFeedChunk> {
  const params = new URLSearchParams({ limit: '120', ai: '1', cursor: String(Math.max(0, cursor)) });
  if (strategy === 'trending' || strategy === 'boost') {
    params.set('strategy', 'trending');
  } else {
    params.set('strategy', 'reco');
    if (seedGenre) params.set('genre', seedGenre);
  }

  const [feedRes, boosted] = await Promise.all([
    optionalRequest<any>(`/api/ranking/feed?${params.toString()}`),
    getBoostedTracks(),
  ]);

  const feedTracks = (Array.isArray(feedRes?.tracks) ? feedRes.tracks : [])
    .map(normalizeTrack)
    .filter((t: Track | null): t is Track => Boolean(t));

  let merged: Track[] = feedTracks;
  if (strategy === 'boost') {
    merged = uniqueTracks([
      ...boosted.slice(0, Math.min(boosted.length, 6)),
      ...injectBoosted(feedTracks, boosted, 3),
    ]);
  } else if (strategy === 'trending') {
    merged = injectBoosted(feedTracks, boosted, 6);
  } else {
    merged = injectBoosted(feedTracks, boosted, 5);
  }

  const cursorVal = typeof feedRes?.nextCursor === 'number' ? feedRes.nextCursor : cursor + feedTracks.length;
  return {
    tracks: uniqueTracks(merged),
    nextCursor: cursorVal,
    hasMore: Boolean(feedRes?.hasMore),
  };
}

export function insertRadioTracks(tracks: Track[], strategy: FeedStrategy): Track[] {
  if (!tracks.length) return [...RADIO_TRACKS];
  const result = [...tracks];
  const positions = strategy === 'boost' ? [4, 11] : strategy === 'trending' ? [6] : [8];
  RADIO_TRACKS.forEach((radioTrack, index) => {
    if (result.some((t) => t._id === radioTrack._id)) return;
    const fallbackPos = Math.min(result.length, 6 + index * 6);
    const insertAt = Math.min(result.length, positions[index] ?? fallbackPos);
    result.splice(insertAt, 0, radioTrack);
  });
  return result;
}

export async function getRadioStatus(station: RadioStation): Promise<RadioMeta | null> {
  const json = await optionalRequest<any>(`/api/radio/status?station=${station}`);
  if (!json) return null;
  const data = json?.data;
  const title = String(data?.currentTrack?.title || '').trim();
  const artist = String(data?.currentTrack?.artist || '').trim();
  const listeners = parseInt(data?.stats?.listeners ?? 0, 10) || 0;
  if (!title) return null;
  return { station, title, artist, listeners };
}

export async function getCommentsCount(trackIds: string[]): Promise<Record<string, number>> {
  const usable = trackIds.filter((id) => id && !isRadioTrackId(id) && !id.startsWith('ai-'));
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
  const json = await optionalRequest<any>(`/api/tracks/${encodeURIComponent(trackId)}/like`, {
    method: like ? 'POST' : 'DELETE',
  });
  if (!json) return null;
  return {
    liked: Boolean(json?.liked ?? like),
    likesCount: Number(json?.likesCount ?? json?.likes_count ?? 0),
  };
}

export async function toggleArtistFollow(artistId: string): Promise<{ following: boolean } | null> {
  if (!artistId) return null;
  const json = await optionalRequest<any>(`/api/users/${encodeURIComponent(artistId)}/follow`, {
    method: 'POST',
  });
  if (!json) return null;
  return { following: Boolean(json?.following) };
}

export async function getArtistFollowState(artistId: string): Promise<boolean> {
  if (!artistId) return false;
  const json = await optionalRequest<any>(`/api/users/${encodeURIComponent(artistId)}/follow`);
  return Boolean(json?.following);
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
