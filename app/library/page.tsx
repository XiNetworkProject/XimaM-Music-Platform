'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Clock, 
  Plus, 
  Play, 
  Pause,
  MoreVertical, 
  Music, 
  Users,
  User,
  Calendar,
  Shuffle,
  Repeat,
  Edit3,
  Trash2,
  Share2,
  Download,
  Search,
  Filter,
  Grid,
  List,
  X,
  Check,
  FolderPlus,
  Star,
  Eye,
  EyeOff,
  Copy,
  Settings,
  Sparkles
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { useBatchLikeSystem } from '@/hooks/useLikeSystem';
import { useBatchPlaysSystem } from '@/hooks/usePlaysSystem';
// Composants temporairement commentés jusqu'à leur création
// import LikeButton from '@/components/LikeButton';
// import { AnimatedPlaysCounter } from '@/components/AnimatedCounter';

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

export default function LibraryPage() {
  const { data: session } = useSession();
  const { audioState, playTrack, setQueueAndPlay } = useAudioPlayer();
  
  // Utiliser les nouveaux systèmes de likes et écoutes
  const { toggleLikeBatch, isBatchLoading } = useBatchLikeSystem();
  const { incrementPlaysBatch, isBatchLoading: isPlaysLoading } = useBatchPlaysSystem();
  
  // États principaux
  const [activeTab, setActiveTab] = useState<'playlists' | 'recent' | 'favorites' | 'downloads'>('playlists');
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Données
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [favoriteTracks, setFavoriteTracks] = useState<Track[]>([]);
  const [downloadedTracks, setDownloadedTracks] = useState<Track[]>([]);
  const [allTracks, setAllTracks] = useState<Track[]>([]);

  // États pour création/édition de playlist
  const [newPlaylist, setNewPlaylist] = useState({
    name: '',
    description: '',
    isPublic: true
  });

  // Charger les données depuis l'API
  const fetchLibraryData = useCallback(async () => {
    console.log('🔄 fetchLibraryData appelé avec session:', !!session?.user?.id);
    
    if (!session?.user?.id) {
      console.log('❌ Pas de session utilisateur, arrêt du chargement');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Charger les playlists de l'utilisateur
      try {
        console.log('🔄 Tentative de chargement des playlists...');
        const playlistsResponse = await fetch('/api/playlists/simple?user=' + session.user.id);
        console.log('📡 Réponse playlists:', playlistsResponse.status);
        
        if (playlistsResponse.ok) {
          const playlistsData = await playlistsResponse.json();
          console.log('📋 Données playlists reçues:', playlistsData);
          setPlaylists(playlistsData.playlists || []);
        } else {
          console.warn('❌ Erreur lors du chargement des playlists:', playlistsResponse.status);
          const errorText = await playlistsResponse.text();
          console.warn('📄 Détails de l\'erreur:', errorText);
        }
      } catch (error) {
        console.warn('❌ Erreur réseau pour les playlists:', error);
      }

      // Charger les pistes récentes
      try {
        const recentResponse = await fetch('/api/tracks?recent=true&limit=20');
        if (recentResponse.ok) {
          const recentData = await recentResponse.json();
          setRecentTracks(recentData.tracks || []);
        } else {
          console.warn('Erreur lors du chargement des pistes récentes:', recentResponse.status);
        }
      } catch (error) {
        console.warn('Erreur réseau pour les pistes récentes:', error);
      }

      // Charger les favoris
      try {
        const favoritesResponse = await fetch('/api/tracks?liked=true&limit=50');
        if (favoritesResponse.ok) {
          const favoritesData = await favoritesResponse.json();
          setFavoriteTracks(favoritesData.tracks || []);
        } else {
          console.warn('Erreur lors du chargement des favoris:', favoritesResponse.status);
        }
      } catch (error) {
        console.warn('Erreur réseau pour les favoris:', error);
      }

      // Charger toutes les pistes pour l'ajout aux playlists
      try {
        const allTracksResponse = await fetch('/api/tracks?limit=100');
        if (allTracksResponse.ok) {
          const allTracksData = await allTracksResponse.json();
          setAllTracks(allTracksData.tracks || []);
        } else {
          console.warn('Erreur lors du chargement de toutes les pistes:', allTracksResponse.status);
        }
      } catch (error) {
        console.warn('Erreur réseau pour toutes les pistes:', error);
      }

      // Charger les téléchargements (simulation)
      setDownloadedTracks([]);

    } catch (error) {
      console.error('Erreur lors du chargement de la bibliothèque:', error);
      setError('Erreur lors du chargement de la bibliothèque');
      // En cas d'erreur, on met quand même loading à false
    } finally {
      console.log('✅ Chargement terminé, loading mis à false');
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    // Timeout de sécurité pour éviter le chargement infini
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Délai d\'attente dépassé. Vérifiez votre connexion.');
      }
    }, 10000); // 10 secondes

    fetchLibraryData();

    return () => clearTimeout(timeoutId);
  }, [fetchLibraryData]);

  // Créer une nouvelle playlist
  const createPlaylist = async () => {
    if (!newPlaylist.name.trim()) return;

    try {
      setActionLoading(true);
      console.log('🎵 Création de playlist:', newPlaylist);
      
      const response = await fetch('/api/playlists/simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPlaylist),
      });

      console.log('📡 Réponse création playlist:', response.status);

      if (response.ok) {
        const playlist = await response.json();
        console.log('✅ Playlist créée:', playlist);
        setPlaylists(prev => [playlist, ...prev]);
        setNewPlaylist({ name: '', description: '', isPublic: true });
        setShowCreatePlaylist(false);
      } else {
        const errorText = await response.text();
        console.error('❌ Erreur création playlist:', response.status, errorText);
        setError('Erreur lors de la création de la playlist');
      }
    } catch (error) {
      console.error('❌ Erreur réseau création playlist:', error);
      setError('Erreur réseau lors de la création de la playlist');
    } finally {
      setActionLoading(false);
    }
  };

  // Ajouter une piste à une playlist
  const addTrackToPlaylist = async (playlistId: string, trackId: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackId }),
      });

      if (response.ok) {
        // Mettre à jour l'état local
        setPlaylists(prev => prev.map(playlist => 
          playlist._id === playlistId 
            ? { ...playlist, trackCount: playlist.trackCount + 1 }
            : playlist
        ));
        setShowAddToPlaylist(null);
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setActionLoading(false);
    }
  };

  // Supprimer une playlist
  const deletePlaylist = async (playlistId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette playlist ?')) return;

    try {
      setActionLoading(true);
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
      // Erreur silencieuse
    } finally {
      setActionLoading(false);
    }
  };

  // Jouer une playlist
  const playPlaylist = async (playlist: Playlist) => {
    if (playlist.tracks.length === 0) return;
    
    try {
      setQueueAndPlay(playlist.tracks, 0);
    } catch (error) {
      // Erreur silencieuse
    }
  };

  // Gérer les likes
  const handleLikeTrack = async (trackId: string) => {
    try {
      await toggleLikeBatch(trackId, { isLiked: false, likesCount: 0 });
      // Mettre à jour l'état local
      setFavoriteTracks(prev => prev.map(track => 
        track._id === trackId 
          ? { ...track, isLiked: !track.isLiked, likes: track.isLiked ? track.likes.filter(id => id !== session?.user?.id) : [...track.likes, session?.user?.id || ''] }
          : track
      ));
    } catch (error) {
      // Erreur silencieuse
    }
  };

  // Partager une playlist
  const sharePlaylist = async (playlist: Playlist) => {
    try {
      const shareUrl = `${window.location.origin}/playlists/${playlist._id}`;
      const shareText = `Écoutez "${playlist.name}" sur Synaura`;
      
      if (navigator.share) {
        await navigator.share({
          title: playlist.name,
          text: shareText,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(`${shareText} - ${shareUrl}`);
        // Lien copié dans le presse-papiers
      }
    } catch (error) {
      // Erreur silencieuse
    }
  };

  // Utilitaires
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const isCurrentlyPlaying = (trackId: string) => {
    return audioState.tracks[audioState.currentTrackIndex]?._id === trackId && audioState.isPlaying;
  };

  const currentPlaylist = playlists.find(p => p._id === selectedPlaylist);

  // Filtrer les données selon la recherche
  const filteredPlaylists = playlists.filter(playlist => 
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playlist.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecentTracks = recentTracks.filter(track => 
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFavoriteTracks = favoriteTracks.filter(track => 
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // État de chargement
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

  // État d'erreur
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
            onClick={() => {
              setError(null);
              fetchLibraryData();
            }}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-lg transition-all"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // État non connecté
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
    <div className="min-h-screen text-[var(--text)]">
      <main className="container mx-auto px-2 sm:px-4 pt-16 pb-32">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)] flex items-center gap-3">
                <Music size={28} className="text-[var(--color-primary)]" />
                Ma Bibliothèque
              </h1>
              
              {/* Bouton Bibliothèque IA */}
              <a
                href="/ai-library"
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-full font-medium transition-all shadow-lg"
              >
                <Sparkles size={16} />
                <span>Bibliothèque IA</span>
              </a>
            </div>
            <p className="text-[var(--text-muted)] text-lg">Vos playlists, écoutes récentes et favoris.</p>
          </div>
          
          {/* Barre de recherche et contrôles */}
          <div className="panel-suno border border-[var(--border)] rounded-xl p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Barre de recherche */}
              <div className="relative flex-1 max-w-xs sm:max-w-md">
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
          <div className="panel-suno border border-[var(--border)] rounded-xl p-6 mb-8">
            <div className="flex space-x-1 bg-[var(--surface-2)] rounded-xl p-1">
              <button
                onClick={() => setActiveTab('playlists')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'playlists'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Music size={16} className="inline mr-2" />
                Playlists
              </button>
              <button
                onClick={() => setActiveTab('recent')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'recent'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Clock size={16} className="inline mr-2" />
                Récent
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'favorites'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Heart size={16} className="inline mr-2" />
                Favoris
              </button>
              <button
                onClick={() => setActiveTab('downloads')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'downloads'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Download size={16} className="inline mr-2" />
                Téléchargements
              </button>
            </div>
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
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 sm:p-6 w-full max-w-[90vw] sm:max-w-md"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Créer une playlist</h3>
                    <button
                      onClick={() => setShowCreatePlaylist(false)}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
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
                        disabled={!newPlaylist.name.trim() || actionLoading}
                        className="flex-1 py-2 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading ? 'Création...' : 'Créer'}
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
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 sm:p-6 w-full max-w-[90vw] sm:max-w-md max-h-96 overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Ajouter à une playlist</h3>
                    <button
                      onClick={() => setShowAddToPlaylist(null)}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {playlists.map((playlist) => (
                      <button
                                        key={playlist._id}
                onClick={() => addTrackToPlaylist(playlist._id, showAddToPlaylist!)}
                        disabled={actionLoading}
                        className="w-full flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        <img
                          src={playlist.coverUrl || '/default-cover.jpg'}
                          alt={playlist.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1 text-left">
                          <h4 className="font-medium">{playlist.name}</h4>
                          <p className="text-sm text-white/60">{playlist.trackCount} pistes</p>
                        </div>
                        <Plus size={16} className="text-white/60" />
                      </button>
                    ))}
        </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Contenu des onglets */}
          <div className="panel-suno border border-[var(--border)] rounded-xl p-6">
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
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        ←
                      </button>
                        <div className="flex-1">
                        <h2 className="text-xl font-bold">{currentPlaylist?.name}</h2>
                        <p className="text-white/60">{currentPlaylist?.description}</p>
                      </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => sharePlaylist(currentPlaylist!)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                          >
                            <Share2 size={16} />
                          </button>
                          <button
                            onClick={() => deletePlaylist(currentPlaylist!._id)}
                            className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                    </div>

                    {/* Contrôles de lecture */}
                    <div className="flex items-center space-x-4 mb-6">
                      <button
                          onClick={() => playPlaylist(currentPlaylist!)}
                          className="w-12 h-12 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-full flex items-center justify-center transition-all"
                      >
                          <Play size={20} />
                      </button>
                      <button className="p-3 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors">
                        <Shuffle size={20} />
                      </button>
                      <button className="p-3 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors">
                        <Repeat size={20} />
                      </button>
                    </div>

                    {/* Liste des pistes */}
                    <div className="space-y-2">
                      {currentPlaylist?.tracks.map((track, index) => (
                        <motion.div
                          key={track._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <span className="text-white/40 text-sm w-8">{index + 1}</span>
                          <img
                            src={track.coverUrl || '/default-cover.jpg'}
                            alt={track.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{track.title}</h4>
                            <p className="text-sm text-white/60 truncate">
                              {track.artist?.name || track.artist?.username}
                            </p>
                          </div>
                          <button
                            onClick={() => playTrack(track)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                          >
                              {isCurrentlyPlaying(track._id) ? (
                              <Pause size={16} />
                            ) : (
                              <Play size={16} />
                            )}
                          </button>
                          <span className="text-white/40 text-sm">
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
                        <div className="text-white/60 text-sm">
                          {filteredPlaylists.length} playlist{filteredPlaylists.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                      {filteredPlaylists.length === 0 ? (
                      <div className="text-center py-12">
                          <FolderPlus className="w-16 h-16 text-white/40 mx-auto mb-4" />
                          <p className="text-white/60 mb-4">
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
                        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6' : 'space-y-4'}>
                          {filteredPlaylists.map((playlist) => (
                          <motion.div
                            key={playlist._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                              className={`glass-effect rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer ${
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
                            <p className="text-sm text-white/60 mb-2">{playlist.description}</p>
                            <div className="flex items-center justify-between text-xs text-white/40">
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
                                    <p className="text-sm text-white/60">{playlist.description}</p>
                                    <div className="flex items-center space-x-4 text-xs text-white/40 mt-1">
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
                      <Clock className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60">
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
                        className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <img
                          src={track.coverUrl || '/default-cover.jpg'}
                          alt={track.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{track.title}</h4>
                          <p className="text-sm text-white/60 truncate">
                            {track.artist?.name || track.artist?.username}
                          </p>
                        </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setShowAddToPlaylist(track._id)}
                              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                        <button
                          onClick={() => playTrack(track)}
                          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                              {isCurrentlyPlaying(track._id) ? (
                            <Pause size={16} />
                          ) : (
                            <Play size={16} />
                          )}
                        </button>
                          </div>
                        <div className="text-right">
                          <span className="text-white/40 text-sm block">
                            {formatDuration(track.duration)}
                          </span>
                          <span className="text-white/40 text-xs">
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
                      <Heart className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">
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
                        className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <img
                          src={track.coverUrl || '/default-cover.jpg'}
                          alt={track.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{track.title}</h4>
                          <p className="text-sm text-white/60 truncate">
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
                              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                        <button
                          onClick={() => playTrack(track)}
                          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                              {isCurrentlyPlaying(track._id) ? (
                            <Pause size={16} />
                          ) : (
                            <Play size={16} />
                          )}
                        </button>
                          </div>
                        <div className="text-right">
                          <span className="text-white/40 text-sm block">
                            {formatDuration(track.duration)}
                          </span>
                          <span className="text-white/40 text-xs">
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
                      <Download className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">Aucun téléchargement pour le moment</p>
                      <p className="text-white/40 text-sm">Les musiques que vous téléchargez apparaîtront ici</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {downloadedTracks.map((track, index) => (
                        <motion.div
                          key={track._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <img
                            src={track.coverUrl || '/default-cover.jpg'}
                            alt={track.title}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{track.title}</h4>
                            <p className="text-sm text-white/60 truncate">
                              {track.artist?.name || track.artist?.username}
                            </p>
                          </div>
                          <button
                            onClick={() => playTrack(track)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                          >
                            {isCurrentlyPlaying(track._id) ? (
                              <Pause size={16} />
                            ) : (
                              <Play size={16} />
                            )}
                          </button>
                          <span className="text-white/40 text-sm">
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
        </div>
      </main>
    </div>
  );
} 