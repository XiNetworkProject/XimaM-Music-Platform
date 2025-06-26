'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { useAudioPlayer } from './providers';
import TrackModal from '@/components/TrackModal';
import { 
  Play, Heart, ChevronLeft, ChevronRight, Pause, Clock, Headphones, 
  Users, TrendingUp, Star, Zap, Music, Flame, Calendar, UserPlus,
  Sparkles, Crown, Radio, Disc3, Mic2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  createdAt: string;
  genre?: string[];
  description?: string;
  lyrics?: string;
  isLiked?: boolean;
}

interface CategoryData {
  tracks: Track[];
  loading: boolean;
  error: string | null;
}

export default function HomePage() {
  const { data: session } = useSession();
  const { user } = useAuth();
  const { isNative, checkForUpdates } = useNativeFeatures();
  const { audioState, setTracks, playTrack, handleLike } = useAudioPlayer();
  
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // États pour les différentes catégories
  const [categories, setCategories] = useState<Record<string, CategoryData>>({
    featured: { tracks: [], loading: false, error: null },
    trending: { tracks: [], loading: false, error: null },
    popular: { tracks: [], loading: false, error: null },
    recent: { tracks: [], loading: false, error: null },
    mostLiked: { tracks: [], loading: false, error: null },
    following: { tracks: [], loading: false, error: null },
    recommended: { tracks: [], loading: false, error: null }
  });

  // Obtenir la piste actuelle
  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  const featuredTracks = categories.featured.tracks.slice(0, 5);

  // Charger toutes les catégories
  useEffect(() => {
    const fetchAllCategories = async () => {
      setLoading(true);
      
      const categoryApis = [
        { key: 'trending', url: '/api/tracks/trending?limit=10' },
        { key: 'popular', url: '/api/tracks/popular?limit=10' },
        { key: 'recent', url: '/api/tracks/recent?limit=10' },
        { key: 'mostLiked', url: '/api/tracks/most-liked?limit=10' },
        { key: 'recommended', url: '/api/tracks/recommended?limit=10' },
        { key: 'following', url: '/api/tracks/following?limit=10' }
      ];

      // Charger les pistes en vedette (mélange des plus populaires)
      try {
        const featuredResponse = await fetch('/api/tracks/popular?limit=20');
        if (featuredResponse.ok) {
          const featuredData = await featuredResponse.json();
          setCategories(prev => ({
            ...prev,
            featured: { tracks: featuredData.tracks, loading: false, error: null }
          }));
        }
      } catch (error) {
        console.error('Erreur chargement pistes vedettes:', error);
      }

      // Charger les autres catégories en parallèle
      const promises = categoryApis.map(async ({ key, url }) => {
        try {
          setCategories(prev => ({
            ...prev,
            [key]: { ...prev[key], loading: true }
          }));

          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            // Marquer les pistes likées par l'utilisateur
            const tracksWithLikes = data.tracks.map((track: Track) => ({
              ...track,
              isLiked: track.likes.includes(user?.id || '')
            }));
            setCategories(prev => ({
              ...prev,
              [key]: { tracks: tracksWithLikes, loading: false, error: null }
            }));
          } else {
            setCategories(prev => ({
              ...prev,
              [key]: { tracks: [], loading: false, error: 'Erreur de chargement' }
            }));
          }
        } catch (error) {
          console.error(`Erreur chargement ${key}:`, error);
          setCategories(prev => ({
            ...prev,
            [key]: { tracks: [], loading: false, error: 'Erreur de chargement' }
          }));
        }
      });

      await Promise.all(promises);
      setLoading(false);
    };

    fetchAllCategories();
  }, [user?.id]);

  // Auto-play du carrousel
  useEffect(() => {
    if (!isAutoPlaying || featuredTracks.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % Math.min(featuredTracks.length, 5));
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, featuredTracks.length]);

  useEffect(() => {
    if (isNative) {
      checkForUpdates().then(update => {
        if (update) {
          console.log('Mise à jour disponible:', update);
        }
      });
    }
  }, [isNative, checkForUpdates]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % Math.min(featuredTracks.length, 5));
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + Math.min(featuredTracks.length, 5)) % Math.min(featuredTracks.length, 5));
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Aujourd\'hui';
    if (diffDays === 2) return 'Hier';
    if (diffDays <= 7) return `Il y a ${diffDays - 1} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Fonction pour gérer les likes
  const handleLikeTrack = async (trackId: string, categoryKey: string, trackIndex: number) => {
    if (!session) {
      return;
    }

    try {
      const response = await fetch(`/api/tracks/${trackId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Mettre à jour l'état local
        setCategories(prev => {
          const newCategories = { ...prev };
          if (newCategories[categoryKey]) {
            newCategories[categoryKey] = {
              ...newCategories[categoryKey],
              tracks: newCategories[categoryKey].tracks.map(track => 
                track._id === trackId 
                  ? { ...track, isLiked: data.isLiked }
                  : track
              )
            };
          }
          return newCategories;
        });
      }
    } catch (error) {
      console.error('Erreur like/unlike:', error);
    }
  };

  // Fonction pour ouvrir le modal d'une piste
  const openTrackModal = async (track: Track) => {
    try {
      // Récupérer les détails complets de la piste
      const response = await fetch(`/api/tracks/${track._id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTrack(data.track);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Erreur ouverture modal:', error);
      // Fallback : utiliser la piste de base
      setSelectedTrack(track);
      setIsModalOpen(true);
    }
  };

  // Fonction pour fermer le modal
  const closeTrackModal = () => {
    setIsModalOpen(false);
    setSelectedTrack(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Chargement de votre univers musical...</p>
        </div>
      </div>
    );
  }

  const categoryConfigs = [
    {
      key: 'trending',
      title: '🔥 En Tendance',
      subtitle: 'Les plus écoutées en ce moment',
      icon: Flame,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20'
    },
    {
      key: 'popular',
      title: '⭐ Les Plus Populaires',
      subtitle: 'Les favoris de la communauté',
      icon: Crown,
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20'
    },
    {
      key: 'recent',
      title: '🆕 Dernières Sorties',
      subtitle: 'Les nouveautés du moment',
      icon: Calendar,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20'
    },
    {
      key: 'mostLiked',
      title: '💖 Les Plus Aimées',
      subtitle: 'Coup de cœur de la communauté',
      icon: Heart,
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/20'
    },
    {
      key: 'following',
      title: '👥 Vos Suivis',
      subtitle: 'Les artistes que vous suivez',
      icon: UserPlus,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      showOnlyIfLoggedIn: true
    },
    {
      key: 'recommended',
      title: '🎯 Recommandées',
      subtitle: 'Basé sur vos goûts',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      showOnlyIfLoggedIn: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Carrousel Hero - Hauteur réduite */}
      {featuredTracks.length > 0 && (
        <section className="relative h-[70vh] overflow-hidden">
          {/* Fond animé */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-blue-900/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)] animate-pulse"></div>
          </div>

          {/* Carrousel principal */}
          <div className="relative h-full">
            <AnimatePresence mode="wait">
              {featuredTracks[currentSlide] && (
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  {/* Image de fond avec effet parallax */}
                  <div className="absolute inset-0">
                    <motion.img
                      src={featuredTracks[currentSlide].coverUrl || '/default-cover.jpg'}
                      alt={featuredTracks[currentSlide].title}
                      className="w-full h-full object-cover"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent"></div>
                  </div>

                  {/* Contenu principal */}
                  <div className="relative h-full flex items-end">
                    <div className="container mx-auto px-8 pb-20">
                      <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="max-w-4xl"
                      >
                        {/* Badge tendance */}
                        <motion.div
                          initial={{ opacity: 0, x: -50 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5, duration: 0.6 }}
                          className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full mb-6 backdrop-blur-sm"
                        >
                          <TrendingUp size={16} />
                          <span className="font-medium">Tendance #1</span>
                        </motion.div>

                        {/* Titre */}
                        <motion.h1
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7, duration: 0.8 }}
                          className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight cursor-pointer hover:text-purple-300 transition-colors"
                          onClick={() => openTrackModal(featuredTracks[currentSlide])}
                        >
                          {featuredTracks[currentSlide].title}
                        </motion.h1>

                        {/* Artiste */}
                        <motion.p
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.9, duration: 0.6 }}
                          className="text-xl md:text-2xl text-gray-300 mb-6 cursor-pointer hover:text-purple-300 transition-colors"
                          onClick={() => openTrackModal(featuredTracks[currentSlide])}
                        >
                          {featuredTracks[currentSlide].artist?.name || featuredTracks[currentSlide].artist?.username || 'Artiste inconnu'}
                        </motion.p>

                        {/* Stats et actions */}
                        <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.1, duration: 0.8 }}
                          className="flex flex-wrap items-center gap-6 mb-6"
                        >
                          {/* Stats */}
                          <div className="flex items-center space-x-6 text-lg text-gray-300">
                            <div className="flex items-center space-x-2">
                              <Headphones size={20} className="text-purple-400" />
                              <span>{formatNumber(featuredTracks[currentSlide].plays)} écoutes</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users size={20} className="text-pink-400" />
                              <span>{formatNumber(featuredTracks[currentSlide].likes.length)} likes</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock size={20} className="text-blue-400" />
                              <span>{formatDuration(featuredTracks[currentSlide].duration)}</span>
                            </div>
                          </div>
                        </motion.div>

                        {/* Boutons d'action */}
                        <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.3, duration: 0.8 }}
                          className="flex flex-wrap items-center gap-4"
                        >
                          {/* Bouton Play */}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => playTrack(featuredTracks[currentSlide]._id)}
                            className="flex items-center space-x-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-2xl hover:shadow-purple-500/25"
                          >
                            {currentTrack?._id === featuredTracks[currentSlide]._id && audioState.isPlaying ? (
                              <Pause size={24} />
                            ) : (
                              <Play size={24} className="ml-1" />
                            )}
                            <span>
                              {currentTrack?._id === featuredTracks[currentSlide]._id && audioState.isPlaying ? 'Pause' : 'Écouter'}
                            </span>
                          </motion.button>

                          {/* Bouton Like */}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleLikeTrack(featuredTracks[currentSlide]._id, 'featured', currentSlide)}
                            className={`flex items-center space-x-3 px-6 py-4 rounded-full font-semibold transition-all duration-300 backdrop-blur-sm ${
                              featuredTracks[currentSlide].isLiked || featuredTracks[currentSlide].likes.includes(user?.id || '')
                                ? 'text-red-500 bg-red-500/20 border border-red-500/30'
                                : 'text-white bg-white/10 border border-white/20 hover:bg-white/20'
                            }`}
                          >
                            <Heart 
                              size={20} 
                              fill={featuredTracks[currentSlide].isLiked || featuredTracks[currentSlide].likes.includes(user?.id || '') ? 'currentColor' : 'none'} 
                            />
                            <span>J'aime</span>
                          </motion.button>
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation du carrousel */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
              <div className="flex items-center space-x-4">
                {/* Bouton précédent */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={prevSlide}
                  className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <ChevronLeft size={24} />
                </motion.button>

                {/* Indicateurs */}
                <div className="flex items-center space-x-2">
                  {featuredTracks.map((_, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => goToSlide(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === currentSlide 
                          ? 'bg-white scale-125' 
                          : 'bg-white/40 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>

                {/* Bouton suivant */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={nextSlide}
                  className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <ChevronRight size={24} />
                </motion.button>
              </div>
            </div>

            {/* Effet de particules flottantes */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-white/20 rounded-full"
                  animate={{
                    x: [0, Math.random() * window.innerWidth],
                    y: [0, Math.random() * window.innerHeight],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: Math.random() * 10 + 10,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    left: Math.random() * 100 + '%',
                    top: Math.random() * 100 + '%',
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sections de catégories */}
      <div className="py-16 space-y-20">
        {categoryConfigs.map((config, configIndex) => {
          // Ne pas afficher les sections qui nécessitent une connexion si l'utilisateur n'est pas connecté
          if (config.showOnlyIfLoggedIn && !session) return null;
          
          const categoryData = categories[config.key];
          const tracks = categoryData.tracks;

          if (tracks.length === 0 && !categoryData.loading) return null;

          return (
            <section key={config.key} className="container mx-auto px-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: configIndex * 0.1 }}
                className="mb-8"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${config.color} ${config.bgColor} ${config.borderColor} border`}>
                    <config.icon size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">{config.title}</h2>
                    <p className="text-gray-400">{config.subtitle}</p>
                  </div>
                </div>
              </motion.div>

              {categoryData.loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {tracks.map((track, index) => (
                    <motion.div
                      key={track._id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.05 }}
                      whileHover={{ y: -10 }}
                      className="group cursor-pointer"
                    >
                      <div className={`relative rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 ${config.bgColor} ${config.borderColor} border`}>
                        {/* Cover */}
                        <div className="relative aspect-square">
                          <img
                            src={track.coverUrl || '/default-cover.jpg'}
                            alt={track.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          
                          {/* Overlay avec bouton play */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                playTrack(track._id);
                              }}
                              className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200"
                            >
                              {currentTrack?._id === track._id && audioState.isPlaying ? (
                                <Pause size={24} fill="white" />
                              ) : (
                                <Play size={24} fill="white" className="ml-1" />
                              )}
                            </motion.button>
                          </div>

                          {/* Badge durée */}
                          <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                            {formatDuration(track.duration)}
                          </div>

                          {/* Badge date pour les récentes */}
                          {config.key === 'recent' && (
                            <div className="absolute top-2 left-2 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                              {formatDate(track.createdAt)}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-4">
                          <h3 
                            className="font-semibold text-white truncate mb-1 group-hover:text-purple-300 transition-colors cursor-pointer"
                            onClick={() => openTrackModal(track)}
                          >
                            {track.title}
                          </h3>
                          <p 
                            className="text-gray-300 text-sm truncate mb-3 cursor-pointer hover:text-purple-300 transition-colors"
                            onClick={() => openTrackModal(track)}
                          >
                            {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                          </p>
                          
                          {/* Stats */}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center space-x-2">
                              <Headphones size={12} />
                              <span>{formatNumber(track.plays)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <motion.button
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.8 }}
                                onClick={() => handleLikeTrack(track._id, config.key, index)}
                                className={`transition-colors ${
                                  track.isLiked || track.likes.includes(user?.id || '')
                                    ? 'text-red-500'
                                    : 'text-gray-500 hover:text-red-500'
                                }`}
                              >
                                <Heart size={12} fill={track.isLiked || track.likes.includes(user?.id || '') ? 'currentColor' : 'none'} />
                              </motion.button>
                              <span>{formatNumber(track.likes.length)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Message si aucune musique */}
      {Object.values(categories).every(cat => cat.tracks.length === 0) && !loading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Music size={64} className="text-gray-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-400 mb-4">Aucune musique disponible</h2>
            <p className="text-gray-500 mb-8">Soyez le premier à partager votre musique !</p>
            <a
              href="/upload"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
            >
              <Mic2 size={20} />
              <span>Uploader ma musique</span>
            </a>
          </div>
        </div>
      )}

      {/* Modal de détails de piste */}
      <TrackModal
        track={selectedTrack}
        isOpen={isModalOpen}
        onClose={closeTrackModal}
      />
    </div>
  );
} 