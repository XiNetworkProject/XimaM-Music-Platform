'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Music, 
  Play, 
  Pause, 
  Heart, 
  Clock, 
  Plus, 
  MoreVertical, 
  Shuffle, 
  Repeat, 
  Download,
  Share2,
  Edit3,
  Trash2,
  FolderPlus,
  Star,
  TrendingUp,
  Calendar,
  Users,
  ArrowRight,
  ChevronRight,
  Search,
  Filter,
  Grid,
  List,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioPlayer } from '@/app/providers';
import { useBatchLikeSystem } from '@/hooks/useLikeSystem';
import { useBatchPlaysSystem } from '@/hooks/usePlaysSystem';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Track {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  genre: string[];
  duration: number;
  plays: number;
  likes: number;
  isLiked: boolean;
  createdAt: string;
  coverUrl?: string;
  audioUrl?: string;
  comments?: any[];
}

interface Playlist {
  _id: string;
  name: string;
  description?: string;
  tracks: Track[];
  createdAt: string;
  isPublic: boolean;
  coverUrl?: string;
}

export default function LibraryPage() {
  const { data: session } = useSession();
  const { audioState, playTrack, pause } = useAudioPlayer();
  const { toggleLikeBatch, isBatchLoading: isLiking } = useBatchLikeSystem();
  const { incrementPlaysBatch } = useBatchPlaysSystem();

  // États principaux
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists' | 'liked'>('tracks');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  // Données
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);
  const [stats, setStats] = useState({
    totalTracks: 0,
    totalPlaylists: 0,
    totalLiked: 0,
    totalDuration: 0,
  });

  // Charger les données
  useEffect(() => {
    const fetchLibraryData = async () => {
      try {
        setLoading(true);
        
        // Charger les tracks de l'utilisateur
        const tracksResponse = await fetch('/api/tracks?user=true');
        if (tracksResponse.ok) {
          const tracksData = await tracksResponse.json();
          setTracks(tracksData.tracks || []);
        }

        // Charger les playlists de l'utilisateur
        const playlistsResponse = await fetch('/api/playlists?user=true');
        if (playlistsResponse.ok) {
          const playlistsData = await playlistsResponse.json();
          setPlaylists(playlistsData.playlists || []);
        }

        // Charger les tracks likées
        const likedResponse = await fetch('/api/tracks/liked');
        if (likedResponse.ok) {
          const likedData = await likedResponse.json();
          setLikedTracks(likedData.tracks || []);
        }

        // Calculer les statistiques
        const totalDuration = tracks.reduce((acc, track) => acc + track.duration, 0);
        setStats({
          totalTracks: tracks.length,
          totalPlaylists: playlists.length,
          totalLiked: likedTracks.length,
          totalDuration: Math.floor(totalDuration / 60), // en minutes
        });

      } catch (error) {
        console.error('Erreur lors du chargement de la bibliothèque:', error);
        toast.error('Erreur lors du chargement de la bibliothèque');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchLibraryData();
    }
  }, [session]);

  // Fonctions de lecture
  const handlePlayTrack = async (track: Track) => {
    try {
      const currentTrack = audioState.tracks[audioState.currentTrackIndex];
      if (currentTrack?._id === track._id) {
        if (audioState.isPlaying) {
          pause();
        } else {
          await playTrack(track._id);
        }
      } else {
        await playTrack(track._id);
        incrementPlaysBatch(track._id, track.plays);
      }
    } catch (error) {
      console.error('Erreur lors de la lecture:', error);
      toast.error('Erreur lors de la lecture');
    }
  };

  const handleLikeTrack = async (track: Track) => {
    try {
      await toggleLikeBatch(track._id, { isLiked: track.isLiked, likesCount: track.likes });
      setTracks(prev => prev.map(t => 
        t._id === track._id 
          ? { ...t, isLiked: !t.isLiked, likes: t.isLiked ? t.likes - 1 : t.likes + 1 }
          : t
      ));
    } catch (error) {
      console.error('Erreur lors du like:', error);
      toast.error('Erreur lors du like');
    }
  };

  // Filtrage des données
  const getFilteredTracks = () => {
    let filtered = tracks;
    
    if (searchQuery) {
      filtered = filtered.filter(track => 
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(track => 
        track.genre.includes(selectedGenre)
      );
    }
    
    return filtered;
  };

  const getFilteredPlaylists = () => {
    if (searchQuery) {
      return playlists.filter(playlist => 
        playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        playlist.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return playlists;
  };

  const getFilteredLikedTracks = () => {
    if (searchQuery) {
      return likedTracks.filter(track => 
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return likedTracks;
  };

  // Formatage des durées
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Obtenir les genres uniques
  const getUniqueGenres = () => {
    const genres = new Set<string>();
    tracks.forEach(track => {
      track.genre.forEach(genre => genres.add(genre));
    });
    return Array.from(genres);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-white/20 rounded-lg w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-white/10 rounded-xl"></div>
              ))}
            </div>
            <div className="h-96 bg-white/10 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Ma Bibliothèque</h1>
          <p className="text-white/70">Gérez vos musiques et playlists</p>
        </motion.div>

        {/* Statistiques */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Mes Tracks</p>
                <p className="text-2xl font-bold text-white">{stats.totalTracks}</p>
              </div>
              <Music className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Playlists</p>
                <p className="text-2xl font-bold text-white">{stats.totalPlaylists}</p>
              </div>
              <FolderPlus className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Tracks Likées</p>
                <p className="text-2xl font-bold text-white">{stats.totalLiked}</p>
              </div>
              <Heart className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Durée Totale</p>
                <p className="text-2xl font-bold text-white">{stats.totalDuration}m</p>
              </div>
              <Clock className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </motion.div>

        {/* Navigation et contrôles */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8"
        >
          {/* Onglets */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { id: 'tracks', label: 'Mes Tracks', icon: Music },
              { id: 'playlists', label: 'Playlists', icon: FolderPlus },
              { id: 'liked', label: 'Tracks Likées', icon: Heart }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === id
                    ? 'bg-purple-600 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Barre de recherche et filtres */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {activeTab === 'tracks' && (
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Tous les genres</option>
                {getUniqueGenres().map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Contenu principal */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'tracks' && (
              <motion.div
                key="tracks"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {getFilteredTracks().map((track) => (
                      <motion.div
                        key={track._id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 group cursor-pointer"
                      >
                        <div className="relative mb-4">
                          <div className="aspect-square bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                            {track.coverUrl ? (
                              <img 
                                src={track.coverUrl} 
                                alt={track.title}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Music className="w-12 h-12 text-white/50" />
                            )}
                          </div>
                          <button
                            onClick={() => handlePlayTrack(track)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
                          >
                            {audioState.tracks[audioState.currentTrackIndex]?._id === track._id && audioState.isPlaying ? (
                              <Pause className="w-8 h-8 text-white" />
                            ) : (
                              <Play className="w-8 h-8 text-white" />
                            )}
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="font-semibold text-white truncate">{track.title}</h3>
                          <p className="text-white/70 text-sm truncate">{track.artist.name}</p>
                          <div className="flex items-center justify-between text-xs text-white/50">
                            <span>{formatDuration(track.duration)}</span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleLikeTrack(track)}
                                className={`transition-colors ${
                                  track.isLiked ? 'text-red-400' : 'text-white/50 hover:text-red-400'
                                }`}
                              >
                                <Heart className="w-4 h-4" />
                              </button>
                              <span>{track.likes}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
                    {getFilteredTracks().map((track, index) => (
                      <div
                        key={track._id}
                        className={`flex items-center gap-4 p-4 hover:bg-white/5 transition-colors ${
                          index !== getFilteredTracks().length - 1 ? 'border-b border-white/10' : ''
                        }`}
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                          {track.coverUrl ? (
                            <img 
                              src={track.coverUrl} 
                              alt={track.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Music className="w-6 h-6 text-white/50" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{track.title}</h3>
                          <p className="text-white/70 text-sm truncate">{track.artist.name}</p>
                        </div>
                        
                        <div className="text-white/50 text-sm">
                          {track.genre.join(', ')}
                        </div>
                        
                        <div className="text-white/50 text-sm">
                          {formatDuration(track.duration)}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePlayTrack(track)}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                          >
                            {audioState.tracks[audioState.currentTrackIndex]?._id === track._id && audioState.isPlaying ? (
                              <Pause className="w-4 h-4 text-white" />
                            ) : (
                              <Play className="w-4 h-4 text-white" />
                            )}
                          </button>
                          <button
                            onClick={() => handleLikeTrack(track)}
                            className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${
                              track.isLiked ? 'text-red-400' : 'text-white/50'
                            }`}
                          >
                            <Heart className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'playlists' && (
              <motion.div
                key="playlists"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getFilteredPlaylists().map((playlist) => (
                    <motion.div
                      key={playlist._id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 group cursor-pointer"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                          {playlist.coverUrl ? (
                            <img 
                              src={playlist.coverUrl} 
                              alt={playlist.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <FolderPlus className="w-8 h-8 text-white/50" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{playlist.name}</h3>
                          <p className="text-white/70 text-sm">{playlist.tracks.length} tracks</p>
                        </div>
                      </div>
                      
                      {playlist.description && (
                        <p className="text-white/60 text-sm mb-4 line-clamp-2">{playlist.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-white/50">
                        <span>Créé le {formatDate(playlist.createdAt)}</span>
                        <div className="flex items-center gap-2">
                          <button className="p-1 rounded hover:bg-white/10 transition-colors">
                            <Play className="w-4 h-4" />
                          </button>
                          <button className="p-1 rounded hover:bg-white/10 transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'liked' && (
              <motion.div
                key="liked"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {getFilteredLikedTracks().map((track) => (
                      <motion.div
                        key={track._id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 group cursor-pointer"
                      >
                        <div className="relative mb-4">
                          <div className="aspect-square bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                            {track.coverUrl ? (
                              <img 
                                src={track.coverUrl} 
                                alt={track.title}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Heart className="w-12 h-12 text-white/50" />
                            )}
                          </div>
                          <button
                            onClick={() => handlePlayTrack(track)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
                          >
                            {audioState.tracks[audioState.currentTrackIndex]?._id === track._id && audioState.isPlaying ? (
                              <Pause className="w-8 h-8 text-white" />
                            ) : (
                              <Play className="w-8 h-8 text-white" />
                            )}
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="font-semibold text-white truncate">{track.title}</h3>
                          <p className="text-white/70 text-sm truncate">{track.artist.name}</p>
                          <div className="flex items-center justify-between text-xs text-white/50">
                            <span>{formatDuration(track.duration)}</span>
                            <div className="flex items-center gap-3">
                              <Heart className="w-4 h-4 text-red-400" />
                              <span>{track.likes}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
                    {getFilteredLikedTracks().map((track, index) => (
                      <div
                        key={track._id}
                        className={`flex items-center gap-4 p-4 hover:bg-white/5 transition-colors ${
                          index !== getFilteredLikedTracks().length - 1 ? 'border-b border-white/10' : ''
                        }`}
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                          {track.coverUrl ? (
                            <img 
                              src={track.coverUrl} 
                              alt={track.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Heart className="w-6 h-6 text-white/50" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{track.title}</h3>
                          <p className="text-white/70 text-sm truncate">{track.artist.name}</p>
                        </div>
                        
                        <div className="text-white/50 text-sm">
                          {track.genre.join(', ')}
                        </div>
                        
                        <div className="text-white/50 text-sm">
                          {formatDuration(track.duration)}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePlayTrack(track)}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                          >
                            {audioState.tracks[audioState.currentTrackIndex]?._id === track._id && audioState.isPlaying ? (
                              <Pause className="w-4 h-4 text-white" />
                            ) : (
                              <Play className="w-4 h-4 text-white" />
                            )}
                          </button>
                          <Heart className="w-4 h-4 text-red-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Message vide */}
        {((activeTab === 'tracks' && getFilteredTracks().length === 0) ||
          (activeTab === 'playlists' && getFilteredPlaylists().length === 0) ||
          (activeTab === 'liked' && getFilteredLikedTracks().length === 0)) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              {activeTab === 'tracks' && <Music className="w-12 h-12 text-white/50" />}
              {activeTab === 'playlists' && <FolderPlus className="w-12 h-12 text-white/50" />}
              {activeTab === 'liked' && <Heart className="w-12 h-12 text-white/50" />}
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {activeTab === 'tracks' && 'Aucune track trouvée'}
              {activeTab === 'playlists' && 'Aucune playlist trouvée'}
              {activeTab === 'liked' && 'Aucune track likée'}
            </h3>
            <p className="text-white/70 mb-6">
              {activeTab === 'tracks' && 'Commencez par uploader vos premières musiques'}
              {activeTab === 'playlists' && 'Créez votre première playlist'}
              {activeTab === 'liked' && 'Likez des tracks pour les retrouver ici'}
            </p>
            {activeTab === 'tracks' && (
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Uploader une track
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}