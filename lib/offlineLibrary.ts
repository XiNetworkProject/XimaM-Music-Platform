export const OFFLINE_TRACKS_STORAGE_KEY = 'synaura.library.offline.v1';
export const OFFLINE_TRACKS_EVENT = 'synaura:offline-library-updated';
export const OFFLINE_AUDIO_CACHE = 'ximam-audio-files-v7';

export type OfflineTrack = {
  id: string;
  title: string;
  artistName: string;
  artistUsername?: string;
  audioUrl: string;
  coverUrl?: string;
  duration?: number;
  downloadedAt: string;
};

export function readOfflineTracks(): OfflineTrack[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(OFFLINE_TRACKS_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => (
      item &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      typeof item.audioUrl === 'string'
    )).slice(0, 100);
  } catch {
    return [];
  }
}

export function rememberOfflineTrack(track: Omit<OfflineTrack, 'downloadedAt'>) {
  if (typeof window === 'undefined') return;
  const next: OfflineTrack[] = [
    { ...track, downloadedAt: new Date().toISOString() },
    ...readOfflineTracks().filter((item) => item.id !== track.id && item.audioUrl !== track.audioUrl),
  ].slice(0, 100);
  window.localStorage.setItem(OFFLINE_TRACKS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(OFFLINE_TRACKS_EVENT));
}

export async function forgetOfflineTrack(id: string) {
  if (typeof window === 'undefined') return;
  const current = readOfflineTracks();
  const removed = current.find((item) => item.id === id);
  const next = current.filter((item) => item.id !== id);
  window.localStorage.setItem(OFFLINE_TRACKS_STORAGE_KEY, JSON.stringify(next));
  if (removed && 'caches' in window) {
    const cache = await window.caches.open(OFFLINE_AUDIO_CACHE);
    await cache.delete(removed.audioUrl);
  }
  window.dispatchEvent(new CustomEvent(OFFLINE_TRACKS_EVENT));
}
