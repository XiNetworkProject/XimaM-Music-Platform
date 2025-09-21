'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAudioPlayer } from '@/app/providers';
import { 
  Music, 
  Star, 
  TrendingUp, 
  Heart, 
  Play, 
  Clock, 
  Headphones,
  Sparkles,
  Crown,
  Zap,
  Flame,
  Gem,
  Target,
  Compass,
  Grid3X3,
  List,
  Shuffle,
  Mic,
  Users,
  Globe,
  X,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  MoreHorizontal
} from 'lucide-react';
import { MUSIC_GENRES, GENRE_CATEGORIES, getGenreColor } from '@/lib/genres';

interface Track {
  _id: string;
  title: string;
  artist: {
    _id: string;
    username: string;
    name: string;
    avatar?: string;
  };
  coverUrl?: string;
  audioUrl?: string;
  duration: number;
  genre: string[];
  plays: number;
  likes: number;
  isFeatured: boolean;
  isNew: boolean;
  createdAt?: string; // Date de création de la track
  mood?: string[];
  energy?: number;
}

interface Artist {
  _id: string;
  username: string;
  name: string;
  avatar?: string;
  bio?: string;
  genre: string[];
  totalPlays: number;
  totalLikes: number;
  followerCount: number;
  isVerified: boolean;
  isTrending: boolean;
  featuredTracks: number;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  trackCount: number;
}

export default function DiscoverPage() {
  const router = useRouter();
  
  // États pour les vraies données
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trendingArtists, setTrendingArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'trending' | 'newest' | 'popular' | 'featured'>('trending');

  // État pour les compteurs de catégories
  const [categoryCounts, setCategoryCounts] = useState<{[key: string]: number}>({});
  
  // État pour gérer les modales "Voir tout"
  const [showAllModal, setShowAllModal] = useState(false);
  const [modalType, setModalType] = useState<'featured' | 'new' | 'trending' | 'artists' | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalTracks, setModalTracks] = useState<Track[]>([]);
  const [modalArtists, setModalArtists] = useState<Artist[]>([]);



  // Calculer les compteurs de catégories UNE SEULE FOIS au chargement initial
  useEffect(() => {
    if (tracks.length > 0) {
      const counts: {[key: string]: number} = {};
      
      tracks.forEach(track => {
        if (track.genre && Array.isArray(track.genre)) {
          track.genre.forEach(genre => {
            counts[genre] = (counts[genre] || 0) + 1;
          });
        }
      });
      
      setCategoryCounts(counts);
      console.log('🔍 Compteurs de catégories calculés UNE SEULE FOIS (STABLES):', counts);
      console.log('✅ Les compteurs ne changeront PLUS entre catégories !');
      
      // Les compteurs sont maintenant dans categoryCounts et s'affichent dans l'interface
    }
  }, [tracks]); // Dépendance UNIQUEMENT sur tracks, JAMAIS sur selectedCategory

  // Filtrer et trier les tracks
  const filteredTracks = useMemo(() => {
    let filtered = tracks;
    
    // 1. Filtrer par catégorie
    if (selectedCategory && selectedCategory !== 'all') {
      // Trouver la catégorie sélectionnée
      const categoryData = categories.find(cat => cat.id === selectedCategory);
      if (categoryData && categoryData.name in GENRE_CATEGORIES) {
        const categoryGenres = GENRE_CATEGORIES[categoryData.name as keyof typeof GENRE_CATEGORIES] as readonly string[];
        filtered = tracks.filter(track => 
          track.genre && 
          Array.isArray(track.genre) && 
          track.genre.some(g => categoryGenres.includes(g))
        );
      } else {
        // Filtrage direct par genre si c'est un genre spécifique
        filtered = tracks.filter(track => 
          track.genre && 
          Array.isArray(track.genre) && 
          track.genre.includes(selectedCategory)
        );
      }
    }
    
    // 2. Trier selon le critère sélectionné
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'trending':
          return (b.plays || 0) - (a.plays || 0);
        case 'newest':
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        case 'popular':
          return (b.likes || 0) - (a.likes || 0);
        case 'featured':
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return (b.plays || 0) - (a.plays || 0);
        default:
          return 0;
      }
    });
    
    console.log(`🎯 Filtrage: ${selectedCategory}, Tri: ${sortBy}, Résultat: ${sorted.length} tracks`);
    
    return sorted;
  }, [tracks, selectedCategory, sortBy]);

  // CSS pour la barre de scroll personnalisée
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Barre de scroll personnalisée pour Webkit (Chrome, Safari, Edge) */
      #categories-scroll::-webkit-scrollbar {
        height: 8px;
      }
      
      #categories-scroll::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }
      
      #categories-scroll::-webkit-scrollbar-thumb {
        background: linear-gradient(90deg, rgba(168, 85, 247, 0.8), rgba(236, 72, 153, 0.8));
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      #categories-scroll::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(90deg, rgba(168, 85, 247, 1), rgba(236, 72, 153, 1));
      }
      
      /* Barre de scroll pour Firefox */
      #categories-scroll {
        scrollbar-width: thin;
        scrollbar-color: rgba(168, 85, 247, 0.8) rgba(255, 255, 255, 0.1);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Fonction pour récupérer les vraies données avec debugging
  const fetchDiscoverData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 Début du chargement des données discover...');

      // Essayer d'abord l'API principale des tracks
      const tracksResponse = await fetch('/api/tracks?limit=100', {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache'
        }
      });

      console.log('📡 Réponse API /api/tracks:', {
        ok: tracksResponse.ok,
        status: tracksResponse.status,
        statusText: tracksResponse.statusText
      });

      let allTracks: Track[] = [];

      if (tracksResponse.ok) {
        const tracksData = await tracksResponse.json();
        console.log('📦 Données reçues de /api/tracks:', tracksData);
        
        allTracks = tracksData.tracks || tracksData || [];
        console.log('🎵 Tracks parsées:', allTracks.length, allTracks.slice(0, 2));
      } else {
        const errorText = await tracksResponse.text();
        console.error('❌ Erreur API /api/tracks:', errorText);
      }

      // Si pas de tracks, essayer le fallback
      if (allTracks.length === 0) {
        console.log('⚠️ Aucune track trouvée, essai du fallback...');
        await fetchFallbackData();
        return;
      }

      // Essayer de récupérer les artistes (optionnel)
      try {
        const artistsResponse = await fetch('/api/users?limit=20');
        if (artistsResponse.ok) {
          const artistsData = await artistsResponse.json();
          const users = artistsData.users || artistsData || [];
          const artists: Artist[] = users.map((user: any) => ({
            _id: user._id || user.id,
            username: user.username,
            name: user.name,
            avatar: user.avatar,
            bio: user.bio || 'Artiste Synaura',
            genre: user.genre || [],
            totalPlays: user.total_plays || 0,
            totalLikes: user.total_likes || 0,
            followerCount: user.follower_count || 0,
            isVerified: user.is_verified || false,
            isTrending: true,
            featuredTracks: user.featured_tracks || 0
          }));
          setTrendingArtists(artists);
          console.log('👥 Artistes chargés:', artists.length);
        }
    } catch (err) {
        console.log('⚠️ Erreur chargement artistes (non critique):', err);
      }

      // Mettre à jour les tracks
      setTracks(allTracks);
      
      console.log('✅ Données discover chargées avec succès:', {
        tracks: allTracks.length,
        artists: trendingArtists.length
      });

    } catch (err) {
      console.error('💥 Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
      // Fallback vers les données de test
      await fetchFallbackData();
    } finally {
      setIsLoading(false);
    }
  };

  // Utiliser le player audio existant de l'app
  const { playTrack } = useAudioPlayer();

  // Fonction pour jouer une track avec le player existant
  const handlePlayTrack = async (track: Track) => {
    console.log('🎵 Lecture de la track:', track.title);
    
    try {
      // Récupérer l'URL audio complète depuis l'API
      const response = await fetch(`/api/tracks/${track._id}`);
      if (response.ok) {
        const trackData = await response.json();
        const audioUrl = trackData.audioUrl;
        
        if (audioUrl) {
          console.log('✅ URL audio récupérée:', audioUrl);
          
          // Utiliser le player existant de l'app avec type any pour éviter les conflits
          playTrack(track as any);
          
          console.log('🎵 Track envoyée au player existant:', track.title);
        } else {
          console.error('❌ Pas d\'URL audio pour cette track');
          alert('Cette track n\'a pas d\'audio disponible.');
        }
      } else {
        console.error('❌ Erreur récupération track:', response.status);
        alert('Impossible de récupérer les informations de cette track.');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la lecture:', error);
      alert('Erreur lors de la lecture de la track.');
    }
  };

  // Synchronisation temps réel des écoutes via event global
  useEffect(() => {
    const handler = (e: any) => {
      const { trackId, plays } = e.detail || {};
      if (!trackId || typeof plays !== 'number') return;
      setTracks(prev => prev.map(t => t._id === trackId ? { ...t, plays } : t));
      if (showAllModal && modalTracks.length) {
        setModalTracks(prev => prev.map(t => t._id === trackId ? { ...t, plays } : t));
      }
    };
    window.addEventListener('playsUpdated', handler as EventListener);
    return () => window.removeEventListener('playsUpdated', handler as EventListener);
  }, [showAllModal, modalTracks.length]);

  // Fonction pour naviguer vers un profil
  const handleArtistClick = (artist: Artist) => {
    console.log('👤 Navigation vers le profil:', artist.username);
    // Navigation vers le profil de l'artiste
    router.push(`/profile/${artist.username}`, { scroll: false });
  };

  // Fonction pour ouvrir les modales "Voir tout"
  const openAllModal = (type: 'featured' | 'new' | 'trending' | 'artists') => {
    let tracksToShow: Track[] = [];
    let artistsToShow: Artist[] = [];
    let title = '';
    
    switch (type) {
      case 'featured':
        tracksToShow = tracks.filter(track => track.isFeatured);
        title = 'Toutes les Tracks en Vedette';
        break;
      case 'new':
        tracksToShow = tracks.filter(track => {
          // Une track est "nouvelle" si isNew est true OU si elle a été créée dans les 30 derniers jours
          if (track.isNew) return true;
          if (track.createdAt) {
            const trackDate = new Date(track.createdAt);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return trackDate > thirtyDaysAgo;
          }
          return false;
        });
        title = 'Toutes les Nouvelles Tracks';
        break;
      case 'trending':
        tracksToShow = tracks.filter(track => track.plays > 30);
        title = 'Toutes les Tracks Tendance';
        break;
      case 'artists':
        // Pour les artistes, on affiche TOUS les artistes en tendance
        artistsToShow = trendingArtists;
        title = 'Tous les Artistes en Tendance';
        break;
    }
    
    setModalType(type);
    setModalTitle(title);
    setModalTracks(tracksToShow);
    setModalArtists(artistsToShow);
    setShowAllModal(true);
  };

  // Fonction de fallback avec des APIs qui existent vraiment
  const fetchFallbackData = async () => {
    try {
      console.log('🔍 Récupération des données via APIs de fallback...');
      
      // Essayer différentes APIs de tracks qui existent
      const trackApis = ['/api/tracks/recent', '/api/tracks/popular', '/api/tracks/trending'];
      let allTracks: Track[] = [];

      for (const api of trackApis) {
        try {
          const response = await fetch(`${api}?limit=50`);
          if (response.ok) {
            const data = await response.json();
            const tracks = data.tracks || data || [];
            allTracks = [...allTracks, ...tracks];
            console.log(`✅ ${api}: ${tracks.length} tracks`);
          }
        } catch (err) {
          console.log(`⚠️ Erreur ${api}:`, err);
        }
      }

      // Déduplication des tracks par ID
      const uniqueTracks = allTracks.filter((track, index, self) => 
        index === self.findIndex(t => t._id === track._id)
      );

      setTracks(uniqueTracks);
      console.log(`✅ Total tracks uniques: ${uniqueTracks.length}`);

      // Essayer de récupérer les utilisateurs/artistes
      try {
        const usersResponse = await fetch('/api/users?limit=20');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          const users = usersData.users || usersData || [];
          // Convertir les utilisateurs en format Artist
          const artists: Artist[] = users.map((user: any) => ({
            _id: user._id || user.id,
            username: user.username,
            name: user.name,
            avatar: user.avatar,
            bio: user.bio || 'Artiste Synaura',
            genre: user.genre || [],
            totalPlays: user.total_plays || 0,
            totalLikes: user.total_likes || 0,
            followerCount: user.follower_count || 0,
            isVerified: user.is_verified || false,
            isTrending: true,
            featuredTracks: user.featured_tracks || 0
          }));
          setTrendingArtists(artists);
          console.log(`✅ Artistes: ${artists.length}`);
        }
      } catch (err) {
        console.log('⚠️ Erreur récupération artistes:', err);
      }
      
    } catch (fallbackErr) {
      console.error('Erreur fallback:', fallbackErr);
      // En dernier recours, créer quelques données de test complètes
      console.log('🆘 Création de données de test...');
      
      const testTracks: Track[] = [
        {
          _id: 'test-1',
          title: 'Neon Dreams',
          artist: { _id: 'artist-1', username: 'synthwave', name: 'SynthWave Artist', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop' },
          duration: 180,
          genre: ['Electronic', 'Synthwave'],
          plays: 1500,
          likes: 89,
          isFeatured: true,
          isNew: false,
          coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
          audioUrl: '#'
        },
        {
          _id: 'test-2',
          title: 'Urban Flow',
          artist: { _id: 'artist-2', username: 'beatmaker', name: 'Beat Maker', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop' },
          duration: 210,
          genre: ['Hip-Hop', 'Rap'],
          plays: 2300,
          likes: 156,
          isFeatured: false,
          isNew: true,
          coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
          audioUrl: '#'
        },
        {
          _id: 'test-3',
          title: 'Chill Vibes',
          artist: { _id: 'artist-3', username: 'chillartist', name: 'Chill Artist', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop' },
          duration: 240,
          genre: ['Lo-Fi', 'Chill'],
          plays: 890,
          likes: 67,
          isFeatured: true,
          isNew: false,
          coverUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop',
          audioUrl: '#'
        },
        {
          _id: 'test-4',
          title: 'Rock Anthem',
          artist: { _id: 'artist-4', username: 'rockstar', name: 'Rock Star', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop' },
          duration: 195,
          genre: ['Rock', 'Alternative'],
          plays: 3400,
          likes: 234,
          isFeatured: false,
          isNew: true,
          coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
          audioUrl: '#'
        },
        {
          _id: 'test-5',
          title: 'Jazz Night',
          artist: { _id: 'artist-5', username: 'jazzcat', name: 'Jazz Cat', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop' },
          duration: 280,
          genre: ['Jazz', 'Blues'],
          plays: 1200,
          likes: 98,
          isFeatured: true,
          isNew: false,
          coverUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop',
          audioUrl: '#'
        }
      ];
      
      setTracks(testTracks);
      console.log('✅ Données de test créées:', testTracks.length, 'tracks');
    }
  };

  // Charger TOUTES les données UNE SEULE FOIS au montage (pas de rechargement)
  useEffect(() => {
    console.log('🚀 Chargement initial des données - UNE SEULE FOIS');
    fetchDiscoverData();
  }, []); // AUCUNE dépendance - chargement unique et définitif

  // Catégories basées sur les VRAIS genres disponibles dans la base + NOUVELLES
  const categories: Category[] = [
    // Catégorie principale
    { id: 'all', name: 'Toutes', icon: <Compass size={20} />, color: 'from-blue-500 to-purple-600', description: 'Découvrez tout le contenu', trackCount: 0 },
    
    // Genres RÉELS disponibles dans la base (GARDER)
    { id: 'Electronic', name: 'Électronique', icon: <Zap size={20} />, color: 'from-purple-500 to-pink-600', description: 'Beats et synthés futuristes', trackCount: 0 },
    { id: 'Pop', name: 'Pop', icon: <Music size={20} />, color: 'from-pink-500 to-purple-600', description: 'Mélodies accrocheuses et rythmes entraînants', trackCount: 0 },
    { id: 'Hip-Hop', name: 'Hip-Hop', icon: <Flame size={20} />, color: 'from-orange-500 to-red-600', description: 'Rap et beats urbains', trackCount: 0 },
    { id: 'Classical', name: 'Classique', icon: <Crown size={20} />, color: 'from-yellow-500 to-orange-600', description: 'Musique orchestrale', trackCount: 0 },
    
    // Catégories populaires pour l'expansion future (GARDER)
    { id: 'Rock', name: 'Rock', icon: <Target size={20} />, color: 'from-red-500 to-yellow-600', description: 'Guitares et énergie brute', trackCount: 0 },
    { id: 'Jazz', name: 'Jazz', icon: <Gem size={20} />, color: 'from-indigo-500 to-blue-600', description: 'Improvisation et swing', trackCount: 0 },
    { id: 'R&B', name: 'R&B', icon: <Heart size={20} />, color: 'from-pink-500 to-red-600', description: 'Soul et rythmes blues', trackCount: 0 },
    { id: 'Country', name: 'Country', icon: <Target size={20} />, color: 'from-green-500 to-yellow-600', description: 'Histoires rurales et guitares acoustiques', trackCount: 0 },
    
    // NOUVELLES catégories électroniques
    { id: 'Reggae', name: 'Reggae', icon: <Music size={20} />, color: 'from-green-600 to-yellow-500', description: 'Reggae jamaïcain', trackCount: 0 },
    { id: 'Blues', name: 'Blues', icon: <Mic size={20} />, color: 'from-blue-600 to-indigo-500', description: 'Blues traditionnel', trackCount: 0 },
    { id: 'Folk', name: 'Folk', icon: <Users size={20} />, color: 'from-yellow-600 to-orange-500', description: 'Folk acoustique', trackCount: 0 },
    { id: 'Metal', name: 'Metal', icon: <Target size={20} />, color: 'from-gray-700 to-black', description: 'Metal puissant', trackCount: 0 },
    { id: 'Ambient', name: 'Ambient', icon: <Globe size={20} />, color: 'from-blue-400 to-cyan-500', description: 'Ambient relaxant', trackCount: 0 },
    { id: 'Trap', name: 'Trap', icon: <Music size={20} />, color: 'from-purple-600 to-pink-500', description: 'Trap moderne', trackCount: 0 },
    { id: 'Dubstep', name: 'Dubstep', icon: <Music size={20} />, color: 'from-green-500 to-blue-500', description: 'Dubstep énergique', trackCount: 0 },
    { id: 'House', name: 'House', icon: <Music size={20} />, color: 'from-blue-500 to-purple-500', description: 'House dance', trackCount: 0 },
    { id: 'Techno', name: 'Techno', icon: <Music size={20} />, color: 'from-gray-500 to-black', description: 'Techno industriel', trackCount: 0 },
    { id: 'Trance', name: 'Trance', icon: <Music size={20} />, color: 'from-purple-400 to-pink-500', description: 'Trance hypnotique', trackCount: 0 },
    { id: 'Drum & Bass', name: 'Drum & Bass', icon: <Music size={20} />, color: 'from-orange-500 to-red-500', description: 'Drum & Bass', trackCount: 0 },
    
    // NOUVELLES catégories acoustiques
    { id: 'Acoustic', name: 'Acoustic', icon: <Mic size={20} />, color: 'from-yellow-500 to-orange-500', description: 'Acoustique pur', trackCount: 0 },
    { id: 'Instrumental', name: 'Instrumental', icon: <Music size={20} />, color: 'from-blue-400 to-indigo-500', description: 'Instrumental', trackCount: 0 },
    { id: 'Orchestral', name: 'Orchestral', icon: <Globe size={20} />, color: 'from-purple-500 to-blue-500', description: 'Orchestral', trackCount: 0 },
    { id: 'A Cappella', name: 'A Cappella', icon: <Mic size={20} />, color: 'from-pink-400 to-purple-500', description: 'A Cappella', trackCount: 0 },
    { id: 'Choir', name: 'Choir', icon: <Users size={20} />, color: 'from-blue-500 to-cyan-500', description: 'Chœur', trackCount: 0 },
    { id: 'Gospel', name: 'Gospel', icon: <Mic size={20} />, color: 'from-yellow-600 to-orange-500', description: 'Gospel spirituel', trackCount: 0 },
    
    // NOUVELLES catégories fusion
    { id: 'Fusion', name: 'Fusion', icon: <Music size={20} />, color: 'from-indigo-500 to-purple-500', description: 'Fusion musicale', trackCount: 0 },
    { id: 'Experimental', name: 'Experimental', icon: <Globe size={20} />, color: 'from-purple-600 to-pink-500', description: 'Expérimental', trackCount: 0 },
    { id: 'Avant-Garde', name: 'Avant-Garde', icon: <Music size={20} />, color: 'from-gray-600 to-black', description: 'Avant-garde', trackCount: 0 },
    
    // NOUVELLES catégories d'ambiance
    { id: 'Retro', name: 'Retro', icon: <Globe size={20} />, color: 'from-orange-400 to-yellow-500', description: 'Rétro nostalgique', trackCount: 0 },
    { id: 'Vintage', name: 'Vintage', icon: <Music size={20} />, color: 'from-yellow-400 to-orange-500', description: 'Vintage classique', trackCount: 0 },
    { id: 'Futuristic', name: 'Futuristic', icon: <Globe size={20} />, color: 'from-blue-600 to-cyan-500', description: 'Futuriste', trackCount: 0 },
    { id: 'Energetic', name: 'Energetic', icon: <Music size={20} />, color: 'from-red-400 to-orange-500', description: 'Énergique', trackCount: 0 },
    { id: 'Chill', name: 'Chill', icon: <Globe size={20} />, color: 'from-blue-300 to-cyan-400', description: 'Chill relaxant', trackCount: 0 },
    { id: 'Romantic', name: 'Romantic', icon: <Mic size={20} />, color: 'from-pink-300 to-red-400', description: 'Romantique', trackCount: 0 },
    { id: 'Mysterious', name: 'Mysterious', icon: <Globe size={20} />, color: 'from-purple-700 to-black', description: 'Mystérieux', trackCount: 0 },
    { id: 'Festive', name: 'Festive', icon: <Music size={20} />, color: 'from-orange-300 to-yellow-400', description: 'Festif joyeux', trackCount: 0 },
    
    // NOUVELLES catégories mondiales
    { id: 'African', name: 'African', icon: <Globe size={20} />, color: 'from-yellow-700 to-orange-600', description: 'Musique africaine', trackCount: 0 },
    { id: 'Latin', name: 'Latin', icon: <Music size={20} />, color: 'from-red-600 to-orange-500', description: 'Musique latine', trackCount: 0 },
    { id: 'Celtic', name: 'Celtic', icon: <Globe size={20} />, color: 'from-green-700 to-blue-600', description: 'Musique celtique', trackCount: 0 },
    { id: 'Indian', name: 'Indian', icon: <Globe size={20} />, color: 'from-orange-600 to-red-500', description: 'Musique indienne', trackCount: 0 },
    { id: 'Arabic', name: 'Arabic', icon: <Globe size={20} />, color: 'from-green-800 to-blue-700', description: 'Musique arabe', trackCount: 0 },
    { id: 'Asian', name: 'Asian', icon: <Globe size={20} />, color: 'from-red-700 to-purple-600', description: 'Musique asiatique', trackCount: 0 }
  ];


  // SUPPRIMÉ : Ce useEffect causait le rechargement des données à chaque changement de catégorie
  // useEffect(() => {
  //   fetchDiscoverData();
  // }, [selectedCategory, sortBy]);



  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getEnergyColor = (energy: number) => {
    if (energy >= 8) return 'text-red-500';
    if (energy >= 6) return 'text-orange-500';
    if (energy >= 4) return 'text-yellow-500';
    return 'text-blue-500';
  };

    return (
    <div className="min-h-screen bg-transparent text-[var(--text)] pt-0 pb-20 lg:pb-4 overflow-x-hidden w-full">

      {/* En-tête épuré - Style moderne */}
      <div className="w-full px-2 sm:px-4 md:px-6 pt-6 sm:pt-8 pb-4">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] mb-2">Découvrir</h1>
              <p className="text-[var(--text-muted)] text-sm sm:text-base">Explorez les dernières créations musicales</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              >
                <option value="trending">Tendances</option>
                <option value="newest">Nouveautés</option>
                <option value="popular">Populaires</option>
                <option value="featured">En Vedette</option>
              </select>
            </div>
          </div>
        </div>
      </div>

          {/* Catégories - Style épuré */}
          <div className="px-2 sm:px-4 md:px-6 mb-8">
            <div className="w-full max-w-7xl mx-auto">
              <h2 className="text-xl font-semibold text-[var(--text)] mb-4">Genres</h2>
            </div>
          </div>

          <div className="px-2 sm:px-4 md:px-6 mb-8">
            <div className="w-full max-w-7xl mx-auto">
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 scroll-smooth [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                 {categories.map((category, index) => (
                   <button
                     key={category.id}
                     onClick={() => setSelectedCategory(category.id)}
                     className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                       selectedCategory === category.id
                         ? 'bg-[var(--accent)] text-white'
                         : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)] border border-[var(--border)]'
                     }`}
                   >
                     {category.name}
                   </button>
                 ))}
               </div>
            </div>
          </div>

      {/* Contenu principal - Sections par genres */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="px-2 sm:px-4 md:px-6 pb-16"
      >
                     {isLoading ? (
             <div className="text-center py-20">
               <div className="relative mx-auto mb-8">
                 <div className="w-24 h-24 rounded-full border-4 border-transparent border-t-purple-500 border-r-pink-500 border-b-blue-500 border-l-cyan-400 animate-spin"></div>
                 <div className="absolute inset-2 w-20 h-20 rounded-full border-2 border-transparent border-t-pink-400 border-r-purple-400 border-b-cyan-500 border-l-blue-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                 <div className="absolute inset-8 w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse"></div>
                 </div>
            <p className="text-gray-300 text-lg font-medium">Chargement des genres...</p>
             </div>
          ) : (
          <div className="space-y-8">
            {selectedCategory === 'all' ? (
              // Afficher toutes les sections par genre
              Object.entries(GENRE_CATEGORIES).map(([categoryName, genres]) => {
                const categoryTracks = filteredTracks.filter(track => 
                  track.genre && 
                  Array.isArray(track.genre) && 
                  track.genre.some(g => (genres as readonly string[]).includes(g))
                );

                if (categoryTracks.length === 0) return null;

                return (
                  <GenreSection
                    key={categoryName}
                    title={categoryName}
                    tracks={categoryTracks}
                    onPlayTrack={handlePlayTrack}
                  />
                );
              })
            ) : (
              // Afficher seulement la catégorie sélectionnée
              (() => {
                const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);
                if (!selectedCategoryData) return null;

                return (
                  <GenreSection
                    key={selectedCategory}
                    title={selectedCategoryData.name}
                    tracks={filteredTracks}
                    onPlayTrack={handlePlayTrack}
                  />
                );
              })()
            )}


            </div>
          )}
        </motion.div>
      
      {/* Modale "Voir tout" avec AnimatePresence */}
      <AnimatePresence>
        {showAllModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAllModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl sm:rounded-2xl p-3 sm:p-6 w-full max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white">{modalTitle}</h2>
                <button
                  onClick={() => setShowAllModal(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X size={24} className="text-white" />
                </button>
      </div>
              
              {/* Grille conditionnelle : tracks OU artistes selon le type */}
              {modalType === 'artists' ? (
                // Grille d'artistes en tendance
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 overflow-y-auto max-h-[60vh]">
                  {modalArtists.map((artist: Artist) => (
                    <div key={artist._id} className="bg-white/10 rounded-xl p-4 border border-gray-700 text-center">
                      <div className="w-16 h-16 rounded-lg overflow-hidden mb-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 mx-auto">
                        {artist.avatar && artist.avatar.trim() !== '' ? (
                          <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {artist.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-white text-sm mb-1 truncate">{artist.name}</h3>
                      <p className="text-gray-300 text-xs mb-2 line-clamp-2 leading-tight">{artist.bio}</p>
                      
                      {/* Stats de l'artiste */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                        <div>
                          <div className="text-white font-bold">{formatNumber(artist.totalPlays)}</div>
                          <div className="text-gray-500">Écoutes</div>
                        </div>
                        <div>
                          <div className="text-white font-bold">{formatNumber(artist.totalLikes)}</div>
                          <div className="text-gray-500">Likes</div>
                        </div>
                        <div>
                          <div className="text-white font-bold">{formatNumber(artist.followerCount)}</div>
                          <div className="text-gray-500">Suiveurs</div>
                        </div>
                      </div>
                      
                      {/* Bouton voir le profil */}
                      <button
                        onClick={() => router.push(`/profile/${artist.username}`, { scroll: false })}
                        className="w-full py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm text-purple-300 text-xs rounded-lg hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300 border border-purple-500/30 hover:border-purple-500/50"
                      >
                        Voir le profil
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                // Grille de tracks (featured, new, trending)
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 overflow-y-auto max-h-[60vh]">
                  {modalTracks.map((track: Track) => (
                    <div key={track._id} className="bg-white/10 rounded-xl p-4 border border-gray-700">
                      <div className="w-16 h-16 rounded-lg overflow-hidden mb-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        {track.coverUrl ? (
                          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {track.title.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-white text-sm mb-1 truncate">{track.title}</h3>
                      <p className="text-gray-300 text-xs mb-2 truncate">{track.artist.name}</p>
                      <button
                        onClick={() => handlePlayTrack(track)}
                        className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                      >
                        <Play size={12} fill="white" className="ml-0.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 

// Composant GenreSection avec style Suno
interface GenreSectionProps {
  title: string;
  tracks: Track[];
  onPlayTrack: (track: Track) => void;
}

const GenreSection: React.FC<GenreSectionProps> = ({ title, tracks, onPlayTrack }) => {
  const sectionId = `section-${title.toLowerCase().replace(/\s+/g, '-')}`;
  
  const scrollLeft = () => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full max-w-none sm:max-w-7xl sm:mx-auto px-2 sm:px-4 md:px-6">
      <div className="h-full w-full overflow-hidden">
        <div className="mb-2 flex w-full flex-row justify-between pb-2">
          <div className="flex items-center gap-4">
            <h2 className="font-sans font-semibold text-[20px] leading-[24px] pb-2 text-[var(--text)]">{title}</h2>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button 
              aria-label="Scroll left" 
              onClick={scrollLeft}
              className="relative inline-block font-sans font-medium text-center select-none text-[15px] leading-[24px] rounded-full aspect-square p-2 text-[var(--text)] bg-[var(--surface-2)] hover:before:bg-[var(--surface-3)] before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-[var(--border)] before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75"
            >
              <span className="relative flex flex-row items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="text-current shrink-0 w-4 h-4 m-1">
                  <path d="m9.398 12.005 6.194-6.193q.315-.316.305-.748a1.06 1.06 0 0 0-.326-.748Q15.255 4 14.823 4t-.748.316l-6.467 6.488a1.7 1.7 0 0 0-.38.57 1.7 1.7 0 0 0-.126.631q0 .315.127.632.126.315.379.569l6.488 6.488q.316.316.738.306a1.05 1.05 0 0 0 .737-.327q.316-.316.316-.748t-.316-.748z"></path>
                </svg>
              </span>
            </button>
            <button 
              aria-label="Scroll right" 
              onClick={scrollRight}
              className="relative inline-block font-sans font-medium text-center select-none text-[15px] leading-[24px] rounded-full aspect-square p-2 text-[var(--text)] bg-[var(--surface-2)] hover:before:bg-[var(--surface-3)] before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-[var(--border)] before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75"
            >
              <span className="relative flex flex-row items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="text-current shrink-0 w-4 h-4 m-1">
                  <path d="M14.602 12.005 8.407 5.812a.99.99 0 0 1-.305-.748q.01-.432.326-.748T9.177 4t.748.316l6.467 6.488q.253.253.38.57.126.315.126.631 0 .315-.127.632-.126.315-.379.569l-6.488 6.488a.97.97 0 0 1-.738.306 1.05 1.05 0 0 1-.737-.327q-.316-.316-.316-.748t.316-.748z"></path>
                </svg>
              </span>
            </button>
          </div>
        </div>
        <div className="relative w-full overflow-hidden" style={{ height: '20rem' }}>
          <div className="h-full w-full overflow-hidden [mask-image:linear-gradient(to_right,black,black_90%,transparent)] [mask-size:100%_100%] transition-[mask-image] duration-500">
            <section 
              id={sectionId}
              className="flex h-auto w-full overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-3 px-1"
            >
              {tracks.slice(0, 20).map((track, index) => (
                <div key={track._id} className="shrink-0">
                  <TrackCard track={track} onPlay={onPlayTrack} />
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>
    </section>
  );
};

// Composant TrackCard avec style Suno
interface TrackCardProps {
  track: Track;
  onPlay: (track: Track) => void;
}

const TrackCard: React.FC<TrackCardProps> = ({ track, onPlay }) => {
  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative flex w-[140px] sm:w-[172px] shrink-0 cursor-pointer flex-col">
      <div className="relative mb-4 cursor-pointer">
        <div className="relative h-[200px] sm:h-[256px] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
          <img
            alt={track.title}
            src={track.coverUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop'}
            className="absolute inset-0 h-full w-full rounded-xl object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop';
            }}
          />
          <div className="absolute inset-0 z-20">
            <button 
              onClick={() => onPlay(track)}
              className="flex items-center justify-center h-14 w-14 rounded-full p-4 bg-[var(--surface-2)]/60 backdrop-blur-xl border border-[var(--border)] outline-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-[var(--text)]">
                <path d="M6 18.705V5.294q0-.55.415-.923Q6.829 4 7.383 4q.173 0 .363.049.189.048.363.145L19.378 10.9a1.285 1.285 0 0 1 0 2.202l-11.27 6.705a1.5 1.5 0 0 1-.725.194q-.554 0-.968-.372A1.19 1.19 0 0 1 6 18.704"></path>
              </svg>
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
          <div className="min-w-0 flex-1 overflow-hidden text-ellipsis" title={track.title}>
            {track.title}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[12px] text-[var(--text-muted)]">
          <div className="flex items-center gap-[2px]">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-headphones">
              <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"></path>
            </svg>
            <span className="text-[12px] leading-4 font-medium">{formatNumber(track.plays)}</span>
          </div>
          <div className="flex items-center gap-[2px]">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-heart">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
            </svg>
            <span className="text-[12px] leading-4 font-medium">{formatNumber(track.likes)}</span>
          </div>
          <div className="flex items-center gap-[2px]">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle">
              <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path>
            </svg>
            <span className="text-[12px] leading-4 font-medium">0</span>
          </div>
        </div>
        <div className="mt-1 flex w-full items-center justify-between">
          <div className="flex w-fit flex-row items-center gap-2 font-sans text-sm font-medium text-[var(--text)]">
            <div className="relative h-8 shrink-0 aspect-square">
              <img
                alt="Profile avatar"
                src={track.artist.avatar || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop'}
                className="rounded-full h-full w-full object-cover p-1"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop';
                }}
              />
            </div>
            <span className="line-clamp-1 max-w-fit break-all" title={track.artist.name}>
              {track.artist.name}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Fonctions utilitaires
const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};





