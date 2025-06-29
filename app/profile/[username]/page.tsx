'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Music,
  Heart,
  Users,
  Calendar,
  MapPin,
  Globe,
  Edit3,
  Settings,
  Share2,
  MoreVertical,
  Play,
  Pause,
  Plus,
  Grid,
  List,
  Search,
  Filter,
  Star,
  Trophy,
  Flame,
  Eye,
  EyeOff,
  Download,
  Bookmark,
  MessageCircle,
  UserPlus,
  UserCheck,
  Camera,
  Image,
  X,
  Check,
  ArrowLeft,
  ExternalLink,
  Clock,
  Headphones,
  Mic,
  Disc3,
  Radio,
  Instagram,
  Twitter,
  Youtube,
  Music2
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';

interface User {
  _id: string;
  username: string;
  name: string;
  email: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  location?: string;
  website?: string;
  followers: string[];
  following: string[];
  trackCount: number;
  playlistCount: number;
  totalPlays: number;
  totalLikes: number;
  isVerified: boolean;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
  createdAt: string;
  lastActive: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    soundcloud?: string;
  };
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
}

interface Playlist {
  _id: string;
  name: string;
  description: string;
  coverUrl?: string;
  trackCount: number;
  duration: number;
  isPublic: boolean;
  tracks: Track[];
  createdBy: User;
  likes: string[];
  followers: string[];
  createdAt: string;
}

export default function ProfileUserPage() {
  const { username } = useParams();
  const { data: session } = useSession();
  const { playTrack, handleLike } = useAudioPlayer();
  const router = useRouter();
  
  // États principaux
  const [user, setUser] = useState<User | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists' | 'followers' | 'following'>('tracks');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Charger les données du profil
  const fetchProfileData = useCallback(async () => {
    if (!username) return;
    
    try {
      setLoading(true);
      
      // Profil utilisateur
      const userRes = await fetch(`/api/users/${username}`);
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user);
      }
      
      // Musiques publiées
      const tracksRes = await fetch(`/api/users/${username}/tracks`);
      if (tracksRes.ok) {
        const tracksData = await tracksRes.json();
        setTracks(tracksData.tracks || []);
      }
      
      // Playlists
      const playlistsRes = await fetch(`/api/users/${username}/playlists`);
      if (playlistsRes.ok) {
        const playlistsData = await playlistsRes.json();
        setPlaylists(playlistsData.playlists || []);
      }
      
      // Followers
      const followersRes = await fetch(`/api/users/${username}/followers`);
      if (followersRes.ok) {
        const followersData = await followersRes.json();
        setFollowers(followersData.followers || []);
      }
      
      // Following
      const followingRes = await fetch(`/api/users/${username}/following`);
      if (followingRes.ok) {
        const followingData = await followingRes.json();
        setFollowing(followingData.following || []);
      }
      
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Actions
  const toggleFollow = async () => {
    if (!user) return;
    
    try {
      setActionLoading(true);
      const res = await fetch(`/api/users/${user.username}/follow`, { method: 'POST' });
      if (res.ok) {
        setUser(prev => prev ? {
          ...prev,
          isFollowing: !prev.isFollowing,
          followers: prev.isFollowing 
            ? prev.followers.filter(id => id !== session?.user?.id)
            : [...prev.followers, session?.user?.id || '']
        } : null);
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setActionLoading(false);
    }
  };

  const handleLikeTrack = async (trackId: string) => {
    try {
      await handleLike(trackId);
      setTracks(prev => prev.map(track => 
        track._id === trackId 
          ? { ...track, isLiked: !track.isLiked, likes: track.isLiked ? track.likes.filter(id => id !== session?.user?.id) : [...track.likes, session?.user?.id || ''] }
          : track
      ));
    } catch (error) {
      // Erreur silencieuse
    }
  };

  // Utilitaires
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isCurrentlyPlaying = (trackId: string) => {
    // Logique pour vérifier si la piste est en cours de lecture
    return false;
  };

  // Filtrage
  const filteredTracks = tracks.filter(track =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.genre.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPlaylists = playlists.filter(playlist =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playlist.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <User size={64} className="text-white/40 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Utilisateur non trouvé</h2>
          <p className="text-white/60 mb-4">Le profil que vous recherchez n'existe pas.</p>
          <button
            onClick={() => router.back()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Bannière */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <div 
          className="w-full h-full bg-gradient-to-r from-purple-900/50 to-pink-900/50"
          style={{
            backgroundImage: user.banner ? `url(${user.banner})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-end gap-4">
            <div className="relative">
              <img
                src={user.avatar || '/default-avatar.png'}
                alt={user.name}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-white/20"
              />
              {user.isVerified && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold mb-1">{user.name}</h1>
              <p className="text-white/80 mb-2">@{user.username}</p>
              {user.bio && <p className="text-white/70 text-sm line-clamp-2">{user.bio}</p>}
            </div>
          </div>
        </div>
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <main className="container mx-auto px-4 pb-32">
        <div className="max-w-6xl mx-auto -mt-8 relative z-10">
          {/* Actions et statistiques */}
          <div className="glass-effect rounded-xl p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                {!user.isOwnProfile && (
                  <button
                    onClick={toggleFollow}
                    disabled={actionLoading}
                    className={`px-6 py-2 rounded-full font-medium transition-all ${
                      user.isFollowing 
                        ? 'bg-pink-600 text-white hover:bg-pink-700' 
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                    } disabled:opacity-50`}
                  >
                    {actionLoading ? '...' : user.isFollowing ? 'Abonné' : 'Suivre'}
                  </button>
                )}
                {user.isOwnProfile && (
                  <button
                    onClick={() => router.push('/profile/edit')}
                    className="px-6 py-2 rounded-full font-medium bg-white/10 text-white hover:bg-white/20 transition-all"
                  >
                    <Edit3 size={16} className="inline mr-2" />
                    Modifier le profil
                  </button>
                )}
                <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                  <Share2 size={16} />
                </button>
              </div>
              
              <div className="flex items-center gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold">{formatNumber(tracks.length)}</div>
                  <div className="text-sm text-white/60">Morceaux</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatNumber(user.followers.length)}</div>
                  <div className="text-sm text-white/60">Abonnés</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatNumber(user.following.length)}</div>
                  <div className="text-sm text-white/60">Abonnements</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatNumber(user.totalPlays)}</div>
                  <div className="text-sm text-white/60">Écoutes</div>
                </div>
              </div>
            </div>
          </div>

          {/* Informations détaillées */}
          {(user.location || user.website || user.socialLinks) && (
            <div className="glass-effect rounded-xl p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {user.location && (
                  <div className="flex items-center gap-2 text-white/70">
                    <MapPin size={16} />
                    <span>{user.location}</span>
                  </div>
                )}
                {user.website && (
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                  >
                    <Globe size={16} />
                    <span className="truncate">{user.website}</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                {user.socialLinks?.instagram && (
                  <a
                    href={user.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                  >
                    <Instagram size={16} className="text-pink-400" />
                    <span>Instagram</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                {user.socialLinks?.twitter && (
                  <a
                    href={user.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                  >
                    <Twitter size={16} className="text-blue-400" />
                    <span>Twitter</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                {user.socialLinks?.youtube && (
                  <a
                    href={user.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                  >
                    <Youtube size={16} className="text-red-400" />
                    <span>YouTube</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                <div className="flex items-center gap-2 text-white/70">
                  <Calendar size={16} />
                  <span>Membre depuis {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Barre de recherche et contrôles */}
          <div className="glass-effect rounded-xl p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
                <input
                  type="text"
                  placeholder={`Rechercher dans ${user.name}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 rounded-xl border border-white/20 focus:border-purple-400 focus:outline-none text-white placeholder-white/60"
                />
              </div>
              <div className="flex items-center space-x-3">
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
                onClick={() => setActiveTab('tracks')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'tracks'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <Music size={16} className="inline mr-2" />
                Morceaux ({tracks.length})
              </button>
              <button
                onClick={() => setActiveTab('playlists')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'playlists'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <Disc3 size={16} className="inline mr-2" />
                Playlists ({playlists.length})
              </button>
              <button
                onClick={() => setActiveTab('followers')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'followers'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <Users size={16} className="inline mr-2" />
                Abonnés ({user.followers.length})
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'following'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <UserPlus size={16} className="inline mr-2" />
                Abonnements ({user.following.length})
              </button>
            </div>
          </div>

          {/* Contenu des onglets */}
          <div className="glass-effect rounded-xl p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'tracks' && (
                <motion.div
                  key="tracks"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {filteredTracks.length === 0 ? (
                    <div className="text-center py-12">
                      <Music className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">
                        {searchQuery ? 'Aucun morceau trouvé' : 'Aucun morceau publié'}
                      </p>
                      {user.isOwnProfile && (
                        <a
                          href="/upload"
                          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                        >
                          Publier un morceau
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-3'}>
                      {filteredTracks.map((track) => (
                        <motion.div
                          key={track._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`glass-effect rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 ${
                            viewMode === 'list' ? 'flex items-center space-x-4 p-4' : 'p-4'
                          }`}
                        >
                          {viewMode === 'grid' ? (
                            <>
                              <img
                                src={track.coverUrl || '/default-cover.jpg'}
                                alt={track.title}
                                className="w-full h-32 object-cover rounded-lg mb-3"
                              />
                              <h3 className="font-semibold mb-1 truncate">{track.title}</h3>
                              <p className="text-sm text-white/60 mb-2 truncate">
                                {track.artist?.name || track.artist?.username}
                              </p>
                              <div className="flex items-center justify-between text-xs text-white/40">
                                <span>{formatNumber(track.plays)} écoutes</span>
                                <span>{formatNumber(track.likes.length)} likes</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <img
                                src={track.coverUrl || '/default-cover.jpg'}
                                alt={track.title}
                                className="w-16 h-16 rounded object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold">{track.title}</h3>
                                <p className="text-sm text-white/60">{track.artist?.name || track.artist?.username}</p>
                                <div className="flex items-center space-x-4 text-xs text-white/40 mt-1">
                                  <span>{formatNumber(track.plays)} écoutes</span>
                                  <span>{formatNumber(track.likes.length)} likes</span>
                                  <span>{formatDuration(track.duration)}</span>
                                </div>
                              </div>
                            </>
                          )}
                          <div className="flex items-center space-x-2 mt-3">
                            <button
                              onClick={() => playTrack(track)}
                              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                              {isCurrentlyPlaying(track._id) ? (
                                <Pause size={16} />
                              ) : (
                                <Play size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => handleLikeTrack(track._id)}
                              className={`p-2 rounded-full transition-colors ${
                                track.isLiked ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/60 hover:text-white'
                              }`}
                            >
                              <Heart size={16} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'playlists' && (
                <motion.div
                  key="playlists"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                  {filteredPlaylists.length === 0 ? (
                    <div className="text-center py-12 col-span-full">
                      <Disc3 className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">
                        {searchQuery ? 'Aucune playlist trouvée' : 'Aucune playlist créée'}
                      </p>
                      {user.isOwnProfile && (
                        <a
                          href="/library"
                          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                        >
                          Créer une playlist
                        </a>
                      )}
                    </div>
                  ) : (
                    filteredPlaylists.map((playlist) => (
                      <motion.div
                        key={playlist._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-effect rounded-xl p-4 flex flex-col gap-3 cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => router.push(`/playlists/${playlist._id}`)}
                      >
                        <img
                          src={playlist.coverUrl || '/default-cover.jpg'}
                          alt={playlist.name}
                          className="w-full h-32 object-cover rounded-lg mb-2"
                        />
                        <h3 className="font-semibold mb-1 truncate">{playlist.name}</h3>
                        <p className="text-sm text-white/60 truncate">{playlist.description}</p>
                        <div className="flex items-center justify-between text-xs text-white/40">
                          <span>{playlist.trackCount} pistes</span>
                          <span>{formatNumber(playlist.likes.length)} likes</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === 'followers' && (
                <motion.div
                  key="followers"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  {followers.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60">Aucun abonné pour le moment</p>
                    </div>
                  ) : (
                    followers.map((follower) => (
                      <motion.div
                        key={follower._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => router.push(`/profile/${follower.username}`)}
                      >
                        <img
                          src={follower.avatar || '/default-avatar.png'}
                          alt={follower.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold truncate">{follower.name}</span>
                            {follower.isVerified && <Check className="text-blue-400 w-4 h-4" />}
                          </div>
                          <span className="text-sm text-white/60">@{follower.username}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Logique pour suivre/ne plus suivre
                          }}
                          className="px-4 py-2 rounded-full font-medium bg-white/10 text-white/80 hover:bg-white/20 transition-all"
                        >
                          Suivre
                        </button>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === 'following' && (
                <motion.div
                  key="following"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  {following.length === 0 ? (
                    <div className="text-center py-12">
                      <UserPlus className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60">Aucun abonnement pour le moment</p>
                    </div>
                  ) : (
                    following.map((followed) => (
                      <motion.div
                        key={followed._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => router.push(`/profile/${followed.username}`)}
                      >
                        <img
                          src={followed.avatar || '/default-avatar.png'}
                          alt={followed.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold truncate">{followed.name}</span>
                            {followed.isVerified && <Check className="text-blue-400 w-4 h-4" />}
                          </div>
                          <span className="text-sm text-white/60">@{followed.username}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Logique pour ne plus suivre
                          }}
                          className="px-4 py-2 rounded-full font-medium bg-pink-600 text-white hover:bg-pink-700 transition-all"
                        >
                          Abonné
                        </button>
                      </motion.div>
                    ))
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