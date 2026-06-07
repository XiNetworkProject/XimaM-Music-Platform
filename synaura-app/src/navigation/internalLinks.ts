import { API_BASE_URL, getTrackById } from '@/api/client';
import type { Track } from '@/api/types';

type NavigationLike = {
  navigate: (name: string, params?: Record<string, unknown>) => void;
};

function toPath(input?: string | null) {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;
  try {
    if (/^https?:\/\//i.test(value)) {
      const parsed = new URL(value);
      const base = new URL(API_BASE_URL);
      if (parsed.host !== base.host) return null;
      return parsed.pathname;
    }
  } catch {
    return null;
  }
  return value.startsWith('/') ? value : `/${value}`;
}

export async function openInternalLink(
  navigation: NavigationLike,
  urlOrPath?: string | null,
  options?: { playTrack?: (track: Track) => void },
) {
  const path = toPath(urlOrPath);
  if (!path) return false;
  const parts = path.split('/').filter(Boolean);
  const [root, id] = parts;

  if (root === 'profile' && id) {
    navigation.navigate('PublicProfile', { username: decodeURIComponent(id) });
    return true;
  }
  if ((root === 'posts' || root === 'post') && id) {
    navigation.navigate('PostDetail', { postId: decodeURIComponent(id) });
    return true;
  }
  if ((root === 'playlists' || root === 'playlist') && id) {
    navigation.navigate('PlaylistDetail', { playlistId: decodeURIComponent(id) });
    return true;
  }
  if ((root === 'track' || root === 'tracks') && id) {
    const track = await getTrackById(decodeURIComponent(id));
    if (track && options?.playTrack) {
      options.playTrack(track);
      return true;
    }
  }
  if (root === 'notifications') {
    navigation.navigate('Notifications');
    return true;
  }
  if (root === 'settings') {
    navigation.navigate('Settings');
    return true;
  }
  return false;
}
