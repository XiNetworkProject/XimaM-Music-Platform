'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Play, Heart, Share2, MessageCircle, Clock, Users, TrendingUp, Music, Shuffle, SortAsc, SortDesc } from 'lucide-react';
import { useAudioPlayer } from '../providers';
import { useBatchLikeSystem } from '@/hooks/useLikeSystem';
import { useBatchPlaysSystem } from '@/hooks/usePlaysSystem';
import LikeButton from '@/components/LikeButton';
import { useSession } from 'next-auth/react';
import TrackCard from '@/components/TrackCard';
import SocialStats from '@/components/SocialStats';
import { AnimatedPlaysCounter } from '@/components/AnimatedCounter';

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

const genres = ['Tous', 'Pop', 'Hip-Hop', 'Rock', 'Electronic', 'Ambient', 'Jazz', 'Classical', 'R&B', 'Country', 'Folk', 'Metal'];
const sortOptions = [
  { value: 'recent', label: 'Plus récent', icon: Clock },
  { value: 'popular', label: 'Plus populaire', icon: TrendingUp },
  { value: 'plays', label: 'Plus écouté', icon: Users },
  { value: 'likes', label: 'Plus aimé', icon: Heart },
  { value: 'random', label: 'Aléatoire', icon: Shuffle }
];

export default function DiscoverPage() {
  const { data: session } = useSession();
  const { playTrack, audioState } = useAudioPlayer();
  
  // Utiliser les nouveaux systèmes de likes et écoutes
  const { toggleLikeBatch, isBatchLoading } = useBatchLikeSystem();
  const { incrementPlaysBatch, isBatchLoading: isPlaysLoading } = useBatchPlaysSystem();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Tous');
  const [sortBy, setSortBy] = useState('recent');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce pour la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Charger les pistes depuis l'API
  const fetchTracks = useCallback(async (page = 1, append = false) => {
      try {
      if (page === 1) setLoading(true);
      if (page > 1) setSearchLoading(true);

        const params = new URLSearchParams();
        if (selectedGenre !== 'Tous') {
          params.append('genre', selectedGenre);
        }
      if (debouncedQuery) {
        params.append('search', debouncedQuery);
        }
      params.append('sort', sortBy);
      params.append('page', page.toString());
      params.append('limit', '20');

        const response = await fetch(`/api/tracks?${params}`);
        if (response.ok) {
          const data = await response.json();
        const newTracks = data.tracks || [];
        
        if (append) {
          setTracks(prev => [...prev, ...newTracks]);
        } else {
          setTracks(newTracks);
        }
        
        setHasMore(newTracks.length === 20);
        setCurrentPage(page);
      } else {
        // Erreur silencieuse
        }
      } catch (error) {
      // Erreur silencieuse
      } finally {
        setLoading(false);
      setSearchLoading(false);
    }
  }, [debouncedQuery, selectedGenre, sortBy]);

  // Recharger quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
    fetchTracks(1, false);
  }, [fetchTracks]);

  // Filtrer et trier les pistes localement
  useEffect(() => {
    let filtered = [...tracks];

    // Tri local supplémentaire si nécessaire
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'popular':
        filtered.sort((a, b) => (b.likes.length + b.plays) - (a.likes.length + a.plays));
        break;
      case 'plays':
        filtered.sort((a, b) => b.plays - a.plays);
        break;
      case 'likes':
        filtered.sort((a, b) => b.likes.length - a.likes.length);
        break;
      case 'random':
        filtered.sort(() => Math.random() - 0.5);
        break;
    }

    setFilteredTracks(filtered);
  }, [tracks, sortBy]);

  const handlePlayTrack = async (track: Track) => {
    try {
      await playTrack(track);
    } catch (error) {
      // Erreur silencieuse
    }
  };

  const handleLikeTrack = async (trackId: string) => {
    try {
      await toggleLikeBatch(trackId, { isLiked: false, likesCount: 0 });
      // Mettre à jour l'état local
      setTracks(prev => prev.map(track => 
        track._id === trackId 
          ? { ...track, isLiked: !track.isLiked, likes: track.isLiked ? track.likes.filter(id => id !== session?.user?.id) : [...track.likes, session?.user?.id || ''] }
          : track
      ));
    } catch (error) {
      // Erreur silencieuse
    }
  };

  const handleShare = async (track: Track) => {
    try {
      const shareUrl = `${window.location.origin}/tracks/${track._id}`;
      const shareText = `Écoutez "${track.title}" par ${track.artist.name} sur XimaM`;
      
      if (navigator.share) {
        await navigator.share({
          title: track.title,
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

  const loadMore = () => {
    if (!searchLoading && hasMore) {
      fetchTracks(currentPage + 1, true);
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

  const isCurrentlyPlaying = (trackId: string) => {
    return audioState.tracks[audioState.currentTrackIndex]?._id === trackId && audioState.isPlaying;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Découverte des musiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <main className="container mx-auto px-4 pt-16 pb-32">
        <div className="max-w-6xl mx-auto">
      {/* Header */}
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
                placeholder="Rechercher des artistes, titres, genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 rounded-xl border border-white/20 focus:border-purple-400 focus:outline-none text-white placeholder-white/60"
            />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                </div>
              )}
          </div>

            {/* Filtres et tri */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Filtres par genre */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedGenre === genre
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {genre}
              </button>
            ))}
              </div>

              {/* Bouton filtres avancés et tri */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/10 rounded-full text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  <Filter size={16} />
                  <span>Filtres</span>
                </button>

                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none px-4 py-2 bg-white/10 rounded-full text-sm font-medium text-white border border-white/20 focus:border-purple-400 focus:outline-none pr-10"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-gray-800">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <SortAsc className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60" size={16} />
                </div>
              </div>
            </div>

            {/* Filtres avancés */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-white/10"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Durée</label>
                      <select className="w-full px-3 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none">
                        <option value="">Toutes les durées</option>
                        <option value="short">Court (&lt; 3 min)</option>
                        <option value="medium">Moyen (3-7 min)</option>
                        <option value="long">Long (&gt; 7 min)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Popularité</label>
                      <select className="w-full px-3 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none">
                        <option value="">Tous</option>
                        <option value="trending">Tendance</option>
                        <option value="new">Nouveau</option>
                        <option value="underrated">Méconnu</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Date</label>
                      <select className="w-full px-3 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none">
                        <option value="">Toutes les dates</option>
                        <option value="today">Aujourd'hui</option>
                        <option value="week">Cette semaine</option>
                        <option value="month">Ce mois</option>
                        <option value="year">Cette année</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-effect rounded-xl p-4 text-center">
              <Music className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">{formatNumber(tracks.length)}</div>
              <div className="text-white/60 text-sm">Musiques</div>
            </div>
            <div className="glass-effect rounded-xl p-4 text-center">
              <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <AnimatedPlaysCounter
                value={tracks.reduce((sum, track) => sum + track.plays, 0)}
                size="lg"
                variant="card"
                animation="slide"
                className="text-2xl font-bold"
              />
              <div className="text-white/60 text-sm">Écoutes</div>
            </div>
            <div className="glass-effect rounded-xl p-4 text-center">
              <Heart className="w-8 h-8 text-pink-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">{formatNumber(tracks.reduce((sum, track) => sum + track.likes.length, 0))}</div>
              <div className="text-white/60 text-sm">Likes</div>
            </div>
            <div className="glass-effect rounded-xl p-4 text-center">
              <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">{formatNumber(tracks.reduce((sum, track) => sum + track.comments.length, 0))}</div>
              <div className="text-white/60 text-sm">Commentaires</div>
          </div>
        </div>

          {/* Résultats */}
          <div className="glass-effect rounded-xl p-6">
            {filteredTracks.length === 0 ? (
            <div className="text-center py-12">
                <Music className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <p className="text-white/60 mb-4">
                {searchQuery || selectedGenre !== 'Tous' 
                    ? 'Aucun résultat trouvé pour votre recherche' 
                  : 'Aucune musique n\'a été uploadée pour le moment'
                }
              </p>
              {!searchQuery && selectedGenre === 'Tous' && (
                <a
                  href="/upload"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                >
                  Uploader la première musique
                </a>
              )}
            </div>
          ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <AnimatePresence>
                    {filteredTracks.map((track, index) => (
                <motion.div
                  key={track._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                        className="glass-effect rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 group"
                >
                  {/* Image de couverture */}
                  <div className="relative aspect-square">
                    <img
                      src={track.coverUrl || '/default-cover.jpg'}
                      alt={track.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.src = '/default-cover.jpg';
                            }}
                    />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    
                          {/* Bouton play avec état de lecture */}
                          <button 
                            onClick={() => handlePlayTrack(track)}
                            className={`absolute top-3 right-3 w-12 h-12 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-300 ${
                              isCurrentlyPlaying(track._id)
                                ? 'bg-purple-500/80 text-white scale-110'
                                : 'bg-white/20 text-white hover:bg-white/30 hover:scale-110'
                            }`}
                          >
                            {isCurrentlyPlaying(track._id) ? (
                              <div className="flex space-x-1">
                                <div className="w-1 h-3 bg-white rounded-full animate-pulse"></div>
                                <div className="w-1 h-3 bg-white rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                <div className="w-1 h-3 bg-white rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                              </div>
                            ) : (
                              <Play size={18} fill="white" />
                            )}
                    </button>

                          {/* Badge genre */}
                          {track.genre?.[0] && (
                            <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs font-medium">
                              {track.genre[0]}
                            </div>
                          )}

                          {/* Durée */}
                          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs">
                            {formatDuration(track.duration)}
                          </div>
                  </div>

                  {/* Informations */}
                  <div className="p-4">
                          <h3 className="font-semibold text-sm mb-1 truncate group-hover:text-purple-300 transition-colors">
                            {track.title}
                          </h3>
                          <p className="text-xs text-white/60 mb-3 truncate">
                      {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                    </p>
                    
                          {/* Statistiques */}
                    <div className="flex items-center justify-between text-xs text-white/60 mb-3">
                            <div className="flex items-center space-x-3">
                              <span className="flex items-center space-x-1">
                                <AnimatedPlaysCounter
                                  value={track.plays}
                                  size="sm"
                                  variant="minimal"
                                  showIcon={true}
                                  icon={<Users size={12} />}
                                  animation="slide"
                                  className="text-white/60"
                                />
                              </span>
                              <span className="flex items-center space-x-1">
                                <Heart size={12} />
                        <span>{formatNumber(track.likes.length)}</span>
                              </span>
                            </div>
                            <span className="flex items-center space-x-1">
                              <MessageCircle size={12} />
                              <span>{formatNumber(track.comments.length)}</span>
                            </span>
                      </div>
                      
                          {/* Actions */}
                          <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                                onClick={() => handleLikeTrack(track._id)}
                                className={`p-2 rounded-full transition-all duration-300 ${
                                  track.isLiked
                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                    : 'bg-white/10 hover:bg-white/20 text-white/60 hover:text-white'
                          }`}
                        >
                                <Heart size={14} fill={track.isLiked ? 'currentColor' : 'none'} />
                        </button>
                        
                              <button 
                                onClick={() => handleShare(track)}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 text-white/60 hover:text-white"
                              >
                          <Share2 size={14} />
                        </button>
                            </div>
                        
                            <button className="text-xs text-white/60 hover:text-purple-300 transition-colors">
                              Voir plus
                        </button>
                      </div>
                    </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Pagination */}
                {hasMore && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={loadMore}
                      disabled={searchLoading}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-full font-medium hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {searchLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Chargement...</span>
                        </div>
                      ) : (
                        'Charger plus de musiques'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
            </div>
        </div>
      </main>
    </div>
  );
} 