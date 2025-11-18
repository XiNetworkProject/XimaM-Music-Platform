'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { 
  Music, 
  Star, 
  TrendingUp, 
  Heart, 
  Play, 
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
  Mic,
  Users,
  Globe,
  X,
  MessageCircle,
  LogIn
} from 'lucide-react';
import { MUSIC_GENRES, GENRE_CATEGORIES } from '@/lib/genres';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

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
  tracks?: Track[];
}

interface PreferenceProfile {
  artistScores: Record<string, number>;
  genreScores: Record<string, number>;
  recencyPreference: number;
  trackCount: number;
}

const normalizeScoresMap = (map: Map<string, number>) => {
  const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1;
  const record: Record<string, number> = {};
  entries.forEach(([key, value]) => {
    record[key] = value / total;
  });
  return record;
};

const buildPreferenceProfile = (tracks: Track[]): PreferenceProfile | null => {
  if (!tracks || tracks.length === 0) return null;

  const artistWeights = new Map<string, number>();
  const genreWeights = new Map<string, number>();
  const now = Date.now();
  let recencyAccumulator = 0;

  tracks.forEach((track, index) => {
    const weight = 1 + (tracks.length - index) / tracks.length;
    if (track.artist?._id) {
      artistWeights.set(
        track.artist._id,
        (artistWeights.get(track.artist._id) || 0) + weight,
      );
    }
    const genres = Array.isArray(track.genre)
      ? track.genre
      : track.genre
      ? [track.genre]
      : [];
    genres.forEach((genre) => {
      const key = genre?.trim()?.toLowerCase();
      if (!key) return;
      genreWeights.set(key, (genreWeights.get(key) || 0) + weight);
    });
    if (track.createdAt) {
      const release = new Date(track.createdAt).getTime();
      const recency = Math.max(
        0,
        1 - (now - release) / (1000 * 60 * 60 * 24 * 365),
      );
      recencyAccumulator += recency;
    }
  });

  return {
    artistScores: normalizeScoresMap(artistWeights),
    genreScores: normalizeScoresMap(genreWeights),
    recencyPreference: recencyAccumulator / tracks.length,
    trackCount: tracks.length,
  };
};

const scoreTrackForProfile = (
  track: Track,
  profile?: PreferenceProfile | null,
) => {
  const basePopularity =
    Math.log10((track.plays || 0) + 1) * 0.6 +
    ((track.likes || 0) * 0.005);
  if (!profile) return basePopularity;

  let personalization = 0;
  if (track.artist?._id && profile.artistScores[track.artist._id]) {
    personalization += 2 * profile.artistScores[track.artist._id];
  }

  const genres = Array.isArray(track.genre)
    ? track.genre
    : track.genre
    ? [track.genre]
    : [];
  genres.forEach((genre) => {
    const key = genre?.trim()?.toLowerCase();
    if (key && profile.genreScores[key]) {
      personalization += 1.2 * profile.genreScores[key];
    }
  });

  if (track.createdAt) {
    const now = Date.now();
    const days =
      (now - new Date(track.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, 1 - days / 180);
    personalization += recencyBoost * profile.recencyPreference;
  }

  return basePopularity + personalization;
};

const scoreArtistForProfile = (
  artist: Artist,
  profile?: PreferenceProfile | null,
) => {
  const base =
    Math.log10((artist.totalPlays || 0) + 1) +
    (artist.totalLikes || 0) * 0.002 +
    (artist.followerCount || 0) * 0.01;
  if (!profile) return base;

  const trackScores = (artist.tracks || []).map((t) =>
    scoreTrackForProfile(t, profile),
  );
  const avgTrackScore =
    trackScores.reduce((sum, score) => sum + score, 0) /
      (trackScores.length || 1) || 0;

  const genreBoost =
    artist.genre?.reduce((sum, g) => {
      const key = g?.toLowerCase?.();
      return sum + (key ? profile.genreScores[key] || 0 : 0);
    }, 0) || 0;

  return base + avgTrackScore + genreBoost;
};

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
  const { data: session } = useSession();
  const { playTrack } = useAudioPlayer();

  // Data
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trendingArtists, setTrendingArtists] = useState<Artist[]>([]);
  const [personalizedArtists, setPersonalizedArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferenceProfile, setPreferenceProfile] = useState<PreferenceProfile | null>(null);

  // UI / filtre
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'trending' | 'newest' | 'popular' | 'featured'>('trending');

  // Compteurs par genre
  const [categoryCounts, setCategoryCounts] = useState<{[key: string]: number}>({});

  // Modales "Voir tout"
  const [showAllModal, setShowAllModal] = useState(false);
  const [modalType, setModalType] = useState<'featured' | 'new' | 'trending' | 'artists' | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalTracks, setModalTracks] = useState<Track[]>([]);
  const [modalArtists, setModalArtists] = useState<Artist[]>([]);

  // Calcul des compteurs par genre lorsque les tracks changent
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
    } else {
      setCategoryCounts({});
    }
  }, [tracks]);

  // Catégories (base)
  const baseCategories: Category[] = [
    { id: 'all', name: 'Toutes', icon: <Compass size={18} />, color: 'from-blue-500 to-purple-600', description: 'Découvrez tout le contenu', trackCount: 0 },
    { id: 'Electronic', name: 'Électronique', icon: <Zap size={18} />, color: 'from-purple-500 to-pink-600', description: 'Beats et synthés futuristes', trackCount: 0 },
    { id: 'Pop', name: 'Pop', icon: <Music size={18} />, color: 'from-pink-500 to-purple-600', description: 'Mélodies accrocheuses', trackCount: 0 },
    { id: 'Hip-Hop', name: 'Hip-Hop', icon: <Flame size={18} />, color: 'from-orange-500 to-red-600', description: 'Rap et beats urbains', trackCount: 0 },
    { id: 'Classical', name: 'Classique', icon: <Crown size={18} />, color: 'from-yellow-500 to-orange-600', description: 'Musique orchestrale', trackCount: 0 },
    { id: 'Rock', name: 'Rock', icon: <Target size={18} />, color: 'from-red-500 to-yellow-600', description: 'Guitares et énergie brute', trackCount: 0 },
    { id: 'Jazz', name: 'Jazz', icon: <Gem size={18} />, color: 'from-indigo-500 to-blue-600', description: 'Improvisation et swing', trackCount: 0 },
    { id: 'R&B', name: 'R&B', icon: <Heart size={18} />, color: 'from-pink-500 to-red-600', description: 'Soul et rythmes blues', trackCount: 0 },
    { id: 'Lo-Fi', name: 'Lo-Fi', icon: <Headphones size={18} />, color: 'from-blue-400 to-purple-500', description: 'Beats chill & study', trackCount: 0 },
    { id: 'Ambient', name: 'Ambient', icon: <Globe size={18} />, color: 'from-blue-400 to-cyan-500', description: 'Ambient relaxant', trackCount: 0 },
    { id: 'Trap', name: 'Trap', icon: <Music size={18} />, color: 'from-purple-600 to-pink-500', description: 'Trap moderne', trackCount: 0 },
    { id: 'House', name: 'House', icon: <Music size={18} />, color: 'from-blue-500 to-purple-500', description: 'House & dance', trackCount: 0 },
    { id: 'Drum & Bass', name: 'Drum & Bass', icon: <Music size={18} />, color: 'from-orange-500 to-red-500', description: 'D&B énergique', trackCount: 0 },
    { id: 'Orchestral', name: 'Orchestral', icon: <Globe size={18} />, color: 'from-purple-500 to-blue-500', description: 'Épique & cinématique', trackCount: 0 },
    { id: 'Chill', name: 'Chill', icon: <Sparkles size={18} />, color: 'from-blue-300 to-cyan-400', description: 'Ambiances calmes', trackCount: 0 },
  ];

  // Catégories enrichies avec le nombre de tracks
  const categories = useMemo(() => {
    return baseCategories.map(cat => ({
      ...cat,
      trackCount: cat.id === 'all'
        ? tracks.length
        : (categoryCounts[cat.id] || 0),
    }));
  }, [baseCategories, categoryCounts, tracks.length]);

  // On affiche seulement les catégories qui ont des tracks (sauf "Toutes")
  const visibleCategories = useMemo(
    () => categories.filter(cat => cat.id === 'all' || cat.trackCount > 0),
    [categories]
  );

  // Helpers
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
  };

  const isNewTrack = (track: Track) => {
    if (track.isNew) return true;
    if (track.createdAt) {
      const trackDate = new Date(track.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return trackDate > thirtyDaysAgo;
    }
    return false;
  };

  // Tracks dérivées (en vedette, tendances, nouveautés)
  const featuredTracks = useMemo(
    () => tracks.filter(t => t.isFeatured),
    [tracks]
  );

  const newTracks = useMemo(
    () => tracks.filter(isNewTrack),
    [tracks]
  );

  const trendingTracks = useMemo(
    () => tracks.filter(t => (t.plays || 0) > 30),
    [tracks]
  );

  // Stats globales pour le header Discover
  const totalTracks = tracks.length;
  const totalArtists = useMemo(() => {
    const ids = new Set<string>();
    tracks.forEach(t => {
      if (t.artist?._id) ids.add(t.artist._id);
      else if (t.artist?.username) ids.add(t.artist.username);
    });
    return ids.size;
  }, [tracks]);

  const totalActiveGenres = useMemo(() => {
    const genres = new Set<string>();
    tracks.forEach(t => {
      t.genre?.forEach(g => genres.add(g));
    });
    return genres.size;
  }, [tracks]);

  // Filtrage & tri des tracks
  const filteredTracks = useMemo(() => {
    let filtered = tracks;

    if (selectedCategory && selectedCategory !== 'all') {
      const categoryData = categories.find(cat => cat.id === selectedCategory);
      if (categoryData && categoryData.name in GENRE_CATEGORIES) {
        const categoryGenres = GENRE_CATEGORIES[categoryData.name as keyof typeof GENRE_CATEGORIES] as readonly string[];
        filtered = tracks.filter(track =>
          track.genre &&
          Array.isArray(track.genre) &&
          track.genre.some(g => categoryGenres.includes(g))
        );
      } else {
        filtered = tracks.filter(track =>
          track.genre &&
          Array.isArray(track.genre) &&
          track.genre.includes(selectedCategory)
        );
      }
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'trending':
          return (b.plays || 0) - (a.plays || 0);
        case 'newest': {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        }
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

    return sorted;
  }, [tracks, selectedCategory, sortBy, categories]);

  // Fetch des données
  const fetchDiscoverData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Tracks principales
      const tracksResponse = await fetch('/api/tracks?limit=100', {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
        },
      });

      let allTracks: Track[] = [];

      if (tracksResponse.ok) {
        const tracksData = await tracksResponse.json();
        allTracks = tracksData.tracks || tracksData || [];
      }

      // Fallback si aucune track
      if (allTracks.length === 0) {
        await fetchFallbackData();
      } else {
        setTracks(allTracks);

        const tracksByArtist = allTracks.reduce<Map<string, Track[]>>((map, track) => {
          const artistId = track.artist?._id;
          if (!artistId) return map;
          if (!map.has(artistId)) {
            map.set(artistId, []);
          }
          map.get(artistId)!.push(track);
          return map;
        }, new Map());

        // Artistes
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
              featuredTracks: user.featured_tracks || 0,
              tracks: tracksByArtist.get(user._id || user.id) || [],
            }));
            setTrendingArtists(artists);
          }
        } catch {
          // artistes non bloquants
        }
      }
    } catch (err) {
      setError('Erreur lors du chargement des données');
      await fetchFallbackData();
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback si les vraies APIs ne renvoient rien
  const fetchFallbackData = async () => {
    try {
      const trackApis = ['/api/tracks/recent', '/api/tracks/popular', '/api/tracks/trending'];
      let allTracks: Track[] = [];

      for (const api of trackApis) {
        try {
          const response = await fetch(`${api}?limit=50`);
          if (response.ok) {
            const data = await response.json();
            const t = data.tracks || data || [];
            allTracks = [...allTracks, ...t];
          }
        } catch {
          // ignore
        }
      }

      const uniqueTracks = allTracks.filter(
        (track, index, self) => index === self.findIndex(t => t._id === track._id)
      );

      if (uniqueTracks.length > 0) {
        setTracks(uniqueTracks);
      } else {
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
            audioUrl: '#',
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
            audioUrl: '#',
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
            audioUrl: '#',
          },
        ];
        setTracks(testTracks);
      }

      try {
        const usersResponse = await fetch('/api/users?limit=20');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          const users = usersData.users || usersData || [];
          const tracksByArtist = uniqueTracks.reduce<Map<string, Track[]>>((map, track) => {
            const artistId = track.artist?._id;
            if (!artistId) return map;
            if (!map.has(artistId)) {
              map.set(artistId, []);
            }
            map.get(artistId)!.push(track);
            return map;
          }, new Map());

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
            featuredTracks: user.featured_tracks || 0,
            tracks: tracksByArtist.get(user._id || user.id) || [],
          }));
          setTrendingArtists(artists);
        }
      } catch {
        // ignore
      }
    } catch (fallbackErr) {
      console.error('Erreur fallback:', fallbackErr);
    }
  };

  // Chargement initial
  useEffect(() => {
    fetchDiscoverData();
  }, []);

  useEffect(() => {
    const buildProfile = async () => {
      if (!tracks.length) {
        setPreferenceProfile(null);
        return;
      }

      let seedTracks = tracks;

      if (session?.user?.id) {
        try {
          const likedRes = await fetch('/api/tracks?liked=true&limit=150', {
            cache: 'no-store',
          });
          if (likedRes.ok) {
            const likedJson = await likedRes.json();
            const likedTracks = likedJson?.tracks || [];
            if (likedTracks.length) {
              seedTracks = likedTracks;
            }
          }
        } catch (error) {
          console.error('Erreur récupération likes pour profil:', error);
        }
      }

      const profile = buildPreferenceProfile(seedTracks);
      setPreferenceProfile(profile);
    };

    buildProfile();
  }, [session?.user?.id, tracks]);

  useEffect(() => {
    if (!trendingArtists.length) {
      setPersonalizedArtists([]);
      return;
    }
    if (!preferenceProfile) {
      setPersonalizedArtists(trendingArtists);
      return;
    }

    const sorted = [...trendingArtists].sort(
      (a, b) =>
        scoreArtistForProfile(b, preferenceProfile) -
        scoreArtistForProfile(a, preferenceProfile),
    );
    setPersonalizedArtists(sorted);
  }, [trendingArtists, preferenceProfile]);

  // Mise à jour temps réel des plays
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

  const handlePlayTrack = async (track: Track) => {
    try {
      const response = await fetch(`/api/tracks/${track._id}`);
      if (response.ok) {
        const trackData = await response.json();
        const audioUrl = trackData.audioUrl;
        if (audioUrl) {
          playTrack(track as any);
        } else {
          alert("Cette track n'a pas d'audio disponible.");
        }
      } else {
        alert('Impossible de récupérer les informations de cette track.');
      }
    } catch (error) {
      alert('Erreur lors de la lecture de la track.');
    }
  };

  const handleArtistClick = (artist: Artist) => {
    router.push(`/profile/${artist.username}`, { scroll: false });
  };

  // Modales "Voir tout"
  const openAllModal = (type: 'featured' | 'new' | 'trending' | 'artists') => {
    let tracksToShow: Track[] = [];
    let artistsToShow: Artist[] = [];
    let title = '';

    switch (type) {
      case 'featured':
        tracksToShow = featuredTracks;
        title = 'Toutes les Tracks en Vedette';
        break;
      case 'new':
        tracksToShow = newTracks;
        title = 'Toutes les Nouvelles Tracks';
        break;
      case 'trending':
        tracksToShow = trendingTracks;
        title = 'Toutes les Tracks Tendance';
        break;
      case 'artists':
        artistsToShow = personalizedArtists;
        title = 'Tous les Artistes en Tendance';
        break;
    }

    setModalType(type);
    setModalTitle(title);
    setModalTracks(tracksToShow);
    setModalArtists(artistsToShow);
    setShowAllModal(true);
  };

  return (
    <div className="min-h-screen bg-transparent text-[var(--text)] pb-20 lg:pb-4 overflow-x-hidden w-full">
      {/* Bannière connexion pour utilisateurs non connectés */}
      {!session && (
        <div className="w-full px-2 sm:px-4 md:px-6 pt-6 sm:pt-8 pb-2">
          <div className="w-full max-w-7xl mx-auto mb-4">
            <div className="p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <LogIn className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Accès limité</h3>
                    <p className="text-sm text-white/70">
                      Connectez-vous pour accéder aux playlists personnalisées, likes, et plus encore.
                    </p>
                  </div>
                </div>
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium whitespace-nowrap"
                >
                  Se connecter
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Discover + filtres principaux */}
      <div className="w-full px-2 sm:px-4 md:px-6 pt-4 sm:pt-4 pb-4">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[11px] text-[var(--text-muted)] mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Mode Découverte • Synaura</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)]">
                Découvrir
              </h1>
              <p className="text-[var(--text-muted)] text-sm sm:text-base mt-1">
                Explore les dernières créations de la communauté, par genre, tendance ou humeur.
              </p>
              {totalTracks > 0 && (
                <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-[var(--text-muted)]">
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)]">
                    <Music className="w-3.5 h-3.5" />
                    <span>{totalTracks} morceaux</span>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)]">
                    <Users className="w-3.5 h-3.5" />
                    <span>{totalArtists} artistes</span>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)]">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{totalActiveGenres} genres actifs</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div className="hidden sm:flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-full p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-full flex items-center justify-center ${
                    viewMode === 'grid'
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
                  }`}
                  aria-label="Vue grille"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-full flex items-center justify-center ${
                    viewMode === 'list'
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
                  }`}
                  aria-label="Vue liste"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              >
                <option value="trending">Tendances</option>
                <option value="newest">Nouveautés</option>
                <option value="popular">Populaires</option>
                <option value="featured">En vedette</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de genres / catégories */}
      <div className="px-2 sm:px-4 md:px-6 mb-6">
        <div className="w-full max-w-7xl mx-auto">
          <div className="mb-2 flex w-full flex-row justify-between pb-1">
            <div className="flex items-center gap-2">
              <h2 className="font-sans font-semibold text-[18px] leading-[24px] pb-1 text-[var(--text)]">
                Genres & filtres
              </h2>
            </div>
          </div>
          <div className="relative w-full overflow-hidden">
            <div className="h-full w-full overflow-hidden [mask-image:linear-gradient(to_right,black,black_92%,transparent)] [mask-size:100%_100%] transition-[mask-image] duration-500">
              <div
                id="genres-scroll"
                className="flex gap-2 sm:gap-3 overflow-x-auto pb-3 scroll-smooth [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none' }}
              >
                {visibleCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex-shrink-0 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 border ${
                      selectedCategory === category.id
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md shadow-[var(--accent)]/30'
                        : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)] border-[var(--border)]'
                    }`}
                  >
                    <span className="hidden sm:inline-block">{category.icon}</span>
                    <span>{category.name}</span>
                    {category.trackCount > 0 && (
                      <span
                        className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                          selectedCategory === category.id
                            ? 'bg-white/15'
                            : 'bg-black/20 text-[var(--text-muted)]'
                        }`}
                      >
                        {category.trackCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-2 sm:px-4 md:px-6 pb-16"
      >
        {isLoading ? (
          <div className="text-center py-20">
            <div className="relative mx-auto mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-transparent border-t-purple-500 border-r-pink-500 border-b-blue-500 border-l-cyan-400 animate-spin" />
              <div
                className="absolute inset-3 w-14 h-14 rounded-full border-2 border-transparent border-t-pink-400 border-r-purple-400 border-b-cyan-500 border-l-blue-400 animate-spin"
                style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
              />
              <div className="absolute inset-7 w-6 h-6 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse" />
            </div>
            <p className="text-gray-300 text-base font-medium">
              Chargement des recommandations...
            </p>
          </div>
        ) : tracks.length === 0 ? (
          <div className="w-full max-w-7xl mx-auto text-center py-20 text-[var(--text-muted)]">
            <p className="text-lg font-medium mb-2">Aucun morceau à afficher pour l’instant.</p>
            <p className="text-sm">Commence par générer ou uploader des musiques dans le studio Synaura.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {selectedCategory === 'all' ? (
              <>
                {/* Sections curated globales */}
                <div className="w-full max-w-7xl mx-auto space-y-8">
                  {featuredTracks.length > 0 && (
                    <GenreSection
                      title="En vedette"
                      subtitle="Les morceaux mis en avant par la communauté Synaura"
                      icon={<Star className="w-4 h-4 text-yellow-400" />}
                      tracks={featuredTracks.slice(0, 20)}
                      onPlayTrack={handlePlayTrack}
                      onSeeAll={() => openAllModal('featured')}
                    />
                  )}

                  {trendingTracks.length > 0 && (
                    <GenreSection
                      title="Tendances"
                      subtitle="Ce qui tourne le plus en ce moment"
                      icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
                      tracks={trendingTracks.slice(0, 20)}
                      onPlayTrack={handlePlayTrack}
                      onSeeAll={() => openAllModal('trending')}
                    />
                  )}

                  {newTracks.length > 0 && (
                    <GenreSection
                      title="Nouveautés"
                      subtitle="Les dernières sorties de la communauté"
                      icon={<Sparkles className="w-4 h-4 text-sky-400" />}
                      tracks={newTracks.slice(0, 20)}
                      onPlayTrack={handlePlayTrack}
                      onSeeAll={() => openAllModal('new')}
                    />
                  )}

                  {personalizedArtists.length > 0 && (
                    <section className="w-full">
                      <div className="mb-2 flex w-full flex-row justify-between pb-1">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-[var(--accent)]" />
                          <h2 className="font-sans font-semibold text-[18px] leading-[24px] text-[var(--text)]">
                            Artistes en tendance
                          </h2>
                        </div>
                        <button
                          onClick={() => openAllModal('artists')}
                          className="hidden sm:inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent)]"
                        >
                          Voir tout
                        </button>
                      </div>
                      <div className="w-full overflow-hidden">
                        <div className="flex gap-3 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                          {personalizedArtists.slice(0, 12).map((artist) => (
                            <button
                              key={artist._id}
                              onClick={() => handleArtistClick(artist)}
                              className="flex-shrink-0 w-[140px] sm:w-[160px] rounded-xl bg-[var(--surface-2)] border border-[var(--border)] p-3 text-left hover:bg-[var(--surface-3)] transition-colors"
                            >
                              <div className="w-12 h-12 rounded-full overflow-hidden mb-2 bg-gradient-to-br from-purple-500/30 to-pink-500/30">
                                {artist.avatar && artist.avatar.trim() !== '' ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={(artist.avatar || '').replace('/upload/', '/upload/f_auto,q_auto/')}
                                    alt={artist.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                                    {artist.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <p className="text-[13px] font-semibold text-[var(--text)] truncate">
                                {artist.name}
                              </p>
                              <p className="text-[11px] text-[var(--text-muted)] truncate">
                                @{artist.username}
                              </p>
                              <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                                <span className="inline-flex items-center gap-1">
                                  <Headphones className="w-3 h-3" />
                                  {formatNumber(artist.totalPlays)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Heart className="w-3 h-3" />
                                  {formatNumber(artist.totalLikes)}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}
                </div>

                {/* Explorer par genre */}
                <div className="w-full max-w-7xl mx-auto">
                  <div className="mt-4 mb-2 flex w-full flex-row justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[var(--accent)]" />
                      <h2 className="font-sans font-semibold text-[18px] leading-[24px] text-[var(--text)]">
                        Explorer par genre
                      </h2>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {MUSIC_GENRES.map((genre) => {
                      const genreTracks = tracks.filter(
                        (track) =>
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
                </div>
              </>
            ) : (
              // Vue d'une catégorie précise
              <div className="w-full max-w-7xl mx-auto space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                  {(() => {
                    const cat = categories.find(c => c.id === selectedCategory);
                    return (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {cat?.icon}
                          <h2 className="text-xl font-semibold text-[var(--text)]">
                            {cat?.name || selectedCategory}
                          </h2>
                        </div>
                        {cat?.description && (
                          <p className="text-xs text-[var(--text-muted)]">
                            {cat.description}
                          </p>
                        )}
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">
                          {filteredTracks.length} morceau(x) • triés par{' '}
                          {sortBy === 'trending'
                            ? 'tendances'
                            : sortBy === 'newest'
                            ? 'date'
                            : sortBy === 'popular'
                            ? 'popularité'
                            : 'mise en avant'}
                        </p>
                      </div>
                    );
                  })()}

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-full p-1">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-full flex items-center justify-center ${
                          viewMode === 'grid'
                            ? 'bg-[var(--accent)] text-white'
                            : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
                        }`}
                        aria-label="Vue grille"
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-full flex items-center justify-center ${
                          viewMode === 'list'
                            ? 'bg-[var(--accent)] text-white'
                            : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
                        }`}
                        aria-label="Vue liste"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {filteredTracks.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] mt-4">
                    Aucun morceau dans cette catégorie pour le moment.
                  </p>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filteredTracks.map((track) => (
                      <TrackCard key={track._id} track={track} onPlay={handlePlayTrack} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTracks.map((track) => (
                      <TrackListRow
                        key={track._id}
                        track={track}
                        onPlay={handlePlayTrack}
                        formatDuration={formatDuration}
                        formatNumber={formatNumber}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Modale "Voir tout" */}
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
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">{modalTitle}</h2>
                <button
                  onClick={() => setShowAllModal(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>

              {modalType === 'artists' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 overflow-y-auto max-h-[60vh]">
                  {modalArtists.map((artist: Artist) => (
                    <div
                      key={artist._id}
                      className="bg-white/5 rounded-xl p-4 border border-[var(--border)] text-center"
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden mb-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 mx-auto">
                        {artist.avatar && artist.avatar.trim() !== '' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={(artist.avatar || '').replace('/upload/', '/upload/f_auto,q_auto/')}
                            alt={artist.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {artist.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-white text-sm mb-1 truncate">
                        {artist.name}
                      </h3>
                      <p className="text-gray-300 text-xs mb-2 truncate">@{artist.username}</p>
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
                      <button
                        onClick={() => router.push(`/profile/${artist.username}`, { scroll: false })}
                        className="w-full py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-200 text-xs rounded-lg hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300 border border-purple-500/30 hover:border-purple-500/50"
                      >
                        Voir le profil
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 overflow-y-auto max-h-[60vh]">
                  {modalTracks.map((track: Track) => (
                    <div
                      key={track._id}
                      className="bg-white/5 rounded-xl p-4 border border-[var(--border)]"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden mb-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        {track.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={(track.coverUrl || '').replace('/upload/', '/upload/f_auto,q_auto/')}
                            alt={track.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {track.title.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-white text-sm mb-1 truncate">
                        {track.title}
                      </h3>
                      <p className="text-gray-300 text-xs mb-2 truncate">
                        {track.artist.name}
                      </p>
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

/* ---------- Sections & Cards ---------- */

interface GenreSectionProps {
  title: string;
  tracks: Track[];
  onPlayTrack: (track: Track) => void;
  subtitle?: string;
  icon?: React.ReactNode;
  onSeeAll?: () => void;
}

const GenreSection: React.FC<GenreSectionProps> = ({
  title,
  tracks,
  onPlayTrack,
  subtitle,
  icon,
  onSeeAll,
}) => {
  const sectionId = `section-${title.toLowerCase().replace(/\s+/g, '-')}`;

  const scrollLeft = () => {
    const section = document.getElementById(sectionId);
    if (section) section.scrollBy({ left: -300, behavior: 'smooth' });
  };

  const scrollRight = () => {
    const section = document.getElementById(sectionId);
    if (section) section.scrollBy({ left: 300, behavior: 'smooth' });
  };

  if (!tracks.length) return null;

  return (
    <section className="w-full max-w-none sm:max-w-7xl sm:mx-auto px-0 sm:px-0 md:px-0">
      <div className="h-full w-full overflow-hidden">
        <div className="mb-2 flex w-full flex-row justify-between pb-1 px-2 sm:px-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {icon}
              <h2 className="font-sans font-semibold text-[18px] leading-[24px] text-[var(--text)]">
                {title}
              </h2>
            </div>
            {subtitle && (
              <p className="text-[11px] text-[var(--text-muted)]">
                {subtitle}
              </p>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2">
            {onSeeAll && (
              <button
                onClick={onSeeAll}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)]"
              >
                Voir tout
              </button>
            )}
            <button
              aria-label="Scroll left"
              onClick={scrollLeft}
              className="inline-flex items-center justify-center rounded-full aspect-square p-2 text-[var(--text)] bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-3)] transition duration-75"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="m9.398 12.005 6.194-6.193q.315-.316.305-.748a1.06 1.06 0 0 0-.326-.748Q15.255 4 14.823 4t-.748.316l-6.467 6.488a1.7 1.7 0 0 0-.38.57 1.7 1.7 0 0 0-.126.631q0 .315.127.632.126.315.379.569l6.488 6.488q.316.316.738.306a1.05 1.05 0 0 0 .737-.327q.316-.316.316-.748t-.316-.748z" />
              </svg>
            </button>
            <button
              aria-label="Scroll right"
              onClick={scrollRight}
              className="inline-flex items-center justify-center rounded-full aspect-square p-2 text-[var(--text)] bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-3)] transition duration-75"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M14.602 12.005 8.407 5.812a.99.99 0 0 1-.305-.748q.01-.432.326-.748T9.177 4t.748.316l6.467 6.488q.253.253.38.57.126.315.126.631 0 .315-.127.632-.126.315-.379.569l-6.488 6.488a.97.97 0 0 1-.738.306 1.05 1.05 0 0 1-.737-.327q-.316-.316-.316-.748t.316-.748z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="relative w-full overflow-hidden" style={{ height: '20rem' }}>
          <div className="h-full w-full overflow-hidden [mask-image:linear-gradient(to_right,black,black_90%,transparent)] [mask-size:100%_100%] transition-[mask-image] duration-500">
            <section
              id={sectionId}
              className="flex h-auto w-full overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-3 px-1"
            >
              {tracks.slice(0, 20).map((track) => (
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

interface TrackCardProps {
  track: Track;
  onPlay: (track: Track) => void;
}

const TrackCard: React.FC<TrackCardProps> = ({ track, onPlay }) => {
  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDurationLocal = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative flex w-[140px] sm:w-[172px] shrink-0 cursor-pointer flex-col">
      <div className="relative mb-4 cursor-pointer">
        <div className="relative h-[200px] sm:h-[256px] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={track.title}
            src={
              track.coverUrl ||
              'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop'
            }
            className="absolute inset-0 h-full w-full rounded-xl object-cover"
            onError={(e) => {
              e.currentTarget.src =
                'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop';
            }}
          />
          <div className="absolute inset-0 z-20">
            <button
              onClick={() => onPlay(track)}
              className="flex items-center justify-center h-14 w-14 rounded-full p-4 bg-[var(--surface-2)]/60 backdrop-blur-xl border border-[var(--border)] outline-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform duration-300"
            >
              <Play className="h-5 w-5 text-[var(--text)]" />
            </button>
            <div className="absolute inset-x-2 top-2 flex flex-row items-center gap-1">
              <div className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold backdrop-blur-lg bg-black/30 border border-[var(--border)] text-[var(--text)]">
                {formatDurationLocal(track.duration)}
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
            <Headphones className="w-3 h-3" />
            <span className="text-[12px] leading-4 font-medium">
              {formatNumber(track.plays)}
            </span>
          </div>
          <div className="flex items-center gap-[2px]">
            <Heart className="w-3 h-3" />
            <span className="text-[12px] leading-4 font-medium">
              {formatNumber(track.likes)}
            </span>
          </div>
          <div className="flex items-center gap-[2px]">
            <MessageCircle className="w-3 h-3" />
            <span className="text-[12px] leading-4 font-medium">0</span>
          </div>
        </div>
        <div className="mt-1 flex w-full items-center justify-between">
          <div className="flex w-fit flex-row items-center gap-2 font-sans text-sm font-medium text-[var(--text)]">
            <div className="relative h-8 shrink-0 aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Profile avatar"
                src={
                  track.artist.avatar ||
                  'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop'
                }
                className="rounded-full h-full w-full object-cover p-1"
                onError={(e) => {
                  e.currentTarget.src =
                    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop';
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

interface TrackListRowProps {
  track: Track;
  onPlay: (track: Track) => void;
  formatDuration: (seconds: number) => string;
  formatNumber: (num: number) => string;
}

const TrackListRow: React.FC<TrackListRowProps> = ({
  track,
  onPlay,
  formatDuration,
  formatNumber,
}) => {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors">
      <button
        onClick={() => onPlay(track)}
        className="flex items-center justify-center h-8 w-8 rounded-full bg-[var(--surface-3)] border border-[var(--border)]"
      >
        <Play className="w-4 h-4 text-[var(--text)]" />
      </button>
      <div className="w-10 h-10 rounded-md overflow-hidden bg-[var(--surface-3)] flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={track.title}
          src={
            track.coverUrl ||
            'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop'
          }
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop';
          }}
        />
      </div>
      <div className="flex flex-1 flex-col min-w-0">
        <p className="text-sm font-medium text-[var(--text)] truncate">
          {track.title}
        </p>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {track.artist.name}
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-4 text-[11px] text-[var(--text-muted)] mr-2">
        <span className="inline-flex items-center gap-1">
          <Headphones className="w-3 h-3" />
          {formatNumber(track.plays)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Heart className="w-3 h-3" />
          {formatNumber(track.likes)}
        </span>
      </div>
      <div className="text-xs text-[var(--text-muted)] w-10 text-right">
        {formatDuration(track.duration)}
      </div>
    </div>
  );
};
