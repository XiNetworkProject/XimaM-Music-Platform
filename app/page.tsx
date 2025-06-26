'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { useAudioPlayer } from './providers';
import { 
  Play, Heart, ChevronLeft, ChevronRight, Pause, Clock, Headphones, 
  Users, TrendingUp, Star, Zap, Music, Flame, Calendar, UserPlus,
  Sparkles, Crown, Radio, Disc3, Mic2, RefreshCw, Share2, Eye, 
  Award, Target, Compass, BarChart3, Gift, Lightbulb, Globe, Search, List
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

// Cache simple pour les données
const dataCache = new Map<string, { tracks: Track[]; timestamp: number }>();
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

export default function HomePage() {
  const { data: session } = useSession();
  const { user } = useAuth();
  const { isNative, checkForUpdates } = useNativeFeatures();
  const { audioState, setTracks, setCurrentTrackIndex, setIsPlaying, setShowPlayer, setIsMinimized } = useAudioPlayer();
  
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // États pour les différentes catégories avec cache
  const [categories, setCategories] = useState<Record<string, CategoryData>>({
    featured: { tracks: [], loading: false, error: null },
    trending: { tracks: [], loading: false, error: null },
    popular: { tracks: [], loading: false, error: null },
    recent: { tracks: [], loading: false, error: null },
    mostLiked: { tracks: [], loading: false, error: null },
    following: { tracks: [], loading: false, error: null },
    recommended: { tracks: [], loading: false, error: null }
  });

  // État pour les utilisateurs populaires
  const [popularUsers, setPopularUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Nouveaux états pour les améliorations
  const [dailyDiscoveries, setDailyDiscoveries] = useState<Track[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<any[]>([]);
  const [communityPlaylists, setCommunityPlaylists] = useState<any[]>([]);
  const [collaborations, setCollaborations] = useState<Track[]>([]);

  // Obtenir la piste actuelle
  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  const featuredTracks = useMemo(() => categories.featured.tracks.slice(0, 5), [categories.featured.tracks]);

  // Fonction optimisée pour charger les données avec cache
  const fetchCategoryData = useCallback(async (key: string, url: string) => {
    // Vérifier le cache d'abord
    const cached = dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          setCategories(prev => ({
            ...prev,
        [key]: { tracks: cached.tracks, loading: false, error: null }
          }));
      return;
      }

        try {
          setCategories(prev => ({
            ...prev,
            [key]: { ...prev[key], loading: true }
          }));

          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            const tracksWithLikes = data.tracks.map((track: Track) => ({
              ...track,
              isLiked: track.likes.includes(user?.id || '')
            }));
        
        // Mettre en cache
        dataCache.set(key, { tracks: tracksWithLikes, timestamp: Date.now() });
        
            setCategories(prev => ({
              ...prev,
              [key]: { tracks: tracksWithLikes, loading: false, error: null }
            }));
          } else {
        throw new Error('Erreur de chargement');
          }
        } catch (error) {
          console.error(`Erreur chargement ${key}:`, error);
          setCategories(prev => ({
            ...prev,
            [key]: { tracks: [], loading: false, error: 'Erreur de chargement' }
          }));
        }
  }, [user?.id]);

  // Fonction pour charger les utilisateurs populaires
  const fetchPopularUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const response = await fetch('/api/users?limit=8');
      if (response.ok) {
        const data = await response.json();
        setPopularUsers(data.users);
      }
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Fonction pour charger les découvertes du jour
  const fetchDailyDiscoveries = useCallback(async () => {
    try {
      const response = await fetch('/api/tracks/recent?limit=4');
      if (response.ok) {
        const data = await response.json();
        const tracksWithLikes = data.tracks.map((track: Track) => ({
          ...track,
          isLiked: track.likes.includes(user?.id || '')
        }));
        setDailyDiscoveries(tracksWithLikes);
      }
    } catch (error) {
      console.error('Erreur chargement découvertes:', error);
    }
  }, [user?.id]);

  // Fonction pour charger les tendances hebdomadaires
  const fetchWeeklyTrends = useCallback(async () => {
    const trends = [
      { genre: 'Pop', growth: '+23%', icon: '🎵', color: 'from-pink-500 to-rose-500' },
      { genre: 'Hip-Hop', growth: '+18%', icon: '🎤', color: 'from-purple-500 to-indigo-500' },
      { genre: 'Electronic', growth: '+15%', icon: '🎧', color: 'from-blue-500 to-cyan-500' },
      { genre: 'Rock', growth: '+12%', icon: '🎸', color: 'from-red-500 to-orange-500' }
    ];
    setWeeklyTrends(trends);
  }, []);

  // Fonction pour charger les playlists de la communauté
  const fetchCommunityPlaylists = useCallback(async () => {
    const playlists = [
      { 
        title: 'Nouveautés 2024', 
        creator: 'MusicLover', 
        tracks: 24, 
        likes: 156,
        color: 'from-purple-500 to-pink-500',
        emoji: '🎵'
      },
      { 
        title: 'Chill Vibes', 
        creator: 'ChillMaster', 
        tracks: 18, 
        likes: 89,
        color: 'from-blue-500 to-cyan-500',
        emoji: '😌'
      },
      { 
        title: 'Workout Mix', 
        creator: 'FitnessGuru', 
        tracks: 32, 
        likes: 234,
        color: 'from-orange-500 to-red-500',
        emoji: '💪'
      },
      { 
        title: 'Late Night', 
        creator: 'NightOwl', 
        tracks: 15, 
        likes: 67,
        color: 'from-indigo-500 to-purple-500',
        emoji: '🌙'
      }
    ];
    setCommunityPlaylists(playlists);
  }, []);

  // Fonction pour charger les collaborations
  const fetchCollaborations = useCallback(async () => {
    try {
      const response = await fetch('/api/tracks/popular?limit=6');
      if (response.ok) {
        const data = await response.json();
        const tracksWithLikes = data.tracks.map((track: Track) => ({
          ...track,
          isLiked: track.likes.includes(user?.id || '')
        }));
        setCollaborations(tracksWithLikes);
      }
    } catch (error) {
      console.error('Erreur chargement collaborations:', error);
    }
  }, [user?.id]);

  // Fonction pour gérer le partage avec notification
  const handleShare = useCallback(async (track: Track) => {
    const shareText = `Écoutez "${track.title}" par ${track.artist?.name || track.artist?.username}`;
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: track.title,
          text: shareText,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(`${shareText} - ${shareUrl}`);
        // Simuler une notification de succès
        console.log('Lien copié dans le presse-papiers !');
      }
    } catch (error) {
      console.error('Erreur lors du partage:', error);
    }
  }, []);

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

      // Charger les pistes en vedette en premier
      await fetchCategoryData('featured', '/api/tracks/popular?limit=20');

      // Charger les autres catégories en parallèle
      await Promise.all(categoryApis.map(({ key, url }) => fetchCategoryData(key, url)));

      // Charger les nouvelles données
      await Promise.all([
        fetchPopularUsers(),
        fetchDailyDiscoveries(),
        fetchWeeklyTrends(),
        fetchCommunityPlaylists(),
        fetchCollaborations()
      ]);

      setLoading(false);
    };

    fetchAllCategories();
  }, [fetchCategoryData, fetchPopularUsers, fetchDailyDiscoveries, fetchWeeklyTrends, fetchCommunityPlaylists, fetchCollaborations]);

  // Fonction de rafraîchissement
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    dataCache.clear();
    
    const categoryApis = [
      { key: 'featured', url: '/api/tracks/popular?limit=20' },
      { key: 'trending', url: '/api/tracks/trending?limit=10' },
      { key: 'popular', url: '/api/tracks/popular?limit=10' },
      { key: 'recent', url: '/api/tracks/recent?limit=10' },
      { key: 'mostLiked', url: '/api/tracks/most-liked?limit=10' },
      { key: 'recommended', url: '/api/tracks/recommended?limit=10' },
      { key: 'following', url: '/api/tracks/following?limit=10' }
    ];

    await Promise.all(categoryApis.map(({ key, url }) => fetchCategoryData(key, url)));
    setRefreshing(false);
  }, [fetchCategoryData]);

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

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % Math.min(featuredTracks.length, 5));
    setIsAutoPlaying(false);
  }, [featuredTracks.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + Math.min(featuredTracks.length, 5)) % Math.min(featuredTracks.length, 5));
    setIsAutoPlaying(false);
  }, [featuredTracks.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Aujourd\'hui';
    if (diffDays === 2) return 'Hier';
    if (diffDays <= 7) return `Il y a ${diffDays - 1} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }, []);

  // Fonction pour gérer les likes
  const handleLikeTrack = useCallback(async (trackId: string, categoryKey: string, trackIndex: number) => {
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
  }, [session]);

  // Fonction pour jouer une piste
  const handlePlayTrack = useCallback((track: Track) => {
    const existingTrackIndex = audioState.tracks.findIndex(t => t._id === track._id);
    if (existingTrackIndex === -1) {
      setTracks([...audioState.tracks, track]);
      setCurrentTrackIndex(audioState.tracks.length);
    } else {
      setCurrentTrackIndex(existingTrackIndex);
    }
    setIsPlaying(true);
    setShowPlayer(true);
    setIsMinimized(false);
  }, [audioState.tracks, setTracks, setCurrentTrackIndex, setIsPlaying, setShowPlayer, setIsMinimized]);

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
      subtitle: 'Les créations les plus écoutées',
      icon: Flame,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20'
    },
    {
      key: 'popular',
      title: '⭐ Créations Populaires',
      subtitle: 'Les favoris de la communauté',
      icon: Crown,
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20'
    },
    {
      key: 'recent',
      title: '🆕 Nouvelles Créations',
      subtitle: 'Les derniers partages',
      icon: Calendar,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20'
    },
    {
      key: 'mostLiked',
      title: '💖 Coup de Cœur',
      subtitle: 'Les créations les plus aimées',
      icon: Heart,
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/20'
    },
    {
      key: 'following',
      title: '👥 Vos Artistes',
      subtitle: 'Les artistes que vous suivez',
      icon: UserPlus,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      showOnlyIfLoggedIn: true
    },
    {
      key: 'recommended',
      title: '🎯 Pour Vous',
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
      {/* Carrousel Hero - Design futuriste */}
      {featuredTracks.length > 0 && (
        <section className="relative h-[60vh] overflow-hidden">
          {/* Fond animé futuriste */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.15),transparent_50%)] animate-pulse"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.1),transparent_50%)] animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>

          {/* Grille de points animés */}
          <div className="absolute inset-0 opacity-30">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-purple-400 rounded-full"
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
                style={{
                  left: Math.random() * 100 + '%',
                  top: Math.random() * 100 + '%',
                }}
              />
            ))}
          </div>

          {/* Carrousel principal */}
          <div className="relative h-full">
            <AnimatePresence mode="wait">
              {featuredTracks[currentSlide] && (
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  {/* Image de fond avec effet parallax */}
                  <div className="absolute inset-0">
                    <motion.img
                      src={featuredTracks[currentSlide].coverUrl || '/default-cover.jpg'}
                      alt={featuredTracks[currentSlide].title}
                      className="w-full h-full object-cover"
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      loading="eager"
                      onError={(e) => {
                        e.currentTarget.src = '/default-cover.jpg';
                      }}
                    />
                    {/* Overlay gradient futuriste */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/60 via-transparent to-transparent"></div>
                  </div>

                  {/* Contenu principal */}
                  <div className="relative h-full flex items-end">
                    <div className="container mx-auto px-6 pb-16">
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="max-w-3xl"
                      >
                        {/* Badge tendance futuriste */}
                        <motion.div
                          initial={{ opacity: 0, x: -30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4, duration: 0.5 }}
                          className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white px-3 py-1.5 rounded-full mb-4 backdrop-blur-md border border-purple-500/30"
                        >
                          <TrendingUp size={14} />
                          <span className="font-medium text-sm">Tendance #1</span>
                        </motion.div>

                        {/* Titre */}
                        <motion.h1
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6, duration: 0.6 }}
                          className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight cursor-pointer hover:text-purple-300 transition-colors"
                        >
                          {featuredTracks[currentSlide].title}
                        </motion.h1>

                        {/* Artiste */}
                        <motion.p
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8, duration: 0.5 }}
                          className="text-lg md:text-xl text-gray-300 mb-4 cursor-pointer hover:text-purple-300 transition-colors"
                        >
                          {featuredTracks[currentSlide].artist?.name || featuredTracks[currentSlide].artist?.username || 'Artiste inconnu'}
                        </motion.p>

                        {/* Stats compactes */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.0, duration: 0.6 }}
                          className="flex flex-wrap items-center gap-4 mb-4"
                        >
                          <div className="flex items-center space-x-4 text-sm text-gray-300">
                            <div className="flex items-center space-x-1.5">
                              <Headphones size={16} className="text-purple-400" />
                              <span>{formatNumber(featuredTracks[currentSlide].plays)}</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <Users size={16} className="text-pink-400" />
                              <span>{formatNumber(featuredTracks[currentSlide].likes.length)}</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <Clock size={16} className="text-blue-400" />
                              <span>{formatDuration(featuredTracks[currentSlide].duration)}</span>
                            </div>
                          </div>
                        </motion.div>

                        {/* Boutons d'action compacts */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.2, duration: 0.6 }}
                          className="flex flex-wrap items-center gap-3"
                        >
                          {/* Bouton Play */}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handlePlayTrack(featuredTracks[currentSlide])}
                            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-semibold text-base hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
                          >
                            {currentTrack?._id === featuredTracks[currentSlide]._id && audioState.isPlaying ? (
                              <Pause size={20} />
                            ) : (
                              <Play size={20} className="ml-0.5" />
                            )}
                            <span>
                              {currentTrack?._id === featuredTracks[currentSlide]._id && audioState.isPlaying ? 'Pause' : 'Écouter'}
                            </span>
                          </motion.button>

                          {/* Bouton Like */}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleLikeTrack(featuredTracks[currentSlide]._id, 'featured', currentSlide)}
                            className={`flex items-center space-x-2 px-4 py-3 rounded-full font-semibold transition-all duration-300 backdrop-blur-sm ${
                              featuredTracks[currentSlide].isLiked || featuredTracks[currentSlide].likes.includes(user?.id || '')
                                ? 'text-red-500 bg-red-500/20 border border-red-500/30'
                                : 'text-white bg-white/10 border border-white/20 hover:bg-white/20'
                            }`}
                          >
                            <Heart 
                              size={18} 
                              fill={featuredTracks[currentSlide].isLiked || featuredTracks[currentSlide].likes.includes(user?.id || '') ? 'currentColor' : 'none'} 
                            />
                            <span>J'aime</span>
                          </motion.button>

                          {/* Bouton Partager */}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleShare(featuredTracks[currentSlide])}
                            className="flex items-center space-x-2 px-4 py-3 rounded-full font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
                          >
                            <Share2 size={18} />
                            <span>Partager</span>
                          </motion.button>
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation du carrousel futuriste */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
              <div className="flex items-center space-x-3">
                {/* Bouton précédent */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={prevSlide}
                  className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/20 transition-colors border border-white/20"
                >
                  <ChevronLeft size={20} />
                </motion.button>

                {/* Indicateurs */}
                <div className="flex items-center space-x-1.5">
                  {featuredTracks.map((_, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => goToSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
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
                  className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/20 transition-colors border border-white/20"
                >
                  <ChevronRight size={20} />
                </motion.button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Section Recherche Rapide - Design futuriste */}
      <section className="container mx-auto px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '50px' }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          {/* Barre de recherche principale */}
          <div className="relative max-w-2xl mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher des créations, artistes, genres..."
                className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-2 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
              >
                <Search size={16} />
              </motion.button>
            </div>
          </div>

          {/* Filtres rapides */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {[
              { label: 'Tous', icon: Music, active: true },
              { label: 'Pop', icon: Music, color: 'from-pink-500 to-rose-500' },
              { label: 'Rock', icon: Music, color: 'from-red-500 to-orange-500' },
              { label: 'Hip-Hop', icon: Music, color: 'from-purple-500 to-indigo-500' },
              { label: 'Electronic', icon: Music, color: 'from-blue-500 to-cyan-500' },
              { label: 'Jazz', icon: Music, color: 'from-yellow-500 to-orange-500' },
              { label: 'Classical', icon: Music, color: 'from-gray-500 to-slate-500' }
            ].map((filter, index) => (
              <motion.button
                key={filter.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '50px' }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 backdrop-blur-sm border ${
                  filter.active 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-500/50' 
                    : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/20 hover:text-white'
                }`}
              >
                <filter.icon size={16} />
                <span>{filter.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Suggestions de recherche */}
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-3">Suggestions populaires :</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Nouveautés 2024', 'Remixes', 'Live Sessions', 'Collaborations', 'Demos', 'Covers'].map((suggestion, index) => (
                <motion.button
                  key={suggestion}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '50px' }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-300"
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Section Découvertes du Jour - Design futuriste */}
      {dailyDiscoveries.length > 0 && (
        <section className="container mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                  <Gift size={20} className="text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Découvertes du Jour</h2>
                  <p className="text-gray-400 text-sm">Nos coups de cœur sélectionnés</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-purple-400 hover:text-purple-300 font-medium text-sm"
              >
                Voir tout
              </motion.button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dailyDiscoveries.map((track, index) => (
                <motion.div
                  key={track._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '50px' }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="group cursor-pointer"
                >
                  <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border border-yellow-500/20 hover:shadow-lg hover:shadow-yellow-500/10 transition-all duration-300">
                    {/* Cover avec lazy loading */}
                    <div className="relative aspect-square">
                      <img
                        src={track.coverUrl || '/default-cover.jpg'}
                        alt={track.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.src = '/default-cover.jpg';
                        }}
                      />
                      
                      {/* Overlay avec bouton play */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayTrack(track);
                          }}
                          className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200"
                        >
                          {currentTrack?._id === track._id && audioState.isPlaying ? (
                            <Pause size={18} fill="white" />
                          ) : (
                            <Play size={18} fill="white" className="ml-0.5" />
                          )}
                        </motion.button>
                      </div>

                      {/* Badge "Découverte" */}
                      <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-500/90 to-orange-500/90 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm font-medium">
                        <Sparkles size={10} className="inline mr-1" />
                        Découverte
                      </div>

                      {/* Badge durée */}
                      <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                        {formatDuration(track.duration)}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="font-semibold text-white truncate mb-1 group-hover:text-yellow-300 transition-colors cursor-pointer text-sm">
                        {track.title}
                      </h3>
                      <p className="text-gray-300 text-xs truncate mb-2 cursor-pointer hover:text-yellow-300 transition-colors">
                        {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                      </p>
                      
                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Headphones size={10} />
                          <span>{formatNumber(track.plays)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.8 }}
                            onClick={() => handleLikeTrack(track._id, 'dailyDiscoveries', index)}
                            className={`transition-colors ${
                              track.isLiked || track.likes.includes(user?.id || '')
                                ? 'text-red-500'
                                : 'text-gray-500 hover:text-red-500'
                            }`}
                          >
                            <Heart size={10} fill={track.isLiked || track.likes.includes(user?.id || '') ? 'currentColor' : 'none'} />
                          </motion.button>
                          <span>{formatNumber(track.likes.length)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      )}

      {/* Sections de catégories améliorées */}
      <div className="py-6 space-y-12">
        {/* Section Quick Actions - Design futuriste */}
        <section className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <h2 className="text-xl font-bold text-white mb-4">Créer & Découvrir</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Mic2, label: 'Partager ma musique', color: 'from-purple-500/20 to-pink-500/20', borderColor: 'border-purple-500/30', iconColor: 'text-purple-400', href: '/upload' },
                { icon: Music, label: 'Découvrir', color: 'from-green-500/20 to-emerald-500/20', borderColor: 'border-green-500/30', iconColor: 'text-green-400', href: '/discover' },
                { icon: Users, label: 'Communauté', color: 'from-orange-500/20 to-red-500/20', borderColor: 'border-orange-500/30', iconColor: 'text-orange-400', href: '/community' }
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group cursor-pointer"
                >
                  <div className={`relative p-4 rounded-lg bg-gradient-to-br ${item.color} hover:shadow-lg transition-all duration-300 border ${item.borderColor}`}>
                    <div className="absolute inset-0 bg-black/5 rounded-lg group-hover:bg-black/10 transition-colors"></div>
                    <div className="relative z-10 text-center">
                      <item.icon size={24} className={`mx-auto mb-2 ${item.iconColor}`} />
                      <p className="text-white font-medium text-sm">{item.label}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Section Artistes Émergents - Design futuriste */}
        <section className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                  <UserPlus size={20} className="text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Artistes Émergents</h2>
                  <p className="text-gray-400 text-sm">Découvrez les nouveaux talents</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-purple-400 hover:text-purple-300 font-medium text-sm"
              >
                Voir tout
              </motion.button>
            </div>
            
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {popularUsers.map((user, index) => (
                  <motion.div
                    key={user._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '50px' }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ y: -2, scale: 1.02 }}
                    className="group cursor-pointer text-center"
                  >
                    <div className="relative mb-2">
                      <img
                        src={user.avatar || '/default-avatar.png'}
                        alt={user.name || user.username}
                        className="w-16 h-16 rounded-full mx-auto object-cover group-hover:ring-2 ring-purple-500/50 transition-all duration-300"
                      />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute bottom-0 right-0 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        <UserPlus size={12} className="text-white" />
                      </motion.button>
                    </div>
                    <h3 className="font-medium text-white text-xs truncate">{user.name || user.username}</h3>
                    <p className="text-gray-400 text-xs">{user.followers?.length || 0} abonnés</p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </section>

        {/* Section Tendances de la Semaine - Design futuriste */}
        <section className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
                  <BarChart3 size={20} className="text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Tendances de la Semaine</h2>
                  <p className="text-gray-400 text-sm">Les styles qui montent en flèche</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-purple-400 hover:text-purple-300 font-medium text-sm"
              >
                Voir tout
              </motion.button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {weeklyTrends.map((trend, index) => (
                <motion.div
                  key={trend.genre}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '50px' }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ y: -2, scale: 1.02 }}
                  className="group cursor-pointer"
                >
                  <div className={`relative p-4 rounded-lg bg-gradient-to-br ${trend.color} hover:shadow-lg transition-all duration-300 border border-white/10`}>
                    <div className="absolute inset-0 bg-black/10 rounded-lg group-hover:bg-black/5 transition-colors"></div>
                    <div className="relative z-10 text-center">
                      <div className="text-2xl mb-2">{trend.icon}</div>
                      <p className="text-white font-medium mb-2 text-sm">{trend.genre}</p>
                      <div className="inline-flex items-center space-x-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                        <TrendingUp size={12} className="text-white" />
                        <span className="text-white text-xs font-medium">{trend.growth}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Section Créations Récentes */}
        <section className="container mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Nouvelles Créations</h2>
                <p className="text-gray-400">Les dernières créations partagées par la communauté</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                Voir tout
              </motion.button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {[
                { title: 'Créations Populaires', tracks: 24, color: 'from-purple-500 to-pink-500', emoji: '🔥' },
                { title: 'Premiers Pas', tracks: 18, color: 'from-blue-500 to-cyan-500', emoji: '🌟' },
                { title: 'Collaborations', tracks: 32, color: 'from-orange-500 to-red-500', emoji: '🤝' },
                { title: 'Remixes', tracks: 15, color: 'from-indigo-500 to-purple-500', emoji: '🔄' },
                { title: 'Live Sessions', tracks: 28, color: 'from-pink-500 to-rose-500', emoji: '🎤' },
                { title: 'Demos', tracks: 12, color: 'from-green-500 to-emerald-500', emoji: '🎵' }
              ].map((playlist, index) => (
                <motion.div
                  key={playlist.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '50px' }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group cursor-pointer"
                >
                  <div className="relative rounded-xl overflow-hidden">
                    <div className={`aspect-square bg-gradient-to-br ${playlist.color} flex items-center justify-center`}>
                      <div className="text-4xl">{playlist.emoji}</div>
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
                      >
                        <Play size={20} fill="white" className="ml-1" />
                      </motion.button>
                    </div>
                    <div className="p-3 bg-black/80 backdrop-blur-sm">
                      <h3 className="font-semibold text-white text-sm truncate">{playlist.title}</h3>
                      <p className="text-gray-400 text-xs">{playlist.tracks} créations</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Section Collaborations Récentes */}
        {collaborations.length > 0 && (
          <section className="container mx-auto px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '50px' }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500">
                    <Users size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">🤝 Collaborations Récentes</h2>
                    <p className="text-gray-400">Les créations faites à plusieurs artistes</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-purple-400 hover:text-purple-300 font-medium"
                >
                  Voir tout
                </motion.button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {collaborations.map((track, index) => (
                  <motion.div
                    key={track._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '50px' }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="group cursor-pointer"
                  >
                    <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 hover:shadow-2xl transition-all duration-300">
                      {/* Cover avec lazy loading */}
                      <div className="relative aspect-square">
                        <img
                          src={track.coverUrl || '/default-cover.jpg'}
                          alt={track.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.src = '/default-cover.jpg';
                          }}
                        />
                        
                        {/* Overlay avec bouton play */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayTrack(track);
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

                        {/* Badge "Collaboration" */}
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm font-semibold">
                          🤝 Collab
                        </div>

                        {/* Badge durée */}
                        <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                          {formatDuration(track.duration)}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h3 className="font-semibold text-white truncate mb-1 group-hover:text-blue-300 transition-colors cursor-pointer">
                          {track.title}
                        </h3>
                        <p className="text-gray-300 text-sm truncate mb-3 cursor-pointer hover:text-blue-300 transition-colors">
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
                              onClick={() => handleLikeTrack(track._id, 'collaborations', index)}
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
            </motion.div>
          </section>
        )}

        {/* Section Événements en Direct - Design futuriste */}
        <section className="container mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Notre Communauté</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: Music, label: 'Créations', value: '1,234', color: 'from-purple-500 to-pink-500' },
                { icon: Users, label: 'Artistes', value: '567', color: 'from-blue-500 to-cyan-500' },
                { icon: Heart, label: 'Likes', value: '89K', color: 'from-pink-500 to-rose-500' },
                { icon: Headphones, label: 'Écoutes', value: '2.1M', color: 'from-green-500 to-emerald-500' }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '50px' }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br ${stat.color} mb-4`}>
                    <stat.icon size={24} className="text-white" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Sections de catégories existantes améliorées */}
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
                viewport={{ once: true, margin: '50px' }}
                transition={{ duration: 0.6, delay: configIndex * 0.1 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${config.color} ${config.bgColor} ${config.borderColor} border`}>
                    <config.icon size={24} className="text-white" />
                  </div>
                  <div>
                      <h2 className="text-2xl font-bold text-white">{config.title}</h2>
                    <p className="text-gray-400">{config.subtitle}</p>
                  </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-purple-400 hover:text-purple-300 font-medium"
                  >
                    Voir tout
                  </motion.button>
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
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '50px' }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      whileHover={{ y: -8, scale: 1.02 }}
                      className="group cursor-pointer"
                    >
                      <div className={`relative rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 ${config.bgColor} ${config.borderColor} border`}>
                        {/* Cover avec lazy loading */}
                        <div className="relative aspect-square">
                          <img
                            src={track.coverUrl || '/default-cover.jpg'}
                            alt={track.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              e.currentTarget.src = '/default-cover.jpg';
                            }}
                          />
                          
                          {/* Overlay avec bouton play */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayTrack(track);
                              }}
                              className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
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
                          >
                            {track.title}
                          </h3>
                          <p 
                            className="text-gray-300 text-sm truncate mb-3 cursor-pointer hover:text-purple-300 transition-colors"
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

        {/* Section Genres */}
        <section className="container mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Explorer par Style</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {[
                { name: 'Pop', color: 'from-pink-500 to-rose-500', icon: '🎵', tracks: '234' },
                { name: 'Rock', color: 'from-red-500 to-orange-500', icon: '🎸', tracks: '156' },
                { name: 'Hip-Hop', color: 'from-purple-500 to-indigo-500', icon: '🎤', tracks: '189' },
                { name: 'Electronic', color: 'from-blue-500 to-cyan-500', icon: '🎧', tracks: '98' },
                { name: 'Jazz', color: 'from-yellow-500 to-orange-500', icon: '🎷', tracks: '67' },
                { name: 'Classical', color: 'from-gray-500 to-slate-500', icon: '🎻', tracks: '45' }
              ].map((genre, index) => (
                <motion.div
                  key={genre.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '50px' }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="group cursor-pointer"
                >
                  <div className={`relative p-6 rounded-2xl bg-gradient-to-br ${genre.color} hover:shadow-2xl transition-all duration-300`}>
                    <div className="absolute inset-0 bg-black/20 rounded-2xl group-hover:bg-black/10 transition-colors"></div>
                    <div className="relative z-10 text-center">
                      <div className="text-3xl mb-2">{genre.icon}</div>
                      <p className="text-white font-semibold mb-1">{genre.name}</p>
                      <p className="text-white/80 text-xs">{genre.tracks} créations</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Section Playlists de la Communauté */}
        <section className="container mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
                  <Music size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">🎵 Playlists de la Communauté</h2>
                  <p className="text-gray-400">Les meilleures compilations créées par les utilisateurs</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                Voir tout
              </motion.button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {communityPlaylists.map((playlist, index) => (
                <motion.div
                  key={playlist.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '50px' }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group cursor-pointer"
                >
                  <div className="relative rounded-xl overflow-hidden">
                    <div className={`aspect-square bg-gradient-to-br ${playlist.color} flex items-center justify-center relative`}>
                      <div className="text-4xl">{playlist.emoji}</div>
                      
                      {/* Overlay avec bouton play */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
                        >
                          <Play size={20} fill="white" className="ml-1" />
                        </motion.button>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-black/80 backdrop-blur-sm">
                      <h3 className="font-semibold text-white text-sm truncate mb-1">{playlist.title}</h3>
                      <p className="text-gray-400 text-xs mb-2">par {playlist.creator}</p>
                      
                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-2">
                          <Music size={12} />
                          <span>{playlist.tracks} titres</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Heart size={12} />
                          <span>{playlist.likes}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Section Actualités */}
        <section className="container mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Actualités</h2>
                <p className="text-gray-400">Les dernières nouvelles de la communauté</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                Voir tout
              </motion.button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { 
                  title: 'Nouvelle fonctionnalité : Playlists collaboratives', 
                  excerpt: 'Créez et partagez des playlists avec vos amis en temps réel',
                  date: 'Il y a 2 jours',
                  color: 'from-purple-500 to-pink-500'
                },
                { 
                  title: 'Artiste de la semaine : Luna Sky', 
                  excerpt: 'Découvrez cette artiste émergente et ses derniers titres',
                  date: 'Il y a 5 jours',
                  color: 'from-blue-500 to-cyan-500'
                },
                { 
                  title: 'Mise à jour de l\'application', 
                  excerpt: 'Nouvelles fonctionnalités et améliorations de performance',
                  date: 'Il y a 1 semaine',
                  color: 'from-green-500 to-emerald-500'
                }
              ].map((news, index) => (
                <motion.div
                  key={news.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '50px' }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group cursor-pointer"
                >
                  <div className={`relative p-6 rounded-2xl bg-gradient-to-br ${news.color} hover:shadow-2xl transition-all duration-300`}>
                    <div className="absolute inset-0 bg-black/20 rounded-2xl group-hover:bg-black/10 transition-colors"></div>
                    <div className="relative z-10">
                      <h3 className="text-white font-semibold mb-2 group-hover:text-purple-200 transition-colors">{news.title}</h3>
                      <p className="text-white/80 text-sm mb-3">{news.excerpt}</p>
                      <p className="text-white/60 text-xs">{news.date}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Section Statistiques de la Communauté */}
        <section className="container mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">Notre Communauté en Chiffres</h2>
              <p className="text-gray-400 text-lg">Découvrez l'impact de notre plateforme musicale</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { 
                  icon: Music, 
                  label: 'Créations', 
                  value: '1,234', 
                  suffix: '+',
                  color: 'from-purple-500 to-pink-500',
                  description: 'Titres partagés'
                },
                { 
                  icon: Users, 
                  label: 'Artistes', 
                  value: '567', 
                  suffix: '+',
                  color: 'from-blue-500 to-cyan-500',
                  description: 'Créateurs actifs'
                },
                { 
                  icon: Heart, 
                  label: 'Likes', 
                  value: '89K', 
                  suffix: '+',
                  color: 'from-pink-500 to-rose-500',
                  description: 'Interactions'
                },
                { 
                  icon: Headphones, 
                  label: 'Écoutes', 
                  value: '2.1M', 
                  suffix: '+',
                  color: 'from-green-500 to-emerald-500',
                  description: 'Minutes écoutées'
                }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '50px' }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group cursor-pointer text-center"
                >
                  <div className={`relative p-6 rounded-2xl bg-gradient-to-br ${stat.color} hover:shadow-2xl transition-all duration-300 border border-white/10 overflow-hidden`}>
                    {/* Effet de particules animées */}
                    <div className="absolute inset-0 opacity-20">
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 bg-white rounded-full"
                          animate={{
                            x: [0, 100, 0],
                            y: [0, -50, 0],
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            duration: 3 + i,
                            repeat: Infinity,
                            delay: i * 0.5,
                          }}
                          style={{
                            left: Math.random() * 100 + '%',
                            top: Math.random() * 100 + '%',
                          }}
                        />
                      ))}
                    </div>

                    <div className="relative z-10">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <stat.icon size={28} className="text-white" />
                      </div>
                      
                      <motion.div 
                        className="text-3xl font-bold text-white mb-2"
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                      >
                        {stat.value}{stat.suffix}
                      </motion.div>
                      
                      <div className="text-white font-semibold mb-1">{stat.label}</div>
                      <div className="text-white/70 text-sm">{stat.description}</div>
                    </div>

                    {/* Effet de brillance au survol */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -skew-x-12 -translate-x-full group-hover:translate-x-full"></div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Statistiques supplémentaires */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { 
                  title: 'Temps d\'écoute moyen', 
                  value: '45 min', 
                  icon: Clock,
                  color: 'from-orange-500 to-red-500'
                },
                { 
                  title: 'Collaborations', 
                  value: '234', 
                  icon: Users,
                  color: 'from-indigo-500 to-purple-500'
                },
                { 
                  title: 'Playlists créées', 
                  value: '1.2K', 
                  icon: List,
                  color: 'from-teal-500 to-cyan-500'
                }
              ].map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '50px' }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center space-x-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
                >
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                    <stat.icon size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">{stat.value}</div>
                    <div className="text-gray-400 text-sm">{stat.title}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Section Recommandations Personnalisées - Design futuriste */}
        {session && (
          <section className="container mx-auto px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '50px' }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">✨ Recommandations pour Vous</h2>
                    <p className="text-gray-400">Basé sur vos goûts et votre historique</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-purple-400 hover:text-purple-300 font-medium"
                >
                  Rafraîchir
                </motion.button>
              </div>

              {/* Cartes de recommandations */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { 
                    type: 'Artiste similaire', 
                    title: 'Découvrez Luna Sky',
                    description: 'Basé sur votre écoute de "Midnight Dreams"',
                    confidence: '95%',
                    color: 'from-purple-500 to-pink-500',
                    icon: UserPlus
                  },
                  { 
                    type: 'Genre émergent', 
                    title: 'Nouveau style : Lo-Fi',
                    description: 'Vous pourriez aimer ces sons relaxants',
                    confidence: '87%',
                    color: 'from-blue-500 to-cyan-500',
                    icon: Music
                  },
                  { 
                    type: 'Collaboration', 
                    title: 'Projet avec DJ Nova',
                    description: 'Vos styles se complètent parfaitement',
                    confidence: '92%',
                    color: 'from-green-500 to-emerald-500',
                    icon: Users
                  }
                ].map((rec, index) => (
                  <motion.div
                    key={rec.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '50px' }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="group cursor-pointer"
                  >
                    <div className={`relative p-6 rounded-2xl bg-gradient-to-br ${rec.color} hover:shadow-2xl transition-all duration-300 border border-white/10 overflow-hidden`}>
                      {/* Badge de confiance */}
                      <div className="absolute top-4 right-4">
                        <div className="bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-semibold">
                          {rec.confidence}
                        </div>
                      </div>

                      {/* Type de recommandation */}
                      <div className="text-white/80 text-sm font-medium mb-3">{rec.type}</div>

                      {/* Icône */}
                      <div className="mb-4">
                        <rec.icon size={32} className="text-white" />
                      </div>

                      {/* Contenu */}
                      <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-purple-200 transition-colors">
                        {rec.title}
                      </h3>
                      <p className="text-white/80 text-sm mb-4">{rec.description}</p>

                      {/* Bouton d'action */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full bg-white/20 backdrop-blur-sm text-white py-2 rounded-lg font-medium hover:bg-white/30 transition-all duration-300 border border-white/20"
                      >
                        Découvrir
                      </motion.button>

                      {/* Effet de brillance au survol */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -skew-x-12 -translate-x-full group-hover:translate-x-full"></div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Insights personnalisés */}
              <div className="mt-8 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <h3 className="text-white font-semibold text-lg mb-4">Vos Insights Musicaux</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Genre préféré', value: 'Pop/Electronic', icon: Music },
                    { label: 'Temps d\'écoute', value: '2h 15min/jour', icon: Clock },
                    { label: 'Artiste top', value: 'Luna Sky', icon: Star }
                  ].map((insight, index) => (
                    <motion.div
                      key={insight.label}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '50px' }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="flex items-center space-x-3"
                    >
                      <insight.icon size={20} className="text-purple-400" />
                      <div>
                        <div className="text-white font-medium">{insight.value}</div>
                        <div className="text-gray-400 text-sm">{insight.label}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </section>
        )}

        {/* Section Activité Récente - Design futuriste */}
        <section className="container mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500">
                  <Zap size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">⚡ Activité Récente</h2>
                  <p className="text-gray-400">Ce qui se passe dans votre réseau</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                Voir tout
              </motion.button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Activités des artistes suivis */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold text-lg mb-4">Artistes que vous suivez</h3>
                {[
                  { 
                    artist: 'Luna Sky', 
                    action: 'a partagé une nouvelle création', 
                    track: 'Midnight Dreams',
                    time: 'Il y a 2h',
                    avatar: '/default-avatar.png',
                    color: 'from-purple-500 to-pink-500'
                  },
                  { 
                    artist: 'DJ Nova', 
                    action: 'a commencé un live', 
                    track: 'Session Lo-Fi',
                    time: 'Il y a 4h',
                    avatar: '/default-avatar.png',
                    color: 'from-blue-500 to-cyan-500'
                  },
                  { 
                    artist: 'The Groove Collective', 
                    action: 'a aimé votre création', 
                    track: 'Summer Vibes',
                    time: 'Il y a 6h',
                    avatar: '/default-avatar.png',
                    color: 'from-green-500 to-emerald-500'
                  }
                ].map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '50px' }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ x: 5 }}
                    className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${activity.color} flex items-center justify-center`}>
                      <img 
                        src={activity.avatar} 
                        alt={activity.artist}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">
                        <span className="font-semibold">{activity.artist}</span> {activity.action}
                      </p>
                      <p className="text-purple-400 text-xs">{activity.track}</p>
                      <p className="text-gray-400 text-xs">{activity.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Notifications et mises à jour */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold text-lg mb-4">Notifications</h3>
                {[
                  { 
                    type: 'Nouvelle fonctionnalité', 
                    title: 'Playlists collaboratives disponibles',
                    description: 'Créez des playlists avec vos amis en temps réel',
                    time: 'Il y a 1h',
                    icon: Gift,
                    color: 'from-yellow-500 to-orange-500'
                  },
                  { 
                    type: 'Mise à jour', 
                    title: 'Nouveau design disponible',
                    description: 'Interface améliorée et nouvelles animations',
                    time: 'Il y a 3h',
                    icon: RefreshCw,
                    color: 'from-green-500 to-emerald-500'
                  },
                  { 
                    type: 'Événement', 
                    title: 'Concert virtuel ce soir',
                    description: 'Rejoignez le live de Luna Sky à 20h',
                    time: 'Il y a 5h',
                    icon: Radio,
                    color: 'from-red-500 to-pink-500'
                  }
                ].map((notification, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '50px' }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ x: -5 }}
                    className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${notification.color}`}>
                        <notification.icon size={16} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-purple-400 text-xs font-medium">{notification.type}</span>
                          <span className="text-gray-400 text-xs">{notification.time}</span>
                        </div>
                        <h4 className="text-white font-semibold text-sm mb-1">{notification.title}</h4>
                        <p className="text-gray-400 text-xs">{notification.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Sections de catégories existantes améliorées */}
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
    </div>
  );
} 