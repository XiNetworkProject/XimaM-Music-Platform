'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Play, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAudioPlayer } from '@/app/providers';
import Avatar from '@/components/Avatar';

interface Track {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  likes: string[];
  comments: string[];
  plays: number;
  isLiked?: boolean;
  genre?: string[];
}

interface Artist {
  _id: string;
  username: string;
  name: string;
  avatar?: string;
  followers: number;
}

interface Playlist {
  _id: string;
  name: string;
  coverUrl?: string;
  creator?: {
    username: string;
  };
  tracks_count: number;
}

interface SearchResults {
  tracks: Track[];
  artists: Artist[];
  playlists: Playlist[];
  total: number;
}

type FlatItem =
  | { kind: 'track'; id: string; track: Track }
  | { kind: 'artist'; id: string; artist: Artist }
  | { kind: 'playlist'; id: string; playlist: Playlist };

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getValidImageUrl(url: string | undefined, fallback: string): string {
  if (!url || url === '' || url === 'null' || url === 'undefined') return fallback;
  if (url.startsWith('/')) return url;
  if (url.includes('cloudinary.com')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return fallback;
}

export default function TopSearchBar() {
  const router = useRouter();
  const { playTrack } = useAudioPlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>({
    tracks: [],
    artists: [],
    playlists: [],
    total: 0,
  });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const abortRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ tracks: [], artists: [], playlists: [], total: 0 });
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch(
        `/api/search?query=${encodeURIComponent(query)}&filter=all&limit=10`,
        { signal: controller.signal, cache: 'no-store' },
      );
      if (!response.ok) {
        setSearchResults({ tracks: [], artists: [], playlists: [], total: 0 });
        setSearchError('Erreur de recherche');
        return;
      }
      const data = await response.json().catch(() => ({}));
      const safeData: SearchResults = {
        tracks: Array.isArray(data.tracks) ? data.tracks : [],
        artists: Array.isArray(data.artists) ? data.artists : [],
        playlists: Array.isArray(data.playlists) ? data.playlists : [],
        total:
          data.totalResults ||
          (data.tracks?.length || 0) + (data.artists?.length || 0) + (data.playlists?.length || 0),
      };
      setSearchResults(safeData);
      setShowSearchResults(true);
    } catch {
      // Abort = normal
      if ((abortRef.current as any)?.signal?.aborted) return;
      setSearchResults({ tracks: [], artists: [], playlists: [], total: 0 });
      setSearchError('Erreur de recherche');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const q = searchQuery.trim();
      if (q.length >= 2) performSearch(q);
      else {
        abortRef.current?.abort();
        setSearchLoading(false);
        setSearchError(null);
        setSearchResults({ tracks: [], artists: [], playlists: [], total: 0 });
        setShowSearchResults(false);
        setActiveIndex(-1);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  const flatItems: FlatItem[] = useMemo(() => {
    const items: FlatItem[] = [];
    for (const t of searchResults.tracks || []) items.push({ kind: 'track', id: t._id, track: t });
    for (const a of searchResults.artists || []) items.push({ kind: 'artist', id: a._id, artist: a });
    for (const p of searchResults.playlists || []) items.push({ kind: 'playlist', id: p._id, playlist: p });
    return items.slice(0, 15);
  }, [searchResults.artists, searchResults.playlists, searchResults.tracks]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.global-search-container')) {
        setShowSearchResults(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSearchResults(false);
      setActiveIndex(-1);
      return;
    }
    if (!showSearchResults) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.min((flatItems.length || 0) - 1, i + 1);
        return Number.isFinite(next) ? next : -1;
      });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(-1, i - 1));
      return;
    }
    if (e.key === 'Enter') {
      const item = flatItems[activeIndex];
      if (!item) return;
      e.preventDefault();
      if (item.kind === 'track') {
        playTrack(item.track as any);
        setShowSearchResults(false);
        setActiveIndex(-1);
        return;
      }
      if (item.kind === 'artist') {
        router.push(`/profile/${item.artist.username}`);
        setShowSearchResults(false);
        setActiveIndex(-1);
        return;
      }
      if (item.kind === 'playlist') {
        router.push(`/playlists/${item.playlist._id}`);
        setShowSearchResults(false);
        setActiveIndex(-1);
      }
    }
  };

  return (
    <div className="sticky top-0 z-40 backdrop-blur-xl bg-background-primary/70 border-b border-border-secondary/60">
      <div className="mx-auto max-w-7xl px-3 md:px-4 py-3">
        <div className="relative global-search-container">
          <div className="relative rounded-3xl border border-border-secondary bg-background-fog-thin h-14 flex items-center px-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground-inactive pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim().length >= 2) setShowSearchResults(true);
              }}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) setShowSearchResults(true);
              }}
              onKeyDown={onKeyDown}
              placeholder="Rechercher un titre, un artiste, une playlist..."
              className="w-full h-11 pl-10 pr-10 rounded-2xl border border-border-secondary bg-background-fog-thin text-sm text-foreground-primary placeholder:text-foreground-inactive outline-none focus:ring-2 focus:ring-overlay-on-primary"
            />

            {searchQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults({ tracks: [], artists: [], playlists: [], total: 0 });
                  setShowSearchResults(false);
                  setActiveIndex(-1);
                  setSearchError(null);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl border border-border-secondary bg-background-tertiary hover:bg-overlay-on-primary transition grid place-items-center"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4 text-foreground-tertiary" />
              </button>
            )}

            <AnimatePresence>
              {showSearchResults && (
                <>
                  {/* Overlay mobile */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] md:hidden"
                    onClick={() => setShowSearchResults(false)}
                  />

                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="fixed md:absolute top-16 md:top-full left-0 right-0 md:mt-2 bg-background-tertiary md:border border-border-secondary md:rounded-3xl shadow-2xl overflow-hidden z-[70]"
                    style={{
                      maxHeight: 'calc(100vh - 80px)',
                      height: 'calc(100vh - 80px)',
                    }}
                  >
                    <div className="sticky top-0 bg-background-tertiary border-b border-border-secondary/60 p-3 flex items-center justify-between md:hidden z-10">
                      <h3 className="text-base font-semibold text-foreground-primary">
                        {searchLoading ? 'Recherche...' : `${searchResults.total} résultat(s)`}
                      </h3>
                      <button
                        onClick={() => setShowSearchResults(false)}
                        className="h-9 w-9 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
                        aria-label="Fermer"
                      >
                        <X className="w-5 h-5 text-foreground-secondary" />
                      </button>
                    </div>

                    <div className="overflow-y-auto" style={{ height: 'calc(100% - 60px)' }}>
                      <div className="p-2">
                        {searchError && (
                          <div className="p-4 text-sm text-foreground-secondary">
                            {searchError}
                          </div>
                        )}

                        {searchLoading && (
                          <div className="p-2 space-y-2">
                            <div className="h-12 rounded-2xl border border-border-secondary bg-background-fog-thin animate-pulse" />
                            <div className="h-12 rounded-2xl border border-border-secondary bg-background-fog-thin animate-pulse" />
                            <div className="h-12 rounded-2xl border border-border-secondary bg-background-fog-thin animate-pulse" />
                          </div>
                        )}

                        {/* Tracks */}
                        {searchResults.tracks.length > 0 && (
                          <div className="space-y-0">
                            <div className="px-2 py-2 text-xs text-foreground-tertiary">Titres</div>
                            {searchResults.tracks.slice(0, 6).map((track) => (
                              <motion.div
                                key={track._id}
                                whileTap={{ scale: 0.98 }}
                                className={cx(
                                  'group flex items-center gap-3 p-3 md:p-2 rounded-2xl cursor-pointer transition-colors',
                                  activeIndex >= 0 && flatItems[activeIndex]?.kind === 'track' && flatItems[activeIndex]?.id === track._id
                                    ? 'bg-overlay-on-primary'
                                    : 'hover:bg-overlay-on-primary',
                                )}
                                onClick={() => {
                                  playTrack(track as any);
                                  setShowSearchResults(false);
                                  setActiveIndex(-1);
                                }}
                              >
                                <div className="relative w-14 h-14 md:w-12 md:h-12 rounded-2xl overflow-hidden bg-background-tertiary border border-border-secondary flex-shrink-0">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={getValidImageUrl(track.coverUrl, '/default-cover.jpg')}
                                    alt={track.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center shadow-lg transform scale-95 group-hover:scale-100 transition-transform">
                                      <Play className="w-4 h-4 text-black fill-black ml-0.5" />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground-primary truncate">{track.title}</p>
                                  <p className="text-xs text-foreground-tertiary truncate">
                                    Créations • {track.artist?.name || track.artist?.username}
                                  </p>
                                </div>
                                <span className="hidden md:inline text-xs text-foreground-tertiary">
                                  {formatDuration(track.duration)}
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        )}

                        {/* Artists */}
                        {searchResults.artists.length > 0 && (
                          <div className="space-y-0 mt-1">
                            <div className="px-2 py-2 text-xs text-foreground-tertiary">Artistes</div>
                            {searchResults.artists.slice(0, 6).map((artist) => (
                              <Link
                                href={`/profile/${artist.username}`}
                                key={artist._id}
                                onClick={() => setShowSearchResults(false)}
                              >
                                <motion.div
                                  whileTap={{ scale: 0.98 }}
                                  className={cx(
                                    'flex items-center gap-3 p-3 md:p-2 rounded-2xl cursor-pointer transition-colors',
                                    activeIndex >= 0 &&
                                      flatItems[activeIndex]?.kind === 'artist' &&
                                      flatItems[activeIndex]?.id === artist._id
                                      ? 'bg-overlay-on-primary'
                                      : 'hover:bg-overlay-on-primary',
                                  )}
                                >
                                  <Avatar
                                    src={getValidImageUrl(artist.avatar, '/default-avatar.png')}
                                    name={artist.name}
                                    username={artist.username}
                                    size="md"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground-primary truncate">{artist.name}</p>
                                    <p className="text-xs text-foreground-tertiary truncate">Artiste</p>
                                  </div>
                                </motion.div>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Playlists */}
                        {searchResults.playlists.length > 0 && (
                          <div className="space-y-0 mt-1">
                            <div className="px-2 py-2 text-xs text-foreground-tertiary">Playlists</div>
                            {searchResults.playlists.slice(0, 6).map((playlist) => (
                              <Link
                                href={`/playlists/${playlist._id}`}
                                key={playlist._id}
                                onClick={() => setShowSearchResults(false)}
                              >
                                <motion.div
                                  whileTap={{ scale: 0.98 }}
                                  className={cx(
                                    'flex items-center gap-3 p-3 md:p-2 rounded-2xl cursor-pointer transition-colors',
                                    activeIndex >= 0 &&
                                      flatItems[activeIndex]?.kind === 'playlist' &&
                                      flatItems[activeIndex]?.id === playlist._id
                                      ? 'bg-overlay-on-primary'
                                      : 'hover:bg-overlay-on-primary',
                                  )}
                                >
                                  <div className="w-14 h-14 md:w-12 md:h-12 rounded-2xl overflow-hidden bg-background-tertiary border border-border-secondary flex-shrink-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={getValidImageUrl(playlist.coverUrl, '/default-cover.jpg')}
                                      alt={playlist.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg';
                                      }}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground-primary truncate">{playlist.name}</p>
                                    <p className="text-xs text-foreground-tertiary truncate">
                                      Playlist • {playlist.creator?.username || 'Utilisateur'}
                                    </p>
                                  </div>
                                </motion.div>
                              </Link>
                            ))}
                          </div>
                        )}

                        {!searchLoading && searchResults.total === 0 && searchQuery.trim() && (
                          <div className="text-center py-12">
                            <Search className="w-12 h-12 mx-auto mb-3 text-foreground-inactive opacity-40" />
                            <p className="text-sm font-medium text-foreground-primary">
                              Aucun résultat pour "{searchQuery}"
                            </p>
                            <p className="text-xs text-foreground-tertiary mt-1">Essayez d&apos;autres mots-clés</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

