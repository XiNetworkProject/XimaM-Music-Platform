import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Track } from '@/api/types';

type LibraryContextValue = {
  favorites: Track[];
  recent: Track[];
  downloaded: Track[];
  isFavorite: (trackId: string) => boolean;
  isDownloaded: (trackId: string) => boolean;
  toggleFavorite: (track: Track) => void;
  downloadTrack: (track: Track) => Promise<void>;
  removeDownload: (trackId: string) => Promise<void>;
  addRecent: (track: Track) => void;
  clearRecent: () => void;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);
const FAVORITES_KEY = 'synaura.library.favorites';
const RECENT_KEY = 'synaura.library.recent';
const DOWNLOADED_KEY = 'synaura.library.downloaded';
const DOWNLOAD_DIRECTORY = `${FileSystem.documentDirectory}synaura-downloads/`;

function safeParseTracks(raw: string | null): Track[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item) => item?._id && item?.audioUrl && !String(item._id).startsWith('radio-'))
      : [];
  } catch {
    return [];
  }
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [recent, setRecent] = useState<Track[]>([]);
  const [downloaded, setDownloaded] = useState<Track[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      AsyncStorage.getItem(FAVORITES_KEY),
      AsyncStorage.getItem(RECENT_KEY),
      AsyncStorage.getItem(DOWNLOADED_KEY),
    ]).then(([favRaw, recentRaw, downloadedRaw]) => {
      if (!mounted) return;
      setFavorites(safeParseTracks(favRaw));
      setRecent(safeParseTracks(recentRaw));
      setDownloaded(safeParseTracks(downloadedRaw));
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const persistFavorites = useCallback((tracks: Track[]) => {
    setFavorites(tracks);
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(tracks)).catch(() => {});
  }, []);

  const isFavorite = useCallback((trackId: string) => {
    return favorites.some((track) => track._id === trackId);
  }, [favorites]);

  const toggleFavorite = useCallback((track: Track) => {
    if (!track?._id || track._id.startsWith('radio-')) return;
    const exists = favorites.some((item) => item._id === track._id);
    const next = exists ? favorites.filter((item) => item._id !== track._id) : [track, ...favorites];
    persistFavorites(next.slice(0, 200));
  }, [favorites, persistFavorites]);

  const isDownloaded = useCallback((trackId: string) => {
    return downloaded.some((track) => track._id === trackId);
  }, [downloaded]);

  const removeDownload = useCallback(async (trackId: string) => {
    const existing = downloaded.find((track) => track._id === trackId);
    if (existing?.audioUrl?.startsWith('file:')) {
      await FileSystem.deleteAsync(existing.audioUrl, { idempotent: true }).catch(() => {});
    }
    const next = downloaded.filter((track) => track._id !== trackId);
    setDownloaded(next);
    await AsyncStorage.setItem(DOWNLOADED_KEY, JSON.stringify(next));
  }, [downloaded]);

  const downloadTrack = useCallback(async (track: Track) => {
    if (!track?._id || !/^https?:\/\//i.test(track.audioUrl || '')) return;
    await FileSystem.makeDirectoryAsync(DOWNLOAD_DIRECTORY, { intermediates: true }).catch(() => {});
    const safeId = encodeURIComponent(track._id).replace(/%/g, '_');
    const destination = `${DOWNLOAD_DIRECTORY}${safeId}.audio`;
    await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => {});
    const result = await FileSystem.downloadAsync(track.audioUrl, destination);
    const offlineTrack = { ...track, audioUrl: result.uri, remoteAudioUrl: track.audioUrl } as Track;
    const next = [offlineTrack, ...downloaded.filter((item) => item._id !== track._id)].slice(0, 100);
    setDownloaded(next);
    await AsyncStorage.setItem(DOWNLOADED_KEY, JSON.stringify(next));
  }, [downloaded]);

  const addRecent = useCallback((track: Track) => {
    if (!track?._id || track._id.startsWith('radio-')) return;
    setRecent((current) => {
      if (current[0]?._id === track._id) return current;
      const next = [track, ...current.filter((item) => item._id !== track._id)].slice(0, 50);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    AsyncStorage.removeItem(RECENT_KEY).catch(() => {});
  }, []);

  const value = useMemo<LibraryContextValue>(() => ({
    favorites,
    recent,
    downloaded,
    isFavorite,
    isDownloaded,
    toggleFavorite,
    downloadTrack,
    removeDownload,
    addRecent,
    clearRecent,
  }), [addRecent, clearRecent, downloaded, downloadTrack, favorites, isDownloaded, isFavorite, recent, removeDownload, toggleFavorite]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}
