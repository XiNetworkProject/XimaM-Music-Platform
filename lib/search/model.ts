export const SEARCH_KINDS = ['tracks', 'artists', 'clips', 'playlists', 'posts'] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];
export type SearchFilter = SearchKind | 'all';
export const SEARCH_LABELS: Record<SearchFilter, string> = {
  all: 'Tout',
  tracks: 'Sons',
  artists: 'Profils',
  clips: 'Clips',
  playlists: 'Playlists',
  posts: 'Posts',
};
export const emptySearch = () =>
  ({ tracks: [], artists: [], clips: [], playlists: [], posts: [] }) as Record<SearchKind, any[]>;
export function searchFilter(value: string | null): SearchFilter {
  return SEARCH_KINDS.includes(value as SearchKind) ? (value as SearchKind) : 'all';
}
export function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/^[@#]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}
export function searchHref(query: string, filter: SearchFilter = 'all', current = '') {
  const params = new URLSearchParams(current);
  params.delete('query');
  params.delete('cursor');
  query.trim() ? params.set('q', query.trim()) : params.delete('q');
  filter === 'all' ? params.delete('filter') : params.set('filter', filter);
  return `/search${params.size ? `?${params}` : ''}`;
}
export function resultHref(kind: SearchKind, item: any) {
  const id = encodeURIComponent(item._id || item.id || '');
  return kind === 'artists'
    ? `/profile/${encodeURIComponent(item.username)}`
    : `/${kind === 'tracks' ? 'track' : kind}/${id}`;
}
export function creatorName(item: any): string {
  const person = item.artist || item.creator;
  return typeof person === 'string'
    ? person
    : person?.artistName || person?.name || person?.username || 'Créateur Synaura';
}
