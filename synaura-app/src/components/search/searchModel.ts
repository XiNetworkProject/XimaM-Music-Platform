import type { SearchResults, Track } from '@/api/types';

export const SEARCH_FILTERS = [
  { value: 'all', label: 'Tout' }, { value: 'tracks', label: 'Sons' },
  { value: 'artists', label: 'Artistes' }, { value: 'playlists', label: 'Playlists' },
  { value: 'posts', label: 'Posts' },
] as const;
export type SearchFilter = (typeof SEARCH_FILTERS)[number]['value'];

export function recentSearches(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((entry): entry is string => typeof entry === 'string')
    .map(entry => entry.trim().slice(0, 120)).filter(entry => {
      const key = entry.toLocaleLowerCase('fr');
      if (entry.length < 2 || seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, 8);
}

export function uniqueSearchResults(results: SearchResults): SearchResults {
  const unique = <T,>(items: T[], key: (item: T) => string) => {
    const seen = new Set<string>();
    return items.filter(item => { const id = key(item); if (seen.has(id)) return false; seen.add(id); return true; });
  };
  return { tracks: unique(results.tracks, item => item._id), artists: unique(results.artists, item => item.id),
    playlists: unique(results.playlists, item => item.id), posts: unique(results.posts, item => item.id) };
}

export function searchCount(results: SearchResults, filter: SearchFilter) {
  return filter === 'all' ? Object.values(results).reduce((sum, items) => sum + items.length, 0) : results[filter].length;
}

/** Fisher-Yates: no biased random comparator, no mutation of the original queue. */
export function shuffledTracks(tracks: Track[], random = Math.random): Track[] {
  const next = [...tracks];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}
