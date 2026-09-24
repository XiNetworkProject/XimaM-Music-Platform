import type { DiscoverTrackLite } from '../app/discover/DiscoverPlayButton';

export const DISCOVERY_TABS = ['explore', 'tracks', 'newest', 'artists', 'posts', 'playlists'] as const;
export type DiscoveryTab = typeof DISCOVERY_TABS[number];
export const DISCOVERY_SORTS = ['trending', 'newest', 'popular', 'hidden'] as const;
export type DiscoverySort = typeof DISCOVERY_SORTS[number];
export type LibraryTrack = DiscoverTrackLite & { genre?: string[]; createdAt?: string; isLiked?: boolean };
export type LibraryArtist = {
  _id: string; username: string; name: string; artistName?: string; avatar?: string;
  bio?: string; tracksCount?: number; followersCount?: number; leadTrack?: LibraryTrack;
};
export type LibraryPlaylist = {
  _id: string; title?: string; name?: string; description?: string; coverUrl?: string;
  bannerUrl?: string; trackCount?: number; publicUrl?: string; tracks?: unknown[];
  creator?: { name?: string; username?: string };
};
export type LibraryPost = {
  id: string; type?: string; content?: string; image_url?: string; imageUrl?: string;
  created_at?: string; createdAt?: string; likes_count?: number; comments_count?: number;
  likes?: number; comments?: number;
  creator?: { id?: string; _id?: string; name?: string; username?: string; avatar?: string } | null;
  track?: { id: string; title: string; artist_name?: string; cover_url?: string; cover_video_poster_url?: string; audio_url?: string; duration?: number } | null;
  original_post?: LibraryPost | null;
};
export type DiscoveryPage = {
  tracks: LibraryTrack[]; artists: LibraryArtist[]; total: number; totalArtists: number;
  page: number; nextPage: number; hasMore: boolean;
  profilePage: number; nextProfilePage: number; hasMoreProfiles: boolean;
};
export type PostsPage = { posts: LibraryPost[]; nextCursor: string | null; hasMore: boolean };
export type SearchResults = { tracks: LibraryTrack[]; artists: LibraryArtist[]; posts: LibraryPost[]; playlists: LibraryPlaylist[] };

export function discoveryView(params: Pick<URLSearchParams, 'get'>) {
  const tab = params.get('tab');
  const sort = params.get('sort');
  return {
    tab: (DISCOVERY_TABS.includes(tab as DiscoveryTab) ? tab : 'explore') as DiscoveryTab,
    sort: (DISCOVERY_SORTS.includes(sort as DiscoverySort) ? sort : 'trending') as DiscoverySort,
    query: (params.get('q') || '').trim().slice(0, 120),
    genre: (params.get('genre') || '').slice(0, 40),
  };
}

/** Keep the public APIs, true pagination flags and one stable ranking per query. */
export function discoveryPageUrl(page: number, sort: DiscoverySort, genre = '', artists = false) {
  const params = new URLSearchParams({ sort, limit: '24', profileLimit: '12', category: genre || 'all', page: String(page) });
  if (artists) params.set('profilePage', String(page));
  return `/api/discover?${params}`;
}
export function discoveryNextPage(page: DiscoveryPage, artists = false) {
  const next = artists ? page.nextProfilePage : page.nextPage;
  const current = artists ? page.profilePage : page.page;
  return (artists ? page.hasMoreProfiles : page.hasMore) && Number.isInteger(next) && next > current ? next : undefined;
}
export function postsNextCursor(page: PostsPage, previous: string | null) {
  return page.hasMore && page.nextCursor && page.nextCursor !== previous ? page.nextCursor : undefined;
}
export function uniqueItems<T>(items: readonly T[], id: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter(item => { const key = id(item); if (!key || seen.has(key)) return false; seen.add(key); return true; });
}
export function postArtwork(post: LibraryPost): string | undefined {
  return post.image_url || post.imageUrl || post.track?.cover_url || post.track?.cover_video_poster_url
    || (post.original_post ? post.original_post.image_url || post.original_post.imageUrl || post.original_post.track?.cover_url : undefined);
}
export function playlistHref(playlist: LibraryPlaylist) {
  // Do not turn API-provided URLs into external navigation or javascript: links.
  return playlist.publicUrl?.startsWith('/playlists/') ? playlist.publicUrl : `/playlists/${encodeURIComponent(playlist._id)}`;
}
export function playlistDescription(playlist: LibraryPlaylist) {
  // Search can still return the legacy editorial header. It is metadata, not copy.
  const value = playlist.description || '';
  const marker = value.match(/^<!--SYNAURA_COLLECTION:([\s\S]*?)-->\s*/);
  if (!marker) return value;
  const description = value.slice(marker[0].length).trim();
  if (description) return description;
  try {
    const metadata = JSON.parse(marker[1]);
    return typeof metadata?.subtitle === 'string' ? metadata.subtitle : '';
  } catch { return ''; }
}
export function searchFilter(tab: DiscoveryTab) {
  return tab === 'newest' ? 'tracks' : tab === 'explore' ? 'all' : tab;
}
