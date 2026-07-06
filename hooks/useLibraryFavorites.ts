'use client';

import { useCallback, useEffect, useState } from 'react';

const FAVORITES_KEY = 'synaura.library.favorites';

type FavoriteTrack = {
  _id: string;
  title: string;
  artist?: { name?: string; username?: string };
  coverUrl?: string | null;
  audioUrl?: string;
};

function readFavorites(): FavoriteTrack[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item?._id) : [];
  } catch {
    return [];
  }
}

/** Bibliothèque personnelle stockée localement (même logique que le mobile, qui persiste
 * ses favoris en AsyncStorage plutôt que sur un serveur). */
export function useLibraryFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set(readFavorites().map((t) => t._id)));

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === FAVORITES_KEY) setFavoriteIds(new Set(readFavorites().map((t) => t._id)));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isFavorite = useCallback((trackId: string) => favoriteIds.has(trackId), [favoriteIds]);

  const toggleFavorite = useCallback((track: FavoriteTrack) => {
    if (!track?._id) return;
    const current = readFavorites();
    const exists = current.some((item) => item._id === track._id);
    const next = exists ? current.filter((item) => item._id !== track._id) : [track, ...current].slice(0, 200);
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    setFavoriteIds(new Set(next.map((t) => t._id)));
  }, []);

  return { isFavorite, toggleFavorite };
}
