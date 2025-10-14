'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Search, Bell, Plus, Music, User, Disc3, X, Headphones, Play, Sparkles, LogIn, Crown } from 'lucide-react';
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
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  
  // Service audio pour lancer les tracks
  const { playTrack, audioState } = useAudioPlayer();
  
  // Charger le plan de l'utilisateur
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
      <div className="mx-auto max-w-[2000px] px-2 sm:px-4 md:px-6 py-2">
        <div className="panel-suno rounded-xl sm:rounded-2xl px-3 sm:px-4 md:px-6 h-14 sm:h-16 flex items-center gap-2 sm:gap-4 border border-[var(--border)]/50 bg-[var(--surface)]/95 backdrop-blur-md shadow-lg">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0" aria-label="Synaura">
            <Image src="/synaura_symbol.svg" alt="Synaura" width={32} height={32} className="w-8 h-8 sm:w-9 sm:h-9" priority />
          </Link>

          {/* Search - Style Spotify */}
          <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-2xl">
            <div className="relative w-full search-container">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search className="w-5 h-5 text-[var(--text-muted)]" />
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Que souhaitez-vous écouter ?"
                className="w-full pl-12 pr-4 py-3 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border-none text-sm font-medium text-[var(--text)] placeholder-[var(--text-muted)] outline-none transition-all duration-200 focus:bg-[var(--surface-3)] focus:ring-2 focus:ring-white/20"
              />
              
              {/* Résultats de recherche modale - Style Spotify avec adaptation mobile */}
              <AnimatePresence>
                {showSearchResults && (
                  <>
                    {/* Overlay mobile seulement */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
                      onClick={() => setShowSearchResults(false)}
                    />
                    
                    {/* Dropdown/Modal */}
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.15 }}
                      className="fixed md:absolute top-16 md:top-full left-0 right-0 md:mt-2 bg-[var(--surface)] md:border border-[var(--border)]/50 md:rounded-lg shadow-2xl backdrop-blur-md overflow-hidden z-[70]"
                      style={{ 
                        maxHeight: 'calc(100vh - 80px)',
                        height: 'calc(100vh - 80px)'
                      }}
                    >
                      {/* Header mobile avec bouton fermer */}
                      <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)]/30 p-3 flex items-center justify-between md:hidden z-10">
                        <h3 className="text-base font-semibold text-[var(--text)]">
                          {searchLoading ? 'Recherche...' : `${searchResults.total} résultat(s)`}
                        </h3>
                        <button
                          onClick={() => setShowSearchResults(false)}
                          className="p-2 hover:bg-[var(--surface-2)] rounded-full transition-colors"
                          aria-label="Fermer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="overflow-y-auto" style={{ height: 'calc(100% - 60px)' }}>
                        {/* Contenu des résultats */}
                        <div className="p-2 md:p-2">
                      {/* Tracks - Style Spotify */}
                      {searchResults.tracks.length > 0 && (
                        <div className="space-y-0">
                          {searchResults.tracks.slice(0, 5).map((track) => (
                            <motion.div
                              key={track._id}
                              whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                              whileTap={{ scale: 0.98 }}
                              className="group flex items-center gap-3 p-3 md:p-2 rounded-md cursor-pointer transition-colors active:bg-[var(--surface-2)]"
                              onClick={() => {
                                playTrack(track);
                                setShowSearchResults(false);
                              }}
                            >
                              <div className="relative w-14 h-14 md:w-12 md:h-12 rounded overflow-hidden bg-[var(--surface-3)] flex-shrink-0">
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
                                {/* Overlay play button */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg transform scale-95 group-hover:scale-100 transition-transform">
                                    <Play size={16} className="text-black fill-black ml-0.5" />
                                  </div>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm md:text-sm font-medium text-[var(--text)] truncate">
                                  {track.title}
                                </p>
                                <p className="text-xs md:text-xs text-[var(--text-muted)] truncate">
                                  Créations • {track.artist.name}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {/* Artists - Style Spotify */}
                      {searchResults.artists.length > 0 && (
                        <div className="space-y-0 mt-1">
                          {searchResults.artists.slice(0, 5).map((artist) => (
                            <Link href={`/profile/${artist.username}`} key={artist._id}>
                              <motion.div
                                whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center gap-3 p-3 md:p-2 rounded-md cursor-pointer transition-colors active:bg-[var(--surface-2)]"
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
                                    Artiste
                                  </p>
                                </div>
                              </motion.div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Playlists - Style Spotify */}
                      {searchResults.playlists.length > 0 && (
                        <div className="space-y-0 mt-1">
                          {searchResults.playlists.slice(0, 5).map((playlist) => (
                            <Link href={`/playlist/${playlist._id}`} key={playlist._id}>
                              <motion.div
                                whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center gap-3 p-3 md:p-2 rounded-md cursor-pointer transition-colors active:bg-[var(--surface-2)]"
                              >
                                <div className="w-14 h-14 md:w-12 md:h-12 rounded overflow-hidden bg-[var(--surface-3)] flex-shrink-0">
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
                                    Playlist • {playlist.creator?.username || 'Utilisateur'}
                                  </p>
                                </div>
                              </motion.div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Aucun résultat */}
                      {!searchLoading && searchResults.total === 0 && searchQuery.trim() && (
                        <div className="text-center py-12">
                          <Search className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
                          <p className="text-sm font-medium text-[var(--text)]">
                            Aucun résultat pour "{searchQuery}"
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            Essayez d'utiliser d'autres mots-clés
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

          {/* Actions - Style Spotify modernisé */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {session ? (
              <>
                {/* Bouton Premium - adapté selon le plan */}
                {!planLoading && (
                  <>
                    {/* Plan Free - Afficher "Premium" */}
                    {(userPlan === 'free' || !userPlan) && (
                      <Link 
                        href="/subscriptions" 
                        className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-white text-black hover:scale-105 transition-transform shadow-lg"
                        style={{ flexShrink: 0 }}
                      >
                        <Crown className="w-4 h-4" />
                        <span>Premium</span>
                      </Link>
                    )}
                    
                    {/* Plan Starter - Afficher "Passer en Pro" */}
                    {userPlan === 'starter' && (
                      <Link 
                        href="/subscriptions" 
                        className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:scale-105 transition-transform shadow-lg"
                        style={{ flexShrink: 0 }}
                      >
                        <Crown className="w-4 h-4" />
                        <span>Passer Pro</span>
                      </Link>
                    )}
                    
                    {/* Plan Pro/Enterprise - Ne rien afficher */}
                  </>
                )}
                
                {/* Bouton IA - agrandi et mis en avant */}
                <Link 
                  href="/ai-generator" 
                  className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:scale-105 transition-all"
                  style={{ flexShrink: 0 }}
                >
                  <Sparkles className="w-5 h-5" />
                  <span className="hidden sm:inline">Générateur IA</span>
                  <span className="sm:hidden">IA</span>
                </Link>
                
                {/* Notifications */}
                <NotificationCenter />
                
                {/* Profil (avatar) - Style Spotify */}
                <button
                  onClick={goToProfile}
                  className="flex items-center gap-2 px-2 py-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
                  aria-label="Profil"
                  style={{ flexShrink: 0 }}
                >
                  <Avatar
                    src={getValidImageUrl((session?.user as any)?.avatar || (session?.user as any)?.image, null)}
                    name={(session?.user as any)?.name}
                    username={(session?.user as any)?.username}
                    size="sm"
                  />
                </button>
              </>
            ) : (
              <>
                {/* Bouton connexion pour non-connectés */}
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
    </header>
  );
}
