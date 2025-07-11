'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { useAudioPlayer } from './providers';
import BottomNav from '@/components/BottomNav';
import InteractiveCounter from '@/components/InteractiveCounter';
import SocialStats from '@/components/SocialStats';
import { 
  Play, Heart, ChevronLeft, ChevronRight, Pause, Clock, Headphones, 
  Users, TrendingUp, Star, Zap, Music, Flame, Calendar, UserPlus,
  Sparkles, Crown, Radio, Disc3, Mic2, RefreshCw, Share2, Eye, 
  Award, Target, Compass, BarChart3, Gift, Lightbulb, Globe, Search, List, Activity, X,
  Newspaper, Download, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

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
  isDiscovery?: boolean;
}

interface CategoryData {
  tracks: Track[];
  loading: boolean;
  error: string | null;
}

// Cache simple pour les données (sans les écoutes pour éviter les désynchronisations)
const dataCache = new Map<string, { tracks: Track[]; timestamp: number }>();
const CACHE_DURATION = 5 * 1000; // 5 secondes (réduit encore plus pour éviter les données obsolètes)

export default function HomePage() {
  const { data: session } = useSession();
  const { user } = useAuth();
  const { isNative, checkForUpdates } = useNativeFeatures();
  const { audioState, setTracks, setCurrentTrackIndex, setIsPlaying, setShowPlayer, setIsMinimized, playTrack, pause, play } = useAudioPlayer();
  const router = useRouter();
  
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
  
  // État pour les événements live
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  
  // État pour la recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>({ tracks: [], artists: [], playlists: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('all');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // État pour les statistiques de la communauté
  const [communityStats, setCommunityStats] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // État pour les recommandations personnalisées
  const [personalRecommendations, setPersonalRecommendations] = useState<any[]>([]);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  
  // État pour l'activité récente
  const [recentActivity, setRecentActivity] = useState<any>({
    followedActivities: [],
    systemNotifications: [],
    userActivities: []
  });
  const [activityLoading, setActivityLoading] = useState(false);
  
  // État pour les playlists populaires
  const [popularPlaylists, setPopularPlaylists] = useState<any[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  
  // État pour les genres musicaux
  const [musicGenres, setMusicGenres] = useState<any[]>([]);
  const [genresLoading, setGenresLoading] = useState(false);
  
  // État pour les interactions de la section Créer & Découvrir
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showQuickStats, setShowQuickStats] = useState(false);
  
  // Interface pour les statistiques en temps réel
  interface RealTimeStats {
    tracks: number;
    artists: number;
    totalPlays: number;
    totalLikes: number;
    loading: boolean;
    error: string | null;
  }

  // État pour les vraies statistiques en temps réel
  const [realTimeStats, setRealTimeStats] = useState<RealTimeStats>({
    tracks: 0,
    artists: 0,
    totalPlays: 0,
    totalLikes: 0,
    loading: false,
    error: null
  });

  // Charger les statistiques en temps réel
  useEffect(() => {
    fetchRealTimeStats();
    
    // Mettre à jour les statistiques toutes les 30 secondes
    const interval = setInterval(fetchRealTimeStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Debug: Afficher l'état des catégories
  useEffect(() => {
    console.log('📊 État des catégories:', {
      featured: categories.featured.tracks.length,
      trending: categories.trending.tracks.length,
      popular: categories.popular.tracks.length,
      recent: categories.recent.tracks.length,
      mostLiked: categories.mostLiked.tracks.length,
      recommended: categories.recommended.tracks.length,
      following: categories.following.tracks.length,
      loading: loading
    });
  }, [categories, loading]);

  // État pour la radio
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [radioInfo, setRadioInfo] = useState({
    name: 'Mixx Party',
    description: 'Le meilleur de la musique électronique et dance',
    currentTrack: 'En direct - Mixx Party',
    listeners: 1247,
    isLive: true
  });
  const [showProgramDialog, setShowProgramDialog] = useState(false);
  const [realRadioProgram, setRealRadioProgram] = useState<any[]>([]);
  const [programLoading, setProgramLoading] = useState(false);

  // Debug: log l'état du dialog
  useEffect(() => {
    console.log('État du dialog:', showProgramDialog);
  }, [showProgramDialog]);



  // Obtenir la piste actuelle
  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  const featuredTracks = useMemo(() => categories.featured.tracks.slice(0, 5), [categories.featured.tracks]);

  // Écouter les changements dans l'état du lecteur pour mettre à jour les statistiques
  useEffect(() => {
    const updateTrackStats = async () => {
      if (currentTrack && audioState.isPlaying) {
        try {
          // Utiliser un debounce pour éviter les appels multiples
          const timeoutId = setTimeout(async () => {
            const response = await fetch(`/api/tracks/${currentTrack._id}/plays`);
            if (response.ok) {
              const data = await response.json();
              
              // Mettre à jour les statistiques dans toutes les catégories de manière atomique
              setCategories(prev => {
                const newCategories = { ...prev };
                Object.keys(newCategories).forEach(categoryKey => {
                  if (newCategories[categoryKey] && newCategories[categoryKey].tracks) {
                    newCategories[categoryKey] = {
                      ...newCategories[categoryKey],
                                    tracks: newCategories[categoryKey].tracks?.map(t =>
                t._id === currentTrack._id 
                  ? { ...t, plays: data.plays || t.plays }
                  : t
              ) || []
                    };
                  }
                });
                return newCategories;
              });
              
              // Mettre à jour aussi les autres états de pistes de manière atomique
              setDailyDiscoveries(prev => 
                prev?.map(t => t._id === currentTrack._id ? { ...t, plays: data.plays || t.plays } : t) || []
              );
              setCollaborations(prev => 
                prev?.map(t => t._id === currentTrack._id ? { ...t, plays: data.plays || t.plays } : t) || []
              );
            }
          }, 1000); // Attendre 1 seconde avant de mettre à jour les stats
          
          return () => clearTimeout(timeoutId);
        } catch (error) {
          console.error('Erreur mise à jour stats:', error);
        }
      }
    };

    // Mettre à jour les stats quand une nouvelle piste commence à jouer
    if (currentTrack && audioState.isPlaying) {
      updateTrackStats();
    }
  }, [currentTrack?._id, audioState.isPlaying]);

  // Fonction optimisée pour charger les données avec cache
  const fetchCategoryData = useCallback(async (key: string, url: string, forceRefresh = false) => {
    console.log(`🔄 Chargement ${key}:`, { forceRefresh, url });
    
    // Toujours forcer le refresh pour éviter les désynchronisations d'écoutes
    const shouldForceRefresh = forceRefresh || key === 'featured' || key === 'trending' || key === 'popular';
    
    // Vérifier le cache d'abord (sauf si forceRefresh est true)
    const cached = dataCache.get(key);
    if (!shouldForceRefresh && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📦 Utilisation cache pour ${key}:`, cached.tracks.length, 'pistes');
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

      // Ajouter un timestamp pour éviter le cache navigateur
      const urlWithTimestamp = forceRefresh ? `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}` : url;
      console.log(`🌐 Requête API ${key}:`, urlWithTimestamp);
      
      const response = await fetch(urlWithTimestamp, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Réponse API ${key}:`, data.tracks?.length || 0, 'pistes');
        
        const tracksWithLikes = data.tracks.map((track: Track) => ({
          ...track,
          isLiked: track.likes.includes(user?.id || '')
        }));
    
        // Mettre en cache (mais les écoutes seront toujours récupérées fraîches)
        dataCache.set(key, { tracks: tracksWithLikes, timestamp: Date.now() });
        console.log(`💾 Cache mis à jour pour ${key}:`, tracksWithLikes.length, 'pistes');
        
        setCategories(prev => ({
          ...prev,
          [key]: { tracks: tracksWithLikes, loading: false, error: null }
        }));
      } else {
        console.error(`❌ Erreur API ${key}:`, response.status, response.statusText);
        throw new Error('Erreur de chargement');
      }
    } catch (error) {
      console.error(`❌ Erreur chargement ${key}:`, error);
      setCategories(prev => ({
        ...prev,
        [key]: { tracks: [], loading: false, error: 'Erreur de chargement' }
      }));
    }
  }, [user?.id]);

  // Fonction pour rafraîchir les écoutes de toutes les pistes
  const refreshAllPlays = useCallback(async () => {
    console.log('🔄 Rafraîchissement global des écoutes...');
    
    // Récupérer les écoutes fraîches pour toutes les pistes affichées
    const allTracks = Object.values(categories).flatMap(cat => cat.tracks);
            const uniqueTrackIds = Array.from(new Set(allTracks?.map(t => t._id) || []));
    
            const playsPromises = uniqueTrackIds?.map(async (trackId) => {
      try {
        const response = await fetch(`/api/tracks/${trackId}/plays`);
        if (response.ok) {
          const data = await response.json();
          return { trackId, plays: data.plays };
        }
      } catch (error) {
        console.error(`❌ Erreur récupération écoutes pour ${trackId}:`, error);
      }
      return null;
    });
    
    const playsResults = await Promise.all(playsPromises);
            const playsMap = new Map(
          playsResults?.filter(r => r !== null).map(r => [r!.trackId, r!.plays]) || []
        );
    
    // Mettre à jour toutes les catégories avec les écoutes fraîches
    setCategories(prev => {
      const newCategories = { ...prev };
      Object.keys(newCategories).forEach(categoryKey => {
        if (newCategories[categoryKey] && newCategories[categoryKey].tracks) {
          newCategories[categoryKey] = {
            ...newCategories[categoryKey],
            tracks: newCategories[categoryKey].tracks?.map(track => ({
              ...track,
              plays: playsMap.get(track._id) || track.plays
            }))
          };
        }
      });
      return newCategories;
    });
    
    console.log('✅ Écoutes rafraîchies pour', playsMap.size, 'pistes');
  }, [categories]);

  // Rafraîchir les écoutes périodiquement
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAllPlays();
    }, 30000); // Toutes les 30 secondes
    
    return () => clearInterval(interval);
  }, [refreshAllPlays]);

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
      // Erreur silencieuse
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
      // Erreur silencieuse
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
      // Erreur silencieuse
    }
  }, [user?.id]);

  // Fonction pour charger les événements live
  const fetchLiveEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const response = await fetch('/api/events/live');
      if (response.ok) {
        const data = await response.json();
        setLiveEvents(data.events);
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setEventsLoading(false);
    }
  }, []);

  // Fonction pour effectuer la recherche
  const performSearch = useCallback(async (query: string, filter: string = 'all') => {
    if (!query.trim()) {
      setSearchResults({ tracks: [], artists: [], playlists: [] });
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&filter=${filter}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setShowSearchResults(true);
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Fonction pour charger les statistiques de la communauté
  const fetchCommunityStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/stats/community');
      if (response.ok) {
        const data = await response.json();
        setCommunityStats(data.stats);
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fonction pour charger les recommandations personnalisées
  const fetchPersonalRecommendations = useCallback(async () => {
    if (!session) return;
    
    setRecommendationsLoading(true);
    try {
      const response = await fetch('/api/recommendations/personal');
      if (response.ok) {
        const data = await response.json();
        setPersonalRecommendations(data.recommendations);
        setUserPreferences(data.userPreferences);
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setRecommendationsLoading(false);
    }
  }, [session]);

  // Fonction pour charger l'activité récente
  const fetchRecentActivity = useCallback(async () => {
    if (!session) return;
    
    setActivityLoading(true);
    try {
      const response = await fetch('/api/activity/recent');
      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data);
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setActivityLoading(false);
    }
  }, [session]);

  // Fonction pour charger les playlists populaires
  const fetchPopularPlaylists = useCallback(async () => {
    setPlaylistsLoading(true);
    try {
      const response = await fetch('/api/playlists/popular?limit=6');
      if (response.ok) {
        const data = await response.json();
        setPopularPlaylists(data.playlists || []);
      } else {
        console.error('Erreur API playlists populaires:', response.status);
        setPopularPlaylists([]);
      }
    } catch (error) {
      console.error('Erreur chargement playlists:', error);
      setPopularPlaylists([]);
    } finally {
      setPlaylistsLoading(false);
    }
  }, []);

  // Fonction pour charger les genres musicaux
  const fetchMusicGenres = useCallback(async () => {
    setGenresLoading(true);
    try {
      const response = await fetch('/api/genres');
      if (response.ok) {
        const data = await response.json();
        setMusicGenres(data.genres);
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setGenresLoading(false);
    }
  }, []);

  // Fonction pour charger toutes les catégories
  const fetchAllCategories = useCallback(async (forceRefresh = false) => {
    console.log('🚀 Début chargement toutes les catégories:', { forceRefresh });
    setLoading(true);
    
    const categoryApis = [
      { key: 'trending', url: '/api/tracks/trending?limit=50' },
      { key: 'popular', url: '/api/tracks/popular?limit=50' },
      { key: 'recent', url: '/api/tracks/recent?limit=50' },
      { key: 'mostLiked', url: '/api/tracks/most-liked?limit=50' },
      { key: 'recommended', url: '/api/tracks/recommended?limit=50' },
      { key: 'following', url: '/api/tracks/following?limit=50' }
    ];

    try {
      // Charger les pistes en vedette en premier
      console.log('⭐ Chargement pistes en vedette...');
      await fetchCategoryData('featured', '/api/tracks/featured?limit=5', forceRefresh);

      // Charger les autres catégories en parallèle
      console.log('📊 Chargement autres catégories...');
      await Promise.all(categoryApis.map(({ key, url }) => fetchCategoryData(key, url, forceRefresh)));

      // Charger les nouvelles données
      console.log('🆕 Chargement données supplémentaires...');
      await Promise.all([
        fetchPopularUsers(),
        fetchDailyDiscoveries(),
        fetchWeeklyTrends(),
        fetchCommunityPlaylists(),
        fetchCollaborations(),
        fetchLiveEvents(),
        fetchCommunityStats(),
        fetchPersonalRecommendations(),
        fetchRecentActivity(),
        fetchPopularPlaylists(),
        fetchMusicGenres()
      ]);

      console.log('✅ Chargement terminé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchCategoryData, fetchPopularUsers, fetchDailyDiscoveries, fetchWeeklyTrends, fetchCommunityPlaylists, fetchCollaborations, fetchLiveEvents, fetchCommunityStats, fetchPersonalRecommendations, fetchRecentActivity, fetchPopularPlaylists, fetchMusicGenres]);

  // Charger toutes les catégories au montage
  useEffect(() => {
    fetchAllCategories();
  }, [fetchAllCategories]);

  // Détecter si on vient d'un upload et forcer le rechargement
  useEffect(() => {
    const isFromUpload = sessionStorage.getItem('fromUpload');
    if (isFromUpload === 'true') {
      console.log('🔄 Détection upload - Rechargement forcé des données');
      // Vider le cache et recharger les données
      dataCache.clear();
      sessionStorage.removeItem('fromUpload');
      
      // Recharger toutes les catégories
      fetchAllCategories(true);
    }
  }, [fetchAllCategories]);

  // Rechargement automatique périodique pour maintenir les données à jour
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     console.log('🔄 Rechargement automatique des données...');
  //     fetchAllCategories(true);
  //   }, 60000); // Recharger toutes les minutes
  //
  //   return () => clearInterval(interval);
  // }, [fetchAllCategories]);

  // Fonction de rafraîchissement
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    dataCache.clear();
    
    const categoryApis = [
      { key: 'trending', url: '/api/tracks/trending?limit=50' },
      { key: 'popular', url: '/api/tracks/popular?limit=50' },
      { key: 'recent', url: '/api/tracks/recent?limit=50' },
      { key: 'mostLiked', url: '/api/tracks/most-liked?limit=50' },
      { key: 'recommended', url: '/api/tracks/recommended?limit=50' },
      { key: 'following', url: '/api/tracks/following?limit=50' }
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
          // Mise à jour disponible
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
    const mins = Math.floor((typeof seconds === 'number' && !isNaN(seconds)) ? seconds / 60 : 0);
    const secs = Math.floor((typeof seconds === 'number' && !isNaN(seconds)) ? seconds % 60 : 0);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatNumber = useCallback((num: number) => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
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

  // Fonction pour gérer les likes avec les nouveaux composants
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
        
        // Mettre à jour l'état local avec les vraies données de l'API
        setCategories(prev => {
          const newCategories = { ...prev };
          if (newCategories[categoryKey]) {
            newCategories[categoryKey] = {
              ...newCategories[categoryKey],
              tracks: newCategories[categoryKey].tracks.map(track => 
                track._id === trackId 
                  ? { ...track, isLiked: data.isLiked, likes: data.likes || track.likes }
                  : track
              )
            };
          }
          return newCategories;
        });

        // Mettre à jour aussi les autres états de pistes
        setDailyDiscoveries(prev => 
          prev.map(track => 
            track._id === trackId 
              ? { ...track, isLiked: data.isLiked, likes: data.likes || track.likes }
              : track
          )
        );
        setCollaborations(prev => 
          prev.map(track => 
            track._id === trackId 
              ? { ...track, isLiked: data.isLiked, likes: data.likes || track.likes }
              : track
          )
        );

        // Mettre à jour les pistes en vedette
        setCategories(prev => {
          const newCategories = { ...prev };
          Object.keys(newCategories).forEach(categoryKey => {
            if (newCategories[categoryKey]) {
              newCategories[categoryKey] = {
                ...newCategories[categoryKey],
                tracks: newCategories[categoryKey].tracks.map(track => 
                  track._id === trackId 
                    ? { ...track, isLiked: data.isLiked, likes: data.likes || track.likes }
                    : track
                )
              };
            }
          });
          return newCategories;
        });

        // Mettre à jour les recommandations personnalisées
        setPersonalRecommendations(prev => 
          prev.map(rec => ({
            ...rec,
            tracks: rec.tracks?.map((t: Track) => 
              t._id === trackId 
                ? { ...t, isLiked: data.isLiked, likes: data.likes || t.likes }
                : t
            ) || []
          }))
        );
      }
    } catch (error) {
      console.error('Erreur like:', error);
    }
  }, [session]);

  // Fonction pour jouer une piste
  const handlePlayTrack = useCallback(async (track: Track) => {
    // Jouer la piste
    playTrack(track);
    
    // Mettre à jour les statistiques d'écoute dans toutes les catégories
    try {
      const response = await fetch(`/api/tracks/${track._id}/plays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Mettre à jour les statistiques dans toutes les catégories
        setCategories(prev => {
          const newCategories = { ...prev };
          Object.keys(newCategories).forEach(categoryKey => {
            if (newCategories[categoryKey]) {
              newCategories[categoryKey] = {
                ...newCategories[categoryKey],
                tracks: newCategories[categoryKey].tracks.map(t => 
                  t._id === track._id 
                    ? { ...t, plays: data.plays || t.plays }
                    : t
                )
              };
            }
          });
          return newCategories;
        });
        
        // Mettre à jour aussi les autres états de pistes
        setDailyDiscoveries(prev => 
          prev.map(t => t._id === track._id ? { ...t, plays: data.plays || t.plays } : t)
        );
        setCollaborations(prev => 
          prev.map(t => t._id === track._id ? { ...t, plays: data.plays || t.plays } : t)
        );
      }
    } catch (error) {
      console.error('Erreur mise à jour plays:', error);
    }
  }, [playTrack]);

  // Fonction pour gérer le changement de recherche avec debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      const timeoutId = setTimeout(() => {
        performSearch(value, searchFilter);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setShowSearchResults(false);
    }
  }, [searchFilter, performSearch]);

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
        // Lien copié dans le presse-papiers
      }
    } catch (error) {
      // Erreur silencieuse
    }
  }, []);

  // Fonction pour récupérer l'URL de streaming
  const fetchStreamUrl = async () => {
    try {
      // URL de streaming directe HTTPS
      const streamUrl = 'https://manager5.streamradio.fr:2335/stream';
      console.log('URL de streaming radio configurée:', streamUrl);
      return streamUrl;
    } catch (error) {
      console.error('Erreur récupération URL streaming:', error);
      return 'https://manager5.streamradio.fr:2335/stream'; // URL de fallback
    }
  };

  // Fonction pour récupérer les métadonnées du flux radio
  const fetchRadioMetadata = async () => {
    try {
      // URL de statut pour récupérer les métadonnées
      const statusUrl = 'https://manager5.streamradio.fr:2335/status-json.xsl';
      const response = await fetch(statusUrl);
      
      if (response.ok) {
        const data = await response.json();
        
        // Extraire les métadonnées du flux
        if (data.icestats && data.icestats.source) {
          const source = data.icestats.source;
          
          // Mettre à jour les infos radio avec les vraies métadonnées
          setRadioInfo(prev => ({
            ...prev,
            currentTrack: source.title || 'En direct - Mixx Party',
            listeners: source.listeners || prev.listeners,
            isLive: true
          }));
          
          // Mettre à jour le titre dans le player si la radio joue
          if (currentTrack?._id === 'radio-mixx-party' && audioState.isPlaying) {
            // Mettre à jour le titre de la piste courante
            const updatedTracks = audioState.tracks.map(track => 
              track._id === 'radio-mixx-party' 
                ? { ...track, title: source.title || 'En direct - Mixx Party' }
                : track
            );
            setTracks(updatedTracks);
          }
          
          console.log('Métadonnées radio mises à jour:', {
            title: source.title,
            artist: source.artist,
            listeners: source.listeners
          });
        }
      }
    } catch (error) {
      console.error('Erreur récupération métadonnées:', error);
      // En cas d'erreur, utiliser les infos par défaut
      setRadioInfo(prev => ({
        ...prev,
        currentTrack: 'En direct - Mixx Party',
        listeners: 1247,
        isLive: true
      }));
    }
  };

  // Fonction helper pour valider les URLs d'images
  const getValidImageUrl = (url: string | undefined, fallback: string) => {
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

  // Fonction pour gérer la lecture/arrêt de la radio
  // Fonction pour récupérer les vraies statistiques
  const fetchRealTimeStats = async () => {
    setRealTimeStats(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/stats/community');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setRealTimeStats({
            tracks: result.data.tracks || 0,
            artists: result.data.artists || 0,
            totalPlays: result.data.totalPlays || 0,
            totalLikes: result.data.totalLikes || 0,
            loading: false,
            error: null
          });
        } else {
          throw new Error(result.error || 'Erreur lors de la récupération des statistiques');
        }
      } else {
        throw new Error('Erreur lors de la récupération des statistiques');
      }
    } catch (error) {
      console.error('Erreur statistiques:', error);
      setRealTimeStats(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }));
    }
  };

  // Fonction pour gérer les interactions de la section Créer & Découvrir
  const handleCardInteraction = (cardType: string, action: 'hover' | 'click') => {
    if (action === 'hover') {
      setHoveredCard(cardType);
      setShowQuickStats(true);
    } else {
      setHoveredCard(null);
      setShowQuickStats(false);
    }
  };

  const handleRadioToggle = async () => {
    if (isRadioPlaying) {
      // Arrêter la radio via le service audio
      if (audioState.isPlaying && currentTrack?._id === 'radio-mixx-party') {
        // Pause le service audio si c'est la radio qui joue
        pause();
      }
      setIsRadioPlaying(false);
      console.log('Radio arrêtée');
    } else {
      // Démarrer la radio
      try {
        // Récupérer l'URL de streaming
        const streamUrl = await fetchStreamUrl();
        
        // Les métadonnées sont déjà chargées au démarrage de l'app
        // Pas besoin de les recharger ici
        
        // Créer un objet "track" pour la radio avec les infos actuelles
        const radioTrack = {
          _id: 'radio-mixx-party',
          title: radioInfo.currentTrack, // Utilise les infos déjà chargées
          artist: {
            _id: 'radio',
            name: 'Mixx Party',
            username: 'mixxparty',
            avatar: '/default-avatar.png'
          },
          audioUrl: streamUrl,
          coverUrl: '/mixxparty1.png', // Logo Mixx Party pour la radio
          duration: -1, // Durée spéciale pour la radio (streaming en direct)
          likes: [],
          comments: [],
          plays: 0,
          isLiked: false,
          genre: ['Electronic', 'Dance']
        };
        
        // Utiliser le système de lecture audio existant
        playTrack(radioTrack);
        setIsRadioPlaying(true);
        console.log('Radio démarrée - Mixx Party via le player principal');
        
      } catch (error) {
        console.error('Erreur démarrage radio:', error);
      }
    }
  };

  // Synchroniser l'état de la radio avec le player principal
  useEffect(() => {
    if (currentTrack?._id === 'radio-mixx-party') {
      setIsRadioPlaying(audioState.isPlaying);
    } else if (isRadioPlaying) {
      // Si une autre piste joue, arrêter l'état radio
      setIsRadioPlaying(false);
    }
  }, [audioState.isPlaying, currentTrack?._id, isRadioPlaying]);

  // Charger les métadonnées radio au démarrage de l'app
  useEffect(() => {
    // Charger les infos radio dès le chargement
    fetchRadioMetadata();
  }, []); // Seulement au montage du composant

  // Mettre à jour les métadonnées radio périodiquement
  useEffect(() => {
    if (!isRadioPlaying) return;
    
    // Mise à jour initiale
    fetchRadioMetadata();
    
    // Mise à jour toutes les 30 secondes
    const interval = setInterval(() => {
      fetchRadioMetadata();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isRadioPlaying]);

  // Données de programmation de la radio
  const radioProgram = [
    {
      day: 'Lundi',
      shows: [
        { time: '06:00 - 10:00', title: 'Morning Mixx', dj: 'DJ Electro', genre: 'House/Techno' },
        { time: '10:00 - 14:00', title: 'Midday Vibes', dj: 'DJ Groove', genre: 'Deep House' },
        { time: '14:00 - 18:00', title: 'Afternoon Beats', dj: 'DJ Pulse', genre: 'Progressive' },
        { time: '18:00 - 22:00', title: 'Evening Energy', dj: 'DJ Fusion', genre: 'Trance' },
        { time: '22:00 - 02:00', title: 'Night Groove', dj: 'DJ Midnight', genre: 'Dubstep' }
      ]
    },
    {
      day: 'Mardi',
      shows: [
        { time: '06:00 - 10:00', title: 'Wake Up Mixx', dj: 'DJ Sunrise', genre: 'Chill House' },
        { time: '10:00 - 14:00', title: 'Workout Beats', dj: 'DJ Energy', genre: 'Electro' },
        { time: '14:00 - 18:00', title: 'Afternoon Flow', dj: 'DJ Smooth', genre: 'Lounge' },
        { time: '18:00 - 22:00', title: 'Evening Rush', dj: 'DJ Rush', genre: 'Hardstyle' },
        { time: '22:00 - 02:00', title: 'Late Night', dj: 'DJ Dark', genre: 'Dark Techno' }
      ]
    },
    {
      day: 'Mercredi',
      shows: [
        { time: '06:00 - 10:00', title: 'Midweek Start', dj: 'DJ Midweek', genre: 'Tech House' },
        { time: '10:00 - 14:00', title: 'Day Vibes', dj: 'DJ Day', genre: 'Melodic House' },
        { time: '14:00 - 18:00', title: 'Afternoon Mix', dj: 'DJ Mix', genre: 'Progressive House' },
        { time: '18:00 - 22:00', title: 'Evening Session', dj: 'DJ Session', genre: 'Psytrance' },
        { time: '22:00 - 02:00', title: 'Night Session', dj: 'DJ Night', genre: 'Minimal' }
      ]
    },
    {
      day: 'Jeudi',
      shows: [
        { time: '06:00 - 10:00', title: 'Thursday Start', dj: 'DJ Thursday', genre: 'House' },
        { time: '10:00 - 14:00', title: 'Midday Mixx', dj: 'DJ Midday', genre: 'Deep House' },
        { time: '14:00 - 18:00', title: 'Afternoon Vibes', dj: 'DJ Vibes', genre: 'Chillout' },
        { time: '18:00 - 22:00', title: 'Evening Groove', dj: 'DJ Groove', genre: 'Funk House' },
        { time: '22:00 - 02:00', title: 'Late Groove', dj: 'DJ Late', genre: 'Acid House' }
      ]
    },
    {
      day: 'Vendredi',
      shows: [
        { time: '06:00 - 10:00', title: 'Friday Start', dj: 'DJ Friday', genre: 'House' },
        { time: '10:00 - 14:00', title: 'Weekend Vibes', dj: 'DJ Weekend', genre: 'Electro' },
        { time: '14:00 - 18:00', title: 'Friday Rush', dj: 'DJ Rush', genre: 'Hard House' },
        { time: '18:00 - 22:00', title: 'Friday Night', dj: 'DJ Night', genre: 'Trance' },
        { time: '22:00 - 06:00', title: 'Weekend Party', dj: 'DJ Party', genre: 'Mixed' }
      ]
    },
    {
      day: 'Samedi',
      shows: [
        { time: '06:00 - 10:00', title: 'Weekend Morning', dj: 'DJ Morning', genre: 'Chill House' },
        { time: '10:00 - 14:00', title: 'Saturday Vibes', dj: 'DJ Saturday', genre: 'House' },
        { time: '14:00 - 18:00', title: 'Weekend Afternoon', dj: 'DJ Afternoon', genre: 'Deep House' },
        { time: '18:00 - 22:00', title: 'Saturday Night', dj: 'DJ Night', genre: 'Trance' },
        { time: '22:00 - 06:00', title: 'Weekend Party', dj: 'DJ Party', genre: 'Mixed' }
      ]
    },
    {
      day: 'Dimanche',
      shows: [
        { time: '06:00 - 10:00', title: 'Sunday Morning', dj: 'DJ Sunday', genre: 'Chillout' },
        { time: '10:00 - 14:00', title: 'Sunday Vibes', dj: 'DJ Vibes', genre: 'Lounge' },
        { time: '14:00 - 18:00', title: 'Sunday Afternoon', dj: 'DJ Afternoon', genre: 'Deep House' },
        { time: '18:00 - 22:00', title: 'Sunday Evening', dj: 'DJ Evening', genre: 'Progressive' },
        { time: '22:00 - 06:00', title: 'Sunday Night', dj: 'DJ Night', genre: 'Ambient' }
      ]
    }
  ];

  // Fonction pour récupérer les informations en temps réel de la radio
  const fetchRadioInfo = useCallback(async () => {
    setProgramLoading(true);
    try {
      // Récupérer les données depuis l'API StreamRadio.fr
      const response = await fetch('https://manager5.streamradio.fr:2335/status-json.xsl');
      if (response.ok) {
        const data = await response.json();
        console.log('Données StreamRadio:', data);
        
        // Analyser les données disponibles
        if (data.icestats && data.icestats.source) {
          const source = data.icestats.source;
          console.log('Métadonnées source:', source);
          
          // Extraire les informations en temps réel
          const currentTrack = {
            title: source.title || 'Titre inconnu',
            artist: source.artist || 'Artiste inconnu',
            genre: source.genre || 'Electronic',
            listeners: source.listeners || 0,
            bitrate: source.bitrate || 0,
            server_name: source.server_name || 'Mixx Party Radio',
            server_description: source.server_description || 'Radio en boucle continue'
          };
          
          console.log('Piste actuelle:', currentTrack);
          
          // Créer les informations de la radio
          const radioInfo = {
            currentTrack,
            status: 'EN DIRECT',
            description: 'Radio en boucle continue - Musique électronique 24h/24',
            features: [
              '🎵 Diffusion en boucle continue',
              '🎧 Musique électronique 24h/24',
              '🎛️ Mix automatique',
              '🌙 Ambiance nocturne',
              '💫 Hits et nouveautés'
            ],
            stats: {
              listeners: currentTrack.listeners,
              bitrate: currentTrack.bitrate,
              uptime: '24h/24',
              quality: 'Haute qualité'
            }
          };
          
          setRealRadioProgram([radioInfo]);
          console.log('Informations radio mises à jour:', radioInfo);
        } else {
          console.log('Aucune donnée source trouvée, utilisation du fallback');
          setRealRadioProgram([{
            currentTrack: {
              title: 'Mixx Party Radio',
              artist: 'En boucle continue',
              genre: 'Electronic',
              listeners: 0,
              bitrate: 0,
              server_name: 'Mixx Party Radio',
              server_description: 'Radio en boucle continue'
            },
            status: 'EN DIRECT',
            description: 'Radio en boucle continue - Musique électronique 24h/24',
            features: [
              '🎵 Diffusion en boucle continue',
              '🎧 Musique électronique 24h/24',
              '🎛️ Mix automatique',
              '🌙 Ambiance nocturne',
              '💫 Hits et nouveautés'
            ],
            stats: {
              listeners: 0,
              bitrate: 0,
              uptime: '24h/24',
              quality: 'Haute qualité'
            }
          }]);
        }
      } else {
        console.log('Erreur API, utilisation du fallback');
        setRealRadioProgram([{
          currentTrack: {
            title: 'Mixx Party Radio',
            artist: 'En boucle continue',
            genre: 'Electronic',
            listeners: 0,
            bitrate: 0,
            server_name: 'Mixx Party Radio',
            server_description: 'Radio en boucle continue'
          },
          status: 'EN DIRECT',
          description: 'Radio en boucle continue - Musique électronique 24h/24',
          features: [
            '🎵 Diffusion en boucle continue',
            '🎧 Musique électronique 24h/24',
            '🎛️ Mix automatique',
            '🌙 Ambiance nocturne',
            '💫 Hits et nouveautés'
          ],
          stats: {
            listeners: 0,
            bitrate: 0,
            uptime: '24h/24',
            quality: 'Haute qualité'
          }
        }]);
      }
    } catch (error) {
      console.error('Erreur récupération informations radio:', error);
      setRealRadioProgram([{
        currentTrack: {
          title: 'Mixx Party Radio',
          artist: 'En boucle continue',
          genre: 'Electronic',
          listeners: 0,
          bitrate: 0,
          server_name: 'Mixx Party Radio',
          server_description: 'Radio en boucle continue'
        },
        status: 'EN DIRECT',
        description: 'Radio en boucle continue - Musique électronique 24h/24',
        features: [
          '🎵 Diffusion en boucle continue',
          '🎧 Musique électronique 24h/24',
          '🎛️ Mix automatique',
          '🌙 Ambiance nocturne',
          '💫 Hits et nouveautés'
        ],
        stats: {
          listeners: 0,
          bitrate: 0,
          uptime: '24h/24',
          quality: 'Haute qualité'
        }
      }]);
    } finally {
      setProgramLoading(false);
    }
  }, []);

  // Charger les informations quand le dialog s'ouvre
  useEffect(() => {
    if (showProgramDialog && realRadioProgram.length === 0) {
      fetchRadioInfo();
    }
  }, [showProgramDialog, realRadioProgram.length, fetchRadioInfo]);

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
                      src={getValidImageUrl(featuredTracks[currentSlide].coverUrl, '/default-cover.jpg')}
                      alt={featuredTracks[currentSlide].title}
                      className="w-full h-full object-cover"
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      loading="eager"
                      onError={(e) => {
                        console.log('Erreur image cover:', featuredTracks[currentSlide].coverUrl);
                        e.currentTarget.src = '/default-cover.jpg';
                      }}
                      onLoad={() => {
                        console.log('Image chargée avec succès:', featuredTracks[currentSlide].coverUrl);
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

                          {/* Bouton Like avec nouveau composant */}
                          <InteractiveCounter
                            type="likes"
                            initialCount={featuredTracks[currentSlide].likes.length}
                            isActive={featuredTracks[currentSlide].isLiked || featuredTracks[currentSlide].likes.includes(user?.id || '')}
                            onToggle={async (newState) => {
                              await handleLikeTrack(featuredTracks[currentSlide]._id, 'featured', currentSlide);
                            }}
                            size="md"
                            showIcon={true}
                            className="px-4 py-3 rounded-full font-semibold transition-all duration-300 backdrop-blur-sm text-white bg-white/10 border border-white/20 hover:bg-white/20"
                          />

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
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Rechercher des créations, artistes, genres..."
                className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
              />
              {searchLoading && (
                <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                </div>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => performSearch(searchQuery, searchFilter)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-2 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
              >
                <Search size={16} />
              </motion.button>
            </div>
          </div>

          {/* Filtres rapides */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {[
              { label: 'Tous', value: 'all', icon: Music, active: searchFilter === 'all' },
              { label: 'Créations', value: 'tracks', icon: Music, active: searchFilter === 'tracks' },
              { label: 'Artistes', value: 'artists', icon: Users, active: searchFilter === 'artists' },
              { label: 'Playlists', value: 'playlists', icon: Music, active: searchFilter === 'playlists' }
            ].map((filter, index) => (
              <motion.button
                key={filter.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '50px' }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSearchFilter(filter.value);
                  if (searchQuery.trim()) {
                    performSearch(searchQuery, filter.value);
                  }
                }}
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

          {/* Résultats de recherche */}
          {showSearchResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              {/* Résumé des résultats */}
              <div className="text-center mb-6">
                <p className="text-gray-400 text-sm">
                  {searchResults.total > 0 
                    ? `${searchResults.total} résultat(s) pour "${searchQuery}"`
                    : `Aucun résultat pour "${searchQuery}"`
                  }
                </p>
              </div>

              {/* Résultats par catégorie */}
              {searchResults.tracks.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center">
                    <Music size={20} className="mr-2 text-purple-400" />
                    Créations ({searchResults.tracks.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {searchResults.tracks?.map((track: Track, index: number) => (
                      <motion.div
                        key={track._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="group cursor-pointer"
                      >
                        <div className="relative rounded-xl overflow-hidden bg-white/10 dark:bg-gray-800/60 border border-gray-700 hover:shadow-xl hover:scale-105 transition-all duration-200 p-4 flex flex-col items-center justify-between min-h-[260px]">
                          {/* Badge Découverte */}
                          {track.isDiscovery && (
                            <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs px-2 py-0.5 rounded-full shadow font-semibold z-10 flex items-center gap-1">
                              <Sparkles size={12} className="inline" />
                              Découverte
                            </div>
                          )}
                          {/* Image */}
                          <div className="w-24 h-24 rounded-lg overflow-hidden mb-3 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                            <img
                              src={track.coverUrl || '/default-cover.jpg'}
                              alt={track.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/default-cover.jpg';
                              }}
                            />
                          </div>
                          {/* Titre */}
                          <h4 className="font-semibold text-white text-base text-center truncate w-full mb-0.5">
                            {track.title || 'Titre inconnu'}
                          </h4>
                          {/* Artiste */}
                          <p className="text-gray-300 text-xs text-center truncate w-full mb-2">
                            {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                          </p>
                          {/* Durée + Bouton play */}
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                              {formatDuration(track.duration)}
                            </span>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayTrack(track);
                              }}
                              className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200 shadow"
                            >
                              {currentTrack?._id === track._id && audioState.isPlaying ? (
                                <Pause size={18} fill="white" />
                              ) : (
                                <Play size={18} fill="white" className="ml-0.5" />
                              )}
                            </motion.button>
                          </div>
                          {/* Stats */}
                          <div className="flex items-center justify-between w-full mt-auto pt-2 border-t border-gray-700 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <Headphones size={12} />
                              <span>{formatNumber(track.plays)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <InteractiveCounter
                                type="likes"
                                initialCount={Array.isArray(track.likes) ? track.likes.length : 0}
                                isActive={track.isLiked || (Array.isArray(track.likes) && track.likes.includes(user?.id || ''))}
                                onToggle={async (newState) => {
                                  await handleLikeTrack(track._id, 'searchResults', index);
                                }}
                                size="sm"
                                showIcon={true}
                                className="text-gray-400 hover:text-red-500"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Résultats artistes */}
              {searchResults.artists.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center">
                    <Users size={20} className="mr-2 text-blue-400" />
                    Artistes ({searchResults.artists.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {searchResults.artists?.map((artist: any, index: number) => (
                      <motion.div
                        key={artist._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="group cursor-pointer"
                      >
                        <div className="relative rounded-xl overflow-hidden bg-white/10 dark:bg-gray-800/60 border border-gray-700 hover:shadow-xl hover:scale-105 transition-all duration-200 p-4 flex flex-col items-center justify-between min-h-[260px]">
                          {/* Badge Découverte */}
                          {artist.isDiscovery && (
                            <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs px-2 py-0.5 rounded-full shadow font-semibold z-10 flex items-center gap-1">
                              <Sparkles size={12} className="inline" />
                              Découverte
                            </div>
                          )}
                          {/* Image */}
                          <div className="w-24 h-24 rounded-lg overflow-hidden mb-3 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                            <img
                              src={artist.avatar || '/default-avatar.png'}
                              alt={artist.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/default-avatar.png';
                              }}
                            />
                          </div>
                          {/* Nom */}
                          <h4 className="font-semibold text-white text-base text-center truncate w-full mb-0.5">
                            {artist.name}
                          </h4>
                          {/* Pseudo */}
                          <p className="text-gray-300 text-xs text-center truncate w-full mb-2">
                            @{artist.username}
                          </p>
                          {/* Stats */}
                          <div className="flex items-center justify-between w-full mt-auto pt-2 border-t border-gray-700 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <Headphones size={12} />
                              <span>{formatNumber(artist.listeners)} auditeurs</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <InteractiveCounter
                                type="likes"
                                initialCount={artist.likes?.length || 0}
                                isActive={artist.isLiked || (Array.isArray(artist.likes) && artist.likes.includes(user?.id || ''))}
                                onToggle={async (newState) => {
                                  // Logique pour liker un artiste
                                  console.log('Like artiste:', artist._id);
                                }}
                                size="sm"
                                showIcon={true}
                                className="text-gray-400 hover:text-red-500"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Résultats playlists */}
              {searchResults.playlists.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-white font-semibold text-xl mb-6 flex items-center gap-2">
                    <Music size={24} className="text-green-400" />
                    Playlists populaires ({searchResults.playlists.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {searchResults.playlists?.map((playlist: any, index: number) => (
                      <div
                        key={playlist._id}
                        className="group bg-white/5 dark:bg-gray-800/70 rounded-2xl p-4 flex flex-col items-center shadow-sm hover:shadow-lg hover:scale-[1.03] transition-all duration-200 border border-gray-700 focus-within:ring-2 focus-within:ring-green-500 cursor-pointer"
                        tabIndex={0}
                        aria-label={`Playlist : ${playlist.title || 'Titre inconnu'} par ${playlist.creator?.name || 'Créateur inconnu'}`}
                      >
                        {/* Image */}
                        <div className="w-28 h-28 rounded-xl overflow-hidden mb-3 flex items-center justify-center bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                          <img
                            src={playlist.coverUrl || '/default-cover.jpg'}
                            alt={playlist.title || 'Titre inconnu'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/default-cover.jpg';
                            }}
                          />
                        </div>
                        {/* Titre */}
                        <h4 className="font-semibold text-white text-base text-center truncate w-full mb-0.5">
                          {playlist.title || 'Titre inconnu'}
                        </h4>
                        {/* Créateur */}
                        <p className="text-gray-300 text-xs text-center truncate w-full mb-2">
                          par {playlist.creator?.name || 'Créateur inconnu'}
                        </p>
                        {/* Bouton play */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayTrack(playlist.tracks?.[0]);
                          }}
                          className="w-10 h-10 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center text-white shadow transition focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
                          aria-label={`Écouter la playlist ${playlist.title || 'Titre inconnu'}`}
                        >
                          <Play size={18} className="ml-0.5" />
                        </button>
                        {/* Stats */}
                        <div className="flex items-center justify-between w-full mt-auto pt-2 border-t border-gray-700 text-xs text-gray-400">
                          <div className="flex items-center gap-1">
                            <Music size={12} />
                            <span>{playlist.trackCount || 0} titres</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <InteractiveCounter
                              type="likes"
                              initialCount={playlist.likes?.length || 0}
                              isActive={playlist.isLiked || (Array.isArray(playlist.likes) && playlist.likes.includes(user?.id || ''))}
                              onToggle={async (newState) => {
                                // Logique pour liker une playlist
                                console.log('Like playlist:', playlist._id);
                              }}
                              size="sm"
                              showIcon={true}
                              className="text-gray-400 hover:text-red-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Suggestions de recherche (seulement si pas de résultats) */}
          {!showSearchResults && (
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
                    onClick={() => {
                      setSearchQuery(suggestion);
                      performSearch(suggestion, searchFilter);
                    }}
                    className="px-3 py-1.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-300"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </section>

      {/* Section Découvertes du Jour - Design Spotify compact */}
      {dailyDiscoveries.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Gift size={28} className="text-yellow-400" />
              <div>
                <h2 className="text-2xl font-bold text-white">Découvertes du Jour</h2>
                <p className="text-gray-400 text-sm">Nos coups de cœur sélectionnés rien que pour vous</p>
              </div>
            </div>
            <button
              className="text-purple-400 hover:text-purple-300 font-medium text-sm px-4 py-2 rounded-lg border border-purple-500/30 bg-purple-900/10 transition"
            >
              Voir tout
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {dailyDiscoveries?.map((track, index) => (
              <div
                key={track._id}
                className="group bg-white/5 dark:bg-gray-800/70 rounded-2xl p-4 flex flex-col items-center shadow-sm hover:shadow-lg hover:scale-[1.03] transition-all duration-200 border border-gray-700 focus-within:ring-2 focus-within:ring-purple-500"
                tabIndex={0}
                aria-label={`Découverte : ${track.title || 'Titre inconnu'} par ${track.artist?.name || track.artist?.username || 'Artiste inconnu'}`}
              >
                {/* Badge Découverte */}
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs px-2 py-0.5 rounded-full shadow font-semibold flex items-center gap-1">
                    <Sparkles size={12} className="inline" /> Découverte
                  </span>
                </div>
                {/* Image */}
                <div className="w-28 h-28 rounded-xl overflow-hidden mb-3 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <img
                    src={track.coverUrl || '/default-cover.jpg'}
                    alt={track.title || 'Titre inconnu'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/default-cover.jpg';
                    }}
                  />
                </div>
                {/* Titre */}
                <h4 className="font-semibold text-white text-base text-center truncate w-full mb-0.5">
                  {track.title || 'Titre inconnu'}
                </h4>
                {/* Artiste */}
                <p className="text-gray-300 text-xs text-center truncate w-full mb-2">
                  {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                </p>
                {/* Durée + Bouton play */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                    {formatDuration(track.duration)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayTrack(track);
                    }}
                    className="w-10 h-10 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center text-white shadow transition focus:outline-none focus:ring-2 focus:ring-purple-500"
                    aria-label={`Écouter ${track.title || 'Titre inconnu'}`}
                  >
                    {currentTrack?._id === track._id && audioState.isPlaying ? (
                      <Pause size={18} />
                    ) : (
                      <Play size={18} className="ml-0.5" />
                    )}
                  </button>
                </div>
                {/* Stats avec likes fonctionnels */}
                <div className="flex items-center justify-between w-full mt-auto pt-2 border-t border-gray-700 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Headphones size={12} />
                    <span>{formatNumber(track.plays)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <InteractiveCounter
                      type="likes"
                      initialCount={track.likes?.length || 0}
                      isActive={track.isLiked || track.likes?.includes(user?.id || '')}
                      onToggle={async (newState) => {
                        await handleLikeTrack(track._id, 'dailyDiscoveries', index);
                      }}
                      size="sm"
                      showIcon={true}
                      className="text-gray-400 hover:text-red-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                  <Sparkles size={24} className="text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Créer & Découvrir</h2>
                  <p className="text-gray-400 text-sm">Explorez et partagez votre passion musicale</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { 
                  icon: Mic2, 
                  label: 'Partager ma musique', 
                  description: 'Uploadez vos créations et partagez-les avec le monde',
                  color: 'from-purple-500/20 to-pink-500/20', 
                  borderColor: 'border-purple-500/30', 
                  iconColor: 'text-purple-400', 
                  bgGradient: 'from-purple-500/10 to-pink-500/10',
                  href: '/upload',
                  features: ['Upload illimité', 'Qualité HD', 'Monétisation']
                },
                { 
                  icon: Compass, 
                  label: 'Découvrir', 
                  description: 'Explorez de nouveaux artistes et genres musicaux',
                  color: 'from-green-500/20 to-emerald-500/20', 
                  borderColor: 'border-green-500/30', 
                  iconColor: 'text-green-400', 
                  bgGradient: 'from-green-500/10 to-emerald-500/10',
                  href: '/discover',
                  features: ['Recommandations IA', 'Nouveautés', 'Playlists personnalisées']
                },
                { 
                  icon: Users, 
                  label: 'Communauté', 
                  description: 'Rejoignez une communauté passionnée de musique',
                  color: 'from-orange-500/20 to-red-500/20', 
                  borderColor: 'border-orange-500/30', 
                  iconColor: 'text-orange-400', 
                  bgGradient: 'from-orange-500/10 to-red-500/10',
                  href: '/community',
                  features: ['Artistes émergents', 'Événements live', 'Collaborations']
                },
                { 
                  icon: Radio, 
                  label: 'Radio Live', 
                  description: 'Écoutez Mixx Party Radio en direct',
                  color: 'from-cyan-500/20 to-blue-500/20', 
                  borderColor: 'border-cyan-500/30', 
                  iconColor: 'text-cyan-400', 
                  bgGradient: 'from-cyan-500/10 to-blue-500/10',
                  href: '#radio',
                  features: ['En direct 24/7', 'Musique électronique', 'Chat en temps réel']
                }
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="group cursor-pointer"
                  onMouseEnter={() => handleCardInteraction(item.label, 'hover')}
                  onMouseLeave={() => handleCardInteraction(item.label, 'click')}
                  onClick={() => {
                    if (item.href === '#radio') {
                      // Scroll vers la section radio
                      document.getElementById('radio')?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      router.push(item.href);
                    }
                  }}
                >
                  <div className={`relative h-full p-6 rounded-2xl bg-gradient-to-br ${item.bgGradient} hover:shadow-2xl transition-all duration-300 border ${item.borderColor} group-hover:border-opacity-60 ${hoveredCard === item.label ? 'ring-2 ring-purple-500/50' : ''}`}>
                    {/* Effet de lueur au hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Indicateur de carte active */}
                    {hoveredCard === item.label && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center"
                      >
                        <Sparkles size={12} className="text-white" />
                      </motion.div>
                    )}
                    
                    <div className="relative z-10">
                      {/* Header avec icône */}
                      <div className="flex items-center space-x-3 mb-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${item.color} border ${item.borderColor}`}>
                          <item.icon size={24} className={item.iconColor} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-1">{item.label}</h3>
                          <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                      
                      {/* Liste des fonctionnalités */}
                      <div className="space-y-2 mb-4">
                        {item.features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-gradient-to-r from-white/60 to-white/40 rounded-full"></div>
                            <span className="text-gray-300 text-xs">{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                                             {/* Bouton d'action */}
                       <div className="flex items-center justify-between">
                         <motion.button
                           whileHover={{ scale: 1.05 }}
                           whileTap={{ scale: 0.95 }}
                           className={`flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r ${item.color} border ${item.borderColor} text-white font-medium text-sm hover:shadow-lg transition-all duration-200`}
                         >
                           <span>Explorer</span>
                           <ArrowRight size={16} />
                         </motion.button>
                         
                         {/* Indicateur de popularité */}
                         <div className="flex items-center space-x-1 text-xs text-gray-400">
                           <TrendingUp size={12} />
                           <span>Populaire</span>
                         </div>
                       </div>
                       
                       {/* Fonctionnalités avancées au survol */}
                       <AnimatePresence>
                         {hoveredCard === item.label && (
                           <motion.div
                             initial={{ opacity: 0, height: 0 }}
                             animate={{ opacity: 1, height: 'auto' }}
                             exit={{ opacity: 0, height: 0 }}
                             className="mt-4 pt-4 border-t border-white/10"
                           >
                             <div className="flex items-center justify-between text-xs text-gray-400">
                               <span>Fonctionnalités avancées</span>
                               <div className="flex items-center space-x-1">
                                 <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                                 <span>Disponible</span>
                               </div>
                             </div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                    </div>
                    
                    {/* Effet de particules au hover */}
                    <div className="absolute inset-0 rounded-2xl overflow-hidden">
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="absolute top-2 right-2 w-2 h-2 bg-white/20 rounded-full animate-pulse"></div>
                        <div className="absolute bottom-4 left-3 w-1 h-1 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                        <div className="absolute top-1/2 right-4 w-1.5 h-1.5 bg-white/25 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
                         {/* Section de statistiques rapides */}
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.4 }}
               className="mt-8"
             >
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-semibold text-white">Statistiques en temps réel</h3>
                 <div className="flex items-center space-x-3">
                   {realTimeStats.loading ? (
                     <div className="flex items-center space-x-2 text-blue-400">
                       <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                       <span>Mise à jour...</span>
                     </div>
                   ) : realTimeStats.error ? (
                     <div className="flex items-center space-x-2 text-red-400">
                       <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                       <span>Erreur</span>
                     </div>
                   ) : (
                     <div className="flex items-center space-x-2 text-green-400">
                       <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                       <span>Live</span>
                     </div>
                   )}
                   
                   <motion.button
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     onClick={fetchRealTimeStats}
                     disabled={realTimeStats.loading}
                     className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                     title="Actualiser les statistiques"
                   >
                     <RefreshCw size={14} className={`text-gray-400 ${realTimeStats.loading ? 'animate-spin' : ''}`} />
                   </motion.button>
                 </div>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {[
                   { 
                     icon: Music, 
                     label: 'Tracks', 
                     value: realTimeStats.loading ? '...' : formatNumber(realTimeStats.tracks), 
                     color: 'text-purple-400', 
                     trend: realTimeStats.loading ? '' : '+12%',
                     loading: realTimeStats.loading
                   },
                   { 
                     icon: Users, 
                     label: 'Artistes', 
                     value: realTimeStats.loading ? '...' : formatNumber(realTimeStats.artists), 
                     color: 'text-green-400', 
                     trend: realTimeStats.loading ? '' : '+8%',
                     loading: realTimeStats.loading
                   },
                   { 
                     icon: Headphones, 
                     label: 'Écoutes', 
                     value: realTimeStats.loading ? '...' : formatNumber(realTimeStats.totalPlays), 
                     color: 'text-orange-400', 
                     trend: realTimeStats.loading ? '' : '+25%',
                     loading: realTimeStats.loading
                   },
                   { 
                     icon: Heart, 
                     label: 'Likes', 
                     value: realTimeStats.loading ? '...' : formatNumber(realTimeStats.totalLikes), 
                     color: 'text-pink-400', 
                     trend: realTimeStats.loading ? '' : '+15%',
                     loading: realTimeStats.loading
                   }
                 ].map((stat, index) => (
                   <motion.div
                     key={stat.label}
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: 0.5 + index * 0.1 }}
                     whileHover={{ scale: 1.05, y: -2 }}
                     className="text-center p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200 group"
                   >
                     <stat.icon size={20} className={`mx-auto mb-2 ${stat.color} group-hover:scale-110 transition-transform duration-200 ${stat.loading ? 'animate-pulse' : ''}`} />
                     <div className="text-2xl font-bold text-white mb-1">
                       {stat.loading ? (
                         <div className="flex items-center justify-center">
                           <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                         </div>
                       ) : (
                         stat.value
                       )}
                     </div>
                     <div className="text-gray-400 text-sm mb-2">{stat.label}</div>
                     {!stat.loading && (
                       <div className="flex items-center justify-center space-x-1 text-xs">
                         <TrendingUp size={12} className="text-green-400" />
                         <span className="text-green-400 font-medium">{stat.trend}</span>
                       </div>
                     )}
                   </motion.div>
                 ))}
               </div>
               
               {/* Barre de progression globale */}
               <motion.div
                 initial={{ opacity: 0, width: 0 }}
                 animate={{ opacity: 1, width: '100%' }}
                 transition={{ delay: 0.8, duration: 1 }}
                 className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20"
               >
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-white font-medium">Progression de la communauté</span>
                   <span className="text-purple-400 text-sm">
                     {realTimeStats.loading ? '...' : `${Math.min(100, Math.round((realTimeStats.artists / 1000) * 100))}%`}
                   </span>
                 </div>
                 <div className="w-full bg-white/10 rounded-full h-2">
                   <motion.div
                     initial={{ width: 0 }}
                     animate={{ width: realTimeStats.loading ? '0%' : `${Math.min(100, Math.round((realTimeStats.artists / 1000) * 100))}%` }}
                     transition={{ delay: 1, duration: 1.5 }}
                     className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                   ></motion.div>
                 </div>
                 <p className="text-gray-400 text-xs mt-2">
                   {realTimeStats.loading ? 'Chargement...' : `${realTimeStats.artists} artistes actifs sur 1000 objectif`}
                 </p>
               </motion.div>
             </motion.div>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {popularUsers?.map((user, index) => (
                  <div
                    key={user._id}
                    className="group bg-white/5 dark:bg-gray-800/70 rounded-2xl p-4 flex flex-col items-center shadow-sm hover:shadow-lg hover:scale-[1.03] transition-all duration-200 border border-gray-700 focus-within:ring-2 focus-within:ring-purple-500 cursor-pointer text-center"
                    tabIndex={0}
                    aria-label={`Artiste : ${user.name || user.username}`}
                    onClick={() => router.push(`/profile/${user.username}`)}
                  >
                    {/* Avatar */}
                    <div className="relative mb-3">
                      <img
                        src={user.avatar || '/default-avatar.png'}
                        alt={user.name || user.username}
                        className="w-20 h-20 rounded-full mx-auto object-cover group-hover:ring-2 ring-purple-500/50 transition-all duration-300"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Logique follow/unfollow ici
                        }}
                        className="absolute bottom-1 right-1 w-8 h-8 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center text-white shadow opacity-0 group-hover:opacity-100 transition-opacity duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        aria-label={`Suivre ${user.name || user.username}`}
                      >
                        <UserPlus size={16} />
                      </button>
                    </div>
                    <h3 className="font-semibold text-white text-base truncate w-full mb-0.5">{user.name || user.username}</h3>
                    <p className="text-gray-400 text-xs mb-1">@{user.username}</p>
                    <p className="text-gray-400 text-xs">{user.followers?.length || 0} abonnés</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </section>



        {/* Section Radio Mixx Party - Compacte et Accessible */}
        <section id="radio" className="container mx-auto px-4 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            {/* Header compact */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Radio size={20} className="text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Mixx Party Radio
                  </h2>
                  <p className="text-gray-400 text-sm">Musique électronique en direct</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-sm border border-cyan-500/30 px-2 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-cyan-400 text-xs font-semibold">LIVE</span>
                </div>
              </div>
            </div>
            
            {/* Carte radio compacte */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
              
              <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-4 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500"></div>
                
                <div className="flex items-center justify-between">
                  {/* Informations principales */}
                  <div className="flex items-center space-x-3 flex-1">
                    {/* Logo compact */}
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <img
                          src="/mixxparty1.png"
                          alt="Mixx Party"
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <Radio size={16} className="text-white hidden" />
                      </div>
                    </div>
                    
                    {/* Détails */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm mb-1 truncate">{radioInfo.name}</h3>
                      <p className="text-gray-300 text-xs mb-2 truncate">{radioInfo.description}</p>
                      <div className="flex items-center space-x-3 text-xs">
                        <div className="flex items-center space-x-1 text-cyan-400">
                          <Headphones size={10} />
                          <span>{formatNumber(radioInfo.listeners)}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-green-400">
                          <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                          <span>En direct</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bouton de lecture compact */}
                  <div className="flex flex-col items-center space-y-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleRadioToggle}
                      className={`relative w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 ${
                        isRadioPlaying 
                          ? 'bg-gradient-to-br from-red-500 to-pink-500 shadow-lg shadow-red-500/40' 
                          : 'bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60'
                      }`}
                    >
                      {isRadioPlaying ? (
                        <Pause size={16} className="text-white" />
                      ) : (
                        <Play size={16} className="text-white ml-0.5" />
                      )}
                    </motion.button>
                    
                    <p className="text-white text-xs font-medium">Mixx Party</p>
                  </div>
                </div>
                
                {/* Piste en cours - compacte */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-400 text-xs font-medium mb-1">EN COURS</p>
                      <p className="text-white font-medium text-sm truncate">{radioInfo.currentTrack}</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowProgramDialog(true)}
                      className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg text-purple-300 text-xs font-medium hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300"
                    >
                      Plus d'infos
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Section Créations Récentes */}
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Nouvelles Créations</h2>
              <p className="text-gray-400">Les dernières créations partagées par la communauté</p>
            </div>
            <button
              className="text-purple-400 hover:text-purple-300 font-medium text-sm px-4 py-2 rounded-lg border border-purple-500/30 bg-purple-900/10 transition"
            >
              Voir tout
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {dailyDiscoveries.length > 0 ? (
              dailyDiscoveries.map((track, index) => (
                <div
                  key={track._id}
                  className="group bg-white/5 dark:bg-gray-800/70 rounded-2xl p-4 flex flex-col items-center shadow-sm hover:shadow-lg hover:scale-[1.03] transition-all duration-200 border border-gray-700 focus-within:ring-2 focus-within:ring-purple-500 cursor-pointer"
                  tabIndex={0}
                  aria-label={`Création : ${track.title || 'Titre inconnu'} par ${track.artist?.name || track.artist?.username || 'Artiste inconnu'}`}
                >
                  {/* Image */}
                  <div className="w-28 h-28 rounded-xl overflow-hidden mb-3 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <img
                      src={track.coverUrl || '/default-cover.jpg'}
                      alt={track.title || 'Titre inconnu'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/default-cover.jpg';
                      }}
                    />
                  </div>
                  {/* Titre */}
                  <h4 className="font-semibold text-white text-base text-center truncate w-full mb-0.5">
                    {track.title || 'Titre inconnu'}
                  </h4>
                  {/* Artiste */}
                  <p className="text-gray-300 text-xs text-center truncate w-full mb-2">
                    {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                  </p>
                  {/* Durée + Bouton play */}
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                      {formatDuration(track.duration)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayTrack(track);
                      }}
                      className="w-10 h-10 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center text-white shadow transition focus:outline-none focus:ring-2 focus:ring-purple-500"
                      aria-label={`Écouter ${track.title || 'Titre inconnu'}`}
                    >
                      {currentTrack?._id === track._id && audioState.isPlaying ? (
                        <Pause size={18} />
                      ) : (
                        <Play size={18} className="ml-0.5" />
                      )}
                    </button>
                  </div>
                  {/* Stats */}
                  <div className="flex items-center justify-between w-full mt-auto pt-2 border-t border-gray-700 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Headphones size={12} />
                      <span>{formatNumber(track.plays)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <InteractiveCounter
                        type="likes"
                        initialCount={Array.isArray(track.likes) ? track.likes.length : 0}
                        isActive={track.isLiked || (Array.isArray(track.likes) && track.likes.includes(user?.id || ''))}
                        onToggle={async (newState) => {
                          await handleLikeTrack(track._id, 'dailyDiscoveries', index);
                        }}
                        size="sm"
                        showIcon={true}
                        className="text-gray-400 hover:text-red-500"
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Skeleton loading si pas de données
              [...Array(6)].map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="relative rounded-xl overflow-hidden">
                    <div className="aspect-square bg-gray-800"></div>
                    <div className="p-3 bg-gray-800">
                      <div className="h-4 bg-gray-700 rounded mb-1"></div>
                      <div className="h-3 bg-gray-700 rounded w-2/3 mb-2"></div>
                      <div className="flex justify-between">
                        <div className="h-3 bg-gray-700 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-700 rounded w-1/4"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
                  <BarChart3 size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">📊 Statistiques Communauté</h2>
                  <p className="text-gray-400">Découvrez l'impact de notre plateforme</p>
                </div>
              </div>
            </div>
            
            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {communityStats?.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '50px' }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="group cursor-pointer text-center"
                  >
                    <div className="relative rounded-xl overflow-hidden bg-white/10 dark:bg-gray-800/60 border border-gray-700 hover:shadow-xl hover:scale-105 transition-all duration-200 p-4">
                      {/* Icône */}
                      <div className="w-12 h-12 rounded-lg mb-3 flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 mx-auto">
                        {stat.icon === 'Music' && <Music size={20} className="text-white" />}
                        {stat.icon === 'Users' && <Users size={20} className="text-white" />}
                        {stat.icon === 'Heart' && <Heart size={20} className="text-white" />}
                        {stat.icon === 'Headphones' && <Headphones size={20} className="text-white" />}
                      </div>
                      
                      {/* Valeur */}
                      <div className="text-2xl font-bold text-white mb-1">
                        {stat.value || '0'}
                      </div>
                      
                      {/* Label */}
                      <div className="text-white font-medium text-sm mb-1">
                        {stat.label || 'Statistique'}
                      </div>
                      
                      {/* Croissance */}
                      <div className="text-gray-400 text-xs">
                        {stat.growth || '+0% ce mois'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Statistiques supplémentaires compactes */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
                >
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color}`}>
                    <stat.icon size={16} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold text-sm">{stat.value}</div>
                    <div className="text-gray-400 text-xs">{stat.title}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Section Recommandations Personnalisées */}
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
                  onClick={fetchPersonalRecommendations}
                  className="text-purple-400 hover:text-purple-300 font-medium"
                >
                  Rafraîchir
                </motion.button>
              </div>

              {recommendationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                <>
                  {/* Cartes de recommandations compactes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {personalRecommendations?.map((rec, index) => (
                      <motion.div
                        key={rec.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '50px' }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="group cursor-pointer"
                      >
                        <div className="relative rounded-xl overflow-hidden bg-white/10 dark:bg-gray-800/60 border border-gray-700 hover:shadow-xl hover:scale-105 transition-all duration-200 p-4">
                          {/* Badge de confiance */}
                          <div className="absolute top-3 right-3">
                            <div className="bg-gradient-to-r from-green-400 to-emerald-400 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                              {rec.confidence || '95%'}
                            </div>
                          </div>

                          {/* Icône */}
                          <div className="w-12 h-12 rounded-lg mb-3 flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                            {rec.icon === 'UserPlus' && <UserPlus size={20} className="text-white" />}
                            {rec.icon === 'TrendingUp' && <TrendingUp size={20} className="text-white" />}
                            {rec.icon === 'Sparkles' && <Sparkles size={20} className="text-white" />}
                          </div>

                          {/* Type de recommandation */}
                          <div className="text-purple-400 text-xs font-medium mb-2">
                            {rec.type || 'Recommandation'}
                          </div>

                          {/* Contenu */}
                          <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2 group-hover:text-purple-200 transition-colors">
                            {rec.title || 'Titre de recommandation'}
                          </h3>
                          <p className="text-gray-300 text-xs mb-3 line-clamp-2">
                            {rec.description || 'Description de la recommandation'}
                          </p>

                          {/* Tracks recommandées compactes avec interactions */}
                          {rec.tracks && rec.tracks.length > 0 && (
                            <div className="space-y-1 mb-3">
                              {rec.tracks.slice(0, 2).map((track: Track, trackIndex: number) => (
                                <motion.div 
                                  key={track._id} 
                                  className="flex items-center space-x-2 p-1.5 bg-white/5 rounded hover:bg-white/10 transition-all duration-200 cursor-pointer group"
                                  whileHover={{ scale: 1.02 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayTrack(track);
                                  }}
                                >
                                  <img
                                    src={track.coverUrl || '/default-cover.jpg'}
                                    alt={track.title}
                                    className="w-6 h-6 rounded object-cover"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-xs font-medium truncate group-hover:text-purple-200 transition-colors">
                                      {track.title || 'Titre inconnu'}
                                    </p>
                                    <p className="text-gray-400 text-xs truncate">
                                      {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-1 gap-1">
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayTrack(track);
                                      }}
                                      className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                                    >
                                      <Play size={8} fill="white" className="ml-0.5" />
                                    </motion.button>
                                    <InteractiveCounter
                                      type="likes"
                                      initialCount={track.likes?.length || 0}
                                      isActive={track.isLiked || track.likes?.includes(user?.id || '')}
                                      onToggle={async (newState) => {
                                        await handleLikeTrack(track._id, 'recommendations', index);
                                      }}
                                      showIcon={true}
                                      className="w-5 h-5 bg-white/20 rounded-full hover:bg-white/30 transition-colors text-white"
                                    />
                                  </div>
                                </motion.div>
                              ))}
                              {rec.tracks.length > 2 && (
                                <div className="text-center pt-1">
                                  <span className="text-gray-400 text-xs">
                                    +{rec.tracks.length - 2} autres recommandations
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Bouton d'action fonctionnel */}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Action basée sur le type de recommandation
                              if (rec.type === 'Basé sur vos goûts') {
                                // Naviguer vers la page de découverte avec filtres
                                router.push(`/discover?filter=similar&genres=${rec.metrics?.topGenres?.join(',') || ''}`);
                              } else if (rec.type === 'Nouveautés populaires') {
                                // Naviguer vers les tendances
                                router.push('/discover?filter=trending');
                              } else if (rec.type === 'Recommandations personnalisées') {
                                // Naviguer vers la page de découverte avec filtres personnalisés
                                router.push('/discover?filter=personal');
                              } else {
                                // Action par défaut : naviguer vers la découverte
                                router.push('/discover');
                              }
                            }}
                            className="w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm text-white py-2 rounded-lg text-xs font-medium hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300 border border-purple-500/30 hover:border-purple-500/50 flex items-center justify-center space-x-1"
                          >
                            <span>Découvrir</span>
                            <ChevronRight size={12} />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Insights personnalisés compacts avec actions */}
                  {userPreferences && (
                    <div className="mt-6 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-semibold text-sm">Vos Insights Musicaux</h3>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => router.push('/profile/edit')}
                          className="text-purple-400 hover:text-purple-300 text-xs font-medium"
                        >
                          Personnaliser
                        </motion.button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          { 
                            label: 'Genres préférés', 
                            value: userPreferences.topGenres?.slice(0, 2).join(', ') || 'Aucun', 
                            icon: Music,
                            action: () => router.push('/discover?filter=genres')
                          },
                          { 
                            label: 'Créations aimées', 
                            value: `${userPreferences.totalLiked || 0} titres`, 
                            icon: Heart,
                            action: () => router.push('/library?filter=liked')
                          },
                          { 
                            label: 'Artiste favori', 
                            value: userPreferences.favoriteArtist || 'Aucun', 
                            icon: Star,
                            action: () => router.push(`/profile/${userPreferences.favoriteArtist?.toLowerCase().replace(/\s+/g, '-')}`)
                          }
                        ].map((insight, index) => (
                          <motion.div
                            key={insight.label}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: '50px' }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            whileHover={{ scale: 1.02 }}
                            className="flex items-center space-x-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer"
                            onClick={insight.action}
                          >
                            <insight.icon size={16} className="text-purple-400" />
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-medium text-xs truncate">{insight.value}</div>
                              <div className="text-gray-400 text-xs truncate">{insight.label}</div>
                            </div>
                            <ChevronRight size={12} className="text-gray-400" />
                          </motion.div>
                        ))}
                      </div>
                      
                      {/* Actions rapides */}
                      <div className="mt-4 pt-3 border-t border-white/10">
                        <div className="flex flex-wrap gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => router.push('/discover')}
                            className="px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30 hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300"
                          >
                            Découvrir plus
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => router.push('/upload')}
                            className="px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 text-xs rounded-full border border-green-500/30 hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-300"
                          >
                            Partager ma musique
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={fetchPersonalRecommendations}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-300"
                          >
                            Actualiser
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </section>
        )}



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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {tracks?.map((track, index) => (
                    <motion.div
                      key={track._id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '50px' }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="group cursor-pointer"
                    >
                      <div className="relative rounded-xl overflow-hidden bg-white/10 dark:bg-gray-800/60 border border-gray-700 hover:shadow-xl hover:scale-105 transition-all duration-200 p-4">
                        {/* Badge Découverte */}
                        {track.isDiscovery && (
                          <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs px-2 py-0.5 rounded-full shadow font-semibold z-10 flex items-center gap-1">
                            <Sparkles size={12} className="inline" />
                            Découverte
                          </div>
                        )}
                        
                        {/* Image */}
                        <div className="w-20 h-20 rounded-lg overflow-hidden mb-3 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                          <img
                            src={track.coverUrl || '/default-cover.jpg'}
                            alt={track.title || 'Titre inconnu'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/default-cover.jpg';
                            }}
                          />
                        </div>
                        
                        {/* Titre */}
                        <h3 className="font-semibold text-white text-sm mb-1 truncate">
                          {track.title || 'Titre inconnu'}
                        </h3>
                        
                        {/* Artiste */}
                        <p className="text-gray-300 text-xs mb-2 truncate">
                          {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                        </p>
                        
                        {/* Durée + Bouton play */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                            {formatDuration(track.duration)}
                          </span>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayTrack(track);
                            }}
                            className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200 shadow"
                          >
                            {currentTrack?._id === track._id && audioState.isPlaying ? (
                              <Pause size={14} fill="white" />
                            ) : (
                              <Play size={14} fill="white" className="ml-0.5" />
                            )}
                          </motion.button>
                        </div>
                        
                        {/* Stats */}
                        <div className="flex items-center justify-between w-full pt-2 border-t border-gray-700 text-xs text-gray-400">
                          <div className="flex items-center gap-1">
                            <Headphones size={12} />
                            <span>{formatNumber(track.plays)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <InteractiveCounter
                              type="likes"
                              initialCount={track.likes.length}
                              isActive={track.isLiked || track.likes.includes(user?.id || '')}
                              onToggle={async (newState) => {
                                await handleLikeTrack(track._id, config.key, index);
                              }}
                              size="sm"
                              showIcon={true}
                              className="text-gray-400 hover:text-red-500"
                            />
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

      {/* Dialog Radio - Compact et Accessible */}
      <AnimatePresence>
        {showProgramDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowProgramDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md max-h-[70vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Effet de fond */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-lg"></div>
              <div className="relative bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col h-full">
                {/* Header compact */}
                <div className="relative p-4 border-b border-white/10 flex-shrink-0">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500"></div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                          <Radio size={20} className="text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full animate-pulse"></div>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                          Mixx Party Radio
                        </h2>
                        <p className="text-gray-400 text-xs">Informations en temps réel</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={fetchRadioInfo}
                        disabled={programLoading}
                        className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 disabled:opacity-50"
                      >
                        <RefreshCw size={16} className={`text-white ${programLoading ? 'animate-spin' : ''}`} />
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowProgramDialog(false)}
                        className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300"
                      >
                        <X size={16} className="text-white" />
                      </motion.button>
                    </div>
                  </div>
                </div>
                
                {/* Contenu compact */}
                <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
                  {programLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-center">
                        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-gray-400 text-sm">Chargement...</p>
                      </div>
                    </div>
                  ) : realRadioProgram.length > 0 ? (
                    <div className="space-y-4">
                      {realRadioProgram.map((radioInfo: any, index: number) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="space-y-3"
                        >
                          {/* Piste actuelle - compacte */}
                          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl p-3 border border-cyan-500/30">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-2 h-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse"></div>
                              <h3 className="text-sm font-bold text-white">En cours</h3>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-semibold text-sm truncate">{radioInfo.currentTrack.title}</p>
                                  <p className="text-cyan-400 text-xs truncate">{radioInfo.currentTrack.artist}</p>
                                </div>
                                <span className="inline-block px-2 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full font-bold animate-pulse ml-2">
                                  LIVE
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-black/20 rounded-lg p-2">
                                  <p className="text-gray-400 text-xs">Auditeurs</p>
                                  <p className="text-white font-medium">{formatNumber(radioInfo.stats.listeners)}</p>
                                </div>
                                <div className="bg-black/20 rounded-lg p-2">
                                  <p className="text-gray-400 text-xs">Qualité</p>
                                  <p className="text-white font-medium">{radioInfo.stats.bitrate}kbps</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Description - compacte */}
                          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-3 border border-purple-500/30">
                            <h3 className="text-sm font-bold text-white mb-2">À propos</h3>
                            <p className="text-gray-300 text-xs mb-3 leading-relaxed">{radioInfo.description}</p>
                            
                            <div className="space-y-1">
                              {radioInfo.features.slice(0, 3).map((feature: string, featureIndex: number) => (
                                <div key={featureIndex} className="flex items-center space-x-2">
                                  <span className="text-lg flex-shrink-0">{feature.split(' ')[0]}</span>
                                  <span className="text-gray-300 text-xs">{feature.split(' ').slice(1).join(' ')}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Statistiques - compactes */}
                          <div className="bg-gradient-to-r from-pink-500/10 to-cyan-500/10 rounded-xl p-3 border border-pink-500/30">
                            <h3 className="text-sm font-bold text-white mb-2">Statistiques</h3>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-center">
                                <div className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                                  {formatNumber(radioInfo.stats.listeners)}
                                </div>
                                <p className="text-gray-400 text-xs">Auditeurs</p>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                                  {radioInfo.stats.bitrate}
                                </div>
                                <p className="text-gray-400 text-xs">kbps</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-6">
                      <p className="text-sm">Aucune information disponible</p>
                    </div>
                  )}
                </div>
                
                {/* Footer compact */}
                <div className="p-4 border-t border-white/10 flex-shrink-0 bg-black/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-xs">
                      <div className="flex items-center space-x-1 text-cyan-400">
                        <div className="w-1.5 h-1.5 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full animate-pulse"></div>
                        <span>24h/24</span>
                      </div>
                      <div className="flex items-center space-x-1 text-green-400">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                        <span>En direct</span>
                      </div>
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowProgramDialog(false)}
                      className="bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-500 hover:to-purple-600 text-white font-medium px-4 py-2 rounded-lg transition-all duration-300 shadow-lg shadow-cyan-500/30 text-sm"
                    >
                      Fermer
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
} 