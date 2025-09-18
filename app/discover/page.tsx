'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAudioPlayer } from '@/app/providers';
import SeeAllButton from '@/components/SeeAllButton';
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
  X
} from 'lucide-react';

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

  // Fonction pour récupérer les vraies données avec catégories et tri
  const fetchDiscoverData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Utiliser la nouvelle API discover complète - TOUJOURS charger TOUTES les données
      const discoverResponse = await fetch(`/api/discover?category=all&sort=trending&limit=100`);
      if (discoverResponse.ok) {
        const discoverData = await discoverResponse.json();
        
        // Mettre à jour tous les états
        setTracks(discoverData.tracks || []);
        setTrendingArtists(discoverData.artists || []);
        
        console.log('✅ Données discover chargées (TOUTES les données):', {
          total: discoverData.total,
          tracks: discoverData.tracks?.length || 0,
          artists: discoverData.artists?.length || 0
        });
      } else {
        console.log('⚠️ Erreur API discover, utilisation des APIs simplifiées');
        // Fallback vers les APIs simplifiées
        await fetchFallbackData();
      }

    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
      // Fallback vers les APIs simplifiées
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

  // Fonction de fallback avec les APIs simplifiées
  const fetchFallbackData = async () => {
    try {
      console.log('🔍 Récupération des données via APIs simplifiées...');
      
      // Récupérer les artistes tendance (API simplifiée)
      const artistsResponse = await fetch('/api/artists/simple');
      if (artistsResponse.ok) {
        const artistsData = await artistsResponse.json();
        setTrendingArtists(artistsData.artists || []);
        console.log('✅ Artistes tendance:', artistsData.artists?.length || 0);
      } else {
        console.log('⚠️ Erreur API artists, création de données par défaut');
        // Données par défaut en cas d'erreur
        setTrendingArtists([
          {
            _id: '1',
            username: 'artiste1',
            name: 'Artiste 1',
            avatar: '',
            bio: 'Bio par défaut',
            genre: [],
            totalPlays: 0,
            totalLikes: 0,
            followerCount: 0,
            isVerified: false,
            isTrending: false,
            featuredTracks: 0
          }
        ]);
      }

      // Récupérer toutes les tracks pour les catégories (API simplifiée)
      const allTracksResponse = await fetch('/api/tracks/simple');
      if (allTracksResponse.ok) {
        const allTracksData = await allTracksResponse.json();
        setTracks(allTracksData.tracks || []);
        console.log('✅ Toutes les tracks:', allTracksData.tracks?.length || 0);
      }
      
      console.log('✅ Toutes les données récupérées avec succès !');
    } catch (fallbackErr) {
      console.error('Erreur fallback:', fallbackErr);
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

  const loadDiscoverContent = async () => {
    setIsLoading(true);
    try {
      // Simuler le chargement des données
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Données simulées pour la démo
      const mockTracks: Track[] = [
        {
          _id: '1',
          title: 'Neon Dreams',
          artist: { _id: '1', username: 'synthwave', name: 'SynthWave' },
          coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
          duration: 180,
          genre: ['electronic', 'synthwave'],
          plays: 15420,
          likes: 892,
          isFeatured: true,
          isNew: false,
          mood: ['énergique', 'mystérieux'],
          energy: 8
        },
        {
          _id: '2',
          title: 'Urban Flow',
          artist: { _id: '2', username: 'beatmaster', name: 'BeatMaster' },
          coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
          duration: 210,
          genre: ['hiphop', 'trap'],
          plays: 8920,
          likes: 456,
          isFeatured: false,
          isNew: true,
          mood: ['énergique', 'festif'],
          energy: 9
        },
        {
          _id: '3',
          title: 'Crystal Echoes',
          artist: { _id: '3', username: 'ambient', name: 'Ambient Dreams' },
          coverUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop',
          duration: 300,
          genre: ['ambient', 'chill'],
          plays: 2340,
          likes: 234,
          isFeatured: true,
          isNew: false,
          mood: ['relaxant', 'mystérieux'],
          energy: 3
        },
        {
          _id: '4',
          title: 'Midnight Groove',
          artist: { _id: '4', username: 'groovemaster', name: 'Groove Master' },
          coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
          duration: 240,
          genre: ['funk', 'soul'],
          plays: 5670,
          likes: 345,
          isFeatured: true,
          isNew: false,
          mood: ['festif', 'énergique'],
          energy: 7
        },
        {
          _id: '5',
          title: 'Desert Wind',
          artist: { _id: '5', username: 'worldmusic', name: 'World Music' },
          coverUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop',
          duration: 320,
          genre: ['world', 'ethnic'],
          plays: 1890,
          likes: 123,
          isFeatured: false,
          isNew: true,
          mood: ['mystérieux', 'relaxant'],
          energy: 4
        },
        {
          _id: '6',
          title: 'Electric Storm',
          artist: { _id: '6', username: 'electroking', name: 'Electro King' },
          coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
          duration: 195,
          genre: ['electronic', 'dance'],
          plays: 12340,
          likes: 678,
          isFeatured: true,
          isNew: false,
          mood: ['énergique', 'festif'],
          energy: 9
        },
        {
          _id: '7',
          title: 'Jazz Night',
          artist: { _id: '7', username: 'jazzcat', name: 'Jazz Cat' },
          coverUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop',
          duration: 280,
          genre: ['jazz', 'blues'],
          plays: 3450,
          likes: 234,
          isFeatured: false,
          isNew: true,
          mood: ['romantique', 'mystérieux'],
          energy: 5
        },
        {
          _id: '8',
          title: 'Rock Anthem',
          artist: { _id: '8', username: 'rockstar', name: 'Rock Star' },
          coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
          duration: 260,
          genre: ['rock', 'alternative'],
          plays: 9870,
          likes: 567,
          isFeatured: true,
          isNew: false,
          mood: ['énergique', 'festif'],
          energy: 8
        }
      ];

      const mockArtists: Artist[] = [
        {
          _id: '1',
          username: 'synthwave',
          name: 'SynthWave',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop',
          bio: 'Pionnier du synthwave moderne',
          genre: ['electronic', 'synthwave'],
          totalPlays: 154200,
          totalLikes: 8920,
          followerCount: 15420,
          isVerified: true,
          isTrending: true,
          featuredTracks: 3
        },
        {
          _id: '2',
          username: 'beatmaster',
          name: 'BeatMaster',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
          bio: 'Créateur de beats urbains',
          genre: ['hiphop', 'trap'],
          totalPlays: 89200,
          totalLikes: 4560,
          followerCount: 8920,
          isVerified: false,
          isTrending: true,
          featuredTracks: 1
        },
        {
          _id: '3',
          username: 'groovemaster',
          name: 'Groove Master',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
          bio: 'Maître du funk et de la soul',
          genre: ['funk', 'soul'],
          totalPlays: 67800,
          totalLikes: 3450,
          followerCount: 6780,
          isVerified: true,
          isTrending: true,
          featuredTracks: 2
        },
        {
          _id: '4',
          username: 'worldmusic',
          name: 'World Music',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop',
          bio: 'Explorateur des musiques du monde',
          genre: ['world', 'ethnic'],
          totalPlays: 23400,
          totalLikes: 1230,
          followerCount: 2340,
          isVerified: false,
          isTrending: true,
          featuredTracks: 1
        },
        {
          _id: '5',
          username: 'electroking',
          name: 'Electro King',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
          bio: 'Roi de l\'électro et de la dance',
          genre: ['electronic', 'dance'],
          totalPlays: 123400,
          totalLikes: 6780,
          followerCount: 12340,
          isVerified: true,
          isTrending: true,
          featuredTracks: 4
        },
        {
          _id: '6',
          username: 'jazzcat',
          name: 'Jazz Cat',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop',
          bio: 'Virtuose du jazz et du blues',
          genre: ['jazz', 'blues'],
          totalPlays: 45600,
          totalLikes: 2340,
          followerCount: 4560,
          isVerified: false,
          isTrending: true,
          featuredTracks: 2
        }
      ];

      setTracks(mockTracks);
              setTrendingArtists(mockArtists);
    } catch (error) {
      console.error('Erreur chargement discover:', error);
    } finally {
      setIsLoading(false);
    }
  };



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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] pt-0 pb-20 lg:pb-4">
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
        <div className="max-w-7xl mx-auto">
          {/* Mode d'affichage et tri - Style identique à l'accueil */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
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

            <div className="flex items-center gap-4">
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
                 className="flex gap-4 overflow-x-auto pb-4 scroll-smooth"
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

      {/* Contenu principal - Style identique à l'accueil */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="px-2 sm:px-4 md:px-6 pb-16"
      >
        <div className="max-w-7xl mx-auto">
                     {isLoading ? (
             <div className="text-center py-20">
               {/* Spinner ultra-stylisé sans fond blanc */}
               <div className="relative mx-auto mb-8">
                 {/* Cercle de rotation principal avec gradient */}
                 <div className="w-24 h-24 rounded-full border-4 border-transparent border-t-purple-500 border-r-pink-500 border-b-blue-500 border-l-cyan-400 animate-spin"></div>
                 
                 {/* Cercle intérieur avec rotation inverse */}
                 <div className="absolute inset-2 w-20 h-20 rounded-full border-2 border-transparent border-t-pink-400 border-r-purple-400 border-b-cyan-500 border-l-blue-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                 
                 {/* Point central avec pulse */}
                 <div className="absolute inset-8 w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse"></div>
                 
                 {/* Particules orbitales */}
                 <div className="absolute inset-0">
                   <div className="absolute top-0 left-1/2 w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ transform: 'translateX(-50%)' }}></div>
                   <div className="absolute top-1/2 right-0 w-1.5 h-1.5 bg-pink-400 rounded-full animate-ping" style={{ transform: 'translateY(-50%)', animationDelay: '0.3s' }}></div>
                   <div className="absolute bottom-0 left-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" style={{ transform: 'translateX(-50%)', animationDelay: '0.6s' }}></div>
                   <div className="absolute top-1/2 left-0 w-1 h-1 bg-cyan-400 rounded-full animate-ping" style={{ transform: 'translateY(-50%)', animationDelay: '0.9s' }}></div>
                 </div>
               </div>
               
               <p className="text-gray-300 text-lg font-medium">Chargement de la boutique...</p>
               <p className="text-gray-500 text-sm mt-2">Préparation de votre expérience musicale</p>
             </div>
          ) : (
            <>
              {/* Tracks en vedette - Style identique à l'accueil */}
              <div className="mb-16">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '50px' }}
                  transition={{ duration: 0.6 }}
                  className="mb-8"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 bg-yellow-500/10 border border-yellow-500/20">
                        <Crown size={24} className="text-white" />
                      </div>
                                             <div>
                         <h2 className="text-2xl font-bold text-white">Tracks en Vedette</h2>
                         <p className="text-gray-400">Les meilleures créations de la communauté</p>
                       </div>
                    </div>
                    <SeeAllButton type="featured" onClick={openAllModal} />
                  </div>
                </motion.div>

                {viewMode === 'grid' ? (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredTracks.filter(track => track.isFeatured).slice(0, 6).map((track: Track, index: number) => (
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
                          {/* Badge Découverte - Style identique à l'accueil */}
                          {track.isFeatured && (
                            <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs px-2 py-0.5 rounded-full shadow font-semibold z-10 flex items-center gap-1">
                              <Crown size={12} className="inline" />
                              Vedette
                            </div>
                          )}
                          
                          {/* Image - Style identique à l'accueil */}
                          <div className="w-20 h-20 rounded-lg overflow-hidden mb-3 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                            {track.coverUrl ? (
                              <img
                                src={track.coverUrl}
                                alt={track.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                                {track.title.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          
                          {/* Titre - Style identique à l'accueil */}
                          <h3 className="font-semibold text-white text-sm mb-1 truncate">
                            {track.title}
                          </h3>
                          
                          {/* Artiste - Style identique à l'accueil */}
                          <p className="text-gray-300 text-xs mb-2 truncate">
                            {track.artist.name}
                          </p>
                          
                          {/* Durée + Bouton play - Style identique à l'accueil */}
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
                              <Play size={14} fill="white" className="ml-0.5" />
                            </motion.button>
                          </div>
                          
                          {/* Stats - Style identique à l'accueil */}
                          <div className="flex items-center justify-between w-full pt-2 border-t border-gray-700 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <Headphones size={12} />
                              {formatNumber(track.plays)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart size={12} />
                              {formatNumber(track.likes)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
            </div>
          ) : (
                  <div className="space-y-2">
                    {filteredTracks.filter(track => track.isFeatured).slice(0, 5).map((track: Track, index: number) => (
                <motion.div
                        key={track._id}
                  initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '50px' }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        whileHover={{ x: 2, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                        onClick={() => handlePlayTrack(track)}
                        className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm border border-gray-700 rounded-lg group cursor-pointer transition-all hover:shadow-lg"
                      >
                        {track.coverUrl ? (
                          <img
                            src={track.coverUrl}
                      alt={track.title}
                            className="w-12 h-12 rounded-lg object-cover"
                      onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {track.title.charAt(0).toUpperCase()}
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white text-sm truncate">{track.title}</h3>
                          <p className="text-gray-400 text-xs truncate">{track.artist.name}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatDuration(track.duration)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Headphones size={12} />
                              {formatNumber(track.plays)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart size={12} />
                              {formatNumber(track.likes)}
                            </span>
                          </div>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePlayTrack(track)}
                          className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white hover:from-purple-600 hover:to-pink-600 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                        >
                          <Play size={16} />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Artistes tendance - Style identique à l'accueil */}
              <div className="mb-16">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '50px' }}
                  transition={{ duration: 0.6 }}
                  className="mb-8"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 bg-green-500/10 border border-green-500/20">
                        <TrendingUp size={24} className="text-white" />
                      </div>
                                             <div>
                         <h2 className="text-2xl font-bold text-white">Artistes Tendance</h2>
                         <p className="text-gray-400">Les artistes qui montent en flèche</p>
                       </div>
                    </div>
                    <SeeAllButton type="artists" onClick={openAllModal} />
                  </div>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {trendingArtists.filter(artist => 
                    // Afficher l'artiste seulement s'il a des tracks dans la catégorie sélectionnée
                    selectedCategory === 'all' || 
                    filteredTracks.some(track => track.artist._id === artist._id)
                  ).map((artist, index) => (
                    <motion.div
                      key={artist._id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '50px' }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="group cursor-pointer"
                    >
                      <div className="relative rounded-xl overflow-hidden bg-white/10 dark:bg-gray-800/60 border border-gray-700 hover:shadow-xl hover:scale-105 transition-all duration-200 p-4 text-center">
                        {/* Badge Vérifié - Style identique à l'accueil */}
                        {artist.isVerified && (
                          <div className="absolute top-3 right-3 bg-gradient-to-r from-blue-400 to-cyan-400 text-white text-xs px-2 py-0.5 rounded-full shadow font-semibold z-10 flex items-center gap-1">
                            <Star size={12} className="inline" />
                            Vérifié
                      </div>
                    )}

                        {/* Avatar - Style identique à l'accueil */}
                        <div className="w-20 h-20 rounded-lg overflow-hidden mb-3 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20 mx-auto">
                          {artist.avatar && artist.avatar.trim() !== '' ? (
                            <img
                              src={artist.avatar}
                              alt={artist.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                              {artist.name.charAt(0).toUpperCase()}
                    </div>
                          )}
                  </div>

                        {/* Nom - Style identique à l'accueil */}
                        <h3 className="font-semibold text-white text-sm mb-1 truncate">
                          {artist.name}
                        </h3>
                        
                        {/* Bio - Style identique à l'accueil */}
                        <p className="text-gray-300 text-xs mb-3 line-clamp-2 leading-tight">
                          {artist.bio}
                        </p>
                        
                        {/* Stats - Style identique à l'accueil */}
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
                        
                        {/* Bouton - Style identique à l'accueil */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => window.location.href = `/profile/${artist.username}`}
                          className="w-full py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm text-purple-300 text-xs rounded-lg hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300 border border-purple-500/30 hover:border-purple-500/50"
                        >
                          Voir le profil
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                    </div>
                  </div>

              {/* Nouveautés - Style identique à l'accueil */}
              <div className="mb-16">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '50px' }}
                  transition={{ duration: 0.6 }}
                  className="mb-8"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 bg-yellow-500/10 border border-yellow-500/20">
                        <Zap size={24} className="text-white" />
                      </div>
                                             <div>
                         <h2 className="text-2xl font-bold text-white">Nouveautés</h2>
                         <p className="text-gray-400">Les dernières créations de la communauté</p>
                       </div>
                    </div>
                    <SeeAllButton type="new" onClick={openAllModal} />
                  </div>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredTracks.filter(track => {
                    // Une track est "nouvelle" si isNew est true OU si elle a été créée dans les 30 derniers jours
                    if (track.isNew) return true;
                    if (track.createdAt) {
                      const trackDate = new Date(track.createdAt);
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                      return trackDate > thirtyDaysAgo;
                    }
                    return false;
                  }).slice(0, 6).map((track: Track, index: number) => (
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
                        {/* Badge Nouveau - Style identique à l'accueil */}
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-green-400 to-emerald-400 text-white text-xs px-2 py-0.5 rounded-full shadow font-semibold z-10 flex items-center gap-1">
                          <Zap size={12} className="inline" />
                          Nouveau
                        </div>
                        
                        {/* Image - Style identique à l'accueil */}
                        <div className="w-20 h-20 rounded-lg overflow-hidden mb-3 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                          <img
                            src={track.coverUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop'}
                            alt={track.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/default-cover.jpg';
                            }}
                          />
                        </div>
                        
                        {/* Titre - Style identique à l'accueil */}
                        <h3 className="font-semibold text-white text-sm mb-1 truncate">
                      {track.title}
                    </h3>
                        
                        {/* Artiste - Style identique à l'accueil */}
                        <p className="text-gray-300 text-xs mb-2 truncate">
                          {track.artist.name}
                        </p>
                        
                        {/* Durée + Bouton play - Style identique à l'accueil */}
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
                            <Play size={14} fill="white" className="ml-0.5" />
                          </motion.button>
                        </div>
                        
                        {/* Stats - Style identique à l'accueil */}
                        <div className="flex items-center justify-between w-full pt-2 border-t border-gray-700 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Headphones size={12} />
                            {formatNumber(track.plays)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart size={12} />
                            {formatNumber(track.likes)}
                      </div>
                      </div>
                    </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Tendances du Moment - Style identique à l'accueil */}
              <div className="mb-16">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '50px' }}
                  transition={{ duration: 0.6 }}
                  className="mb-8"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 bg-orange-500/10 border border-orange-500/20">
                        <TrendingUp size={24} className="text-white" />
                      </div>
                                             <div>
                         <h2 className="text-2xl font-bold text-white">Tendances du Moment</h2>
                         <p className="text-gray-400">Ce qui fait vibrer la communauté en ce moment</p>
                       </div>
                    </div>
                    <SeeAllButton type="trending" onClick={openAllModal} />
                  </div>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredTracks.filter(track => track.plays > 30).slice(0, 6).map((track, index) => (
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
                        {/* Badge Tendance - Style identique à l'accueil */}
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-400 to-red-400 text-white text-xs px-2 py-0.5 rounded-full shadow font-semibold z-10 flex items-center gap-1">
                          <TrendingUp size={12} className="inline" />
                          Tendance
                        </div>
                        
                        {/* Image - Style identique à l'accueil */}
                        <div className="w-20 h-20 rounded-lg overflow-hidden mb-3 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                          {track.coverUrl ? (
                            <img
                              src={track.coverUrl}
                              alt={track.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                              {track.title.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        
                        {/* Titre - Style identique à l'accueil */}
                        <h3 className="font-semibold text-white text-sm mb-1 truncate">
                          {track.title}
                        </h3>
                        
                        {/* Artiste - Style identique à l'accueil */}
                        <p className="text-gray-300 text-xs mb-2 truncate">
                          {track.artist.name}
                        </p>
                        
                        {/* Genres - Style identique à l'accueil */}
                        {track.genre && track.genre.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {track.genre.slice(0, 2).map((genre: string, index: number) => (
                              <span
                                key={index}
                                className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full border border-purple-500/30"
                              >
                                {genre}
                              </span>
              ))}
            </div>
          )}
                        
                        {/* Durée + Bouton play - Style identique à l'accueil */}
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
                            <Play size={14} fill="white" className="ml-0.5" />
                          </motion.button>
                        </div>
                        
                        {/* Stats - Style identique à l'accueil */}
                        <div className="flex items-center justify-between w-full pt-2 border-t border-gray-700 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                            <Headphones size={12} />
                            {formatNumber(track.plays)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart size={12} />
                            {formatNumber(track.likes)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
              </div>
            </>
          )}
        </div>
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
              className="bg-gray-900 rounded-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-hidden"
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto max-h-[60vh]">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto max-h-[60vh]">
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




