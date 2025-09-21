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

  // Filtrer les tracks par catégorie sélectionnée (OPTIMISÉ - PAS de rechargement)
  const filteredTracks = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') {
      return tracks;
    }
    
    // Filtrage optimisé SANS recharger les données - juste un filtre local
    const filtered = tracks.filter(track => 
      track.genre && 
      Array.isArray(track.genre) && 
      track.genre.includes(selectedCategory)
    );
    
    console.log(`🎯 Filtrage local ${selectedCategory}: ${filtered.length} tracks trouvées (pas de rechargement)`);
    
    // Log des sections avec le nombre de tracks filtrées
    const featuredCount = filtered.filter(track => track.isFeatured).length;
    const newCount = filtered.filter(track => {
      // Une track est "nouvelle" si isNew est true OU si elle a été créée dans les 30 derniers jours
      if (track.isNew) return true;
      if (track.createdAt) {
        const trackDate = new Date(track.createdAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return trackDate > thirtyDaysAgo;
      }
      return false;
    }).length;
    const trendingCount = filtered.filter(track => track.plays > 30).length;
    
    console.log(`📊 Sections avec tracks filtrées:`, {
      'En Vedette': featuredCount,
      'Nouveautés': newCount,
      'Tendances': trendingCount
    });
    
    return filtered;
  }, [tracks, selectedCategory]);

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

  // Fonction pour récupérer les vraies données (comme dans l'accueil)
  const fetchDiscoverData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Utiliser les mêmes APIs que l'accueil pour être sûr d'avoir des données
      const [tracksResponse, artistsResponse] = await Promise.all([
        fetch('/api/tracks?limit=100', {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache'
          }
        }),
        fetch('/api/users/trending', {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache'
          }
        })
      ]);

      let allTracks: Track[] = [];
      let allArtists: Artist[] = [];

      // Récupérer les tracks
      if (tracksResponse.ok) {
        const tracksData = await tracksResponse.json();
        allTracks = tracksData.tracks || tracksData || [];
      }

      // Récupérer les artistes
      if (artistsResponse.ok) {
        const artistsData = await artistsResponse.json();
        allArtists = artistsData.users || artistsData || [];
      }

      // Mettre à jour les états
      setTracks(allTracks);
      setTrendingArtists(allArtists);
      
      console.log('✅ Données discover chargées:', {
        tracks: allTracks.length,
        artists: allArtists.length
      });

    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
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
      // En dernier recours, créer quelques données de test
      setTracks([
        {
          _id: 'test-1',
          title: 'Test Track 1',
          artist: { _id: 'artist-1', username: 'testartist', name: 'Test Artist', avatar: '' },
          duration: 180,
          genre: ['Electronic', 'Pop'],
          plays: 1000,
          likes: 50,
          isFeatured: true,
          isNew: false,
          coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop'
        }
      ]);
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

  // Moods pour le filtrage
  const moods = [
    { name: 'Énergique', icon: <Zap size={16} />, color: 'bg-yellow-500' },
    { name: 'Relaxant', icon: <Sparkles size={16} />, color: 'bg-blue-500' },
    { name: 'Romantique', icon: <Heart size={16} />, color: 'bg-pink-500' },
    { name: 'Mystérieux', icon: <Gem size={16} />, color: 'bg-purple-500' },
    { name: 'Festif', icon: <Flame size={16} />, color: 'bg-orange-500' }
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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] pt-0 pb-20 lg:pb-4 overflow-x-hidden w-full">
      {/* Header Hero - Style identique à l'accueil */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden"
      >
        {/* Fond dynamique avec particules - Style identique à l'accueil */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-pink-900/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,20,147,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(120,119,198,0.1),transparent_50%)]"></div>
          </div>
        
        <div className="relative z-10 px-2 sm:px-4 md:px-6 py-12 sm:py-16 text-center">
          {/* Badge de statut - Style identique à l'accueil */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md border border-white/20 rounded-full"
          >
            <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
            <span className="text-white/90 text-sm font-medium">Découverte</span>
            <Compass size={14} className="text-purple-400" />
        </motion.div>

          {/* Titre principal - Style identique à l'accueil */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight"
            style={{
              textShadow: '0 0 30px rgba(168, 85, 247, 0.5), 0 0 60px rgba(236, 72, 153, 0.3)'
            }}
          >
            Découvrez la
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              {' '}Musique
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto"
          >
            Explorez des milliers de tracks et d'artistes, organisés par notre algorithme intelligent pour vous faire découvrir les meilleures créations
          </motion.p>
          
  

          </div>
      </motion.div>

      {/* Contrôles et filtres - Style identique à l'accueil */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="px-2 sm:px-4 md:px-6 py-8"
      >
        <div className="w-full max-w-none sm:max-w-7xl sm:mx-auto overflow-hidden px-0">
          {/* Mode d'affichage et tri - Style identique à l'accueil */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 mb-8">
            <div className="flex items-center gap-2 sm:gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('grid')}
                className={`p-3 rounded-xl transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' 
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-gray-700'
                }`}
              >
                <Grid3X3 size={20} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-xl transition-all ${
                  viewMode === 'list' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' 
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-gray-700'
                }`}
              >
                <List size={20} />
              </motion.button>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                             <div className="relative">
                 <select
                   value={sortBy}
                   onChange={(e) => setSortBy(e.target.value as any)}
                   className="px-4 py-3 pr-10 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 appearance-none cursor-pointer hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300"
                 >
                   <option value="trending" className="bg-gray-900 text-white">Tendances</option>
                   <option value="newest" className="bg-gray-900 text-white">Nouveautés</option>
                   <option value="popular" className="bg-gray-900 text-white">Populaires</option>
                   <option value="featured" className="bg-gray-900 text-white">En Vedette</option>
                 </select>
                 
                 {/* Icône personnalisée */}
                 <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                   <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent border-r-transparent transform rotate-45"></div>
          </div>
            </div>
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 bg-white/10 backdrop-blur-sm border border-gray-700 rounded-xl text-white hover:bg-white/20 transition-all"
              >
                <Shuffle size={20} />
              </motion.button>
          </div>
          </div>

          {/* Catégories - Style identique à l'accueil */}
          <div className="mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '50px' }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 bg-purple-500/10 border border-purple-500/20">
                  <Compass size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Catégories</h2>
                  <p className="text-gray-400">Explorez par style musical</p>
                </div>
          </div>
        </motion.div>

                                      <div className="relative">
               {/* Contrôles de navigation PC - Flèche gauche */}
               <div className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10">
                 <button
                   onClick={() => {
                     const container = document.getElementById('categories-scroll');
                     if (container) container.scrollLeft -= 300;
                   }}
                   className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500/80 to-pink-500/80 backdrop-blur-sm border border-white/30 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 flex items-center justify-center text-white shadow-lg hover:shadow-purple-500/25"
                   aria-label="Catégories précédentes"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                   </svg>
                 </button>
               </div>

               {/* Contrôles de navigation PC - Flèche droite */}
               <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10">
                 <button
                   onClick={() => {
                     const container = document.getElementById('categories-scroll');
                     if (container) container.scrollLeft += 300;
                   }}
                   className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500/80 to-pink-500/80 backdrop-blur-sm border border-white/30 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 flex items-center justify-center text-white shadow-lg hover:shadow-purple-500/25"
                   aria-label="Catégories suivantes"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                   </svg>
                 </button>
               </div>

               {/* Container scrollable avec ID pour les contrôles */}
               <div 
                 id="categories-scroll"
                 className="flex gap-2 sm:gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-hide"
                 style={{
                   scrollbarWidth: 'thin',
                   scrollbarColor: 'rgba(168, 85, 247, 0.5) transparent'
                 }}
               >
                 {categories.map((category, index) => (
                   <motion.button
                     key={category.id}
                     initial={{ opacity: 0, x: 20 }}
                     whileInView={{ opacity: 1, x: 0 }}
                     viewport={{ once: true, margin: '50px' }}
                     transition={{ duration: 0.4, delay: index * 0.05 }}
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     onClick={() => setSelectedCategory(category.id)}
                     className={`flex-shrink-0 p-4 rounded-2xl text-center transition-all min-w-[120px] ${
                       selectedCategory === category.id
                         ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                         : 'bg-white/10 backdrop-blur-sm border border-gray-700 text-gray-300 hover:bg-white/20'
                     }`}
                   >
                     <div className="text-2xl mb-2">{category.icon}</div>
                     <div className="text-sm font-medium">{category.name}</div>
                     <div className="text-xs opacity-75 mt-1">
                       {category.id === 'all' ? tracks.length : (categoryCounts[category.id] || 0)} tracks
                     </div>
                   </motion.button>
                 ))}
               </div>
               
               {/* Indicateur de scroll */}
               <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"></div>
             </div>
          </div>

          {/* Moods - Style identique à l'accueil */}
          <div className="mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '50px' }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 bg-pink-500/10 border border-pink-500/20">
                  <Sparkles size={24} className="text-white" />
            </div>
                <div>
                                     <h2 className="text-2xl font-bold text-white">Ambiances</h2>
                   <p className="text-gray-400">Filtrez par humeur musicale</p>
                </div>
              </div>
            </motion.div>
            
            <div className="flex flex-wrap gap-3">
              {moods.map((mood, index) => (
                <motion.button
                  key={mood.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '50px' }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-gray-700 rounded-full text-white hover:bg-white/20 transition-all"
                >
                  <div className={`w-3 h-3 rounded-full ${mood.color}`} />
                  {mood.icon}
                  <span className="text-sm">{mood.name}</span>
                </motion.button>
              ))}
            </div>
            </div>
          </div>
        </motion.div>

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
            {/* Générer les sections pour chaque genre qui a des tracks */}
            {Object.entries(GENRE_CATEGORIES).map(([categoryName, genres]) => {
              // Trouver les tracks pour cette catégorie
              const categoryTracks = tracks.filter(track => 
                track.genre && 
                Array.isArray(track.genre) && 
                track.genre.some(g => (genres as readonly string[]).includes(g))
              );

              // Ne pas afficher la section si aucune track
              if (categoryTracks.length === 0) return null;

              return (
                <GenreSection
                  key={categoryName}
                  title={categoryName}
                  tracks={categoryTracks}
                  onPlayTrack={handlePlayTrack}
                />
              );
            })}

            {/* Section pour les genres individuels populaires */}
            {MUSIC_GENRES.slice(0, 10).map(genre => {
              const genreTracks = tracks.filter(track => 
                track.genre && 
                Array.isArray(track.genre) && 
                track.genre.includes(genre)
              );

              if (genreTracks.length === 0) return null;

              return (
                <GenreSection
                  key={genre}
                  title={genre}
                  tracks={genreTracks}
                  onPlayTrack={handlePlayTrack}
                />
              );
            })}
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="w-full py-4 bg-[var(--bg)] mb-0 md:mb-2"
      aria-label={`section-${title}`}
    >
      <div className="h-full w-full overflow-hidden">
        {/* Header de section */}
        <div className="mb-2 flex w-full flex-row justify-between pb-2">
          <div className="flex items-center gap-4">
            <h1 className="font-sans font-semibold text-[20px] leading-[24px] pb-2 text-white">
              {title}
            </h1>
          </div>
          <div className="flex flex-1 items-center justify-end">
            <div className="line-clamp-1 cursor-pointer gap-2 font-sans text-sm hover:underline text-gray-400">
              Show More
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Container scrollable */}
        <div className="relative w-full overflow-hidden" style={{ height: '24rem' }}>
          {/* Boutons de navigation */}
          <button 
            className="absolute top-0 left-0 z-2 hidden h-full w-16 items-center justify-center transition ease-linear sm:flex pointer-events-none opacity-0"
            aria-label="Scroll left"
          >
            <div className="inline-block font-sans font-medium text-center rounded-full aspect-square p-2 text-white bg-black/20 hover:bg-black/40 absolute left-0 -translate-y-1/2" style={{ top: '9rem' }}>
              <ChevronLeft className="w-4 h-4" />
            </div>
          </button>

          {/* Masque de dégradé */}
          <div className="h-full w-full overflow-hidden mask-[linear-gradient(to_right,black,black_80%,transparent)] mask-size-[100%_100%] transition-[mask-image] duration-500">
            <div style={{ overflow: 'visible', height: '0px', width: '0px' }}>
              <section 
                className="flex h-auto w-full overflow-x-auto scroll-smooth [&::-webkit-overflow-scrolling]:touch-auto [&::-webkit-scrollbar]:hidden"
                style={{ position: 'relative', height: '384px', width: '100%', overflow: 'auto', willChange: 'transform', direction: 'ltr', scrollbarWidth: 'none' }}
              >
                <div className="flex gap-4" style={{ height: '100%' }}>
                  {tracks.slice(0, 20).map((track, index) => (
                    <TrackCard key={track._id} track={track} onPlay={onPlayTrack} />
                  ))}
                </div>
              </section>
            </div>
          </div>

          <button 
            className="absolute top-0 right-0 z-2 hidden h-full w-16 items-center justify-center transition ease-linear sm:flex pointer-events-auto opacity-100"
            aria-label="Scroll right"
          >
            <div className="inline-block font-sans font-medium text-center rounded-full aspect-square p-2 text-white bg-black/20 hover:bg-black/40 absolute left-0 -translate-y-1/2" style={{ top: '9rem' }}>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>
    </motion.div>
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
    <div className="relative flex w-[172px] shrink-0 cursor-pointer flex-col group">
      {/* Image container */}
      <div className="relative mb-4 cursor-pointer">
        <div className="relative h-[256px] w-full overflow-hidden rounded-xl">
          <img
            alt={`Image for ${track.title}`}
            src={track.coverUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop'}
            className="absolute inset-0 h-full w-full rounded-xl object-cover"
            style={{ transform: 'scale(1)', transition: 'transform 0.3s ease-in-out' }}
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop';
            }}
          />
        </div>

        {/* Overlay avec bouton play */}
        <div className="absolute inset-0 z-20">
          <button 
            onClick={() => onPlay(track)}
            className="flex items-center justify-center h-14 w-14 rounded-full p-4 bg-white/60 backdrop-blur-xl border-none outline-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform duration-300 scale-75 opacity-0 group-hover:opacity-100 group-hover:scale-100"
          >
            <Play className="h-5 w-5" fill="currentColor" />
          </button>

          {/* Badges top */}
          <div className="absolute inset-x-2 top-2 flex flex-row items-center gap-1">
            <div className="flex-row items-center gap-1 rounded-md px-2 py-1 font-sans font-semibold text-[12px] leading-snug backdrop-blur-lg bg-clip-padding text-white bg-black/30 inline-flex w-auto border-none">
              <div>{formatDuration(track.duration)}</div>
            </div>
            {track.isFeatured && (
              <div className="flex-row items-center gap-1 rounded-md px-2 py-1 font-sans font-semibold text-[12px] leading-snug backdrop-blur-lg bg-clip-padding text-foreground-primary-on-dark bg-background-dark-overlay inline-flex w-auto border-none" 
                   style={{ color: 'rgb(253, 66, 156)', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderColor: 'rgba(0, 0, 0, 0)' }}>
                <div>Featured</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info section */}
      <div className="flex w-full flex-col">
        {/* Titre et menu */}
        <div className="line-clamp-1 w-full cursor-pointer font-sans text-base font-medium text-white hover:underline font-500 text-md leading-[24px] font-normal flex items-center justify-between">
          <div className="min-w-0 flex-1 overflow-hidden text-ellipsis">
            <a 
              title={track.title}
              className="block overflow-hidden text-ellipsis whitespace-nowrap"
              href={`/track/${track._id}`}
            >
              {track.title}
            </a>
          </div>
          <button 
            type="button"
            className="cursor-pointer rounded-full outline-none"
            aria-label="More Options"
          >
            <MoreHorizontal className="w-4 h-4 text-white opacity-0 group-hover:opacity-100" />
          </button>
        </div>

        {/* Genres */}
        {track.genre && track.genre.length > 0 && (
          <div className="gap-2 font-sans break-all mb-1 line-clamp-1 flex-nowrap text-gray-400 text-[14px] leading-[20px] font-normal">
            <div>
              {track.genre.slice(0, 3).map((genre, index) => (
                <span key={genre}>
                  <a className="hover:underline" title={genre} href={`/genre/${genre}`}>
                    {genre}
                  </a>
                  {index < Math.min(track.genre!.length, 3) - 1 && ', '}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-1 flex items-center gap-1 text-[12px] text-[#8B8785]">
          <div className="flex cursor-pointer items-center gap-[2px] hover:opacity-80">
            <Play className="h-[12px] w-[12px]" fill="currentColor" />
            <span className="text-[12px] leading-4 font-medium font-normal">
              {formatNumber(track.plays)}
            </span>
          </div>
          <div className="flex cursor-pointer items-center gap-[2px] hover:opacity-80">
            <Heart className="h-[12px] w-[12px]" fill="currentColor" />
            <span className="text-[12px] leading-4 font-medium font-normal">
              {formatNumber(track.likes)}
            </span>
          </div>
          <div className="flex cursor-pointer items-center gap-[2px] hover:opacity-80">
            <MessageCircle className="h-[12px] w-[12px]" fill="currentColor" />
            <span className="text-[12px] leading-4 font-medium font-normal">
              {Math.floor(Math.random() * 50)}
            </span>
          </div>
        </div>

        {/* Artiste */}
        <div className="mt-1 flex w-full items-center justify-between">
          <div className="flex w-fit flex-row items-center gap-2 font-sans text-sm font-medium text-white">
            <div className="relative h-8 shrink-0 aspect-square">
              <a 
                className="hover:underline relative z-10 block aspect-square h-full"
                href={`/profile/${track.artist.username}`}
              >
                <img
                  alt="Profile avatar"
                  src={track.artist.avatar || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop'}
                  className="rounded-full h-full w-full object-cover p-1"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop';
                  }}
                />
              </a>
            </div>
            <a 
              className="hover:underline line-clamp-1 max-w-fit break-all"
              title={track.artist.name}
              href={`/profile/${track.artist.username}`}
            >
              {track.artist.name}
            </a>
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




