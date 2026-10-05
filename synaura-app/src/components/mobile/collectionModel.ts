import type { Track } from '@/api/types';

export function collectionSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim();
}

/** Keep the original queue index, including repeated tracks, after searching. */
export function filterCollectionTracks(tracks: Track[], query: string) {
  const needle = collectionSearch(query);
  return tracks.map((track, index) => ({ kind: 'track' as const, track, index }))
    .filter(({ track }) => collectionSearch([track.title, track.artist?.name, track.artist?.username, ...(track.genre || [])].join(' ')).includes(needle));
}

export function sortCollectionTracks<T extends Track>(tracks: T[], sort: 'recent' | 'plays' | 'likes'): T[] {
  return [...tracks].sort((a, b) => {
    if (sort === 'plays') return Number(b.plays || 0) - Number(a.plays || 0);
    if (sort === 'likes') return Number(b.likesCount || 0) - Number(a.likesCount || 0);
    return (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0);
  });
}
