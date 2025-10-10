'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Search, Sun, Moon, Bell, Plus, Music, User, Disc3, X, Headphones, Play, Sparkles, TrendingUp, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioPlayer } from '../app/providers';
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
  name: string; // Nom réel de l'artiste
  avatar?: string; // URL de l'avatar (sans @)
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
  const [searchResults, setSearchResults] = useState<SearchResults>({ tracks: [], artists: [], playlists: [], total: 0 });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Service audio pour lancer les tracks
  const { playTrack, audioState } = useAudioPlayer();
  
  const goToProfile = () => {
    const username = (session?.user as any)?.username;
    if (username) {
      window.location.href = `/profile/${username}`;
    } else {
      window.location.href = '/auth/signin';
    }
  };

  // (toggle theme removed)

  // Fonction pour effectuer la recherche
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ tracks: [], artists: [], playlists: [], total: 0 });
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&filter=all&limit=10`);
      if (response.ok) {
        const data = await response.json();
        
        if (!data || typeof data !== 'object') {
          setSearchResults({ tracks: [], artists: [], playlists: [], total: 0 });
          return;
        }
        
        const safeData = {
          tracks: Array.isArray(data.tracks) ? data.tracks : [],
          artists: Array.isArray(data.artists) ? data.artists : [],
          playlists: Array.isArray(data.playlists) ? data.playlists : [],
          total: data.totalResults || (data.tracks?.length || 0) + (data.artists?.length || 0) + (data.playlists?.length || 0)
        };
        
        setSearchResults(safeData);
        setShowSearchResults(true);
      } else {
        setSearchResults({ tracks: [], artists: [], playlists: [], total: 0 });
      }
    } catch (error) {
      setSearchResults({ tracks: [], artists: [], playlists: [], total: 0 });
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Gérer la recherche lors de la saisie
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

  // Fermer les résultats en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fonction helper pour valider les URLs d'images
  const getValidImageUrl = (url: string | undefined, fallback: string | null): string | null => {
    if (!url || url === '' || url === 'null' || url === 'undefined') {
      return fallback;
    }
    
    // Si l'URL est relative, la rendre absolue
    if (url.startsWith('/')) {
      return url;
    }
    
    // Si c'est une URL Cloudinary, la valider
    if (url.includes('cloudinary.com')) {
      return url;
    }
    
    // Si c'est une URL externe, vérifier qu'elle commence par http/https
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    return fallback;
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-2 sm:px-4 md:px-6 py-2">
        <div className="panel-suno rounded-xl sm:rounded-2xl px-2 sm:px-3 md:px-4 h-14 sm:h-16 flex items-center gap-2 sm:gap-3 border border-[var(--border)]/80 bg-[var(--surface)]/60">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 sm:gap-2">
            <Image src="/synaura_symbol.svg" alt="Synaura" width={24} height={24} className="sm:w-7 sm:h-7" priority />
            <span className="hidden sm:block font-extrabold tracking-tight text-base sm:text-lg">Synaura</span>
          </Link>

          {/* Search - Visible sur mobile */}
          <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-2 sm:mx-4">
            <div className="relative w-full search-container">
              <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--text-muted)]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-[var(--bg)]/60 border border-[var(--border)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
              
              {/* Résultats de recherche modale */}
              <AnimatePresence>
                {showSearchResults && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 right-0 mt-2 panel-suno bg-[var(--surface)]/95 border border-[var(--border)] rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50"
                  >
                    {/* Header des résultats */}
                    <div className="p-4 border-b border-[var(--border)]">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-[var(--text)]">
                          {searchLoading ? 'Recherche...' : `${searchResults.total} résultat(s)`}
                        </h3>
                        <button
                          onClick={() => setShowSearchResults(false)}
                          className="p-1 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Contenu des résultats */}
                    <div className="p-4 space-y-4">
                      {/* Tracks - Cliquables pour lancer la lecture */}
                      {searchResults.tracks.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2 flex items-center gap-2">
                            <Music size={14} />
                            Créations
                          </h4>
                          <div className="space-y-2">
                            {searchResults.tracks.slice(0, 3).map((track) => (
                              <motion.div
                                key={track._id}
                                whileHover={{ backgroundColor: 'var(--surface-2)' }}
                                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
                                onClick={() => playTrack(track)}
                              >
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                                  <img
                                    src={getValidImageUrl(track.coverUrl, '/default-cover.jpg') || '/default-cover.jpg'}
                                    alt={track.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg hidden">
                                    {track.title[0]?.toUpperCase() || '?'}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[var(--text)] truncate">
                                    {track.title}
                                  </p>
                                  <p className="text-xs text-[var(--text-muted)] truncate">
                                    {track.artist.name}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                  <span>{formatDuration(track.duration)}</span>
                                  <div className="flex items-center gap-1">
                                    <Headphones size={12} />
                                    {formatNumber(track.plays)}
                                  </div>
                                                                     {/* Bouton play et indicateur de lecture */}
                                   <div className="flex items-center gap-1">
                                     {audioState.tracks[audioState.currentTrackIndex]?._id === track._id && audioState.isPlaying ? (
                                       <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                                     ) : (
                                       <Play size={12} className="text-purple-400" />
                                     )}
                                   </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Artists - Cliquables pour ouvrir la page */}
                      {searchResults.artists.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2 flex items-center gap-2">
                            <User size={14} />
                            Artistes
                          </h4>
                          <div className="space-y-2">
                            {searchResults.artists.slice(0, 3).map((artist) => (
                              <Link href={`/profile/${artist.username}`} key={artist._id}>
                                <motion.div
                                  whileHover={{ backgroundColor: 'var(--surface-2)' }}
                                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
                                >
                                  <Avatar
                                    src={getValidImageUrl(artist.avatar, null)}
                                    name={artist.name}
                                    username={artist.username}
                                    size="md"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[var(--text)] truncate">
                                      {artist.name}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)] truncate">
                                      @{artist.username} • {formatNumber(artist.followers)} abonnés
                                    </p>
                                  </div>
                                </motion.div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Playlists - Cliquables pour ouvrir la page */}
                      {searchResults.playlists.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2 flex items-center gap-2">
                            <Disc3 size={14} />
                            Playlists
                          </h4>
                          <div className="space-y-2">
                            {searchResults.playlists.slice(0, 3).map((playlist) => (
                              <Link href={`/playlist/${playlist._id}`} key={playlist._id}>
                                <motion.div
                                  whileHover={{ backgroundColor: 'var(--surface-2)' }}
                                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
                                >
                                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                                    <img
                                      src={getValidImageUrl(playlist.coverUrl, '/default-cover.jpg') || '/default-cover.jpg'}
                                      alt={playlist.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg hidden">
                                      {playlist.name[0]?.toUpperCase() || '?'}
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[var(--text)] truncate">
                                      {playlist.name}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)] truncate">
                                      par {playlist.creator?.username || 'Utilisateur'}
                                    </p>
                                  </div>
                                  <div className="text-xs text-[var(--text-muted)]">
                                    {playlist.tracks_count} pistes
                                  </div>
                                </motion.div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Aucun résultat */}
                      {!searchLoading && searchResults.total === 0 && searchQuery.trim() && (
                        <div className="text-center py-8">
                          <p className="text-sm text-[var(--text-muted)]">
                            Aucun résultat pour "{searchQuery}"
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Actions - Mobile optimisé */}
          <div className="flex items-center gap-1 sm:gap-2">
            {session ? (
              <>
                <Link href="/stats" className="hidden lg:inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:block">Stats</span>
                </Link>
                <Link href="/ai-generator" className="btn-suno inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:block text-sm">IA</span>
                </Link>
                {/* Upload button removed from top navbar */}
                <NotificationCenter />
                {/* theme toggle removed */}
                {/* Profil (avatar) */}
                <button
                  onClick={goToProfile}
                  className="flex items-center gap-2 ml-1 px-2 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-2)]"
                  aria-label="Profil"
                >
                  <Avatar
                    src={getValidImageUrl((session?.user as any)?.avatar || (session?.user as any)?.image, null)}
                    name={(session?.user as any)?.name}
                    username={(session?.user as any)?.username}
                    size="sm"
                  />
                  <span className="hidden md:block text-xs sm:text-sm text-white/90 font-medium">Profil</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-md">
                  <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:block">Se connecter</span>
                </Link>
                {/* theme toggle removed */}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
