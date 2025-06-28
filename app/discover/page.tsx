'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Play, Heart, Share2, MessageCircle } from 'lucide-react';

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

const genres = ['Tous', 'Pop', 'Hip-Hop', 'Rock', 'Electronic', 'Ambient', 'Jazz', 'Classical'];

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Tous');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());

  // Charger les pistes depuis l'API
  useEffect(() => {
    const fetchTracks = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedGenre !== 'Tous') {
          params.append('genre', selectedGenre);
        }
        if (searchQuery) {
          params.append('search', searchQuery);
        }
        params.append('limit', '50');

        const response = await fetch(`/api/tracks?${params}`);
        if (response.ok) {
          const data = await response.json();
          setTracks(data.tracks || []);
        } else {
          console.error('Erreur lors du chargement des pistes');
        }
      } catch (error) {
        console.error('Erreur fetch tracks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, [searchQuery, selectedGenre]);

  const toggleLike = async (trackId: string) => {
    const newLikedTracks = new Set(likedTracks);
    if (newLikedTracks.has(trackId)) {
      newLikedTracks.delete(trackId);
    } else {
      newLikedTracks.add(trackId);
    }
    setLikedTracks(newLikedTracks);

    // Appel API pour liker/unliker
    try {
      const response = await fetch(`/api/tracks/${trackId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du like');
      }
    } catch (error) {
      console.error('Erreur like:', error);
    }
  };

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Chargement des musiques...</p>
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
              <Search size={28} className="text-purple-400" />
              Découvrir
            </h1>
            <p className="text-white/60 text-lg">Explorez les dernières musiques et artistes de la communauté.</p>
          </div>
          
          {/* Barre de recherche et filtres */}
          <div className="glass-effect rounded-xl p-6 mb-8">
            {/* Barre de recherche */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
              <input
                type="text"
                placeholder="Rechercher des artistes, titres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 rounded-xl border border-white/20 focus:border-primary-400 focus:outline-none text-white placeholder-white/60"
              />
            </div>

            {/* Filtres par genre */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              {genres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedGenre === genre
                      ? 'bg-primary-500 text-white'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Résultats */}
          <div className="glass-effect rounded-xl p-6">
            {tracks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60 mb-4">
                  {searchQuery || selectedGenre !== 'Tous' 
                    ? 'Aucun résultat trouvé' 
                    : 'Aucune musique n\'a été uploadée pour le moment'
                  }
                </p>
                {!searchQuery && selectedGenre === 'Tous' && (
                  <a
                    href="/upload"
                    className="bg-primary-500 text-white px-6 py-3 rounded-full font-medium hover:bg-primary-600 transition-colors"
                  >
                    Uploader la première musique
                  </a>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tracks.map((track) => (
                  <motion.div
                    key={track._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-effect rounded-xl overflow-hidden hover:scale-105 transition-transform"
                  >
                    {/* Image de couverture */}
                    <div className="relative aspect-square">
                      <img
                        src={track.coverUrl || '/default-cover.jpg'}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      
                      {/* Bouton play */}
                      <button className="absolute top-3 right-3 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                        <Play size={16} fill="white" />
                      </button>
                    </div>

                    {/* Informations */}
                    <div className="p-4">
                      <h3 className="font-semibold text-sm mb-1 truncate">{track.title}</h3>
                      <p className="text-xs text-white/60 mb-2">
                        {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-white/60 mb-3">
                        <span>{track.genre?.[0] || 'Pop'}</span>
                        <span>{formatDuration(track.duration)}</span>
                      </div>

                      {/* Statistiques et actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 text-xs text-white/60">
                          <span>{formatNumber(track.plays)}</span>
                          <span>{formatNumber(track.likes.length)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleLike(track._id)}
                            className={`p-2 rounded-full transition-colors ${
                              likedTracks.has(track._id) || track.isLiked
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-white/10 hover:bg-white/20'
                            }`}
                          >
                            <Heart size={14} fill={likedTracks.has(track._id) || track.isLiked ? 'currentColor' : 'none'} />
                          </button>
                          
                          <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            <Share2 size={14} />
                          </button>
                          
                          <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            <MessageCircle size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 