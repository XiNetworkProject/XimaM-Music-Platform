'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music, 
  Heart, 
  Clock, 
  Download, 
  Plus, 
  Play, 
  Pause,
  MoreVertical,
  Search,
  Filter,
  Grid,
  List,
  X,
  Edit3,
  Trash2,
  Share2,
  Shuffle,
  Repeat,
  Eye,
  EyeOff,
  FolderPlus,
  Sparkles,
  User,
  Calendar,
  Users,
  Star,
  Volume2,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { useBatchLikeSystem } from '@/hooks/useLikeSystem';
import { useBatchPlaysSystem } from '@/hooks/usePlaysSystem';

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
  coverUrl?: string;
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

type TabType = 'playlists' | 'recent' | 'favorites' | 'downloads';
type ViewMode = 'grid' | 'list';

export default function LibraryPage() {
  const { data: session } = useSession();
  const { audioState, playTrack, setQueueAndPlay } = useAudioPlayer();
  const { toggleLikeBatch } = useBatchLikeSystem();
  const { incrementPlaysBatch } = useBatchPlaysSystem();

  // États principaux
  const [activeTab, setActiveTab] = useState<TabType>('playlists');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États pour les modals
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState<string | null>(null);
  const [showPlaylistSettings, setShowPlaylistSettings] = useState<string | null>(null);

  // Données
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [favoriteTracks, setFavoriteTracks] = useState<Track[]>([]);
  const [downloadedTracks, setDownloadedTracks] = useState<Track[]>([]);
  const [allTracks, setAllTracks] = useState<Track[]>([]);

  // État pour création de playlist
  const [newPlaylist, setNewPlaylist] = useState({
    name: '',
    description: '',
    isPublic: true
  });

  // Charger les données
  const fetchLibraryData = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Charger les playlists
      const playlistsResponse = await fetch(`/api/playlists/simple?user=${session.user.id}`);
      if (playlistsResponse.ok) {
        const playlistsData = await playlistsResponse.json();
        setPlaylists(playlistsData.playlists || []);
      }

      // Charger les pistes récentes
      const recentResponse = await fetch('/api/tracks?recent=true&limit=20');
      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        setRecentTracks(recentData.tracks || []);
      }

      // Charger les favoris
      const favoritesResponse = await fetch('/api/tracks?liked=true&limit=50');
      if (favoritesResponse.ok) {
        const favoritesData = await favoritesResponse.json();
        setFavoriteTracks(favoritesData.tracks || []);
      }

      // Charger toutes les pistes
      const allTracksResponse = await fetch('/api/tracks?limit=100');
      if (allTracksResponse.ok) {
        const allTracksData = await allTracksResponse.json();
        setAllTracks(allTracksData.tracks || []);
      }

      // Simulation des téléchargements
      setDownloadedTracks([]);

    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setError('Erreur lors du chargement de la bibliothèque');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchLibraryData();
  }, [fetchLibraryData]);

  // Fonctions utilitaires
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

  const isCurrentlyPlaying = (trackId: string) => {
    return audioState.tracks[audioState.currentTrackIndex]?._id === trackId && audioState.isPlaying;
  };

  // Créer une playlist
  const createPlaylist = async () => {
    if (!newPlaylist.name.trim()) return;

    try {
      const response = await fetch('/api/playlists/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlaylist),
      });

      if (response.ok) {
        const playlist = await response.json();
        setPlaylists(prev => [playlist, ...prev]);
        setNewPlaylist({ name: '', description: '', isPublic: true });
        setShowCreatePlaylist(false);
      }
    } catch (error) {
      console.error('Erreur création playlist:', error);
    }
  };

  // Supprimer une playlist
  const deletePlaylist = async (playlistId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette playlist ?')) return;

    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPlaylists(prev => prev.filter(p => p._id !== playlistId));
        if (selectedPlaylist === playlistId) {
          setSelectedPlaylist(null);
        }
      }
    } catch (error) {
      console.error('Erreur suppression playlist:', error);
    }
  };

  // Jouer une playlist
  const playPlaylist = async (playlist: Playlist) => {
    if (playlist.tracks.length === 0) return;
    try {
      setQueueAndPlay(playlist.tracks, 0);
    } catch (error) {
      console.error('Erreur lecture playlist:', error);
    }
  };

  // Gérer les likes
  const handleLikeTrack = async (trackId: string) => {
    try {
      await toggleLikeBatch(trackId, { isLiked: false, likesCount: 0 });
      setFavoriteTracks(prev => prev.map(track => 
        track._id === trackId 
          ? { ...track, isLiked: !track.isLiked }
          : track
      ));
    } catch (error) {
      console.error('Erreur like:', error);
    }
  };

  // Filtrer les données
  const filteredPlaylists = useMemo(() => 
    playlists.filter(playlist => 
      playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      playlist.description.toLowerCase().includes(searchQuery.toLowerCase())
    ), [playlists, searchQuery]
  );

  const filteredRecentTracks = useMemo(() => 
    recentTracks.filter(track => 
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [recentTracks, searchQuery]
  );

  const filteredFavoriteTracks = useMemo(() => 
    favoriteTracks.filter(track => 
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [favoriteTracks, searchQuery]
  );

  const currentPlaylist = playlists.find(p => p._id === selectedPlaylist);

  // États de chargement et erreur
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">Chargement de votre bibliothèque...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={24} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Erreur de chargement</h2>
          <p className="text-[var(--text-muted)] mb-4">{error}</p>
          <button
            onClick={fetchLibraryData}
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
            <User size={24} className="text-[var(--color-primary)]" />
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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <main className="container mx-auto px-4 pt-20 pb-32">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                <Music size={32} className="text-[var(--color-primary)]" />
                Ma Bibliothèque
              </h1>
              <p className="text-[var(--text-muted)] text-lg mt-2">
                Vos playlists, écoutes récentes et favoris
              </p>
            </div>
            
            <a
              href="/ai-library"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-full font-medium transition-all shadow-lg"
            >
              <Sparkles size={16} />
              <span>Bibliothèque IA</span>
            </a>
          </div>
        </div>

        {/* Barre de recherche et contrôles */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Barre de recherche */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" size={20} />
              <input
                type="text"
                placeholder="Rechercher dans votre bibliothèque..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[var(--bg)] rounded-xl border border-[var(--border)] focus:border-[var(--color-primary)] focus:outline-none text-[var(--text)] placeholder-[var(--text-muted)]"
              />
            </div>

            {/* Contrôles */}
            <div className="flex items-center space-x-3">
              {/* Bouton vue */}
              <div className="flex bg-[var(--surface-2)] rounded-lg p-1">
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

              {/* Bouton créer playlist */}
              {activeTab === 'playlists' && (
                <button
                  onClick={() => setShowCreatePlaylist(true)}
                  className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-full font-medium transition-all"
                >
                  <Plus size={16} />
                  <span>Nouvelle playlist</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
          <div className="flex space-x-1 bg-[var(--surface-2)] rounded-xl p-1">
            {[
              { id: 'playlists', label: 'Playlists', icon: Music },
              { id: 'recent', label: 'Récent', icon: Clock },
              { id: 'favorites', label: 'Favoris', icon: Heart },
              { id: 'downloads', label: 'Téléchargements', icon: Download }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as TabType)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === id
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'playlists' && (
              <motion.div
                key="playlists"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {selectedPlaylist ? (
                  // Vue détaillée de la playlist
                  <div>
                    <div className="flex items-center space-x-4 mb-6">
                      <button
                        onClick={() => setSelectedPlaylist(null)}
                        className="p-2 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
                      >
                        ←
                      </button>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold">{currentPlaylist?.name}</h2>
                        <p className="text-[var(--text-muted)]">{currentPlaylist?.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => playPlaylist(currentPlaylist!)}
                          className="w-12 h-12 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-full flex items-center justify-center transition-all"
                        >
                          <Play size={20} />
                        </button>
                        <button
                          onClick={() => deletePlaylist(currentPlaylist!._id)}
                          className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Liste des pistes */}
                    <div className="space-y-2">
                      {currentPlaylist?.tracks.map((track, index) => (
                        <motion.div
                          key={track._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center space-x-3 p-3 bg-[var(--surface-2)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
                        >
                          <span className="text-[var(--text-muted)] text-sm w-8">{index + 1}</span>
                          <img
                            src={track.coverUrl || '/default-cover.jpg'}
                            alt={track.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{track.title}</h4>
                            <p className="text-sm text-[var(--text-muted)] truncate">
                              {track.artist?.name || track.artist?.username}
                            </p>
                          </div>
                          <button
                            onClick={() => playTrack(track)}
                            className="p-2 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
                          >
                            {isCurrentlyPlaying(track._id) ? (
                              <Pause size={16} />
                            ) : (
                              <Play size={16} />
                            )}
                          </button>
                          <span className="text-[var(--text-muted)] text-sm">
                            {formatDuration(track.duration)}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Liste des playlists
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold">Mes Playlists</h2>
                      <div className="text-[var(--text-muted)] text-sm">
                        {filteredPlaylists.length} playlist{filteredPlaylists.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {filteredPlaylists.length === 0 ? (
                      <div className="text-center py-12">
                        <FolderPlus className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
                        <p className="text-[var(--text-muted)] mb-4">
                          {searchQuery ? 'Aucune playlist trouvée' : 'Aucune playlist créée'}
                        </p>
                        {!searchQuery && (
                          <button
                            onClick={() => setShowCreatePlaylist(true)}
                            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-3 rounded-full font-medium transition-all"
                          >
                            Créer une playlist
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
                        {filteredPlaylists.map((playlist) => (
                          <motion.div
                            key={playlist._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`bg-[var(--surface-2)] rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer ${
                              viewMode === 'list' ? 'flex items-center space-x-4 p-4' : 'p-4'
                            }`}
                            onClick={() => setSelectedPlaylist(playlist._id)}
                          >
                            {viewMode === 'grid' ? (
                              <>
                                <img
                                  src={playlist.coverUrl || '/default-cover.jpg'}
                                  alt={playlist.name}
                                  className="w-full h-32 object-cover rounded-lg mb-3"
                                />
                                <h3 className="font-semibold mb-1">{playlist.name}</h3>
                                <p className="text-sm text-[var(--text-muted)] mb-2">{playlist.description}</p>
                                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                                  <span>{playlist.trackCount} pistes</span>
                                  <span>{formatDuration(playlist.duration)}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <img
                                  src={playlist.coverUrl || '/default-cover.jpg'}
                                  alt={playlist.name}
                                  className="w-16 h-16 rounded object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold">{playlist.name}</h3>
                                  <p className="text-sm text-[var(--text-muted)]">{playlist.description}</p>
                                  <div className="flex items-center space-x-4 text-xs text-[var(--text-muted)] mt-1">
                                    <span>{playlist.trackCount} pistes</span>
                                    <span>{formatDuration(playlist.duration)}</span>
                                    <span className={`flex items-center space-x-1 ${playlist.isPublic ? 'text-green-400' : 'text-yellow-400'}`}>
                                      {playlist.isPublic ? <Eye size={12} /> : <EyeOff size={12} />}
                                      <span>{playlist.isPublic ? 'Publique' : 'Privée'}</span>
                                    </span>
                                  </div>
                                </div>
                              </>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
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
                <h2 className="text-xl font-bold mb-6">Écouté Récemment</h2>
                
                {filteredRecentTracks.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--text-muted)]">
                      {searchQuery ? 'Aucun résultat trouvé' : 'Aucune écoute récente'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRecentTracks.map((track, index) => (
                      <motion.div
                        key={track._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-3 p-3 bg-[var(--surface-2)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
                      >
                        <img
                          src={track.coverUrl || '/default-cover.jpg'}
                          alt={track.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{track.title}</h4>
                          <p className="text-sm text-[var(--text-muted)] truncate">
                            {track.artist?.name || track.artist?.username}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setShowAddToPlaylist(track._id)}
                            className="p-2 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => playTrack(track)}
                            className="p-2 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
                          >
                            {isCurrentlyPlaying(track._id) ? (
                              <Pause size={16} />
                            ) : (
                              <Play size={16} />
                            )}
                          </button>
                        </div>
                        <div className="text-right">
                          <span className="text-[var(--text-muted)] text-sm block">
                            {formatDuration(track.duration)}
                          </span>
                          <span className="text-[var(--text-muted)] text-xs">
                            {formatNumber(track.plays)} écoutes
                          </span>
                        </div>
                      </motion.div>
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
                <h2 className="text-xl font-bold mb-6">Mes Favoris</h2>
                
                {filteredFavoriteTracks.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--text-muted)] mb-4">
                      {searchQuery ? 'Aucun résultat trouvé' : 'Aucun favori pour le moment'}
                    </p>
                    {!searchQuery && (
                      <a
                        href="/discover"
                        className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-3 rounded-full font-medium transition-all"
                      >
                        Découvrir de la musique
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredFavoriteTracks.map((track, index) => (
                      <motion.div
                        key={track._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-3 p-3 bg-[var(--surface-2)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
                      >
                        <img
                          src={track.coverUrl || '/default-cover.jpg'}
                          alt={track.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{track.title}</h4>
                          <p className="text-sm text-[var(--text-muted)] truncate">
                            {track.artist?.name || track.artist?.username}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleLikeTrack(track._id)}
                            className="p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                          >
                            <Heart size={16} fill="currentColor" />
                          </button>
                          <button
                            onClick={() => setShowAddToPlaylist(track._id)}
                            className="p-2 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => playTrack(track)}
                            className="p-2 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
                          >
                            {isCurrentlyPlaying(track._id) ? (
                              <Pause size={16} />
                            ) : (
                              <Play size={16} />
                            )}
                          </button>
                        </div>
                        <div className="text-right">
                          <span className="text-[var(--text-muted)] text-sm block">
                            {formatDuration(track.duration)}
                          </span>
                          <span className="text-[var(--text-muted)] text-xs">
                            {formatNumber(track.likes.length)} likes
                          </span>
                        </div>
                      </motion.div>
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
                <h2 className="text-xl font-bold mb-6">Téléchargements</h2>
                
                {downloadedTracks.length === 0 ? (
                  <div className="text-center py-12">
                    <Download className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--text-muted)] mb-4">Aucun téléchargement pour le moment</p>
                    <p className="text-[var(--text-muted)] text-sm">Les musiques que vous téléchargez apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {downloadedTracks.map((track, index) => (
                      <motion.div
                        key={track._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-3 p-3 bg-[var(--surface-2)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
                      >
                        <img
                          src={track.coverUrl || '/default-cover.jpg'}
                          alt={track.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{track.title}</h4>
                          <p className="text-sm text-[var(--text-muted)] truncate">
                            {track.artist?.name || track.artist?.username}
                          </p>
                        </div>
                        <button
                          onClick={() => playTrack(track)}
                          className="p-2 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
                        >
                          {isCurrentlyPlaying(track._id) ? (
                            <Pause size={16} />
                          ) : (
                            <Play size={16} />
                          )}
                        </button>
                        <span className="text-[var(--text-muted)] text-sm">
                          {formatDuration(track.duration)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal de création de playlist */}
        <AnimatePresence>
          {showCreatePlaylist && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Créer une playlist</h3>
                  <button
                    onClick={() => setShowCreatePlaylist(false)}
                    className="p-2 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-2">Nom</label>
                    <input
                      type="text"
                      value={newPlaylist.name}
                      onChange={(e) => setNewPlaylist(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nom de la playlist"
                      className="w-full px-3 py-2 bg-[var(--bg)] rounded-lg text-[var(--text)] border border-[var(--border)] focus:border-[var(--color-primary)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-2">Description</label>
                    <textarea
                      value={newPlaylist.description}
                      onChange={(e) => setNewPlaylist(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description (optionnel)"
                      rows={3}
                      className="w-full px-3 py-2 bg-[var(--bg)] rounded-lg text-[var(--text)] border border-[var(--border)] focus:border-[var(--color-primary)] focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setNewPlaylist(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                        newPlaylist.isPublic 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                      }`}
                    >
                      {newPlaylist.isPublic ? <Eye size={16} /> : <EyeOff size={16} />}
                      <span className="text-sm">
                        {newPlaylist.isPublic ? 'Publique' : 'Privée'}
                      </span>
                    </button>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setShowCreatePlaylist(false)}
                      className="flex-1 py-2 px-4 bg-[var(--surface-2)] rounded-lg text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={createPlaylist}
                      disabled={!newPlaylist.name.trim()}
                      className="flex-1 py-2 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Créer
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal d'ajout à une playlist */}
        <AnimatePresence>
          {showAddToPlaylist && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md max-h-96 overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Ajouter à une playlist</h3>
                  <button
                    onClick={() => setShowAddToPlaylist(null)}
                    className="p-2 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-2">
                  {playlists.map((playlist) => (
                    <button
                      key={playlist._id}
                      onClick={() => {
                        // TODO: Implémenter l'ajout à la playlist
                        setShowAddToPlaylist(null);
                      }}
                      className="w-full flex items-center space-x-3 p-3 bg-[var(--surface-2)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
                    >
                      <img
                        src={playlist.coverUrl || '/default-cover.jpg'}
                        alt={playlist.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="flex-1 text-left">
                        <h4 className="font-medium">{playlist.name}</h4>
                        <p className="text-sm text-[var(--text-muted)]">{playlist.trackCount} pistes</p>
                      </div>
                      <Plus size={16} className="text-[var(--text-muted)]" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}