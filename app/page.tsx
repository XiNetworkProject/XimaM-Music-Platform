'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { useAudioPlayer } from './providers';
import { useBatchLikeSystem } from '@/hooks/useLikeSystem';
import { useBatchPlaysSystem } from '@/hooks/usePlaysSystem';
import LikeButton from '@/components/LikeButton';
import CommentButton from '@/components/CommentButton';
import BottomNav from '@/components/BottomNav';
import { AnimatedPlaysCounter, AnimatedLikeCounter } from '@/components/AnimatedCounter';

import SocialStats from '@/components/SocialStats';
import { 
  Play, Heart, ChevronLeft, ChevronRight, Pause, Clock, Headphones, 
  Users, TrendingUp, Star, Zap, Music, Flame, Calendar, UserPlus,
  Sparkles, Crown, Radio, Disc3, Mic2, RefreshCw, Share2, Eye, 
  Award, Target, Compass, BarChart3, Gift, Lightbulb, Globe, Search, List, Activity, X,
  Newspaper, Download, ArrowRight, MessageCircle
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
  likes: number;
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
  
  // Utiliser les nouveaux systèmes de likes et écoutes
  const { toggleLikeBatch, isBatchLoading } = useBatchLikeSystem();
  const { incrementPlaysBatch, isBatchLoading: isPlaysLoading } = useBatchPlaysSystem();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [autoProgress, setAutoProgress] = useState(0);
  const [isCarouselInView, setIsCarouselInView] = useState(true);
  const rafRef = useRef<number | null>(null);

  // États pour les différentes catégories avec cache
  const [categories, setCategories] = useState<Record<string, CategoryData>>({
    featured: { tracks: [], loading: false, error: null },
    trending: { tracks: [], loading: false, error: null },
    popular: { tracks: [], loading: false, error: null },
    recent: { tracks: [], loading: false, error: null },
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
        // Ne pas mettre à jour les stats pour la radio
        if (currentTrack._id === 'radio-mixx-party') {
          return;
        }
        
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
        
        // Vérifier que data.tracks existe et est un tableau
        if (!data.tracks || !Array.isArray(data.tracks)) {
          console.error(`❌ Format de réponse invalide pour ${key}:`, data);
          throw new Error('Format de réponse invalide');
        }
        
        const tracksWithLikes = data.tracks.map((track: any) => ({
          ...track,
          likes: track.likes || 0,
          isLiked: false
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
        
        // Vérifier que data.tracks existe et est un tableau
        if (!data.tracks || !Array.isArray(data.tracks)) {
          console.error('❌ Format de réponse invalide pour daily discoveries:', data);
          return;
        }
        
        const tracksWithLikes = data.tracks.map((track: any) => ({
          ...track,
          likes: track.likes || 0,
          isLiked: false
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
        
        // Vérifier que data.tracks existe et est un tableau
        if (!data.tracks || !Array.isArray(data.tracks)) {
          console.error('❌ Format de réponse invalide pour collaborations:', data);
          return;
        }
        
        const tracksWithLikes = data.tracks.map((track: any) => ({
          ...track,
          likes: track.likes || 0,
          isLiked: false
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
        
        // Vérifier que data.events existe et est un tableau
        if (!data.events || !Array.isArray(data.events)) {
          console.error('❌ Format de réponse invalide pour live events:', data);
          setLiveEvents([]);
          return;
        }
        
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
        
        // Vérifier que data est valide et contient les propriétés attendues
        if (!data || typeof data !== 'object') {
          console.error('❌ Format de réponse invalide pour search:', data);
          setSearchResults({ tracks: [], artists: [], playlists: [] });
          return;
        }
        
        // S'assurer que toutes les propriétés existent
        const safeData = {
          tracks: Array.isArray(data.tracks) ? data.tracks : [],
          artists: Array.isArray(data.artists) ? data.artists : [],
          playlists: Array.isArray(data.playlists) ? data.playlists : [],
          total: data.totalResults || (data.tracks?.length || 0) + (data.artists?.length || 0) + (data.playlists?.length || 0)
        };
        
        setSearchResults(safeData);
        setShowSearchResults(true);
      } else {
        console.error('❌ Erreur API search:', response.status, response.statusText);
        setSearchResults({ tracks: [], artists: [], playlists: [] });
      }
    } catch (error) {
      console.error('❌ Erreur chargement search:', error);
      setSearchResults({ tracks: [], artists: [], playlists: [] });
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
        
        // Vérifier que data.data existe et contient les stats
        if (!data.data || !data.success) {
          console.error('❌ Format de réponse invalide pour community stats:', data);
          setCommunityStats([]);
          return;
        }
        
        setCommunityStats(data.data);
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
        
        // Vérifier que data.tracks existe et est un tableau
        if (!data.tracks || !Array.isArray(data.tracks)) {
          console.error('❌ Format de réponse invalide pour personal recommendations:', data);
          setPersonalRecommendations([]);
          setUserPreferences({});
          return;
        }
        
        setPersonalRecommendations(data.tracks);
        setUserPreferences(data.userPreferences || {});
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
        
        // Vérifier que data est valide
        if (!data || typeof data !== 'object') {
          console.error('❌ Format de réponse invalide pour recent activity:', data);
          setRecentActivity([]);
          return;
        }
        
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
        
        // Vérifier que data.genres existe et est un tableau
        if (!data.genres || !Array.isArray(data.genres)) {
          console.error('❌ Format de réponse invalide pour music genres:', data);
          setMusicGenres([]);
          return;
        }
        
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
      { key: 'recommended', url: '/api/tracks/recommended?limit=50' },
      { key: 'following', url: '/api/tracks/following?limit=50' }
    ];

    await Promise.all(categoryApis.map(({ key, url }) => fetchCategoryData(key, url)));
    setRefreshing(false);
  }, [fetchCategoryData]);

  // Observer de visibilité du carrousel pour suspendre l'autoplay hors-écran
  useEffect(() => {
    if (!carouselRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsCarouselInView(entry.isIntersecting),
      { threshold: 0.2 }
    );
    observer.observe(carouselRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-play avec barre de progression fluide + pause on hover/blur
  useEffect(() => {
    if (!isAutoPlaying || !isCarouselInView || featuredTracks.length === 0) return;
    let start: number | null = null;
    const durationMs = 8000;

    const step = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(100, (elapsed / durationMs) * 100);
      setAutoProgress(progress);
      if (elapsed >= durationMs) {
      setCurrentSlide((prev) => (prev + 1) % Math.min(featuredTracks.length, 5));
        start = ts;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setAutoProgress(0);
    };
  }, [isAutoPlaying, isCarouselInView, featuredTracks.length]);

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
    setAutoProgress(0);
  }, [featuredTracks.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + Math.min(featuredTracks.length, 5)) % Math.min(featuredTracks.length, 5));
    setIsAutoPlaying(false);
    setAutoProgress(0);
  }, [featuredTracks.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    setAutoProgress(0);
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

  // Fonction pour gérer les likes avec le nouveau système
  const handleLikeTrack = useCallback(async (trackId: string, categoryKey: string, trackIndex: number) => {
    if (!session) {
      return;
    }

    try {
      // Utiliser le nouveau système de likes
      const result = await toggleLikeBatch(trackId, { isLiked: false, likesCount: 0 });
      
      if (result) {
        // Mettre à jour l'état local avec les vraies données de l'API
        setCategories(prev => {
          const newCategories = { ...prev };
          if (newCategories[categoryKey]) {
            newCategories[categoryKey] = {
              ...newCategories[categoryKey],
              tracks: newCategories[categoryKey].tracks.map(track => 
                track._id === trackId 
                  ? { ...track, isLiked: result.isLiked, likes: typeof result.likes === 'number' ? result.likes : track.likes }
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
              ? { ...track, isLiked: result.isLiked, likes: typeof result.likes === 'number' ? result.likes : track.likes }
              : track
          )
        );
        setCollaborations(prev => 
          prev.map(track => 
            track._id === trackId 
              ? { ...track, isLiked: result.isLiked, likes: typeof result.likes === 'number' ? result.likes : track.likes }
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
                    ? { ...track, isLiked: result.isLiked, likes: typeof result.likes === 'number' ? result.likes : track.likes }
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
                ? { ...t, isLiked: result.isLiked, likes: result.likes || t.likes }
                : t
            ) || []
          }))
        );
      }
    } catch (error) {
      console.error('Erreur like:', error);
    }
  }, [session, toggleLikeBatch]);

  // Fonction pour jouer une piste
  const handlePlayTrack = useCallback(async (track: any) => {
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
      const streamUrl = 'https://rocket.streamradio.fr/stream/mixxparty';
      console.log('URL de streaming radio configurée:', streamUrl);
      return streamUrl;
    } catch (error) {
      console.error('Erreur récupération URL streaming:', error);
      return 'https://rocket.streamradio.fr/stream/mixxparty'; // URL de fallback
    }
  };

  // Fonction pour récupérer les métadonnées du flux radio
  const fetchRadioMetadata = async () => {
    try {
      // URL de statut pour récupérer les métadonnées
      const statusUrl = 'https://rocket.streamradio.fr/status-json.xsl';
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
      const response = await fetch('https://rocket.streamradio.fr/status-json.xsl');
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white pt-0">
      {/* Banderoles fines et élégantes */}
      <div className="relative z-20">
        {/* Banderole IA - Générateur de musique */}
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full bg-gradient-to-r from-blue-600/15 via-purple-600/15 to-cyan-600/15 border-y border-blue-500/20"
        >
          <div className="flex items-center justify-center py-3 px-4">
            <div className="flex items-center space-x-3 text-center">
              <Sparkles size={16} className="text-blue-400 animate-pulse" />
              <span className="text-sm font-medium text-blue-200">
                🎵 <span className="text-white font-semibold">Générateur de Musique IA</span> - Bientôt disponible
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/ai-generator')}
                className="ml-3 px-3 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-xs rounded-full border border-blue-500/30 transition-all duration-200"
              >
                En savoir plus
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Banderole Abonnements */}
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="w-full bg-gradient-to-r from-green-600/15 via-emerald-600/15 to-teal-600/15 border-y border-green-500/20"
        >
          <div className="flex items-center justify-center py-3 px-4">
            <div className="flex items-center space-x-3 text-center">
              <Crown size={16} className="text-green-400 animate-pulse" />
              <span className="text-sm font-medium text-green-200">
                👑 <span className="text-white font-semibold">Abonnements Premium</span> - Débloquez tout le potentiel
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/subscriptions')}
                className="ml-3 px-3 py-1 bg-green-600/30 hover:bg-green-600/50 text-green-200 text-xs rounded-full border border-green-500/30 transition-all duration-200"
              >
                Voir les offres
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Zone transparente pour le carrousel */}
      <div className="relative bg-transparent" style={{ background: 'transparent !important' }}>
        {/* Carrousel Hero - Design futuriste complet */}
        {featuredTracks.length > 0 && (
          <div className="relative w-full h-[70vh] min-h-[500px] max-h-[800px] overflow-hidden">
            {/* Fond dynamique avec particules */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-pink-900/20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,20,147,0.1),transparent_50%)]"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(120,119,198,0.1),transparent_50%)]"></div>
          </div>



            <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="relative w-full h-full flex items-center justify-center"
              >
                {/* Image de fond avec effet parallax et overlay */}
                <div className="absolute inset-0 overflow-hidden">
                  <img
                      src={getValidImageUrl(featuredTracks[currentSlide].coverUrl, '/default-cover.jpg')}
                      alt={featuredTracks[currentSlide].title}
                      className="w-full h-full object-cover"
                      loading="eager"
                      onError={(e) => {
                        console.log('Erreur image cover:', featuredTracks[currentSlide].coverUrl);
                        e.currentTarget.src = '/default-cover.jpg';
                      }}
                      onLoad={() => {
                        console.log('Image chargée avec succès:', featuredTracks[currentSlide].coverUrl);
                      }}
                    />
                  
                  {/* Overlay gradient complexe */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]"></div>
                  </div>

                {/* Contenu principal centré */}
                <div className="relative z-10 text-center px-8 max-w-4xl mx-auto">
                  {/* Badge de statut */}
                      <motion.div
                    initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                    className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md border border-white/20 rounded-full"
                  >
                    <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
                    <span className="text-white/90 text-sm font-medium">En vedette</span>
                    <TrendingUp size={14} className="text-purple-400" />
                  </motion.div>

                  {/* Badges secondaires */}
                        <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="flex items-center justify-center gap-3 mb-6"
                  >
                    {Array.isArray(featuredTracks[currentSlide]?.genre) && (featuredTracks[currentSlide]?.genre?.length || 0) > 0 && (
                      <span className="px-3 py-1.5 text-sm rounded-full border border-white/30 bg-white/10 backdrop-blur-md text-white/90 font-medium">
                        {featuredTracks[currentSlide]?.genre?.[0]}
                      </span>
                    )}
                    {featuredTracks[currentSlide].createdAt && (
                      <span className="px-3 py-1.5 text-sm rounded-full border border-white/30 bg-white/10 backdrop-blur-md text-white/90 font-medium">
                        {formatDate(featuredTracks[currentSlide].createdAt)}
                      </span>
                    )}
                    <span className="px-3 py-1.5 text-sm rounded-full border border-white/30 bg-white/10 backdrop-blur-md text-white/90 font-medium">
                      {formatDuration(featuredTracks[currentSlide].duration)}
                    </span>
                        </motion.div>

                  {/* Titre principal */}
                        <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight cursor-pointer hover:text-purple-300 transition-all duration-500"
                    style={{
                      textShadow: '0 0 30px rgba(168, 85, 247, 0.5), 0 0 60px rgba(236, 72, 153, 0.3)'
                    }}
                        >
                          {featuredTracks[currentSlide].title}
                        </motion.h1>

                  {/* Artiste avec avatar */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    className="flex items-center justify-center gap-4 mb-8"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/30 shadow-lg">
                      <img
                        src={featuredTracks[currentSlide].artist?.avatar || '/default-avatar.png'}
                        alt={featuredTracks[currentSlide].artist?.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/default-avatar.png';
                        }}
                              />
                            </div>
                    <div className="text-left">
                      <p className="text-white/80 text-lg font-medium">par</p>
                      <h3 className="text-2xl font-bold text-white hover:text-purple-300 transition-colors cursor-pointer">
                        {featuredTracks[currentSlide].artist?.name || featuredTracks[currentSlide].artist?.username || 'Artiste inconnu'}
                      </h3>
                          </div>
                        </motion.div>

                  {/* Boutons d'action principaux */}
                        <motion.div
                    initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    className="flex flex-wrap items-center justify-center gap-4 mb-8"
                        >
                    {/* Bouton Play principal */}
                          <motion.button
                      whileHover={{ 
                        scale: 1.05,
                        boxShadow: "0 0 30px rgba(168, 85, 247, 0.6)"
                      }}
                      whileTap={{ scale: 0.95 }}
                            onClick={() => handlePlayTrack(featuredTracks[currentSlide])}
                      className="group relative flex items-center space-x-3 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-purple-700 hover:via-pink-700 hover:to-purple-800 transition-all duration-300 shadow-2xl hover:shadow-purple-500/40"
                      aria-label={currentTrack?._id === featuredTracks[currentSlide]._id && audioState.isPlaying ? 'Mettre en pause' : 'Lire la piste'}
                          >
                      {/* Effet de lueur */}
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                      
                      <div className="relative flex items-center space-x-3">
                            {currentTrack?._id === featuredTracks[currentSlide]._id && audioState.isPlaying ? (
                          <Pause size={24} />
                            ) : (
                          <Play size={24} className="ml-1" />
                            )}
                            <span>
                              {currentTrack?._id === featuredTracks[currentSlide]._id && audioState.isPlaying ? 'Pause' : 'Écouter'}
                            </span>
                      </div>
                          </motion.button>

                    {/* Bouton Like */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleLikeTrack(featuredTracks[currentSlide]._id, 'featured', 0)}
                      className="flex items-center space-x-2 px-6 py-4 rounded-2xl font-semibold text-white bg-white/10 border border-white/30 hover:bg-white/20 transition-all duration-300 backdrop-blur-md shadow-lg hover:shadow-white/20"
                      aria-label="Aimer la piste"
                    >
                      <Heart size={20} className={featuredTracks[currentSlide].isLiked ? 'text-red-500 fill-red-500' : 'text-white'} />
                      <span>J'aime</span>
                    </motion.button>

                          {/* Bouton Partager */}
                          <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                            onClick={() => handleShare(featuredTracks[currentSlide])}
                      className="flex items-center space-x-2 px-6 py-4 rounded-2xl font-semibold text-white bg-white/10 border border-white/30 hover:bg-white/20 transition-all duration-300 backdrop-blur-md shadow-lg hover:shadow-white/20"
                      aria-label="Partager la piste"
                          >
                      <Share2 size={20} />
                            <span>Partager</span>
                          </motion.button>

                    {/* Bouton Artiste */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                                                      onClick={() => router.push(`/profile/${featuredTracks[currentSlide].artist?.username || ''}`)}
                      className="px-6 py-4 rounded-2xl font-semibold text-white bg-white/10 border border-white/30 hover:bg-white/20 transition-all duration-300 backdrop-blur-md shadow-lg hover:shadow-white/20"
                      aria-label="Voir l'artiste"
                    >
                      Artiste
                    </motion.button>
                        </motion.div>

                  {/* Stats de la piste */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0, duration: 0.6 }}
                    className="flex items-center justify-center gap-8 text-white/80"
                  >
                    <div className="flex items-center gap-2">
                      <Headphones size={18} className="text-purple-400" />
                      <span className="font-medium">{formatNumber(featuredTracks[currentSlide].plays)} écoutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart size={18} className="text-pink-400" />
                      <span className="font-medium">{formatNumber(featuredTracks[currentSlide].likes || 0)} likes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle size={18} className="text-blue-400" />
                      <span className="text-white/80 font-medium">{featuredTracks[currentSlide].comments?.length || 0} commentaires</span>
                  </div>
                </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Barre de progression autoplay moderne */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-32 w-64 h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-md">
              <motion.div 
                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 rounded-full"
                style={{ width: `${autoProgress}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${autoProgress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>

            {/* Indicateurs centraux simplifiés */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
              <div className="flex items-center space-x-2">
                  {featuredTracks.map((_, index) => (
                    <motion.button
                      key={index}
                    whileHover={{ scale: 1.3 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => goToSlide(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === currentSlide 
                        ? 'bg-gradient-to-r from-purple-400 to-pink-400 scale-125 shadow-lg shadow-purple-500/50' 
                          : 'bg-white/40 hover:bg-white/60'
                      }`}
                    aria-label={`Aller à la diapositive ${index + 1}`}
                    />
                  ))}
              </div>
                </div>

            {/* Contrôles d'autoplay */}
            <div className="absolute top-6 right-6 z-20">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="group relative w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center hover:bg-white/20 transition-all duration-300 border border-white/30 shadow-lg"
                aria-label={isAutoPlaying ? 'Arrêter l\'autoplay' : 'Démarrer l\'autoplay'}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {isAutoPlaying ? (
                  <Pause size={20} className="relative text-white" />
                ) : (
                  <Play size={20} className="relative text-white ml-0.5" />
                )}
                </motion.button>
              </div>
            </div>
      )}
      </div>




      {/* Sections de catégories améliorées */}
      <div className="py-6 space-y-12">
        {/* Section Créer & Découvrir - Version compacte et mobile */}
        <section className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '20px' }}
            transition={{ duration: 0.4 }}
          className="relative"
        >
            {/* Header compact */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-2xl border border-purple-500/40 mb-4"
              >
                <Sparkles size={24} className="text-purple-300" />
              </motion.div>
              
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-3"
              >
                Créer & Découvrir
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto"
              >
                Partagez vos créations et explorez de nouveaux talents
              </motion.p>
              </div>

            {/* Grille compacte des actions principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Carte Créer */}
                      <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                whileHover={{ scale: 1.01 }}
                        className="group cursor-pointer"
                onClick={() => router.push('/upload')}
              >
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                      <Mic2 size={20} className="text-white" />
                            </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">🎵 Créer</h3>
                      <p className="text-purple-200 text-sm">Partagez votre musique</p>
                          </div>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-4">
                    Uploadez vos créations et construisez votre audience
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    {['Upload HD', 'Promotion IA', 'Monétisation'].map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                        <span className="text-gray-200 text-xs">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                            <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold text-sm hover:from-purple-700 hover:to-pink-700 transition-all duration-150 flex items-center justify-center space-x-2"
                  >
                    <Mic2 size={16} />
                    <span>Commencer</span>
                    <ArrowRight size={16} />
                            </motion.button>
                        </div>
                      </motion.div>
              
              {/* Carte Découvrir */}
                      <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                whileHover={{ scale: 1.01 }}
                        className="group cursor-pointer"
                onClick={() => router.push('/discover')}
              >
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 hover:border-green-400/50 transition-all duration-150">
                  {/* Effet de fond animé */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  
                  {/* Particules flottantes */}
                  <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                      animate={{ 
                        y: [0, -25, 0],
                        opacity: [0, 1, 0]
                      }}
                      transition={{ duration: 4.5, repeat: Infinity, delay: 0.5 }}
                      className="absolute top-12 left-12 w-2.5 h-2.5 bg-green-400/40 rounded-full"
                    />
                    <motion.div
                      animate={{ 
                        y: [0, -18, 0],
                        opacity: [0, 1, 0]
                      }}
                      transition={{ duration: 3.8, repeat: Infinity, delay: 1.5 }}
                      className="absolute bottom-20 right-10 w-2 h-2 bg-emerald-400/50 rounded-full"
                            />
                          </div>
                  
                  {/* Header avec icône */}
                  <div>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500">
                        <Compass size={20} className="text-white" />
                            </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">🔍 Découvrir</h3>
                        <p className="text-green-200 text-sm">Explorez la musique</p>
                            </div>
                          </div>
                    
                    {/* Description détaillée */}
                    <p className="text-gray-300 text-sm mb-4">
                      Trouvez de nouveaux artistes et genres musicaux
                    </p>
                    
                    {/* Fonctionnalités principales */}
                    <div className="space-y-2 mb-4">
                      {['IA recommandations', 'Playlists perso', 'Artistes émergents'].map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                          <span className="text-gray-200 text-xs">{feature}</span>
                      </div>
                    ))}
                  </div>
                    
                    {/* Bouton d'action principal */}
                  <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-semibold text-sm hover:from-green-700 hover:to-emerald-700 transition-all duration-150 flex items-center justify-center space-x-2"
                    >
                      <Compass size={16} />
                      <span>Explorer</span>
                      <ArrowRight size={16} />
                  </motion.button>
              </div>
            </div>
        </motion.div>
              </div>
            
            {/* Fonctionnalités rapides en grille compacte */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.3 }}
              className="mb-8"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  {
                    icon: Users,
                    title: 'Communauté',
                    color: 'from-orange-500 to-red-500',
                    href: '/community'
                  },
                  {
                    icon: Radio,
                    title: 'Radio Live',
                    color: 'from-cyan-500 to-blue-500',
                    href: '#radio'
                  },
                  {
                    icon: Crown,
                    title: 'Premium',
                    color: 'from-yellow-500 to-orange-500',
                    href: '/subscriptions'
                  }
                ].map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.05, duration: 0.25 }}
                    whileHover={{ scale: 1.01 }}
                    className="group cursor-pointer"
                    onClick={() => {
                      if (feature.href === '#radio') {
                        document.getElementById('radio')?.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        router.push(feature.href);
                      }
                    }}
                  >
                    <div className={`p-4 rounded-xl bg-gradient-to-br ${feature.color}/10 border border-${feature.color.split('-')[1]}-500/30 hover:border-${feature.color.split('-')[1]}-400/50 transition-all duration-150 text-center`}>
                      <div className={`w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                        <feature.icon size={20} className="text-white" />
                </div>
                      <h4 className="text-sm font-semibold text-white">{feature.title}</h4>
                  </div>
                  </motion.div>
            ))}
          </div>
            </motion.div>

            {/* Section des fonctionnalités avancées */}
          <motion.div
              initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.8 }}
              className="mb-16"
            >
              <div className="text-center mb-12">
                <h3 className="text-3xl font-bold text-white mb-4">🚀 Fonctionnalités Avancées</h3>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                  Des outils puissants pour enrichir votre expérience musicale
                </p>
            </div>
            
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                { 
                  icon: Users, 
                    title: 'Communauté Active',
                    description: 'Connectez-vous avec des artistes passionnés',
                    color: 'from-orange-500 to-red-500',
                    features: ['Chat en temps réel', 'Collaborations', 'Événements live'],
                    href: '/community'
                },
                { 
                  icon: Radio, 
                    title: 'Radio Mixx Party',
                    description: 'Écoutez notre radio électronique 24/7',
                    color: 'from-cyan-500 to-blue-500',
                    features: ['Streaming en direct', 'Chat interactif', 'Playlists exclusives'],
                    href: '#radio'
                  },
                  {
                    icon: Crown,
                    title: 'Programme Premium',
                    description: 'Accédez à des fonctionnalités exclusives',
                    color: 'from-yellow-500 to-orange-500',
                    features: ['Upload illimité', 'Analytics avancés', 'Support prioritaire'],
                    href: '/subscriptions'
                  }
                ].map((feature, index) => (
                <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 + index * 0.1, duration: 0.6 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                  className="group cursor-pointer"
                  onClick={() => {
                      if (feature.href === '#radio') {
                      document.getElementById('radio')?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                        router.push(feature.href);
                      }
                    }}
                  >
                    <div className={`relative p-6 rounded-2xl bg-gradient-to-br ${feature.color}/10 border border-${feature.color.split('-')[1]}-500/30 hover:border-${feature.color.split('-')[1]}-400/50 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-${feature.color.split('-')[1]}-500/20`}>
                      <div className="flex items-center space-x-4 mb-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} shadow-lg`}>
                          <feature.icon size={24} className="text-white" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white mb-1">{feature.title}</h4>
                          <p className="text-gray-400 text-sm">{feature.description}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        {feature.features.map((feat, featIndex) => (
                          <div key={featIndex} className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-gradient-to-r from-white/60 to-white/40 rounded-full"></div>
                            <span className="text-gray-300 text-xs">{feat}</span>
                          </div>
                        ))}
                      </div>
                      
                         <motion.button
                           whileHover={{ scale: 1.05 }}
                           whileTap={{ scale: 0.95 }}
                        className={`w-full bg-gradient-to-r ${feature.color} text-white py-2 rounded-lg font-medium text-sm hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2`}
                         >
                        <span>Découvrir</span>
                           <ArrowRight size={16} />
                         </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
            </motion.div>
            
            {/* Statistiques compactes */}
             <motion.div
               initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="relative"
            >
              <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-white mb-2">📊 Statistiques</h3>
                  <p className="text-gray-400 text-sm">Activité de la communauté</p>
                     </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                 {[
                   { 
                     icon: Music, 
                      label: 'Créations', 
                     value: realTimeStats.loading ? '...' : formatNumber(realTimeStats.tracks), 
                     color: 'text-purple-400', 
                     loading: realTimeStats.loading
                   },
                   { 
                     icon: Users, 
                     label: 'Artistes', 
                     value: realTimeStats.loading ? '...' : formatNumber(realTimeStats.artists), 
                     color: 'text-green-400', 
                     loading: realTimeStats.loading
                   },
                   { 
                     icon: Headphones, 
                     label: 'Écoutes', 
                     value: realTimeStats.loading ? 0 : realTimeStats.totalPlays, 
                     color: 'text-orange-400', 
                     animated: true,
                      loading: realTimeStats.loading
                   },
                   { 
                     icon: Heart, 
                     label: 'Likes', 
                     value: realTimeStats.loading ? 0 : realTimeStats.totalLikes, 
                     color: 'text-pink-400', 
                     animated: true,
                      loading: realTimeStats.loading
                   }
                 ].map((stat, index) => (
                   <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + index * 0.05, duration: 0.2 }}
                      className="text-center p-3 rounded-xl bg-white/5 border border-white/10"
                    >
                      <stat.icon size={18} className={`mx-auto mb-2 ${stat.color}`} />
                      <div className="text-lg font-bold text-white mb-1">
                       {stat.loading ? (
                          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                       ) : stat.animated ? (
                          stat.label === 'Écoutes' ? (
                           <AnimatedPlaysCounter
                             value={stat.value}
                              size="sm"
                             variant="minimal"
                             showIcon={false}
                             animation="slide"
                             className="text-white"
                           />
                         ) : (
                           <AnimatedLikeCounter
                             value={stat.value}
                              size="sm"
                             variant="minimal"
                             showIcon={false}
                             animation="bounce"
                             className="text-white"
                           />
                         )
                       ) : (
                         stat.value
                       )}
                     </div>
                      <div className="text-gray-300 text-xs">{stat.label}</div>
                   </motion.div>
                 ))}
               </div>
               
                {/* Barre de progression simplifiée */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium text-sm">Objectif: 1000 artistes</span>
                    <span className="text-purple-300 font-medium text-sm">
                     {realTimeStats.loading ? '...' : `${Math.min(100, Math.round((realTimeStats.artists / 1000) * 100))}%`}
                   </span>
                 </div>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                   <motion.div
                     initial={{ width: 0 }}
                      whileInView={{ width: realTimeStats.loading ? '0%' : `${Math.min(100, Math.round((realTimeStats.artists / 1000) * 100))}%` }}
                      transition={{ delay: 0.7, duration: 0.8 }}
                     className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                   ></motion.div>
                 </div>
                  <p className="text-gray-300 text-center text-xs">
                    {realTimeStats.loading ? 'Chargement...' : `${realTimeStats.artists} artistes actifs`}
                 </p>
                </div>
              </div>
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
                    key={user._id || user.id || index}
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
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <AnimatedPlaysCounter
                        value={user.followers?.length || 0}
                        size="sm"
                        variant="minimal"
                        showIcon={false}
                        animation="slide"
                        className="text-gray-400"
                      />
                      <span>abonnés</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </section>



        {/* Section Radio Mixx Party - Version Compacte */}
        <section id="radio" className="container mx-auto px-4 sm:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative"
          >
            {/* Effet de fond animé */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl blur-2xl"></div>
            
            {/* Header principal */}
            <div className="relative text-center mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 rounded-2xl shadow-xl shadow-purple-500/40 mb-4"
              >
                <Radio size={24} className="text-white" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full animate-pulse"></div>
              </motion.div>
              
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-3xl md:text-4xl font-black bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-3"
              >
                    Mixx Party Radio
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-lg text-gray-300 max-w-xl mx-auto leading-relaxed"
              >
                La radio électronique qui pulse 24h/24. Plongez dans un univers de beats hypnotiques.
              </motion.p>
              
              {/* Badge LIVE */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-xl border border-red-500/40 px-3 py-1.5 rounded-full mt-4"
              >
                <div className="w-1.5 h-1.5 bg-gradient-to-r from-red-400 to-pink-400 rounded-full animate-pulse"></div>
                <span className="text-red-400 font-bold text-xs tracking-wider">LIVE NOW</span>
              </motion.div>
            </div>
            
            {/* Carte radio principale */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="relative group"
            >
              {/* Effet de bordure animée */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-pink-500/30 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500 opacity-75 group-hover:opacity-100"></div>
              
              <div className="relative bg-black/60 backdrop-blur-xl border border-white/20 rounded-2xl p-6 overflow-hidden">
                {/* Barre de progression animée */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500">
                  <motion.div
                    className="h-full bg-gradient-to-r from-white/50 to-white/30"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  {/* Informations et contrôles */}
                  <div className="space-y-4">
                    {/* Logo et titre */}
                    <div className="flex items-center space-x-3">
                    <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/40">
                        <img
                          src="/mixxparty1.png"
                          alt="Mixx Party"
                            className="w-7 h-7 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                          <Radio size={18} className="text-white hidden" />
                      </div>
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full animate-pulse"></div>
                    </div>
                    
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{radioInfo.name || 'Mixx Party Radio'}</h3>
                        <p className="text-gray-300 text-sm">{radioInfo.description || 'Musique électronique en continu'}</p>
                      </div>
                    </div>
                    
                    {/* Statistiques en temps réel */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <div className="flex items-center space-x-2 mb-1">
                          <Headphones size={14} className="text-cyan-400" />
                          <span className="text-gray-400 text-xs">Auditeurs</span>
                        </div>
                          <AnimatedPlaysCounter
                          value={radioInfo.listeners || 0}
                          size="lg"
                            variant="minimal"
                          showIcon={false}
                            animation="slide"
                          className="text-xl font-bold text-cyan-400"
                          />
                        </div>
                      
                      <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-gray-400 text-xs">Statut</span>
                        </div>
                        <span className="text-xl font-bold text-green-400">LIVE</span>
                    </div>
                  </div>
                  
                    {/* Bouton de lecture principal */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleRadioToggle}
                      className={`relative w-full h-14 rounded-xl flex items-center justify-center space-x-3 transition-all duration-500 shadow-xl ${
                        isRadioPlaying 
                          ? 'bg-gradient-to-br from-red-500 to-pink-500 shadow-red-500/40 hover:shadow-red-500/60' 
                          : 'bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 shadow-purple-500/40 hover:shadow-purple-500/60'
                      }`}
                    >
                      {isRadioPlaying ? (
                        <>
                          <Pause size={20} className="text-white" />
                          <span className="text-white font-bold text-base">Arrêter la Radio</span>
                        </>
                      ) : (
                        <>
                          <Play size={20} className="text-white ml-1" />
                          <span className="text-white font-bold text-base">Écouter la Radio</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                  
                  {/* Piste en cours et visualisation */}
                  <div className="space-y-4">
                    {/* Piste actuelle */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/30">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-2.5 h-2.5 bg-gradient-to-r from-red-400 to-pink-400 rounded-full animate-pulse"></div>
                        <h4 className="text-base font-bold text-white">En cours de lecture</h4>
                  </div>
                      
                      <div className="space-y-2">
                        <div className="text-center">
                          <p className="text-white font-semibold text-base mb-1 truncate">
                            {radioInfo.currentTrack || 'Chargement...'}
                          </p>
                          <p className="text-purple-300 text-sm">Mixx Party Radio</p>
                </div>
                
                        {/* Barre de progression simulée */}
                        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          />
                    </div>
                      </div>
                    </div>
                    
                    {/* Bouton d'informations */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowProgramDialog(true)}
                      className="w-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 rounded-xl p-3 hover:from-cyan-500/30 hover:to-purple-500/30 transition-all duration-300 group"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Eye size={16} className="text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-white font-semibold text-sm">Informations détaillées</p>
                          <p className="text-cyan-300 text-xs">Programme, statistiques, qualité</p>
                        </div>
                      </div>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Dépliant d'informations - s'ouvre dans la section */}
            <AnimatePresence>
              {showProgramDialog && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="mt-6 overflow-hidden"
                >
                  <div className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                    {/* Header du dépliant */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
                          <Radio size={16} className="text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-white">Informations Radio</h3>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1, rotate: 180 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={fetchRadioInfo}
                          disabled={programLoading}
                          className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 disabled:opacity-50"
                        >
                          <RefreshCw size={14} className={`text-white ${programLoading ? 'animate-spin' : ''}`} />
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setShowProgramDialog(false)}
                          className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300"
                        >
                          <X size={14} className="text-white" />
                        </motion.button>
                      </div>
                    </div>
                    
                    {/* Contenu du dépliant */}
                    <div className="space-y-4">
                      {programLoading ? (
                        <div className="flex items-center justify-center h-24">
                          <div className="text-center space-y-2">
                            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-gray-400 text-sm">Chargement...</p>
                          </div>
                        </div>
                      ) : realRadioProgram.length > 0 ? (
                        realRadioProgram.map((radioInfo: any, index: number) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.4 }}
                            className="space-y-3"
                          >
                            {/* Piste actuelle */}
                            <div className="bg-gradient-to-r from-cyan-500/15 to-purple-500/15 rounded-xl p-4 border border-cyan-500/30">
                              <div className="flex items-center space-x-2 mb-2">
                                <div className="w-2 h-2 bg-gradient-to-r from-red-400 to-pink-400 rounded-full animate-pulse"></div>
                                <h4 className="text-sm font-bold text-white">🎵 En cours de lecture</h4>
                              </div>
                              
                              <div className="text-center p-3 bg-black/20 rounded-lg border border-white/10">
                                <p className="text-white font-bold text-lg mb-1 truncate">
                                  {radioInfo.currentTrack?.title || 'Chargement...'}
                                </p>
                                <p className="text-cyan-300 text-sm truncate">
                                  {radioInfo.currentTrack?.artist || 'Mixx Party Radio'}
                                </p>
                                <div className="mt-2">
                                  <span className="inline-block px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full font-bold animate-pulse">
                                    🔴 LIVE
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Statistiques et informations */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="bg-gradient-to-r from-purple-500/15 to-pink-500/15 rounded-xl p-4 border border-purple-500/30">
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                                  <span>📊</span>
                                  <span>Statistiques</span>
                                </h4>
                                
                                <div className="space-y-3">
                                  <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <Headphones size={14} className="text-cyan-400" />
                                      <span className="text-gray-400 text-xs">Auditeurs actifs</span>
                                    </div>
                                    <div className="text-center">
                                      <AnimatedPlaysCounter
                                        value={radioInfo.stats?.listeners || 0}
                                        size="lg"
                                        variant="minimal"
                                        showIcon={false}
                                        animation="slide"
                                        className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="text-sm">🎯</span>
                                      <span className="text-gray-400 text-xs">Qualité audio</span>
                                    </div>
                                    <div className="text-center">
                                      <span className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                                        {radioInfo.stats?.bitrate || '128'} kbps
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-gradient-to-r from-pink-500/15 to-cyan-500/15 rounded-xl p-4 border border-pink-500/30">
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                                  <span>ℹ️</span>
                                  <span>Informations</span>
                                </h4>
                                
                                <div className="space-y-3">
                                  <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                                    <h5 className="text-white font-semibold text-sm mb-2">À propos de la radio</h5>
                                    <p className="text-gray-300 text-xs leading-relaxed">
                                      {radioInfo.description || 'Radio électronique en boucle continue - Musique électronique 24h/24'}
                                    </p>
                                  </div>
                                  
                                  <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                                    <h5 className="text-white font-semibold text-sm mb-2">Caractéristiques</h5>
                                    <div className="space-y-1">
                                      <div className="flex items-center space-x-2 text-xs">
                                        <span className="text-cyan-400">✓</span>
                                        <span className="text-gray-300">Diffusion 24h/24</span>
                                      </div>
                                      <div className="flex items-center space-x-2 text-xs">
                                        <span className="text-purple-400">✓</span>
                                        <span className="text-gray-300">Qualité haute définition</span>
                                      </div>
                                      <div className="flex items-center space-x-2 text-xs">
                                        <span className="text-pink-400">✓</span>
                                        <span className="text-gray-300">Musique électronique</span>
                                      </div>
                                    </div>
                  </div>
                </div>
              </div>
            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center text-gray-400 py-6">
                          <div className="w-12 h-12 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Radio size={20} className="text-gray-500" />
                          </div>
                          <p className="text-sm font-medium mb-1">Aucune information disponible</p>
                          <p className="text-xs">La radio pourrait être temporairement indisponible</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
                      <AnimatedPlaysCounter
                        value={track.plays}
                        size="sm"
                        variant="minimal"
                        showIcon={false}
                        animation="slide"
                        className="text-gray-400"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <LikeButton
                        trackId={track._id}
                        initialLikesCount={track.likes || 0}
                        initialIsLiked={track.isLiked || false}
                        size="sm"
                        variant="minimal"
                        showCount={false}
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
                                    <LikeButton
                                      trackId={track._id}
                                      initialLikesCount={track.likes || 0}
                                      initialIsLiked={track.isLiked || false}
                                      size="sm"
                                      variant="card"
                                      showCount={true}
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
                            <AnimatedPlaysCounter
                              value={track.plays}
                              size="sm"
                              variant="minimal"
                              showIcon={false}
                              animation="slide"
                              className="text-gray-400"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <LikeButton
                              trackId={track._id}
                              initialLikesCount={track.likes || 0}
                              initialIsLiked={track.isLiked || false}
                              size="sm"
                              variant="minimal"
                              showCount={true}
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



      {/* Dialog Radio supprimé - remplacé par un dépliant intégré dans la section radio */}




      <BottomNav />
    </div>
  );
} 