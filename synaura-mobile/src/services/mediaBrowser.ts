import { apiUrl } from '../config/env';
import type { ApiTrack } from './api';

export type MediaItem = {
  id: string;
  title: string;
  subtitle?: string;
  artwork?: string;
  playable: boolean;
  children?: boolean;
};

function trackToMediaItem(track: ApiTrack): MediaItem {
  const artistName =
    track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste';
  return {
    id: track._id,
    title: track.title || 'Sans titre',
    subtitle: artistName,
    artwork: track.coverUrl || undefined,
    playable: true,
  };
}

const ROOT_CATEGORIES: MediaItem[] = [
  { id: 'pour-toi', title: 'Pour toi', playable: false, children: true },
  { id: 'tendances', title: 'Tendances', playable: false, children: true },
  { id: 'nouveautes', title: 'Nouveautés', playable: false, children: true },
  { id: 'populaires', title: 'Populaires', playable: false, children: true },
];

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(apiUrl(path));
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type TrackListResponse = { tracks: ApiTrack[] };

async function fetchCategoryTracks(categoryId: string): Promise<ApiTrack[]> {
  let data: TrackListResponse | null = null;

  switch (categoryId) {
    case 'pour-toi': {
      const r = await fetchJSON<{ tracks: ApiTrack[]; nextCursor?: number }>(
        '/api/ranking/feed?limit=30&ai=0&cursor=0&strategy=reco'
      );
      return r?.tracks ?? [];
    }
    case 'tendances':
      data = await fetchJSON<TrackListResponse>('/api/tracks/trending?limit=30');
      break;
    case 'nouveautes':
      data = await fetchJSON<TrackListResponse>('/api/tracks/recent?limit=30');
      break;
    case 'populaires':
      data = await fetchJSON<TrackListResponse>('/api/tracks/popular?limit=30');
      break;
    default:
      return [];
  }

  return data?.tracks ?? [];
}

export async function getMediaItems(parentId?: string): Promise<MediaItem[]> {
  if (!parentId || parentId === 'root') {
    return ROOT_CATEGORIES;
  }

  const tracks = await fetchCategoryTracks(parentId);
  return tracks.map(trackToMediaItem);
}

export async function getTracksForCategory(categoryId: string): Promise<ApiTrack[]> {
  return fetchCategoryTracks(categoryId);
}
