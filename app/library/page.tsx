'use client';

import { useState, useEffect } from 'react';
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
  Calendar,
  Shuffle,
  Repeat
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';

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
}

export default function LibraryPage() {
  const { data: session } = useSession();
  const { audioState, playTrack, setIsPlaying } = useAudioPlayer();
  const [activeTab, setActiveTab] = useState<'playlists' | 'recent' | 'favorites'>('playlists');
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [favoriteTracks, setFavoriteTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les données depuis l'API
  useEffect(() => {
    const fetchLibraryData = async () => {
      if (!session?.user?.id) return;

      try {
        setLoading(true);
        
        // Charger les playlists de l'utilisateur
        const playlistsResponse = await fetch('/api/playlists?user=' + session.user.id);
        if (playlistsResponse.ok) {
          const playlistsData = await playlistsResponse.json();
          setPlaylists(playlistsData.playlists || []);
        }

        // Charger les pistes récentes
        const recentResponse = await fetch('/api/tracks?recent=true&limit=10');
        if (recentResponse.ok) {
          const recentData = await recentResponse.json();
          setRecentTracks(recentData.tracks || []);
        }

        // Charger les favoris
        const favoritesResponse = await fetch('/api/tracks?liked=true&limit=20');
        if (favoritesResponse.ok) {
          const favoritesData = await favoritesResponse.json();
          setFavoriteTracks(favoritesData.tracks || []);
        }

      } catch (error) {
        console.error('Erreur chargement bibliothèque:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLibraryData();
  }, [session?.user?.id]);

  const currentPlaylist = playlists.find(p => p._id === selectedPlaylist);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Chargement de votre bibliothèque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <main className="container mx-auto px-4 pt-16 pb-32">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold gradient-text flex items-center gap-3 mb-2">
              <Music size={28} className="text-purple-400" />
              Ma Bibliothèque
            </h1>
            <p className="text-white/60 text-lg">Vos playlists, écoutes récentes et favoris.</p>
          </div>
          
          {/* Onglets */}
          <div className="glass-effect rounded-xl p-6 mb-8">
            <div className="flex space-x-1 bg-white/10 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('playlists')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'playlists'
                    ? 'bg-primary-500 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <Music size={16} className="inline mr-2" />
                Playlists
              </button>
              <button
                onClick={() => setActiveTab('recent')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'recent'
                    ? 'bg-primary-500 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <Clock size={16} className="inline mr-2" />
                Récent
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'favorites'
                    ? 'bg-primary-500 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <Heart size={16} className="inline mr-2" />
                Favoris
              </button>
            </div>
          </div>

          {/* Contenu des onglets */}
          <div className="glass-effect rounded-xl p-6">
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
                        <div>
                          <h2 className="text-xl font-bold">{currentPlaylist?.name}</h2>
                          <p className="text-white/60">{currentPlaylist?.description}</p>
                        </div>
                      </div>

                      {/* Contrôles de lecture */}
                      <div className="flex items-center space-x-4 mb-6">
                        <button
                          onClick={() => setIsPlaying(!audioState.isPlaying)}
                          className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors"
                        >
                          {audioState.isPlaying ? <Pause size={20} /> : <Play size={20} />}
                        </button>
                        <button className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                          <Shuffle size={20} />
                        </button>
                        <button className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
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
                              {audioState.tracks[audioState.currentTrackIndex]?._id === track._id && audioState.isPlaying ? (
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
                        <button className="p-2 rounded-full bg-primary-500 hover:bg-primary-600 transition-colors">
                          <Plus size={20} />
                        </button>
                      </div>

                      {playlists.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-white/60 mb-4">Aucune playlist créée</p>
                          <button className="bg-primary-500 text-white px-6 py-3 rounded-full font-medium hover:bg-primary-600 transition-colors">
                            Créer une playlist
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {playlists.map((playlist) => (
                            <motion.div
                              key={playlist._id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              onClick={() => setSelectedPlaylist(playlist._id)}
                              className="glass-effect rounded-xl p-4 cursor-pointer hover:scale-105 transition-transform"
                            >
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
                  
                  {recentTracks.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-white/60">Aucune écoute récente</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentTracks.map((track, index) => (
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
                            {audioState.tracks[audioState.currentTrackIndex]?._id === track._id && audioState.isPlaying ? (
                              <Pause size={16} />
                            ) : (
                              <Play size={16} />
                            )}
                          </button>
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
                  
                  {favoriteTracks.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-white/60 mb-4">Aucun favori pour le moment</p>
                      <a
                        href="/discover"
                        className="bg-primary-500 text-white px-6 py-3 rounded-full font-medium hover:bg-primary-600 transition-colors"
                      >
                        Découvrir de la musique
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {favoriteTracks.map((track, index) => (
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
                            {audioState.tracks[audioState.currentTrackIndex]?._id === track._id && audioState.isPlaying ? (
                              <Pause size={16} />
                            ) : (
                              <Play size={16} />
                            )}
                          </button>
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
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
} 