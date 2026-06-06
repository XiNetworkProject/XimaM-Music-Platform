import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Track } from '@/api/types';

type LibraryContextValue = {
  favorites: Track[];
  recent: Track[];
  isFavorite: (trackId: string) => boolean;
  toggleFavorite: (track: Track) => void;
  addRecent: (track: Track) => void;
  clearRecent: () => void;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);
const FAVORITES_KEY = 'synaura.library.favorites';
const RECENT_KEY = 'synaura.library.recent';

function safeParseTracks(raw: string | null): Track[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item?._id && item?.audioUrl) : [];
  } catch {
    return [];
  }
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [recent, setRecent] = useState<Track[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      AsyncStorage.getItem(FAVORITES_KEY),
      AsyncStorage.getItem(RECENT_KEY),
    ]).then(([favRaw, recentRaw]) => {
      if (!mounted) return;
      setFavorites(safeParseTracks(favRaw));
      setRecent(safeParseTracks(recentRaw));
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const persistFavorites = useCallback((tracks: Track[]) => {
    setFavorites(tracks);
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(tracks)).catch(() => {});
  }, []);

  const persistRecent = useCallback((tracks: Track[]) => {
    setRecent(tracks);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(tracks)).catch(() => {});
  }, []);

  const isFavorite = useCallback((trackId: string) => {
    return favorites.some((track) => track._id === trackId);
  }, [favorites]);

  const toggleFavorite = useCallback((track: Track) => {
    if (!track?._id) return;
    const exists = favorites.some((item) => item._id === track._id);
    const next = exists ? favorites.filter((item) => item._id !== track._id) : [track, ...favorites];
    persistFavorites(next.slice(0, 200));
  }, [favorites, persistFavorites]);

  const addRecent = useCallback((track: Track) => {
    if (!track?._id) return;
    const next = [track, ...recent.filter((item) => item._id !== track._id)].slice(0, 50);
    persistRecent(next);
  }, [persistRecent, recent]);

  const clearRecent = useCallback(() => {
    persistRecent([]);
  }, [persistRecent]);

  const value = useMemo<LibraryContextValue>(() => ({
    favorites,
    recent,
    isFavorite,
    toggleFavorite,
    addRecent,
    clearRecent,
  }), [addRecent, clearRecent, favorites, isFavorite, recent, toggleFavorite]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}
