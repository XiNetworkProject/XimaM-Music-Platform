'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useAudioPlayer } from './providers';
import { useBatchLikeSystem } from '@/hooks/useLikeSystem';
import { useBatchPlaysSystem } from '@/hooks/usePlaysSystem';
import LikeButton from '@/components/LikeButton';
import { AnimatedPlaysCounter } from '@/components/AnimatedCounter';
import { DiscoverPageSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/Skeletons';
import { applyCdnToTracks, applyCdnToUsers } from '@/lib/cdnHelpers';
import MeteoWidget from '@/components/MeteoWidget';

import SocialStats from '@/components/SocialStats';
import FollowButton from '@/components/FollowButton';
import Avatar from '@/components/Avatar';
import { 
    Play, Heart, Pause, Headphones, 
    Users, TrendingUp, Music,
    Sparkles, Crown, Radio, Mic2, Share2, 
    X, MessageCircle, LogIn, Cloud
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamicImport from 'next/dynamic';
const OnboardingChecklist = dynamicImport(() => import('@/components/OnboardingChecklist'), { ssr: false });

export const dynamic = 'force-dynamic';

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
const CACHE_DURATION = 30 * 1000; // 30 secondes (augmenté pour réduire les appels API)

export default function HomePage() {
  const { data: session } = useSession();
  const { user } = useAuth();
  const { audioState, setTracks, setCurrentTrackIndex, setIsPlaying, setShowPlayer, playTrack, pause, play } = useAudioPlayer();
  
  // Utiliser les nouveaux systèmes de likes et écoutes
  const { toggleLikeBatch } = useBatchLikeSystem();
  const { incrementPlaysBatch } = useBatchPlaysSystem();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [autoProgress, setAutoProgress] = useState(0);
  const [isCarouselInView, setIsCarouselInView] = useState(true);
  const rafRef = useRef<number | null>(null);
  const newSongsRef = useRef<HTMLDivElement>(null);
  const creatorsRef = useRef<HTMLDivElement>(null);


  const scrollNewSongs = useCallback((direction: 'left' | 'right') => {
    const el = newSongsRef.current;
    if (!el) return;
    const cardWidth = 172 + 12; // largeur de carte + interstice approx
    el.scrollBy({ left: (direction === 'left' ? -1 : 1) * cardWidth * 3, behavior: 'smooth' });
  }, []);

  const scrollCreators = useCallback((direction: 'left' | 'right') => {
    const el = creatorsRef.current;
    if (!el) return;
    const cardWidth = 192 + 16; // largeur de carte + interstice approx (w-48 = 192px + gap-4 = 16px)
    el.scrollBy({ left: (direction === 'left' ? -1 : 1) * cardWidth * 3, behavior: 'smooth' });
  }, []);

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
  const [collaborations, setCollaborations] = useState<Track[]>([]);
  
  // État pour la recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>({ tracks: [], artists: [], playlists: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('all');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // État pour les recommandations personnalisées
  const [personalRecommendations, setPersonalRecommendations] = useState<any[]>([]);
  
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



  // État pour la radio
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [radioInfo, setRadioInfo] = useState({
    name: 'Mixx Party Radio',
    description: 'Radio électronique en continu 24h/24',
    currentTrack: 'Mixx Party Radio',
    listeners: 0,
    bitrate: 128,
    quality: 'Standard',
    isLive: true,
    lastUpdate: new Date().toISOString()
  });





  // Obtenir la piste actuelle
  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  const featuredTracks = useMemo(() => categories.featured.tracks.slice(0, 5), [categories.featured.tracks]);
  // Pistes utilisées pour le carrousel héros: toujours les tendances
  const heroTracks = useMemo(() => categories.trending.tracks.slice(0, 5), [categories.trending.tracks]);
  // Listes For You et Trending uniques (sans doublons)
  const forYouList = useMemo(() => {
    const algo = (categories as any)?.forYou?.tracks || [];
    if (Array.isArray(algo) && algo.length > 0) return algo;
    return (dailyDiscoveries && dailyDiscoveries.length > 0 ? dailyDiscoveries : featuredTracks);
  }, [categories?.forYou?.tracks, dailyDiscoveries, featuredTracks]);
  const trendingUnique = useMemo(() => {
    const trendingList = (categories.trending.tracks || []);
    
    // Filtrage moins agressif : garder au minimum 6 pistes
    const forYouIds = new Set((forYouList || []).map((t: any) => t._id));
    const filtered = trendingList.filter((t: any) => !forYouIds.has(t._id));
    
    // Si après filtrage on a moins de 6 pistes, prendre les premières de la liste originale
    if (filtered.length < 6 && trendingList.length >= 6) {
      return trendingList.slice(0, 6);
    }
    
    return filtered.length > 0 ? filtered : trendingList;
  }, [categories.trending.tracks, forYouList]);
  // Slides statiques: 0 = Météo, 1 = Abonnements, 2 = IA
  const STATIC_SLIDES = 3;
  const totalSlides = useMemo(() => Math.max(1, heroTracks.length + STATIC_SLIDES), [heroTracks.length]);

  // Synchronisation temps réel pour les listes d'accueil
  useEffect(() => {
    const handler = (e: any) => {
      const { trackId, plays } = e.detail || {};
      if (!trackId || typeof plays !== 'number') return;
      setCategories(prev => {
        const next = { ...prev } as any;
        Object.keys(next).forEach((k) => {
          if (!next[k]?.tracks) return;
          next[k] = {
            ...next[k],
            tracks: next[k].tracks.map((t: any) => t._id === trackId ? { ...t, plays } : t)
          };
        });
        return next;
      });
      setDailyDiscoveries(prev => prev.map(t => t._id === trackId ? { ...t, plays } : t));
      setCollaborations(prev => prev.map(t => t._id === trackId ? { ...t, plays } : t));
    };
    window.addEventListener('playsUpdated', handler as EventListener);
    return () => window.removeEventListener('playsUpdated', handler as EventListener);
  }, []);

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
      const response = await fetch(`/api/tracks/${currentTrack._id}/plays`, { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } });
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
          // Erreur silencieuse
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
    // Vérifier le cache d'abord (sauf si force refresh)
    if (!forceRefresh) {
    const cached = dataCache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setCategories(prev => ({
        ...prev,
        [key]: { tracks: cached.tracks, loading: false, error: null }
      }));
        return; // Utiliser les données en cache
      }
    }

    try {
      setCategories(prev => ({
        ...prev,
        [key]: { ...prev[key], loading: true }
      }));

      // Ajouter un timestamp pour éviter le cache navigateur seulement si force refresh
      const urlWithTimestamp = forceRefresh ? `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}` : url;
      
      const response = await fetch(urlWithTimestamp, {
        headers: forceRefresh ? {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache'
        } : {}
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Vérifier que data.tracks existe et est un tableau
        if (!data.tracks || !Array.isArray(data.tracks)) {
          throw new Error('Format de réponse invalide');
        }
        
        // Appliquer le CDN et ajouter les likes
        const cdnTracks = applyCdnToTracks(data.tracks);
        const tracksWithLikes = cdnTracks.map((track: any) => ({
          ...track,
          likes: track.likes || 0,
          isLiked: false
        }));
    
        // Mettre en cache (mais les écoutes seront toujours récupérées fraîches)
        dataCache.set(key, { tracks: tracksWithLikes, timestamp: Date.now() });
        
        setCategories(prev => ({
          ...prev,
          [key]: { tracks: tracksWithLikes, loading: false, error: null }
        }));
      } else {
        throw new Error('Erreur de chargement');
      }
    } catch (error) {
      setCategories(prev => ({
        ...prev,
        [key]: { tracks: [], loading: false, error: 'Erreur de chargement' }
      }));
    }
  }, [user?.id]);

  // Fonction pour rafraîchir les écoutes de toutes les pistes
  const refreshAllPlays = useCallback(async () => {
    // Récupérer les écoutes fraîches pour toutes les pistes affichées
    const allTracks = Object.values(categories).flatMap(cat => cat.tracks);
    const uniqueTrackIds = Array.from(new Set(allTracks?.map(t => t._id) || []));
    
    const playsPromises = uniqueTrackIds?.map(async (trackId) => {
      try {
      const response = await fetch(`/api/tracks/${trackId}/plays`, { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } });
        if (response.ok) {
          const data = await response.json();
          return { trackId, plays: data.plays };
        }
      } catch (error) {
        // Erreur silencieuse pour éviter les logs
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


  // Fonction pour charger les collaborations
  const fetchCollaborations = useCallback(async () => {
    try {
      const response = await fetch('/api/tracks/popular?limit=6');
      if (response.ok) {
        const data = await response.json();
        
        // Vérifier que data.tracks existe et est un tableau
        if (!data.tracks || !Array.isArray(data.tracks)) {
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
        setSearchResults({ tracks: [], artists: [], playlists: [] });
      }
    } catch (error) {
      setSearchResults({ tracks: [], artists: [], playlists: [] });
    } finally {
      setSearchLoading(false);
    }
  }, []);


  // Fonction pour charger les recommandations personnalisées
  const fetchPersonalRecommendations = useCallback(async () => {
    if (!session) return;
    
    try {
      const response = await fetch('/api/recommendations/personal');
      if (response.ok) {
        const data = await response.json();
        
        // Vérifier que data.tracks existe et est un tableau
        if (!data.tracks || !Array.isArray(data.tracks)) {
          setPersonalRecommendations([]);
          return;
        }
        
        setPersonalRecommendations(data.tracks);
      }
    } catch (error) {
      // Erreur silencieuse
    }
  }, [session]);


  // Fonction pour charger toutes les catégories
  const fetchAllCategories = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    
    try {
      // Charger les données essentielles en premier (priorité)
      await Promise.all([
        fetchCategoryData('featured', '/api/tracks/featured?limit=5', forceRefresh),
        fetchCategoryData('forYou', '/api/ranking/feed?limit=50&ai=1', forceRefresh),
        fetchCategoryData('trending', '/api/tracks/trending?limit=50', forceRefresh), // Musiques les plus écoutées
        fetchCategoryData('popular', '/api/tracks/popular?limit=50', forceRefresh)
      ]);

      // Charger les données secondaires en parallèle
      await Promise.all([
        fetchCategoryData('recent', '/api/tracks/recent?limit=50', true), // Toujours forcer le refresh pour les nouvelles musiques
        fetchCategoryData('recommended', '/api/tracks/recommended?limit=50', forceRefresh),
        fetchCategoryData('following', '/api/tracks/following?limit=50', forceRefresh),
        fetchPopularUsers(),
        fetchDailyDiscoveries(),
      ]);

      // Charger les données optionnelles en arrière-plan
      setTimeout(() => {
        Promise.all([
        fetchCollaborations(),
        fetchPersonalRecommendations()
        ]).catch(() => {}); // Ignorer les erreurs pour les données optionnelles
      }, 1000);

    } catch (error) {
      // Erreur silencieuse
    } finally {
      setLoading(false);
    }
  }, [fetchCategoryData, fetchPopularUsers, fetchDailyDiscoveries, fetchCollaborations, fetchPersonalRecommendations]);

  // Charger toutes les catégories au montage
  useEffect(() => {
    fetchAllCategories();
  }, [fetchAllCategories]);

  // Rafraîchir automatiquement les nouvelles musiques toutes les 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCategoryData('recent', '/api/tracks/recent?limit=50', true);
    }, 120000); // Toutes les 2 minutes
    
    return () => clearInterval(interval);
  }, [fetchCategoryData]);

  // Détecter si on vient d'un upload et forcer le rechargement
  useEffect(() => {
    const isFromUpload = sessionStorage.getItem('fromUpload');
    if (isFromUpload === 'true') {
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
      { key: 'forYou', url: '/api/ranking/feed?limit=50&ai=1', forceRefresh: false },
      { key: 'trending', url: '/api/tracks/trending?limit=50', forceRefresh: false }, // Musiques les plus écoutées
      { key: 'popular', url: '/api/tracks/popular?limit=50', forceRefresh: false },
      { key: 'recent', url: '/api/tracks/recent?limit=50', forceRefresh: true }, // Toujours forcer le refresh pour les nouvelles musiques
      { key: 'recommended', url: '/api/tracks/recommended?limit=50', forceRefresh: false },
      { key: 'following', url: '/api/tracks/following?limit=50', forceRefresh: false }
    ];

    await Promise.all(categoryApis.map(({ key, url, forceRefresh }) => fetchCategoryData(key, url, forceRefresh)));
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
    if (!isAutoPlaying || !isCarouselInView || totalSlides === 0) {
      // Arrêter l'animation si les conditions ne sont pas remplies
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setAutoProgress(0);
      return;
    }
    
    let start: number | null = null;
    // Allonger la visibilité des diapositives statiques (météo, abonnements, IA)
    const isPromo = currentSlide < STATIC_SLIDES;
    const durationMs = isPromo ? 14000 : 8000;

    const step = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(100, (elapsed / durationMs) * 100);
      setAutoProgress(progress);
      if (elapsed >= durationMs) {
        setCurrentSlide((prev) => (prev + 1) % Math.max(1, totalSlides));
        start = ts;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    
    rafRef.current = requestAnimationFrame(step);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setAutoProgress(0);
    };
  }, [isAutoPlaying, isCarouselInView, totalSlides, STATIC_SLIDES]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % Math.max(1, totalSlides));
    setIsAutoPlaying(false);
    setAutoProgress(0);
    // Arrêter l'animation
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    const n = Math.max(1, totalSlides);
    setCurrentSlide((prev) => (prev - 1 + n) % n);
    setIsAutoPlaying(false);
    setAutoProgress(0);
  }, [totalSlides]);

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
      // Erreur silencieuse
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
      // Erreur silencieuse
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
      return streamUrl;
    } catch (error) {
      return 'https://rocket.streamradio.fr/stream/mixxparty'; // URL de fallback
    }
  };

  // Fonction pour récupérer les métadonnées du flux radio via notre API
  const fetchRadioMetadata = async () => {
    try {
      const response = await fetch('/api/radio/status', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          const radioData = result.data;
          
          // Mettre à jour les infos radio avec les vraies métadonnées
          setRadioInfo(prev => ({
            ...prev,
            name: radioData.name,
            description: radioData.description,
            currentTrack: radioData.currentTrack.title,
            listeners: radioData.stats.listeners,
            bitrate: radioData.stats.bitrate,
            quality: radioData.stats.quality,
            isLive: radioData.isOnline,
            lastUpdate: radioData.lastUpdate
          }));
          
          // Mettre à jour le titre dans le player si la radio joue
          if (currentTrack?._id === 'radio-mixx-party' && audioState.isPlaying) {
            const updatedTracks = audioState.tracks.map(track => 
              track._id === 'radio-mixx-party' 
                ? { 
                    ...track, 
                    title: radioData.currentTrack.title,
                    artist: {
                      ...track.artist,
                      name: radioData.currentTrack.artist
                    }
                  }
                : track
            );
            setTracks(updatedTracks);
          }
          
          // Métadonnées radio mises à jour
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      
      // En cas d'erreur, utiliser les infos par défaut
      setRadioInfo(prev => ({
        ...prev,
        currentTrack: 'Mixx Party Radio',
        listeners: 1247,
        bitrate: 128,
        quality: 'Standard',
        isLive: true,
        lastUpdate: new Date().toISOString()
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
      // injecter f_auto,q_auto si manquant
      try {
        const u = new URL(url);
        if (/\/upload\//.test(u.pathname) && !/f_auto|q_auto/.test(u.pathname)) {
          return url.replace('/upload/', '/upload/f_auto,q_auto/');
        }
      } catch {}
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
      setRealTimeStats(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }));
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
        
          } catch (error) {
      // Erreur silencieuse
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
    // Mise à jour toutes les 30 secondes, même si la radio n'est pas en cours de lecture
    const interval = setInterval(() => {
      fetchRadioMetadata();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <DiscoverPageSkeleton />;
  }


  // Index et piste courante pour les slides dynamiques (après les 3 slides statiques)
  const heroIndex = currentSlide - STATIC_SLIDES;
  const heroTrack = heroIndex >= 0 && heroIndex < heroTracks.length ? heroTracks[heroIndex] : null;

  return (
    <div className="text-white pt-0 pb-20 lg:pb-4 overflow-x-hidden w-full">
        <div className="w-full max-w-none sm:max-w-7xl sm:mx-auto px-2 sm:px-4 md:px-6">
        {/* Onboarding simple (3 étapes) - seulement si connecté */}
        {session && <OnboardingChecklist />}
        
        {/* Bannière connexion pour utilisateurs non connectés */}
        {!session && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <LogIn className="w-5 h-5 text-blue-400" />
            </div>
                <div>
                  <h3 className="font-semibold text-white">Accès limité</h3>
                  <p className="text-sm text-white/70">Connectez-vous pour accéder à toutes les fonctionnalités</p>
          </div>
        </div>
              <Link 
                href="/auth/signin"
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium"
              >
                Se connecter
              </Link>
            </div>
          </div>
        )}
        <div className="panel-suno border border-[var(--border)] rounded-2xl p-2 md:p-4">
      {/* Banderoles fines et élégantes */}
      <div className="relative z-20">

        
      </div>

      {/* Zone transparente pour le carrousel */}
      <div className="relative bg-transparent" style={{ background: 'transparent !important' }}>
        {/* Carrousel Hero - Design futuriste complet */}
        {totalSlides > 0 && (
          <div className="relative w-full h-[40vh] sm:h-[48vh] min-h-[240px] sm:min-h-[260px] max-h-[320px] sm:max-h-[420px] overflow-hidden panel-suno border border-[var(--border)] rounded-xl sm:rounded-2xl">
            {/* Fond dynamique avec particules */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-pink-900/20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(110,86,207,0.12),transparent_55%)]"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(240,147,251,0.10),transparent_55%)]"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(0,211,167,0.10),transparent_55%)]"></div>
          </div>



            <div
              key={currentSlide}
              className="relative w-full h-full flex items-center justify-center animate-fade-in"
            >
                {/* Image de fond avec effet parallax et overlay */}
                <div className="absolute inset-0 overflow-hidden">
                  {currentSlide === 0 ? (
                    // Slide Météo (Alertemps)
                  <img
                      src={'/meteocaroussel.webp'}
                      alt={'Météo Alertemps sur Synaura'}
                      className="w-full h-full object-cover"
                      loading="eager"
                      onError={(e) => { e.currentTarget.src = '/default-cover.jpg'; }}
                    />
                  ) : currentSlide === 1 ? (
                    // Slide Abonnements
                    <img
                      src={'/fe904850-2547-4e2e-8cc3-085a7704488b.webp'}
                      alt={'Abonnements Synaura'}
                      className="w-full h-full object-cover"
                      loading="eager"
                      onError={(e) => { e.currentTarget.src = '/default-cover.jpg'; }}
                    />
                  ) : currentSlide === 2 ? (
                    // Slide IA
                    <img
                      src={'/DALL·E 2025-09-26 23.14.53 - A minimalist, abstract landscape-format illustration symbolizing AI-generated music. The image features a stylized humanoid head made of flowing digit.webp'}
                      alt={'Générateur de Musique IA'}
                      className="w-full h-full object-cover"
                      loading="eager"
                      onError={(e) => { e.currentTarget.src = '/default-cover.jpg'; }}
                    />
                  ) : (
                    <img
                      src={getValidImageUrl(heroTrack?.coverUrl, '/default-cover.jpg')}
                      alt={heroTrack?.title || 'Titre'}
                      className="w-full h-full object-cover"
                      loading="eager"
                      onError={(e) => { e.currentTarget.src = '/default-cover.jpg'; }}
                    />
                  )}
                  
                  {/* Overlay gradient complexe */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]"></div>
                  </div>

                {/* Contenu principal centré */}
                <div className="relative z-10 text-center px-4 sm:px-8 max-w-4xl mx-auto">
                  {/* Badge de statut */}
                      <div
                    className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md border border-[var(--border)] rounded-full animate-slide-up text-[var(--text)]"
                  >
                    <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
                    {currentSlide === 0 ? (
                      <span className="text-[var(--text)] text-sm font-medium">Bulletin météo</span>
                    ) : currentSlide === 1 ? (
                      <span className="text-[var(--text)] text-sm font-medium">Offre Premium</span>
                    ) : currentSlide === 2 ? (
                      <span className="text-[var(--text)] text-sm font-medium">IA Musicale</span>
                    ) : (
                      <>
                        <span className="text-[var(--text)] text-sm font-medium">En vedette</span>
                    <TrendingUp size={14} className="text-purple-400" />
                      </>
                    )}
                  </div>

                  {/* Badges secondaires */}
                  <div className="flex items-center justify-center gap-3 mb-6 animate-slide-up">
                    {currentSlide === 0 ? (
                      <>
                        <span className="px-3 py-1.5 text-sm rounded-full border border-[var(--border)] bg-blue-500/15 backdrop-blur-md text-blue-200 font-medium">
                          Alertemps
                      </span>
                        <span className="px-3 py-1.5 text-sm rounded-full border border-[var(--border)] bg-blue-500/15 backdrop-blur-md text-blue-200 font-medium">
                          Bulletin hebdomadaire
                        </span>
                        <span className="px-3 py-1.5 text-sm rounded-full border border-[var(--border)] bg-blue-500/15 backdrop-blur-md text-blue-200 font-medium">
                          Cartes haute résolution
                        </span>
                      </>
                    ) : currentSlide === 2 ? (
                      <>
                        <span className="px-3 py-1.5 text-sm rounded-full border border-[var(--border)] bg-[var(--surface-2)] backdrop-blur-md text-[var(--text)] font-medium">
                          Génération IA
                      </span>
                        <span className="px-3 py-1.5 text-sm rounded-full border border-[var(--border)] bg-[var(--surface-2)] backdrop-blur-md text-[var(--text)] font-medium">
                          Modèles V4.5, V4.5+, V5
                        </span>
                        <span className="px-3 py-1.5 text-sm rounded-full border border-[var(--border)] bg-[var(--surface-2)] backdrop-blur-md text-[var(--text)] font-medium">
                          Gratuit
                        </span>
                      </>
                    ) : currentSlide >= STATIC_SLIDES && Array.isArray(heroTrack?.genre) && ((heroTrack?.genre?.length || 0) > 0) ? (
                      <>
                        <span className="px-3 py-1.5 text-sm rounded-full border border-[var(--border)] bg-[var(--surface-2)] backdrop-blur-md text-[var(--text)] font-medium">
                          {heroTrack?.genre?.[0]}
                        </span>
                        {heroTrack?.createdAt && (
                          <span className="px-3 py-1.5 text-sm rounded-full border border-[var(--border)] bg-[var(--surface-2)] backdrop-blur-md text-[var(--text)] font-medium">
                            {formatDate(heroTrack?.createdAt)}
                      </span>
                    )}
                        <span className="px-3 py-1.5 text-sm rounded-full border border-[var(--border)] bg-[var(--surface-2)] backdrop-blur-md text-[var(--text)] font-medium">
                          {formatDuration(heroTrack?.duration || 0)}
                    </span>
                      </>
                    ) : null}
                        </div>

                  {/* Titre principal */}
                        <h1
                    className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-[var(--text)] mb-3 sm:mb-4 leading-tight cursor-pointer hover:text-purple-300 transition-all duration-500 animate-slide-up title-suno"
                    style={{
                      textShadow: '0 0 30px rgba(168, 85, 247, 0.5), 0 0 60px rgba(236, 72, 153, 0.3)'
                    }}
                        >
                          {currentSlide === 0 ? 'Météo Alertemps sur Synaura' : currentSlide === 1 ? 'Débloquez tout Synaura' : currentSlide === 2 ? 'Générateur de Musique IA' : heroTracks[currentSlide-STATIC_SLIDES].title}
                        </h1>

                  {/* Artiste avec avatar */}
                  {currentSlide >= STATIC_SLIDES && (
                    <div className="flex items-center justify-center gap-3 mb-4 animate-slide-up">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30 shadow-lg">
                        <img
                          src={heroTrack?.artist?.avatar || '/default-avatar.png'}
                          alt={heroTrack?.artist?.name}
                        className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
                              />
                            </div>
                    <div className="text-left">
                        <p className="text-[var(--text-muted)] text-lg font-medium">par</p>
                        <h3 className="text-2xl font-bold text-[var(--text)] hover:text-purple-300 transition-colors cursor-pointer">
                          {heroTrack?.artist?.name || heroTrack?.artist?.username || 'Artiste inconnu'}
                      </h3>
                          </div>
                        </div>
                  )}
                  
                  {/* Description pour IA */}
                  {currentSlide === 2 && (
                    <div className="text-center mb-4 animate-slide-up">
                      <p className="text-[var(--text-muted)] text-lg font-medium">
                        Créez de la musique unique avec l'intelligence artificielle
                      </p>
                    </div>
                  )}

                  {/* Boutons d'action principaux */}
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4 animate-slide-up">
                    {/* Bouton Play principal */}
                          {currentSlide === 0 ? (
                          <button
                              onClick={() => router.push('/meteo', { scroll: false })}
                              className="group relative flex items-center space-x-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-xl hover:scale-105 active:scale-95"
                              aria-label="Voir la météo"
                            >
                              <Cloud size={18} />
                              <span>Voir la météo</span>
                            </button>
                          ) : currentSlide === 1 ? (
                          <button
                              onClick={() => router.push('/subscriptions', { scroll: false })}
                              className="group relative flex items-center space-x-2 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-xl hover:scale-105 active:scale-95"
                              aria-label="Voir les abonnements"
                            >
                              <Crown size={18} />
                              <span>Débloquer toutes les fonctionnalités</span>
                            </button>
                          ) : currentSlide === 2 ? (
                            <button
                              onClick={() => router.push('/ai-generator', { scroll: false })}
                              className="group relative flex items-center space-x-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-xl hover:scale-105 active:scale-95"
                              aria-label="Générer de la musique IA"
                            >
                              <Sparkles size={18} />
                              <span>Générer de la musique IA</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => heroTrack && handlePlayTrack(heroTrack)}
                      className="group relative flex items-center space-x-2 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-sm hover:from-purple-700 hover:via-pink-700 hover:to-purple-800 transition-all duration-300 shadow-xl hover:shadow-purple-500/40 hover:scale-105 active:scale-95"
                      aria-label={heroTrack && currentTrack?._id === heroTrack._id && audioState.isPlaying ? 'Mettre en pause' : 'Lire la piste'}
                          >
                      {/* Effet de lueur */}
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                      
                      <div className="relative flex items-center space-x-3">
                            {heroTrack && currentTrack?._id === heroTrack._id && audioState.isPlaying ? (
                          <Pause size={18} />
                            ) : (
                          <Play size={18} className="ml-0.5" />
                            )}
                            <span>
                              {heroTrack && currentTrack?._id === heroTrack._id && audioState.isPlaying ? 'Pause' : 'Écouter'}
                            </span>
                      </div>
                          </button>) }

                        </div>

                </div>
              </div>

            {/* Barre de progression autoplay moderne */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-6 w-44 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden backdrop-blur-md border border-[var(--border)]/60">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${autoProgress}%` }}
              />
            </div>

            {/* Indicateurs centraux simplifiés */}
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-20">
              <div className="flex items-center space-x-1.5">
                  {Array.from({ length: totalSlides }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 hover:scale-130 active:scale-80 ${
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
            <div className="absolute top-3 right-3 z-20">
                <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="group relative w-9 h-9 bg-[var(--surface-2)] backdrop-blur-md rounded-lg flex items-center justify-center hover:bg-[var(--surface-3)] transition-all duration-300 border border-[var(--border)] shadow-lg hover:scale-110 active:scale-90"
                aria-label={isAutoPlaying ? 'Arrêter l\'autoplay' : 'Démarrer l\'autoplay'}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {isAutoPlaying ? (
                  <Pause size={14} className="relative text-white" />
                ) : (
                  <Play size={14} className="relative text-white ml-0.5" />
                )}
                </button>
              </div>
            </div>
      )}
      </div>




      {/* Section type Suno: colonnes For You / Suggested Creators / Trending */}
      <div className="opacity-100" style={{ transform: 'none' }}>
        <div className="flex flex-col gap-4 mt-4 pb-4 w-full max-w-full overflow-hidden">
          <div className="flex flex-row items-center justify-start gap-2">
            <div className="flex-1" />
          </div>

          <div className="relative flex-1 overflow-hidden">
            <div className="w-full">
              <div>
                <div className="flex flex-col gap-4 w-full max-w-full overflow-hidden sm:grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {/* Colonne 1: For You */}
                  <div className="w-full max-w-full overflow-hidden">
                    <div className="flex min-h-96 flex-col gap-3 text-[var(--text)]">
                      <div className="flex flex-row justify-between items-center">
                        <button
                          onClick={() => router.push('/for-you', { scroll: false })}
                          className="flex cursor-pointer flex-row items-center hover:underline"
                        >
                          <div className="font-sans font-semibold text-[20px] leading-[24px] line-clamp-1">Pour toi</div>
                          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 pt-0.5 text-[var(--text-muted)]">
                            <path d="m13.902 11.702-3.9-3.9a.99.99 0 1 1 1.4-1.4l4.593 4.593a1 1 0 0 1 0 1.414l-4.593 4.593a.99.99 0 1 1-1.4-1.4z" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex flex-col gap-1">
                        {forYouList
                          ?.slice(0, 6)
                          .map((track) => (
                            <div
                              key={track._id}
                              className="group flex w-full flex-row items-center justify-between rounded-lg p-2 transition-colors duration-150 hover:bg-[var(--surface-2)] focus-within:bg-[var(--surface-2)]"
                              data-media-playing={currentTrack?._id === track._id && audioState.isPlaying ? 'true' : 'false'}
                            >
                              <div className="flex w-full min-w-0 flex-row items-center gap-2">
                                <button
                                  className="group relative shrink-0"
                                  aria-label="Play"
                                  onClick={() => handlePlayTrack(track)}
                                >
                                  <div className="h-16 w-12 rounded-lg overflow-hidden bg-[var(--surface-2)] border border-[var(--border)]">
                                    <div className="relative h-full w-full">
                                      <img
                                        alt={track.title || 'Cover'}
                                        src={track.coverUrl || '/default-cover.jpg'}
                                        className="absolute inset-0 h-full w-full object-cover"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg';
                                        }}
                                      />
                                      {String(track._id || '').startsWith('ai-') && (
                                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-600/90 text-white border border-white/10">
                                          IA
                                        </span>
                                      )}
                </div>
                </div>
                                  <div className="absolute inset-0 flex items-center justify-center rounded-lg transition-colors duration-150 text-[var(--text)] bg-transparent">
                                    {currentTrack?._id === track._id && audioState.isPlaying ? (
                                      <Pause size={18} />
                                    ) : (
                                      <Play size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
              </div>
                                </button>

                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                  <div className="flex flex-row items-start justify-stretch gap-1 px-1">
                                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                                      <div className="flex flex-row items-center justify-start gap-2">
                                        <div title={track.title} className="font-sans font-medium text-[16px] leading-[16px] cursor-pointer text-[var(--text)] hover:underline min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">
                                          {track.title || 'Titre inconnu'}
              </div>
                                      </div>
                                      <div className="flex flex-row justify-between gap-1 flex-col items-start">
                                        <div className="gap-2 break-all font-sans font-normal text-[14px] leading-[16px] line-clamp-1 text-[var(--text-muted)]">
                                          {Array.isArray(track.genre) && track.genre.length > 0 && (
                                            <div>{track.genre.slice(0, 6).join(', ')}</div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="-mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Colonne 2: Suggested Creators */}
                  <div className="w-full max-w-full overflow-hidden">
                    <div className="flex min-h-96 flex-col gap-3 text-[var(--text)]">
                      <div className="flex flex-row justify-between items-center">
                        <div className="font-sans font-semibold text-[20px] leading-[24px] line-clamp-1">Créateurs suggérés</div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {(popularUsers || [])?.slice(0, 6).map((user) => (
                          <div key={user._id || user.id} className="group flex w-full flex-row items-center rounded-lg p-2 transition-colors duration-150 hover:bg-[var(--surface-2)]">
                            <div className="flex min-w-0 flex-1 flex-row gap-3 items-center">
                              <button onClick={() => router.push(`/profile/${user.username}`, { scroll: false })} className="shrink-0">
                                <Avatar
                                  src={(user.avatar || '').replace('/upload/','/upload/f_auto,q_auto/') || null}
                                  name={user.name}
                                  username={user.username}
                                  size="lg"
                                  className="h-16 w-16"
                                />
                              </button>
                              <div className="flex min-w-0 flex-col justify-center gap-1">
                                <button onClick={() => router.push(`/profile/${user.username}`, { scroll: false })} className="flex flex-row items-center gap-2">
                                  <div className="font-sans font-medium text-[16px] leading-[16px] line-clamp-1 cursor-pointer text-[var(--text)] hover:underline">{user.name || user.username}</div>
                                </button>
                                <div className="font-sans font-normal text-[14px] leading-[16px] line-clamp-1 text-[var(--text-muted)]">{(user.followerCount || 0).toLocaleString()} abonnés</div>
                                <div className="font-sans font-normal text-[14px] leading-[16px] line-clamp-1 text-[var(--text-muted)]">@{user.username} · Suggested</div>
                </div>
              </div>
              <FollowButton 
                artistId={user._id || user.id}
                artistUsername={user.username}
                size="sm"
                className="border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-3)]"
              />
                          </div>
                        ))}
                      </div>
                    </div>
            </div>
            
                  {/* Colonne 3: Trending - Musiques les plus écoutées */}
                  <div className="w-full max-w-full overflow-hidden">
                    <div className="flex min-h-96 flex-col gap-3 text-[var(--text)]">
                      <div className="flex flex-row justify-between items-center">
              <button
                          onClick={() => router.push('/trending', { scroll: false })}
                          className="flex cursor-pointer flex-row items-center hover:underline"
              >
                          <div className="font-sans font-semibold text-[20px] leading-[24px] line-clamp-1">Les plus écoutées</div>
                          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 pt-0.5 text-[var(--text-muted)]">
                            <path d="m13.902 11.702-3.9-3.9a.99.99 0 1 1 1.4-1.4l4.593 4.593a1 1 0 0 1 0 1.414l-4.593 4.593a.99.99 0 1 1-1.4-1.4z" />
                          </svg>
              </button>
            </div>
                      <div className="flex flex-col gap-1">
                        {trendingUnique
                          ?.slice(0, 6)
                          .map((track) => (
                            <div
                              key={track._id}
                              className="group flex w-full flex-row items-center justify-between rounded-lg p-2 transition-colors duration-150 hover:bg-[var(--surface-2)] focus-within:bg-[var(--surface-2)]"
                            >
                              <div className="flex w-full min-w-0 flex-row items-center gap-2">
                                <button
                                  className="group relative shrink-0"
                                  aria-label="Play"
                                  onClick={() => handlePlayTrack(track)}
                                >
                                  <div className="h-16 w-12 rounded-lg overflow-hidden bg-[var(--surface-2)] border border-[var(--border)]">
                                    <div className="relative h-full w-full">
                                      <img
                                        alt={track.title || 'Cover'}
                                        src={track.coverUrl || '/default-cover.jpg'}
                                        className="absolute inset-0 h-full w-full object-cover"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg';
                                        }}
                                      />
                                      {String(track._id || '').startsWith('ai-') && (
                                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-600/90 text-white border border-white/10">
                                          IA
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="absolute inset-0 flex items-center justify-center rounded-lg transition-colors duration-150 text-[var(--text)] bg-transparent">
                                    {currentTrack?._id === track._id && audioState.isPlaying ? (
                                      <Pause size={18} />
                                    ) : (
                                      <Play size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                  </div>
                                </button>

                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                  <div className="flex flex-row items-start justify-stretch gap-1 px-1">
                                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                                      <div className="flex flex-row items-center justify-start gap-2">
                                        <div title={track.title} className="font-sans font-medium text-[16px] leading-[16px] cursor-pointer text-[var(--text)] hover:underline min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">
                                          {track.title || 'Titre inconnu'}
                                        </div>
                                      </div>
                                      <div className="flex flex-row justify-between gap-1 flex-col items-start">
                                        <div className="gap-2 break-all font-sans font-normal text-[14px] leading-[16px] line-clamp-1 text-[var(--text-muted)]">
                                          {Array.isArray(track.genre) && track.genre.length > 0 && (
                                            <div>{track.genre.slice(0, 6).join(', ')}</div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Songs - Carrousel horizontal inspiré Suno */}
      {categories.recent?.tracks?.length > 0 && (
        <section className="w-full max-w-none sm:max-w-7xl sm:mx-auto px-2 sm:px-4 md:px-6">
          <div className="h-full w-full overflow-hidden">
            <div className="mb-2 flex w-full flex-row justify-between pb-2">
              <div className="flex items-center gap-4">
                <h2 className="font-sans font-semibold text-[20px] leading-[24px] pb-2 text-[var(--text)]">New Songs</h2>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <button aria-label="Scroll left" onClick={() => scrollNewSongs('left')} className="relative inline-block font-sans font-medium text-center select-none text-[15px] leading-[24px] rounded-full aspect-square p-2 text-[var(--text)] bg-[var(--surface-2)] hover:before:bg-[var(--surface-3)] before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-[var(--border)] before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75">
                  <span className="relative flex flex-row items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="text-current shrink-0 w-4 h-4 m-1"><path d="m9.398 12.005 6.194-6.193q.315-.316.305-.748a1.06 1.06 0 0 0-.326-.748Q15.255 4 14.823 4t-.748.316l-6.467 6.488a1.7 1.7 0 0 0-.38.57 1.7 1.7 0 0 0-.126.631q0 .315.127.632.126.315.379.569l6.488 6.488q.316.316.738.306a1.05 1.05 0 0 0 .737-.327q.316-.316.316-.748t-.316-.748z"/></svg>
                  </span>
                </button>
                <button aria-label="Scroll right" onClick={() => scrollNewSongs('right')} className="relative inline-block font-sans font-medium text-center select-none text-[15px] leading-[24px] rounded-full aspect-square p-2 text-[var(--text)] bg-[var(--surface-2)] hover:before:bg-[var(--surface-3)] before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-[var(--border)] before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75">
                  <span className="relative flex flex-row items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="text-current shrink-0 w-4 h-4 m-1"><path d="M14.602 12.005 8.407 5.812a.99.99 0 0 1-.305-.748q.01-.432.326-.748T9.177 4t.748.316l6.467 6.488q.253.253.38.57.126.315.126.631 0 .315-.127.632-.126.315-.379.569l-6.488 6.488a.97.97 0 0 1-.738.306 1.05 1.05 0 0 1-.737-.327q-.316-.316-.316-.748t.316-.748z"/></svg>
                  </span>
                </button>
              </div>
            </div>
            <div className="relative w-full overflow-hidden" style={{ height: '20rem' }}>
              <div className="h-full w-full overflow-hidden [mask-image:linear-gradient(to_right,black,black_90%,transparent)] [mask-size:100%_100%] transition-[mask-image] duration-500">
                <section className="flex h-auto w-full overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-3 px-1" ref={newSongsRef}>
                  {categories.recent.tracks.map((track) => (
                    <div key={track._id} className="relative flex w-[140px] sm:w-[172px] shrink-0 cursor-pointer flex-col" onClick={() => handlePlayTrack(track)}>
                      <div className="relative mb-4 cursor-pointer">
                        <div className="relative h-[200px] sm:h-[256px] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
                          <img alt={track.title} src={(track.coverUrl || '/default-cover.jpg').replace('/upload/','/upload/f_auto,q_auto/')} className="absolute inset-0 h-full w-full rounded-xl object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'; }} loading="lazy" decoding="async" />
                          {String(track._id || '').startsWith('ai-') && (
                            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-600/90 text-white border border-white/10">IA</span>
                          )}
                          <div className="absolute inset-0 z-20">
                            <button className="flex items-center justify-center h-14 w-14 rounded-full p-4 bg-[var(--surface-2)]/60 backdrop-blur-xl border border-[var(--border)] outline-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform duration-300">
                              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-[var(--text)]"><path d="M6 18.705V5.294q0-.55.415-.923Q6.829 4 7.383 4q.173 0 .363.049.189.048.363.145L19.378 10.9a1.285 1.285 0 0 1 0 2.202l-11.27 6.705a1.5 1.5 0 0 1-.725.194q-.554 0-.968-.372A1.19 1.19 0 0 1 6 18.704"/></svg>
                            </button>
                            <div className="absolute inset-x-2 top-2 flex flex-row items-center gap-1">
                              <div className="flex-row items-center gap-1 rounded-md px-2 py-1 font-sans font-semibold text-[12px] leading-snug backdrop-blur-lg bg-clip-padding border border-[var(--border)] text-[var(--text)] bg-black/30 inline-flex w-auto">
                                <div>{formatDuration(track.duration)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex w-full flex-col">
                        <div className="line-clamp-1 w-full font-sans text-base font-medium text-[var(--text)] hover:underline leading-[24px] flex items-center justify-between">
                          <div className="min-w-0 flex-1 overflow-hidden text-ellipsis" title={track.title}>{track.title || 'Titre inconnu'}</div>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[12px] text-[var(--text-muted)]">
                          <div className="flex items-center gap-[2px]">
                            <Headphones size={12} />
                            <span className="text-[12px] leading-4 font-medium">{formatNumber(track.plays)}</span>
                          </div>
                          <div className="flex items-center gap-[2px]">
                            <Heart size={12} />
                            <span className="text-[12px] leading-4 font-medium">{formatNumber(track.likes || 0)}</span>
                          </div>
                          <div className="flex items-center gap-[2px]">
                            <MessageCircle size={12} />
                            <span className="text-[12px] leading-4 font-medium">{track.comments?.length || 0}</span>
                          </div>
                        </div>
                        <div className="mt-1 flex w-full items-center justify-between">
                          <div className="flex w-fit flex-row items-center gap-2 font-sans text-sm font-medium text-[var(--text)]">
                            <div className="relative h-8 shrink-0 aspect-square">
                              <img alt="Profile avatar" src={(track.artist?.avatar || '/default-avatar.png').replace('/upload/','/upload/f_auto,q_auto/')} className="rounded-full h-full w-full object-cover p-1" loading="lazy" decoding="async" />
                            </div>
                            <span className="line-clamp-1 max-w-fit break-all" title={track.artist?.name || track.artist?.username || 'Artiste inconnu'}>
                              {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </section>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Sections de catégories améliorées */}
      <div className="py-6 space-y-12">

        {/* Créateurs suggérés - Style carrousel Synaura */}
        <section className="w-full max-w-none sm:max-w-7xl sm:mx-auto px-2 sm:px-4 md:px-6">
          <div className="h-full w-full overflow-hidden animate-fade-in">
            <div className="mb-2 flex w-full flex-row justify-between pb-2">
              <div className="flex items-center gap-4">
                <h2 className="font-sans font-semibold text-[20px] leading-[24px] pb-2 text-[var(--text)]">Créateurs que vous pourriez aimer</h2>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <button aria-label="Scroll left" onClick={() => scrollCreators('left')} className="relative inline-block font-sans font-medium text-center select-none text-[15px] leading-[24px] rounded-full aspect-square p-2 text-[var(--text)] bg-[var(--surface-2)] hover:before:bg-[var(--surface-3)] before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-[var(--border)] before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75">
                  <span className="relative flex flex-row items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="text-current shrink-0 w-4 h-4 m-1"><path d="m9.398 12.005 6.194-6.193q.315-.316.305-.748a1.06 1.06 0 0 0-.326-.748Q15.255 4 14.823 4t-.748.316l-6.467 6.488a1.7 1.7 0 0 0-.38.57 1.7 1.7 0 0 0-.126.631q0 .315.127.632.126.315.379.569l6.488 6.488q.316.316.738.306a1.05 1.05 0 0 0 .737-.327q.316-.316.316-.748t-.316-.748z"/></svg>
                  </span>
                </button>
                <button aria-label="Scroll right" onClick={() => scrollCreators('right')} className="relative inline-block font-sans font-medium text-center select-none text-[15px] leading-[24px] rounded-full aspect-square p-2 text-[var(--text)] bg-[var(--surface-2)] hover:before:bg-[var(--surface-3)] before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-[var(--border)] before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75">
                  <span className="relative flex flex-row items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="text-current shrink-0 w-4 h-4 m-1"><path d="M14.602 12.005 8.407 5.812a.99.99 0 0 1-.305-.748q.01-.432.326-.748T9.177 4t.748.316l6.467 6.488q.253.253.38.57.126.315.126.631 0 .315-.127.632-.126.315-.379.569l-6.488 6.488a.97.97 0 0 1-.738.306 1.05 1.05 0 0 1-.737-.327q-.316-.316-.316-.748t.316-.748z"/></svg>
                  </span>
                </button>
              </div>
            </div>
            {usersLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-primary)]"></div>
              </div>
            ) : (
              <div className="relative w-full overflow-hidden" style={{ height: '20.5rem' }}>
                <div className="h-full w-full overflow-hidden [mask-image:linear-gradient(to_right,black,black_85%,transparent)] [mask-size:100%_100%] transition-[mask-image] duration-500">
                  <section className="flex h-auto w-full overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-4 px-1" ref={creatorsRef}>
                {popularUsers?.slice(0, 6).map((user, index) => (
                      <div key={user._id || user.id || index} className="relative flex h-fit w-48 shrink-0 cursor-pointer flex-col gap-4 rounded-lg p-4 transition ease-in-out hover:bg-[var(--surface-2)]/60 border border-transparent hover:border-[var(--border)]"
                        title={user.name || user.username}
                    onClick={() => router.push(`/profile/${user.username}`, { scroll: false })}
                        aria-label={`Créateur : ${user.name || user.username}`}
                  >
                      <Avatar
                        src={user.avatar}
                        name={user.name}
                        username={user.username}
                        size="2xl"
                        className="aspect-square h-auto w-full"
                      />
                        <div className="flex h-fit w-full flex-col">
                          <h3 className="overflow-hidden font-sans text-lg font-semibold text-ellipsis whitespace-nowrap text-[var(--text)]">{user.name || user.username}</h3>
                          <span className="line-clamp-1 font-sans text-sm font-normal text-[var(--text-muted)]">@{user.username}</span>
                          <span className="font-mono text-sm text-[var(--text-muted)]">{formatNumber((user.followerCount || 0))} abonnés</span>
                    </div>
                  </div>
                ))}
                  </section>
                </div>
              </div>
            )}
          </div>
        </section>



        {/* Section Radio Mixx Party - Version Améliorée */}
        <section id="radio" className="w-full max-w-none sm:max-w-7xl sm:mx-auto px-2 sm:px-4 md:px-6 py-4">
          <div className="relative animate-fade-in">
            {/* En-tête avec badge animé */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-2 bg-gradient-to-r from-cyan-500/15 to-purple-500/15 backdrop-blur-md border border-cyan-500/25 rounded-full">
                <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-pulse"></div>
                <span className="text-cyan-200 text-sm font-medium">EN DIRECT</span>
                <Radio size={14} className="text-cyan-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Mixx Party Radio
              </h2>
              <p className="text-gray-300 text-sm md:text-base">La radio électronique qui pulse 24h/24</p>
            </div>
            
            {/* Carte principale avec design amélioré */}
            <div className="relative bg-gradient-to-br from-gray-900/80 via-black/60 to-gray-900/80 backdrop-blur-xl rounded-2xl p-4 md:p-5 border border-[var(--border)] shadow-lg">
              {/* Effet de particules en arrière-plan */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.1),transparent_50%)] rounded-3xl"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.1),transparent_50%)] rounded-3xl"></div>
              
              <div className="relative z-10">
                {/* Layout responsive amélioré */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                  
                  {/* Section principale - Contrôles et infos */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* En-tête de la radio */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                          <Radio size={18} className="text-white" />
                        </div>
                        {/* Effet de lueur */}
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-xl blur-lg opacity-20"></div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl md:text-2xl font-bold text-white mb-0.5">Mixx Party Radio</h3>
                        <p className="text-gray-300 text-sm">Musique électronique en continu • 24h/24</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-green-400 text-sm font-medium">LIVE</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Statistiques en grille responsive */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <Headphones size={16} className="text-cyan-400" />
                          <span className="text-gray-400 text-sm font-medium">Auditeurs</span>
                        </div>
                        <AnimatedPlaysCounter
                          value={radioInfo.listeners || 0}
                          size="md"
                          variant="minimal"
                          showIcon={false}
                          animation="slide"
                          className="text-xl font-bold text-cyan-400"
                        />
                      </div>
                      
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-gray-400 text-sm font-medium">Statut</span>
                        </div>
                        <span className="text-xl font-bold text-green-400">LIVE</span>
                      </div>
                      
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10 sm:col-span-1 col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          <span className="text-gray-400 text-sm font-medium">Qualité</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xl font-bold text-purple-400">{radioInfo.quality}</span>
                          <div className="text-xs text-gray-500">{radioInfo.bitrate} kbps</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bouton de contrôle principal */}
                    <button
                      onClick={handleRadioToggle}
                      className={`group relative w-full h-12 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.01] active:scale-[0.99] ${
                        isRadioPlaying 
                          ? 'bg-gradient-to-r from-red-500 via-pink-500 to-red-600' 
                          : 'bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500'
                      }`}
                    >
                      {/* Effet de lueur discret */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      
                      <div className="relative flex items-center gap-3">
                        {isRadioPlaying ? (
                          <>
                            <Pause size={20} className="text-white" />
                            <span className="text-white font-semibold text-sm md:text-base">Arrêter la Radio</span>
                          </>
                        ) : (
                          <>
                            <Play size={20} className="text-white ml-1" />
                            <span className="text-white font-semibold text-sm md:text-base">Écouter la Radio</span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                  
                  {/* Section latérale - Informations sur la piste */}
                  <div className="space-y-4">
                    {/* Carte de la piste actuelle */}
                    <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-cyan-500/10 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                        <h4 className="text-lg font-bold text-white">En cours de lecture</h4>
                      </div>
                      
                      <div className="text-center space-y-3">
                        <div className="w-14 h-14 mx-auto bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                          <Radio size={22} className="text-purple-400" />
                        </div>
                        
                        <div>
                          <p className="text-white font-semibold text-base md:text-lg mb-1 line-clamp-2">
                            {radioInfo.currentTrack || 'Chargement...'}
                          </p>
                          <p className="text-purple-300 text-sm">Mixx Party Radio</p>
                          {radioInfo.lastUpdate && (
                            <div className="space-y-1">
                              <p className="text-gray-500 text-xs">
                                Mis à jour: {new Date(radioInfo.lastUpdate).toLocaleTimeString('fr-FR')}
                              </p>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <span className="text-blue-400 text-xs font-medium">
                                  {radioInfo.listeners > 0 ? 'Données intelligentes' : 'Simulation réaliste'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Boutons d'action secondaires */}
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          // Fonctionnalité de partage
                          if (navigator.share) {
                            navigator.share({
                              title: 'Mixx Party Radio',
                              text: 'Écoutez Mixx Party Radio en direct !',
                              url: window.location.href
                            });
                          } else {
                            navigator.clipboard.writeText(window.location.href);
                          }
                        }}
                        className="w-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/40 rounded-xl p-3 hover:bg-gradient-to-r hover:from-pink-500/30 hover:to-purple-500/30 transition-all duration-200"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Share2 size={18} className="text-white" />
                          <span className="text-white font-semibold text-sm">Partager</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
            </div>

      {/* Message si aucune musique */}
      {Object.values(categories).every(cat => cat.tracks.length === 0) && !loading && (
        <EmptyState
          icon={Music}
          title="Aucune musique disponible"
          description="Soyez le premier à partager votre musique !"
          action={{
            label: "Uploader ma musique",
            href: "/upload",
            icon: Mic2
          }}
        />
      )}



      {/* Dialog Radio supprimé - remplacé par un dépliant intégré dans la section radio */}

      {/* Section Météo - Votre météo */}
      <div className="w-full max-w-none sm:max-w-7xl sm:mx-auto px-2 sm:px-4 md:px-6 mt-8 mb-4">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            Votre météo
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Bulletin météo professionnel par Alertemps</p>
                  </div>
        <MeteoWidget />
                  </div>
                  </div>
                </div>
    </div>
  );
} 