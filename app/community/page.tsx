'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  TrendingUp, 
  UserPlus, 
  Music, 
  Heart, 
  MessageCircle, 
  Share2,
  Search,
  Filter,
  Grid,
  List,
  Play,
  Pause,
  MoreVertical,
  Calendar,
  Eye,
  Star,
  Award,
  Activity,
  Users2,
  Headphones,
  Mic,
  Volume2,
  Clock,
  MapPin,
  Globe,
  Hash,
  Bookmark,
  BookmarkPlus,
  Send,
  Smile,
  Image,
  Video,
  Link,
  Settings,
  Bell,
  Crown,
  Zap,
  Target,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  X,
  Check,
  Edit3,
  Trash2,
  Flag,
  Shield,
  Verified,
  Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';

interface User {
  _id: string;
  username: string;
  name: string;
  avatar?: string;
  followers: string[];
  following: string[];
  trackCount: number;
  isVerified: boolean;
  isFollowing?: boolean;
  latestTrack?: {
    _id: string;
    title: string;
    coverUrl?: string;
    plays: number;
  };
  bio?: string;
  location?: string;
  website?: string;
  totalPlays: number;
  totalLikes: number;
  joinDate: string;
  badges: string[];
}

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
  trendingScore: number;
}

interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  track: string;
  likes: string[];
  replies: Comment[];
  createdAt: string;
  isLiked?: boolean;
}

interface CommunityStats {
  totalUsers: number;
  totalTracks: number;
  totalPlays: number;
  totalLikes: number;
  activeUsers: number;
  trendingGenres: string[];
  topArtists: User[];
  recentActivity: any[];
}

export default function CommunityPage() {
  const { data: session } = useSession();
  const { audioState, playTrack, handleLike } = useAudioPlayer();
  const router = useRouter();
  
  // États principaux
  const [activeTab, setActiveTab] = useState<'feed' | 'artists' | 'trending' | 'activity'>('feed');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'trending' | 'recent' | 'popular'>('trending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Données
  const [users, setUsers] = useState<User[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const [bookmarkedTracks, setBookmarkedTracks] = useState<Set<string>>(new Set());

  // États pour les interactions
  const [showCommentModal, setShowCommentModal] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showShareModal, setShowShareModal] = useState<string | null>(null);

  // Charger les données depuis l'API
  const fetchCommunityData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Charger les utilisateurs
      const usersResponse = await fetch('/api/users?limit=50');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      // Charger les pistes tendances
      const trendingResponse = await fetch('/api/tracks?trending=true&limit=20');
      if (trendingResponse.ok) {
        const trendingData = await trendingResponse.json();
        setTrendingTracks(trendingData.tracks || []);
      }

      // Charger les statistiques communautaires
      const statsResponse = await fetch('/api/stats/community');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setCommunityStats(statsData);
      }

      // Charger les données utilisateur
      if (session?.user?.id) {
        const userDataResponse = await fetch('/api/users/me');
        if (userDataResponse.ok) {
          const userData = await userDataResponse.json();
          setFollowingUsers(new Set(userData.following || []));
          setLikedTracks(new Set(userData.likedTracks || []));
          setBookmarkedTracks(new Set(userData.bookmarkedTracks || []));
        }
      }

    } catch (error) {
      // Erreur silencieuse
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchCommunityData();
  }, [fetchCommunityData]);

  // Gérer le follow/unfollow
  const toggleFollow = async (userId: string) => {
    const newFollowing = new Set(followingUsers);
    const isFollowing = newFollowing.has(userId);
    
    if (isFollowing) {
      newFollowing.delete(userId);
    } else {
      newFollowing.add(userId);
    }
    setFollowingUsers(newFollowing);

    try {
      setActionLoading(true);
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // Revenir à l'état précédent en cas d'erreur
        if (isFollowing) {
          newFollowing.add(userId);
        } else {
          newFollowing.delete(userId);
        }
        setFollowingUsers(newFollowing);
      }
    } catch (error) {
      // Revenir à l'état précédent en cas d'erreur
      if (isFollowing) {
        newFollowing.add(userId);
      } else {
        newFollowing.delete(userId);
      }
      setFollowingUsers(newFollowing);
    } finally {
      setActionLoading(false);
    }
  };

  // Gérer les likes
  const toggleLike = async (trackId: string) => {
    const newLikedTracks = new Set(likedTracks);
    const isLiked = newLikedTracks.has(trackId);
    
    if (isLiked) {
      newLikedTracks.delete(trackId);
    } else {
      newLikedTracks.add(trackId);
    }
    setLikedTracks(newLikedTracks);

    // Mettre à jour l'état local des pistes
    setTrendingTracks(prev => prev.map(track => 
      track._id === trackId 
        ? { 
            ...track, 
            isLiked: !isLiked,
            likes: isLiked 
              ? track.likes.filter(id => id !== session?.user?.id)
              : [...track.likes, session?.user?.id || '']
          }
        : track
    ));

    try {
      await handleLike(trackId);
    } catch (error) {
      // Revenir à l'état précédent en cas d'erreur
      if (isLiked) {
        newLikedTracks.add(trackId);
      } else {
        newLikedTracks.delete(trackId);
      }
      setLikedTracks(newLikedTracks);
    }
  };

  // Gérer les bookmarks
  const toggleBookmark = async (trackId: string) => {
    const newBookmarkedTracks = new Set(bookmarkedTracks);
    const isBookmarked = newBookmarkedTracks.has(trackId);
    
    if (isBookmarked) {
      newBookmarkedTracks.delete(trackId);
    } else {
      newBookmarkedTracks.add(trackId);
    }
    setBookmarkedTracks(newBookmarkedTracks);

    try {
      const response = await fetch(`/api/tracks/${trackId}/bookmark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // Revenir à l'état précédent en cas d'erreur
        if (isBookmarked) {
          newBookmarkedTracks.add(trackId);
        } else {
          newBookmarkedTracks.delete(trackId);
        }
        setBookmarkedTracks(newBookmarkedTracks);
      }
    } catch (error) {
      // Revenir à l'état précédent en cas d'erreur
      if (isBookmarked) {
        newBookmarkedTracks.add(trackId);
      } else {
        newBookmarkedTracks.delete(trackId);
      }
      setBookmarkedTracks(newBookmarkedTracks);
    }
  };

  // Partager une piste
  const shareTrack = async (track: Track) => {
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

  // Utilitaires
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isCurrentlyPlaying = (trackId: string) => {
    return audioState.tracks[audioState.currentTrackIndex]?._id === trackId && audioState.isPlaying;
  };

  // Filtrer et trier les données
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTracks = trendingTracks.filter(track => {
    const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         track.artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         track.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesGenre = selectedGenre === 'all' || track.genre.includes(selectedGenre);
    
    return matchesSearch && matchesGenre;
  });

  const sortedTracks = [...filteredTracks].sort((a, b) => {
    switch (sortBy) {
      case 'trending':
        return b.trendingScore - a.trendingScore;
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'popular':
        return b.plays - a.plays;
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Chargement de la communauté...</p>
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
              <Users size={28} className="text-purple-400" />
              Communauté
            </h1>
            <p className="text-white/60 text-lg">Découvrez les artistes, les tendances et l'activité de la communauté.</p>
          </div>

          {/* Statistiques communautaires */}
          {communityStats && (
            <div className="glass-effect rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Activity size={20} className="text-purple-400" />
                Statistiques de la communauté
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <Users2 className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{formatNumber(communityStats.totalUsers)}</div>
                  <div className="text-sm text-white/60">Utilisateurs</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <Music className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{formatNumber(communityStats.totalTracks)}</div>
                  <div className="text-sm text-white/60">Pistes</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <Headphones className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{formatNumber(communityStats.totalPlays)}</div>
                  <div className="text-sm text-white/60">Écoutes</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <Heart className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{formatNumber(communityStats.totalLikes)}</div>
                  <div className="text-sm text-white/60">Likes</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Barre de recherche et contrôles */}
          <div className="glass-effect rounded-xl p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Barre de recherche */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
                <input
                  type="text"
                  placeholder="Rechercher dans la communauté..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 rounded-xl border border-white/20 focus:border-purple-400 focus:outline-none text-white placeholder-white/60"
                />
              </div>

              {/* Contrôles */}
              <div className="flex items-center space-x-3">
                {/* Filtres */}
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="px-3 py-2 bg-white/10 rounded-lg border border-white/20 text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value="all">Tous les genres</option>
                  <option value="pop">Pop</option>
                  <option value="rock">Rock</option>
                  <option value="hip-hop">Hip-Hop</option>
                  <option value="electronic">Électronique</option>
                  <option value="jazz">Jazz</option>
                  <option value="classical">Classique</option>
                  <option value="reggae">Reggae</option>
                  <option value="country">Country</option>
                  <option value="r&b">R&B</option>
                </select>

                {/* Tri */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 bg-white/10 rounded-lg border border-white/20 text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value="trending">Tendances</option>
                  <option value="recent">Récent</option>
                  <option value="popular">Populaire</option>
                </select>

                {/* Bouton vue */}
                <div className="flex bg-white/10 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Grid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Onglets */}
          <div className="glass-effect rounded-xl p-6 mb-8">
            <div className="flex space-x-1 bg-white/10 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('feed')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'feed'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <Activity size={16} className="inline mr-2" />
                Feed
              </button>
              <button
                onClick={() => setActiveTab('artists')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'artists'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <Users size={16} className="inline mr-2" />
                Artistes
              </button>
              <button
                onClick={() => setActiveTab('trending')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'trending'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <TrendingUp size={16} className="inline mr-2" />
                Tendances
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'activity'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <Zap size={16} className="inline mr-2" />
                Activité
              </button>
            </div>
          </div>

          {/* Contenu des onglets */}
          <div className="glass-effect rounded-xl p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'feed' && (
                <motion.div
                  key="feed"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-xl font-bold mb-6">Feed Communautaire</h2>
                  
                  {sortedTracks.length === 0 ? (
                    <div className="text-center py-12">
                      <Music className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">
                        {searchQuery ? 'Aucun résultat trouvé' : 'Aucune activité récente'}
                      </p>
                      {!searchQuery && (
                        <a
                          href="/upload"
                          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                        >
                          Partager votre musique
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sortedTracks.map((track, index) => (
                        <motion.div
                          key={track._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="glass-effect rounded-xl p-4 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            {/* Cover */}
                            <div className="relative">
                              <img
                                src={track.coverUrl || '/default-cover.jpg'}
                                alt={track.title}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                              <button
                                onClick={() => playTrack(track)}
                                className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                              >
                                {isCurrentlyPlaying(track._id) ? (
                                  <Pause size={20} className="text-white" />
                                ) : (
                                  <Play size={20} className="text-white" />
                                )}
                              </button>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold mb-1 truncate">{track.title}</h3>
                              <p className="text-sm text-white/60 mb-2 truncate">
                                {track.artist?.name || track.artist?.username}
                              </p>
                              
                              <div className="flex items-center space-x-4 text-xs text-white/40">
                                <span className="flex items-center gap-1">
                                  <Headphones size={12} />
                                  {formatNumber(track.plays)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Heart size={12} />
                                  {formatNumber(track.likes.length)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageCircle size={12} />
                                  {formatNumber(track.comments.length)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {formatDuration(track.duration)}
                                </span>
                              </div>

                              {/* Tags */}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {track.tags.slice(0, 3).map((tag, tagIndex) => (
                                  <span
                                    key={tagIndex}
                                    className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => toggleLike(track._id)}
                                className={`p-2 rounded-full transition-colors ${
                                  track.isLiked || likedTracks.has(track._id)
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-white/10 hover:bg-white/20 text-white/60'
                                }`}
                              >
                                <Heart size={16} fill={track.isLiked || likedTracks.has(track._id) ? 'currentColor' : 'none'} />
                              </button>
                              
                              <button
                                onClick={() => setShowCommentModal(track._id)}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/60"
                              >
                                <MessageCircle size={16} />
                              </button>
                              
                              <button
                                onClick={() => toggleBookmark(track._id)}
                                className={`p-2 rounded-full transition-colors ${
                                  bookmarkedTracks.has(track._id)
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-white/10 hover:bg-white/20 text-white/60'
                                }`}
                              >
                                <Bookmark size={16} fill={bookmarkedTracks.has(track._id) ? 'currentColor' : 'none'} />
                              </button>
                              
                              <button
                                onClick={() => shareTrack(track)}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/60"
                              >
                                <Share2 size={16} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'artists' && (
                <motion.div
                  key="artists"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-xl font-bold mb-6">Artistes de la Communauté</h2>
                  
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">
                        {searchQuery ? 'Aucun artiste trouvé' : 'Aucun artiste pour le moment'}
                      </p>
                      {!searchQuery && (
                        <a
                          href="/upload"
                          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                        >
                          Devenir le premier artiste
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                      {filteredUsers.map((user, index) => (
                        <motion.div
                          key={user._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`glass-effect rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 ${
                            viewMode === 'list' ? 'flex items-center space-x-4 p-4' : 'p-4'
                          }`}
                        >
                          {viewMode === 'grid' ? (
                            <>
                              <div className="relative mb-4">
                                <img
                                  src={user.avatar || '/default-avatar.png'}
                                  alt={user.name}
                                  className="w-full h-32 object-cover rounded-lg"
                                />
                                {user.isVerified && (
                                  <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                    <Verified size={12} className="text-white" />
                                  </div>
                                )}
                              </div>
                              <h3 className="font-semibold mb-1">{user.name}</h3>
                              <p className="text-sm text-white/60 mb-2">@{user.username}</p>
                              {user.bio && (
                                <p className="text-sm text-white/80 mb-3 line-clamp-2">{user.bio}</p>
                              )}
                              <div className="flex items-center justify-between text-xs text-white/40 mb-3">
                                <span>{formatNumber(user.followers.length)} abonnés</span>
                                <span>{user.trackCount} pistes</span>
                              </div>
                              <button
                                onClick={() => toggleFollow(user._id)}
                                disabled={actionLoading}
                                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                                  followingUsers.has(user._id) || user.isFollowing
                                    ? 'bg-white/20 text-white'
                                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                                }`}
                              >
                                {followingUsers.has(user._id) || user.isFollowing ? 'Suivi' : 'Suivre'}
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="relative">
                                <img
                                  src={user.avatar || '/default-avatar.png'}
                                  alt={user.name}
                                  className="w-16 h-16 rounded-full object-cover"
                                />
                                {user.isVerified && (
                                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                    <Verified size={12} className="text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold">{user.name}</h3>
                                <p className="text-sm text-white/60">@{user.username}</p>
                                {user.bio && (
                                  <p className="text-sm text-white/80 mt-1 line-clamp-1">{user.bio}</p>
                                )}
                                <div className="flex items-center space-x-4 text-xs text-white/40 mt-1">
                                  <span>{formatNumber(user.followers.length)} abonnés</span>
                                  <span>{user.trackCount} pistes</span>
                                  <span>{formatNumber(user.totalPlays)} écoutes</span>
                                </div>
                              </div>
                              <button
                                onClick={() => toggleFollow(user._id)}
                                disabled={actionLoading}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  followingUsers.has(user._id) || user.isFollowing
                                    ? 'bg-white/20 text-white'
                                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                                }`}
                              >
                                {followingUsers.has(user._id) || user.isFollowing ? 'Suivi' : 'Suivre'}
                              </button>
                            </>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'trending' && (
                <motion.div
                  key="trending"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-xl font-bold mb-6">Pistes Tendances</h2>
                  
                  {sortedTracks.length === 0 ? (
                    <div className="text-center py-12">
                      <TrendingUp className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">
                        {searchQuery ? 'Aucun résultat trouvé' : 'Aucune piste tendance pour le moment'}
                      </p>
                      {!searchQuery && (
                        <a
                          href="/upload"
                          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                        >
                          Uploader une piste
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sortedTracks.slice(0, 10).map((track, index) => (
                        <motion.div
                          key={track._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="glass-effect rounded-xl p-4 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            {/* Position */}
                            <div className="text-center w-8">
                              <div className={`text-lg font-bold ${
                                index === 0 ? 'text-yellow-400' : 
                                index === 1 ? 'text-gray-300' : 
                                index === 2 ? 'text-orange-400' : 'text-white/60'
                              }`}>
                                {index + 1}
                              </div>
                              {index < 3 && (
                                <div className="text-xs text-white/40">
                                  {index === 0 ? '🔥' : index === 1 ? '⚡' : '💫'}
                                </div>
                              )}
                            </div>

                            {/* Cover */}
                            <div className="relative">
                              <img
                                src={track.coverUrl || '/default-cover.jpg'}
                                alt={track.title}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                              <button
                                onClick={() => playTrack(track)}
                                className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                              >
                                {isCurrentlyPlaying(track._id) ? (
                                  <Pause size={20} className="text-white" />
                                ) : (
                                  <Play size={20} className="text-white" />
                                )}
                              </button>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold mb-1 truncate">{track.title}</h3>
                              <p className="text-sm text-white/60 mb-2 truncate">
                                {track.artist?.name || track.artist?.username}
                              </p>
                              
                              <div className="flex items-center space-x-4 text-xs text-white/40">
                                <span className="flex items-center gap-1">
                                  <TrendingUp size={12} />
                                  Score: {Math.round(track.trendingScore)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Headphones size={12} />
                                  {formatNumber(track.plays)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Heart size={12} />
                                  {formatNumber(track.likes.length)}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => toggleLike(track._id)}
                                className={`p-2 rounded-full transition-colors ${
                                  track.isLiked || likedTracks.has(track._id)
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-white/10 hover:bg-white/20 text-white/60'
                                }`}
                              >
                                <Heart size={16} fill={track.isLiked || likedTracks.has(track._id) ? 'currentColor' : 'none'} />
                              </button>
                              
                              <button
                                onClick={() => shareTrack(track)}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/60"
                              >
                                <Share2 size={16} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'activity' && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-xl font-bold mb-6">Activité Récente</h2>
                  
                  {communityStats?.recentActivity?.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">Aucune activité récente</p>
                      <p className="text-white/40 text-sm">Les actions de la communauté apparaîtront ici</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {communityStats?.recentActivity?.map((activity: any, index: number) => (
                        <motion.div
                          key={activity._id || index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="glass-effect rounded-xl p-4"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                              {activity.type === 'upload' && <Music size={16} className="text-purple-400" />}
                              {activity.type === 'like' && <Heart size={16} className="text-red-400" />}
                              {activity.type === 'follow' && <UserPlus size={16} className="text-blue-400" />}
                              {activity.type === 'comment' && <MessageCircle size={16} className="text-green-400" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-white/80">
                                <span className="font-medium">{activity.user?.name}</span>
                                {' '}
                                {activity.type === 'upload' && 'a uploadé une nouvelle piste'}
                                {activity.type === 'like' && 'a liké une piste'}
                                {activity.type === 'follow' && 'a commencé à suivre'}
                                {activity.type === 'comment' && 'a commenté une piste'}
                                {' '}
                                {activity.target && (
                                  <span className="text-white/60">{activity.target}</span>
                                )}
                              </p>
                              <p className="text-xs text-white/40 mt-1">
                                {new Date(activity.createdAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
} 