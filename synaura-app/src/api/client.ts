import Constants from 'expo-constants';
import type { Creator, FeedResponse, HomeComment, HomeData, HomePost, LibraryStats, Playlist, RadioItem, SearchResults, Track } from './types';

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
    duration: Number(raw?.duration || 0),
    likes: Array.isArray(raw?.likes) ? raw.likes : [],
    comments: Array.isArray(raw?.comments) ? raw.comments : [],
    likesCount: Number(raw?.likes_count ?? raw?.likesCount ?? countArrayOrNumber(raw?.likes)),
    commentsCount: Number(raw?.comments_count ?? raw?.commentsCount ?? countArrayOrNumber(raw?.comments)),
    isLiked: Boolean(raw?.isLiked || raw?.is_liked),
    isAI: Boolean(raw?.isAI || raw?.is_ai || String(id).startsWith('ai-')),
    isBoosted: Boolean(raw?.isBoosted || raw?.is_boosted),
    plays: Number(raw?.plays || raw?.play_count || 0),
    genre,
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
    avatar: name.slice(0, 1).toUpperCase(),
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
    avatar: author.slice(0, 1).toUpperCase(),
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
        playlists: Array.isArray(libraryPlaylistsPayload?.playlists) ? libraryPlaylistsPayload.playlists.length : 0,
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
    body: JSON.stringify({ impressions, source: 'mobile-home' }),
  });
}

export async function toggleTrackLike(trackId: string) {
  return request<any>(`/api/tracks/${encodeURIComponent(trackId)}/like`, { method: 'POST' });
}

export async function togglePostLike(postId: string) {
  return request<any>(`/api/posts/${encodeURIComponent(postId)}/like`, { method: 'POST' });
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

export async function getComments(kind: 'track' | 'post', id: string): Promise<HomeComment[]> {
  const path = kind === 'track'
    ? `/api/tracks/${encodeURIComponent(id)}/comments`
    : `/api/posts/${encodeURIComponent(id)}/comments`;
  const json = await request<any>(path);
  const raw = Array.isArray(json?.comments) ? json.comments : Array.isArray(json) ? json : [];
  return raw.map(normalizeComment).filter((comment: HomeComment | null): comment is HomeComment => Boolean(comment));
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
