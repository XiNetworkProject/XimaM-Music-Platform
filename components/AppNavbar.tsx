'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Search,
  Bell,
  Plus,
  Music,
  User,
  Disc3,
  X,
  Headphones,
  Play,
  Sparkles,
  LogIn,
  Crown,
  Menu,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioPlayer } from '../app/providers';
import { useSidebar } from '@/app/providers';
import NotificationCenter from './NotificationCenter';
import Avatar from './Avatar';

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

export default function AppNavbar() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>({
    tracks: [],
    artists: [],
    playlists: [],
    total: 0,
  });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  const { playTrack, audioState } = useAudioPlayer();
  const { toggleSidebar } = useSidebar();

  useEffect(() => {
    const loadUserPlan = async () => {
      if (!session?.user?.id) {
        setPlanLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/subscriptions/usage');
        if (res.ok) {
          const data = await res.json();
          console.log('📊 Plan utilisateur chargé:', data.plan);
          setUserPlan(data.plan || 'free');
        }
      } catch (error) {
        console.error('Erreur chargement plan:', error);
      } finally {
        setPlanLoading(false);
      }
    };

    loadUserPlan();
  }, [session?.user?.id]);

  const goToProfile = () => {
    const username = (session?.user as any)?.username;
    if (username) {
      window.location.href = `/profile/${username}`;
    } else {
      window.location.href = '/auth/signin';
    }
  };

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults({
        tracks: [],
        artists: [],
        playlists: [],
        total: 0,
      });
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(
        `/api/search?query=${encodeURIComponent(
          query,
        )}&filter=all&limit=10`,
      );
      if (response.ok) {
        const data = await response.json();

        if (!data || typeof data !== 'object') {
          setSearchResults({
            tracks: [],
            artists: [],
            playlists: [],
            total: 0,
          });
          return;
        }

        const safeData = {
          tracks: Array.isArray(data.tracks) ? data.tracks : [],
          artists: Array.isArray(data.artists) ? data.artists : [],
          playlists: Array.isArray(data.playlists) ? data.playlists : [],
          total:
            data.totalResults ||
            (data.tracks?.length || 0) +
              (data.artists?.length || 0) +
              (data.playlists?.length || 0),
        };

        setSearchResults(safeData);
        setShowSearchResults(true);
      } else {
        setSearchResults({
          tracks: [],
          artists: [],
          playlists: [],
          total: 0,
        });
      }
    } catch (error) {
      setSearchResults({
        tracks: [],
        artists: [],
        playlists: [],
        total: 0,
      });
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getValidImageUrl = (
    url: string | undefined,
    fallback: string | null,
  ): string | null => {
    if (!url || url === '' || url === 'null' || url === 'undefined') {
      return fallback;
    }

    if (url.startsWith('/')) {
      return url;
    }

    if (url.includes('cloudinary.com')) {
      return url;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    return fallback;
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto max-w-[2000px] px-3 py-3">
        <div className="relative rounded-2xl sm:rounded-3xl px-3 sm:px-4 md:px-6 h-14 sm:h-16 flex items-center border border-white/10 bg-transparent">
          {/* Glow overlay */}
          <div className="pointer-events-none absolute inset-[1px] rounded-[inherit] bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-teal-400/20 opacity-40 mix-blend-soft-light" />
          <div className="relative flex items-center gap-2 sm:gap-4 w-full">
            {/* Toggle sidebar */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 transition-colors"
              aria-label="Basculer la barre latérale"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo + nom */}
            <Link
              href="/"
              className="flex items-center flex-shrink-0 gap-2"
              aria-label="Synaura"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-accent-brand/60 blur-xl opacity-60" />
                <div className="relative w-9 h-9 rounded-2xl bg-black/30 border border-white/15 flex items-center justify-center overflow-hidden backdrop-blur-sm">
                  <Image
                    src="/synaura_symbol.svg"
                    alt="Synaura"
                    width={32}
                    height={32}
                    className="w-5 h-5"
                    priority
                  />
                </div>
              </div>
              <span className="hidden sm:inline text-sm font-semibold tracking-tight text-white">
                Synaura
              </span>
            </Link>

            {/* Search */}
            <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-2xl">
              <div className="relative w-full search-container">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Search className="w-5 h-5 text-white/60" />
                </div>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un titre, un artiste, une playlist..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white placeholder:text-white/50 outline-none transition-all duration-200 focus:bg-white/10 focus:ring-2 focus:ring-violet-400/60 focus:border-violet-300/60"
                />

                {/* Résultats de recherche */}
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

                      {/* Dropdown / modal */}
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="fixed md:absolute top-16 md:top-full left-0 right-0 md:mt-2 bg-transparent md:border border-white/10 md:rounded-2xl backdrop-blur-xl overflow-hidden z-[70]"
                        style={{
                          maxHeight: 'calc(100vh - 80px)',
                          height: 'calc(100vh - 80px)',
                        }}
                      >
                        {/* Header mobile */}
                        <div className="sticky top-0 bg-transparent border-b border-white/10 p-3 flex items-center justify-between md:hidden z-10">
                          <h3 className="text-base font-semibold text-white">
                            {searchLoading
                              ? 'Recherche...'
                              : `${searchResults.total} résultat(s)`}
                          </h3>
                          <button
                            onClick={() => setShowSearchResults(false)}
                            className="p-2 hover:bg-white/5 rounded-full transition-colors"
                            aria-label="Fermer"
                          >
                            <X className="w-5 h-5 text-white/80" />
                          </button>
                        </div>

                        <div
                          className="overflow-y-auto"
                          style={{ height: 'calc(100% - 60px)' }}
                        >
                          <div className="p-2 md:p-2">
                            {/* Tracks */}
                            {searchResults.tracks.length > 0 && (
                              <div className="space-y-0">
                                {searchResults.tracks
                                  .slice(0, 5)
                                  .map((track) => (
                                    <motion.div
                                      key={track._id}
                                      whileHover={{
                                        backgroundColor:
                                          'rgba(255,255,255,0.04)',
                                      }}
                                      whileTap={{ scale: 0.98 }}
                                      className="group flex items-center gap-3 p-3 md:p-2 rounded-md cursor-pointer transition-colors active:bg-white/5"
                                      onClick={() => {
                                        playTrack(track);
                                        setShowSearchResults(false);
                                      }}
                                    >
                                      <div className="relative w-14 h-14 md:w-12 md:h-12 rounded-md overflow-hidden bg-white/5 flex-shrink-0">
                                        <img
                                          src={
                                            getValidImageUrl(
                                              track.coverUrl,
                                              '/default-cover.jpg',
                                            ) || '/default-cover.jpg'
                                          }
                                          alt={track.title}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.currentTarget.style.display =
                                              'none';
                                            e.currentTarget.nextElementSibling?.classList.remove(
                                              'hidden',
                                            );
                                          }}
                                        />
                                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg hidden">
                                          {track.title[0]?.toUpperCase() ||
                                            '?'}
                                        </div>
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg transform scale-95 group-hover:scale-100 transition-transform">
                                            <Play className="w-4 h-4 text-black fill-black ml-0.5" />
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">
                                          {track.title}
                                        </p>
                                        <p className="text-xs text-white/60 truncate">
                                          Créations • {track.artist.name}
                                        </p>
                                      </div>
                                      <span className="hidden md:inline text-xs text-white/40">
                                        {formatDuration(track.duration)}
                                      </span>
                                    </motion.div>
                                  ))}
                              </div>
                            )}

                            {/* Artists */}
                            {searchResults.artists.length > 0 && (
                              <div className="space-y-0 mt-1">
                                {searchResults.artists
                                  .slice(0, 5)
                                  .map((artist) => (
                                    <Link
                                      href={`/profile/${artist.username}`}
                                      key={artist._id}
                                    >
                                      <motion.div
                                        whileHover={{
                                          backgroundColor:
                                            'rgba(255,255,255,0.04)',
                                        }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex items-center gap-3 p-3 md:p-2 rounded-md cursor-pointer transition-colors active:bg-white/5"
                                      >
                                        <Avatar
                                          src={getValidImageUrl(
                                            artist.avatar,
                                            null,
                                          )}
                                        name={artist.name}
                                          username={artist.username}
                                          size="md"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-white truncate">
                                            {artist.name}
                                          </p>
                                          <p className="text-xs text-white/60 truncate">
                                            Artiste •{' '}
                                            {formatNumber(
                                              artist.followers,
                                            )}{' '}
                                            abonné(e)s
                                          </p>
                                        </div>
                                      </motion.div>
                                    </Link>
                                  ))}
                              </div>
                            )}

                            {/* Playlists */}
                            {searchResults.playlists.length > 0 && (
                              <div className="space-y-0 mt-1">
                                {searchResults.playlists
                                  .slice(0, 5)
                                  .map((playlist) => (
                                    <Link
                                      href={`/playlist/${playlist._id}`}
                                      key={playlist._id}
                                    >
                                      <motion.div
                                        whileHover={{
                                          backgroundColor:
                                            'rgba(255,255,255,0.04)',
                                        }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex items-center gap-3 p-3 md:p-2 rounded-md cursor-pointer transition-colors active:bg-white/5"
                                      >
                                        <div className="w-14 h-14 md:w-12 md:h-12 rounded-md overflow-hidden bg-white/5 flex-shrink-0">
                                          <img
                                            src={
                                              getValidImageUrl(
                                                playlist.coverUrl,
                                                '/default-cover.jpg',
                                              ) || '/default-cover.jpg'
                                            }
                                            alt={playlist.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.currentTarget.style.display =
                                                'none';
                                              e.currentTarget.nextElementSibling?.classList.remove(
                                                'hidden',
                                              );
                                            }}
                                          />
                                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg hidden">
                                            {playlist.name[0]?.toUpperCase() ||
                                              '?'}
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-white truncate">
                                            {playlist.name}
                                          </p>
                                          <p className="text-xs text-white/60 truncate">
                                            Playlist •{' '}
                                            {playlist.creator?.username ||
                                              'Utilisateur'}
                                          </p>
                                        </div>
                                      </motion.div>
                                    </Link>
                                  ))}
                              </div>
                            )}

                            {/* Aucun résultat */}
                            {!searchLoading &&
                              searchResults.total === 0 &&
                              searchQuery.trim() && (
                                <div className="text-center py-12">
                                  <Search className="w-12 h-12 mx-auto mb-3 text-white/30 opacity-40" />
                                  <p className="text-sm font-medium text-white">
                                    Aucun résultat pour "{searchQuery}"
                                  </p>
                                  <p className="text-xs text-white/50 mt-1">
                                    Essayez d&apos;autres mots-clés
                                  </p>
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

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {session ? (
                <>
                  {/* Premium / plan */}
                  {!planLoading && (
                    <>
                      {(userPlan === 'free' || !userPlan) && (
                        <Link
                          href="/subscriptions"
                          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-white text-black hover:scale-105 transition-transform shadow-lg"
                        >
                          <Crown className="w-4 h-4" />
                          <span>Premium</span>
                        </Link>
                      )}

                      {userPlan === 'starter' && (
                        <Link
                          href="/subscriptions"
                          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:scale-105 transition-transform shadow-lg"
                        >
                          <Crown className="w-4 h-4" />
                          <span>Passer Pro</span>
                        </Link>
                      )}
                    </>
                  )}

                  {/* IA */}
                  <Link
                    href="/ai-generator"
                    className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm font-bold bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 hover:from-violet-500 hover:via-fuchsia-500 hover:to-cyan-300 text-white shadow-[0_0_26px_rgba(129,140,248,0.9)] hover:scale-105 active:scale-95 transition-all"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span className="hidden sm:inline">Générateur IA</span>
                    <span className="sm:hidden">IA</span>
                  </Link>

                  {/* Notifications */}
                  <NotificationCenter />

                  {/* Profil */}
                  <button
                    onClick={goToProfile}
                    className="flex items-center gap-2 px-2 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    aria-label="Profil"
                  >
                    <Avatar
                      src={getValidImageUrl(
                        (session?.user as any)?.avatar ||
                          (session?.user as any)?.image,
                        null,
                      )}
                      name={(session?.user as any)?.name}
                      username={(session?.user as any)?.username}
                      size="sm"
                    />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm font-bold bg-white text-black hover:scale-105 transition-transform shadow-lg"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Se connecter</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
