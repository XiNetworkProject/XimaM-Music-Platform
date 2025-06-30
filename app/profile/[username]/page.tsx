'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIcon,
  Edit3,
  Camera,
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
  Music,
  Play,
  Pause,
  Plus,
  Users,
  Calendar,
  MapPin,
  Globe,
  Twitter,
  Instagram,
  Youtube,
  Settings,
  X,
  Check,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Trophy,
  Flame,
  TrendingUp,
  Grid,
  List,
  Filter,
  Search,
  ArrowLeft,
  ArrowRight,
  Download,
  Bookmark,
  Flag,
  Crown,
  Verified,
  Mic,
  Headphones,
  Radio,
  Disc3,
  Volume2
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { User, Track, Playlist } from '@/types';

interface EditProfileData {
  name: string;
  bio: string;
  location: string;
  website: string;
  socialLinks: {
    twitter: string;
    instagram: string;
    youtube: string;
    spotify: string;
  };
}

export default function ProfileUserPage() {
  const { username } = useParams();
  const { data: session } = useSession();
  const { playTrack } = useAudioPlayer();
  const router = useRouter();
  
  // États principaux
  const [user, setUser] = useState<User | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists' | 'followers' | 'following'>('tracks');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'alphabetical'>('recent');
  
  // États pour l'édition du profil
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<EditProfileData>({
    name: '',
    bio: '',
    location: '',
    website: '',
    socialLinks: {
      twitter: '',
      instagram: '',
      youtube: '',
      spotify: ''
    }
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [newAvatar, setNewAvatar] = useState<File | null>(null);
  const [newBanner, setNewBanner] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // États pour les modals
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Charger les données du profil
  const fetchProfileData = useCallback(async () => {
    if (!username) return;
    
    try {
      setLoading(true);
      
      // Charger les données utilisateur
      const userRes = await fetch(`/api/users/${username}`);
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
        setEditData({
          name: userData.name || '',
          bio: userData.bio || '',
          location: userData.location || '',
          website: userData.website || '',
          socialLinks: {
            twitter: userData.socialLinks?.twitter || '',
            instagram: userData.socialLinks?.instagram || '',
            youtube: userData.socialLinks?.youtube || '',
            spotify: userData.socialLinks?.spotify || ''
          }
        });
      }
      
      // Charger les pistes de l'utilisateur
      const tracksRes = await fetch(`/api/tracks?artist=${username}&limit=50`);
      if (tracksRes.ok) {
        const tracksData = await tracksRes.json();
        setTracks(tracksData.tracks || []);
      }
      
      // Charger les playlists de l'utilisateur
      const playlistsRes = await fetch(`/api/playlists?user=${username}&limit=20`);
      if (playlistsRes.ok) {
        const playlistsData = await playlistsRes.json();
        setPlaylists(playlistsData.playlists || []);
      }
      
      // Charger les followers
      const followersRes = await fetch(`/api/users/${username}/followers`);
      if (followersRes.ok) {
        const followersData = await followersRes.json();
        setFollowers(followersData.followers || []);
      }
      
      // Charger les following
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

  // Gestion des images
  const handleImageUpload = (file: File, type: 'avatar' | 'banner') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'avatar') {
        setNewAvatar(file);
        setAvatarPreview(e.target?.result as string);
      } else {
        setNewBanner(file);
        setBannerPreview(e.target?.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload vers Cloudinary
  const uploadToCloudinary = async (file: File, type: 'avatar' | 'banner') => {
    try {
      // Créer FormData pour l'upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', type === 'avatar' ? 'ximam/avatars' : 'ximam/banners');
      
      // Upload via l'API
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur API upload:', response.status, errorText);
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de l\'upload');
      }
      
      return result.url;
    } catch (error) {
      console.error('Erreur upload image:', error);
      // Retourner l'image par défaut en cas d'erreur
      return type === 'avatar' ? '/default-avatar.svg' : '/default-banner.svg';
    }
  };

  // Sauvegarder les modifications du profil
  const saveProfile = async () => {
    if (!user || !user.username) return;
    
    try {
      setActionLoading(true);
      
      let avatarUrl = user.avatar;
      let bannerUrl = user.banner;
      
      // Upload des nouvelles images si nécessaire
      if (newAvatar) {
        avatarUrl = await uploadToCloudinary(newAvatar, 'avatar');
      }
      if (newBanner) {
        bannerUrl = await uploadToCloudinary(newBanner, 'banner');
      }
      
      // Mettre à jour le profil
      const res = await fetch(`/api/users/${user.username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editData,
          avatar: avatarUrl,
          banner: bannerUrl
        })
      });
      
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        setIsEditing(false);
        setNewAvatar(null);
        setNewBanner(null);
        setAvatarPreview('');
        setBannerPreview('');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Follow/Unfollow
  const toggleFollow = async () => {
    if (!user || !user.username) return;
    
    try {
      const res = await fetch(`/api/users/${user.username}/follow`, {
        method: 'POST'
      });
      
      if (res.ok) {
        setUser(prev => prev ? { ...prev, isFollowing: !prev.isFollowing } : null);
        fetchProfileData();
      }
    } catch (error) {
      console.error('Erreur lors du follow/unfollow:', error);
    }
  };

  // Like/Unlike track
  const toggleLikeTrack = async (trackId: string) => {
    if (!trackId || !session?.user?.id) return;
    
    setTracks(prev => prev.map(track => 
      track._id === trackId 
        ? { ...track, isLiked: !track.isLiked, likes: track.isLiked ? track.likes.filter(id => id !== session?.user?.id) : [...track.likes, session?.user?.id || ''] }
        : track
    ));
    await fetch(`/api/tracks/${trackId}/like`, { method: 'POST' });
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

  const isOwnProfile = session?.user?.username === username;

  // Filtrage et tri
  const filteredTracks = tracks.filter(track =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.genre.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => {
    switch (sortBy) {
      case 'popular': return b.plays - a.plays;
      case 'alphabetical': return a.title.localeCompare(b.title);
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

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
          <UserIcon className="w-16 h-16 text-white/40 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Utilisateur non trouvé</h2>
          <p className="text-white/60 mb-4">L'utilisateur @{username} n'existe pas.</p>
          <button
            onClick={() => router.push('/discover')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            Découvrir des artistes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Bannière */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img
          src={bannerPreview || user.banner || '/default-banner.svg'}
          alt="Bannière"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
        
        {/* Bouton retour */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        
        {/* Actions */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {!isOwnProfile && (
            <button
              onClick={toggleFollow}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                user.isFollowing 
                  ? 'bg-pink-600 text-white hover:bg-pink-700' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {user.isFollowing ? 'Abonné' : 'Suivre'}
            </button>
          )}
          
          <button
            onClick={() => setShowShare(true)}
            className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          >
            <Share2 size={20} />
          </button>
          
          <button
            onClick={() => setShowMore(true)}
            className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      <main className="container mx-auto px-4 pb-32">
        <div className="max-w-6xl mx-auto">
          {/* En-tête du profil */}
          <div className="relative -mt-20 mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
              {/* Avatar */}
              <div className="relative">
                <img
                  src={avatarPreview || user.avatar || '/default-avatar.svg'}
                  alt={user.name}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-gray-900 shadow-xl"
                />
                {isOwnProfile && (
                  <button
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    className="absolute bottom-2 right-2 p-2 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors"
                  >
                    <Camera size={16} />
                  </button>
                )}
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'avatar')}
                  className="hidden"
                />
              </div>
              
              {/* Informations utilisateur */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold">{user.name}</h1>
                  {user.isVerified && <Verified className="text-blue-400 w-6 h-6" />}
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                  )}
                </div>
                <p className="text-white/60 mb-3">@{user.username}</p>
                
                {user.bio && (
                  <p className="text-white/80 mb-4 max-w-2xl">{user.bio}</p>
                )}
                
                {/* Statistiques */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Music size={16} className="text-purple-400" />
                    <span>{formatNumber(user.trackCount)} morceaux</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-purple-400" />
                    <span>{formatNumber(user.followers.length)} abonnés</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserIcon size={16} className="text-purple-400" />
                    <span>{formatNumber(user.following.length)} abonnements</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Play size={16} className="text-purple-400" />
                    <span>{formatNumber(user.totalPlays || 0)} écoutes</span>
                  </div>
                </div>
                
                {/* Liens sociaux */}
                {user.socialLinks && Object.values(user.socialLinks).some(link => link) && (
                  <div className="flex items-center gap-3 mt-4">
                    {user.socialLinks.twitter && (
                      <a href={user.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                        <Twitter size={16} />
                      </a>
                    )}
                    {user.socialLinks.instagram && (
                      <a href={user.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                        <Instagram size={16} />
                      </a>
                    )}
                    {user.socialLinks.youtube && (
                      <a href={user.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                        <Youtube size={16} />
                      </a>
                    )}
                    {user.socialLinks.spotify && (
                      <a href={user.socialLinks.spotify} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                        <Music size={16} />
                      </a>
                    )}
                  </div>
                )}
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
                <List size={16} className="inline mr-2" />
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
                Abonnés ({followers.length})
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'following'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <UserIcon size={16} className="inline mr-2" />
                Abonnements ({following.length})
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
                  {/* Contrôles */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={16} />
                        <input
                          type="text"
                          placeholder="Rechercher dans les morceaux..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:border-purple-400 focus:outline-none text-white placeholder-white/60 text-sm"
                        />
                      </div>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-2 bg-white/10 rounded-lg border border-white/20 focus:border-purple-400 focus:outline-none text-white text-sm"
                      >
                        <option value="recent">Plus récents</option>
                        <option value="popular">Plus populaires</option>
                        <option value="alphabetical">Alphabétique</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
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

                  {/* Liste des morceaux */}
                  {filteredTracks.length === 0 ? (
                    <div className="text-center py-12">
                      <Music className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">
                        {searchQuery ? 'Aucun morceau trouvé' : 'Aucun morceau publié'}
                      </p>
                      {isOwnProfile && (
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
                          key={track._id || Math.random()}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`glass-effect rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 ${
                            viewMode === 'list' ? 'flex items-center space-x-4 p-4' : 'p-4'
                          }`}
                        >
                          {viewMode === 'grid' ? (
                            <>
                              <img
                                src={track.coverUrl || '/default-cover.svg'}
                                alt={track.title || 'Morceau'}
                                className="w-full h-32 object-cover rounded-lg mb-3"
                              />
                              <h3 className="font-semibold mb-1 truncate">{track.title || 'Titre inconnu'}</h3>
                              <p className="text-sm text-white/60 mb-2">{track.artist?.name || track.artist?.username || 'Artiste inconnu'}</p>
                              <div className="flex items-center justify-between text-xs text-white/40">
                                <span>{formatNumber(track.plays || 0)} écoutes</span>
                                <span>{formatNumber((track.likes && track.likes.length) || 0)} likes</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <img
                                src={track.coverUrl || '/default-cover.svg'}
                                alt={track.title || 'Morceau'}
                                className="w-16 h-16 rounded object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold">{track.title || 'Titre inconnu'}</h3>
                                <p className="text-sm text-white/60">{track.artist?.name || track.artist?.username || 'Artiste inconnu'}</p>
                                <div className="flex items-center gap-4 text-xs text-white/40 mt-1">
                                  <span>{formatDuration(track.duration || 0)}</span>
                                  <span>{formatNumber(track.plays || 0)} écoutes</span>
                                  <span>{formatNumber((track.likes && track.likes.length) || 0)} likes</span>
                                </div>
                              </div>
                            </>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => playTrack(track)}
                              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                              <Play size={16} />
                            </button>
                            <button
                              onClick={() => toggleLikeTrack(track._id)}
                              className={`p-2 rounded-full transition-colors ${
                                track.isLiked ? 'bg-pink-500/20 text-pink-400' : 'bg-white/10 hover:bg-white/20'
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
                      <List className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">Aucune playlist créée</p>
                      {isOwnProfile && (
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
                        className="glass-effect rounded-xl p-4 cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => router.push(`/playlists/${playlist._id}`)}
                      >
                        <img
                          src={playlist.coverUrl || '/default-cover.svg'}
                          alt={playlist.name}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                        <h3 className="font-semibold mb-1 truncate">{playlist.name}</h3>
                        <p className="text-sm text-white/60 truncate mb-2">{playlist.description}</p>
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
                  className="space-y-4"
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
                        className="flex items-center gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <img
                          src={follower.avatar || '/default-avatar.svg'}
                          alt={follower.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{follower.name}</h4>
                          <p className="text-sm text-white/60">@{follower.username}</p>
                        </div>
                        <button
                          onClick={() => router.push(`/profile/${follower.username}`)}
                          className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm"
                        >
                          Voir profil
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
                  className="space-y-4"
                >
                  {following.length === 0 ? (
                    <div className="text-center py-12">
                      <UserIcon className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60">Aucun abonnement pour le moment</p>
                    </div>
                  ) : (
                    following.map((followed) => (
                      <motion.div
                        key={followed._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <img
                          src={followed.avatar || '/default-avatar.svg'}
                          alt={followed.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{followed.name}</h4>
                          <p className="text-sm text-white/60">@{followed.username}</p>
                        </div>
                        <button
                          onClick={() => router.push(`/profile/${followed.username}`)}
                          className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm"
                        >
                          Voir profil
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

      {/* Modal d'édition du profil */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-effect rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Modifier le profil</h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-3">Photo de profil</label>
                    <div className="relative">
                      <img
                        src={avatarPreview || user.avatar || '/default-avatar.svg'}
                        alt="Avatar"
                        className="w-24 h-24 rounded-full object-cover border-2 border-purple-500"
                      />
                      <button
                        onClick={() => document.getElementById('edit-avatar-upload')?.click()}
                        className="absolute bottom-0 right-0 p-2 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors"
                      >
                        <Camera size={14} />
                      </button>
                      <input
                        id="edit-avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'avatar')}
                        className="hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-3">Bannière</label>
                    <div className="relative">
                      <img
                        src={bannerPreview || user.banner || '/default-banner.svg'}
                        alt="Bannière"
                        className="w-full h-24 rounded-lg object-cover border-2 border-purple-500"
                      />
                      <button
                        onClick={() => document.getElementById('edit-banner-upload')?.click()}
                        className="absolute bottom-0 right-0 p-2 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors"
                      >
                        <Camera size={14} />
                      </button>
                      <input
                        id="edit-banner-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'banner')}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Informations de base */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Nom</label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Localisation</label>
                    <input
                      type="text"
                      value={editData.location}
                      onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Ville, Pays"
                      className="w-full px-3 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Bio</label>
                  <textarea
                    value={editData.bio}
                    onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Parlez-nous de vous..."
                    rows={4}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Site web</label>
                  <input
                    type="url"
                    value={editData.website}
                    onChange={(e) => setEditData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://votre-site.com"
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none"
                  />
                </div>

                {/* Réseaux sociaux */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-3">Réseaux sociaux</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Twitter</label>
                      <input
                        type="url"
                        value={editData.socialLinks.twitter}
                        onChange={(e) => setEditData(prev => ({ 
                          ...prev, 
                          socialLinks: { ...prev.socialLinks, twitter: e.target.value }
                        }))}
                        placeholder="https://twitter.com/username"
                        className="w-full px-3 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Instagram</label>
                      <input
                        type="url"
                        value={editData.socialLinks.instagram}
                        onChange={(e) => setEditData(prev => ({ 
                          ...prev, 
                          socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                        }))}
                        placeholder="https://instagram.com/username"
                        className="w-full px-3 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1">YouTube</label>
                      <input
                        type="url"
                        value={editData.socialLinks.youtube}
                        onChange={(e) => setEditData(prev => ({ 
                          ...prev, 
                          socialLinks: { ...prev.socialLinks, youtube: e.target.value }
                        }))}
                        placeholder="https://youtube.com/@username"
                        className="w-full px-3 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Spotify</label>
                      <input
                        type="url"
                        value={editData.socialLinks.spotify}
                        onChange={(e) => setEditData(prev => ({ 
                          ...prev, 
                          socialLinks: { ...prev.socialLinks, spotify: e.target.value }
                        }))}
                        placeholder="https://open.spotify.com/artist/..."
                        className="w-full px-3 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-2 px-4 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={saveProfile}
                    disabled={actionLoading}
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 