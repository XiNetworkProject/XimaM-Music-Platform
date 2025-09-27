'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  Heart,
  Clock,
  Download,
  Grid,
  List,
  Play,
  Pause,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import { useBatchLikeSystem } from '@/hooks/useLikeSystem';
import { useBatchPlaysSystem } from '@/hooks/usePlaysSystem';

type TabKey = 'overview' | 'playlists' | 'favorites' | 'recent' | 'downloads';

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
  genre: string[];
  tags: string[];
  likes: string[];
  comments: string[];
  plays: number;
  isLiked?: boolean;
  createdAt: string;
}

interface Playlist {
  _id: string;
  name: string;
  description: string;
  coverUrl?: string | null;
  trackCount: number;
  duration: number;
  isPublic: boolean;
  tracks: Track[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  likes: string[];
  followers: string[];
}

function optimizeImage(url?: string | null) {
  if (!url) return '/default-cover.jpg';
  return url.includes('/upload/') ? url.replace('/upload/', '/upload/f_auto,q_auto/') : url;
}

export default function LibraryPage() {
  const { data: session } = useSession();
  const { audioState, playTrack, setQueueAndPlay } = useAudioPlayer();
  const { toggleLikeBatch } = useBatchLikeSystem();
  const { incrementPlaysBatch } = useBatchPlaysSystem();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [favoriteTracks, setFavoriteTracks] = useState<Track[]>([]);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [downloadedTracks, setDownloadedTracks] = useState<Track[]>([]);

  const isPlayingTrack = useCallback(
    (trackId: string) => audioState.tracks[audioState.currentTrackIndex]?._id === trackId && audioState.isPlaying,
    [audioState]
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [plRes, recentRes, favRes, allRes] = await Promise.all([
        fetch('/api/playlists/simple?user=' + session.user.id),
        fetch('/api/tracks?recent=true&limit=20', {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
          },
        }),
        fetch('/api/tracks?liked=true&limit=50', {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
          },
        }),
        fetch('/api/tracks?limit=100', {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
          },
        }),
      ]);

      const sanitizeTrack = (t: any): Track => ({
        ...t,
        coverUrl: t?.coverUrl || undefined,
        artist: {
          ...(t?.artist || {}),
          avatar: t?.artist?.avatar || undefined,
        },
      });

      if (plRes.ok) {
        const json = await plRes.json();
        const pls: Playlist[] = (json.playlists || []).map((p: any) => ({
          ...p,
          coverUrl: p?.coverUrl || undefined,
          tracks: Array.isArray(p?.tracks) ? p.tracks.map(sanitizeTrack) : [],
        }));
        setPlaylists(pls);
      }
      if (recentRes.ok) {
        const json = await recentRes.json();
        setRecentTracks(Array.isArray(json.tracks) ? json.tracks.map(sanitizeTrack) : []);
      }
      if (favRes.ok) {
        const json = await favRes.json();
        setFavoriteTracks(Array.isArray(json.tracks) ? json.tracks.map(sanitizeTrack) : []);
      }
      if (allRes.ok) {
        const json = await allRes.json();
        setAllTracks(Array.isArray(json.tracks) ? json.tracks.map(sanitizeTrack) : []);
      }

      setDownloadedTracks([]);
      setError(null);
    } catch (e) {
      setError('Erreur lors du chargement de la bibliothèque');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) setLoading(false);
    }, 10000);
    fetchData();
    return () => clearTimeout(timeoutId);
  }, [fetchData]);

  const filteredPlaylists = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return playlists.filter((p) =>
      p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [playlists, searchQuery]);

  const filteredRecent = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return recentTracks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.artist.name.toLowerCase().includes(q)
    );
  }, [recentTracks, searchQuery]);

  const filteredFavorites = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return favoriteTracks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.artist.name.toLowerCase().includes(q)
    );
  }, [favoriteTracks, searchQuery]);

  const DiscCard = ({ track, index }: { track: Track; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group flex flex-col items-center text-center"
    >
      <div className="relative">
        <img
          src={optimizeImage(track.coverUrl)}
          alt={track.title}
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border border-[var(--border)] shadow-md"
          loading="lazy"
          decoding="async"
        />
        <button
          onClick={() => playTrack(track)}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 group-hover:bg-black/40 transition-colors"
        >
          {isPlayingTrack(track._id) ? (
            <Pause className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={22} />
          ) : (
            <Play className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={22} />
          )}
        </button>
      </div>
      <div className="mt-2 w-28 sm:w-32">
        <div className="truncate text-sm font-medium">{track.title}</div>
        <div className="truncate text-xs text-[var(--text-muted)]">{track.artist?.name || track.artist?.username}</div>
      </div>
    </motion.div>
  );

  const PlaylistCard = ({ playlist, index }: { playlist: Playlist; index: number }) => (
    <motion.button
      onClick={() => {
        if (playlist.tracks?.length) setQueueAndPlay(playlist.tracks, 0);
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="text-left bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-3 border border-[var(--border)]"
    >
      <img
        src={optimizeImage(playlist.coverUrl)}
        alt={playlist.name}
        className="w-full h-36 object-cover rounded-lg"
        loading="lazy"
        decoding="async"
      />
      <div className="mt-2">
        <div className="font-semibold truncate">{playlist.name}</div>
        <div className="text-xs text-white/60 truncate">
          {playlist.trackCount} piste{playlist.trackCount !== 1 ? 's' : ''} • {formatDuration(playlist.duration)}
        </div>
      </div>
    </motion.button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p>Chargement de votre bibliothèque...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400">!</span>
          </div>
          <h2 className="text-xl font-bold mb-2">Erreur de chargement</h2>
          <p className="text-[var(--text-muted)] mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchData();
            }}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-lg transition-all"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-[var(--color-primary)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Music size={24} className="text-[var(--color-primary)]" />
          </div>
          <h2 className="text-xl font-bold mb-2">Connexion requise</h2>
          <p className="text-[var(--text-muted)] mb-4">Connectez-vous pour accéder à votre bibliothèque</p>
          <a
            href="/auth/signin"
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-3 rounded-lg font-medium transition-all"
          >
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[var(--text)] overflow-x-hidden w-full">
      <main className="container mx-auto px-2 sm:px-4 pt-16 pb-32">
        <div className="w-full max-w-none sm:max-w-6xl sm:mx-auto overflow-hidden">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)] flex items-center gap-3">
                <Music size={28} className="text-[var(--color-primary)]" />
                Ma Bibliothèque
              </h1>
              <a
                href="/ai-library"
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-full font-medium transition-all shadow-lg"
              >
                <Sparkles size={16} />
                <span>Bibliothèque IA</span>
              </a>
            </div>
            <p className="text-[var(--text-muted)]">Vos playlists, écoutes récentes et favoris.</p>
          </div>

          <div className="panel-suno border border-[var(--border)] rounded-xl p-3 sm:p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="relative flex-1 max-w-xs sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                <input
                  type="text"
                  placeholder="Rechercher dans votre bibliothèque..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[var(--bg)] rounded-xl border border-[var(--border)] focus:border-[var(--color-primary)] focus:outline-none text-[var(--text)] placeholder-[var(--text-muted)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="panel-suno border border-[var(--border)] rounded-xl p-3 sm:p-6 mb-6">
            <div className="flex gap-1 bg-[var(--surface-2)] rounded-xl p-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'overview' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Aperçu
              </button>
              <button
                onClick={() => setActiveTab('playlists')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'playlists' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Playlists
              </button>
              <button
                onClick={() => setActiveTab('recent')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'recent' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Récent
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'favorites' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Favoris
              </button>
              <button
                onClick={() => setActiveTab('downloads')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'downloads' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Téléchargements
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Favoris */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Heart size={18} className="text-red-400" />
                      Favoris
                    </h2>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('favorites'); }} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">Tout voir</a>
                  </div>
                  {filteredFavorites.length === 0 ? (
                    <div className="text-white/60 text-sm">Aucun favori pour le moment.</div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                      {filteredFavorites.slice(0, 12).map((t, i) => (
                        <DiscCard key={t._id} track={t} index={i} />
                      ))}
                    </div>
                  )}
                </section>

                {/* Récents */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Clock size={18} className="text-blue-400" />
                      Récemment écoutés
                    </h2>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('recent'); }} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">Tout voir</a>
                  </div>
                  {filteredRecent.length === 0 ? (
                    <div className="text-white/60 text-sm">Aucune écoute récente.</div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                      {filteredRecent.slice(0, 12).map((t, i) => (
                        <DiscCard key={t._id} track={t} index={i} />
                      ))}
                    </div>
                  )}
                </section>

                {/* Playlists */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Music size={18} className="text-[var(--color-primary)]" />
                      Mes playlists
                    </h2>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('playlists'); }} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">Tout voir</a>
                  </div>
                  {filteredPlaylists.length === 0 ? (
                    <div className="text-white/60 text-sm">Aucune playlist créée.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredPlaylists.slice(0, 8).map((p, i) => (
                        <PlaylistCard key={p._id} playlist={p} index={i} />
                      ))}
                    </div>
                  )}
                </section>
              </motion.div>
            )}

            {activeTab === 'playlists' && (
              <motion.div
                key="playlists"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Mes Playlists</h2>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-full font-medium transition-all"
                  >
                    <Plus size={16} />
                    Nouvelle playlist
                  </a>
                </div>
                {filteredPlaylists.length === 0 ? (
                  <div className="text-center py-12 text-white/60">Aucune playlist créée</div>
                ) : (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}>
                    {filteredPlaylists.map((p, i) => (
                      <PlaylistCard key={p._id} playlist={p} index={i} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'recent' && (
              <motion.div
                key="recent"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-bold mb-4">Écouté récemment</h2>
                {filteredRecent.length === 0 ? (
                  <div className="text-center py-12 text-white/60">Aucune écoute récente</div>
                ) : (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4' : 'space-y-3'}>
                    {filteredRecent.map((t, i) => (
                      <DiscCard key={t._id} track={t} index={i} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'favorites' && (
              <motion.div
                key="favorites"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-bold mb-4">Mes favoris</h2>
                {filteredFavorites.length === 0 ? (
                  <div className="text-center py-12 text-white/60">Aucun favori pour le moment</div>
                ) : (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4' : 'space-y-3'}>
                    {filteredFavorites.map((t, i) => (
                      <DiscCard key={t._id} track={t} index={i} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'downloads' && (
              <motion.div
                key="downloads"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-bold mb-4">Téléchargements</h2>
                {downloadedTracks.length === 0 ? (
                  <div className="text-center py-12 text-white/60">Aucun téléchargement pour le moment</div>
                ) : (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4' : 'space-y-3'}>
                    {downloadedTracks.map((t, i) => (
                      <DiscCard key={t._id} track={t} index={i} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}


