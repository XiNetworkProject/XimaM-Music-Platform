'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Edit3,
  Settings,
  Heart,
  MessageCircle,
  Share2,
  Play,
  Pause,
  Plus,
  Users,
  Music,
  Calendar,
  MapPin,
  Globe,
  Mail,
  Camera,
  X,
  Check,
  Star,
  Trophy,
  TrendingUp,
  Eye,
  EyeOff,
  MoreVertical,
  ArrowLeft,
  ArrowRight,
  Download,
  Bookmark,
  Flag,
  Crown,
  Verified,
  Mic,
  Headphones,
  Disc3,
  Radio,
  Volume2,
  UserPlus
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useAudioPlayer } from '@/app/providers';

interface UserProfile {
  _id: string;
  username: string;
  name: string;
  email: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  location?: string;
  website?: string;
  isVerified: boolean;
  isArtist: boolean;
  followers: string[];
  following: string[];
  trackCount: number;
  playlistCount: number;
  totalPlays: number;
  totalLikes: number;
  createdAt: string;
  lastActive: string;
  badges: string[];
  genres: string[];
  instruments: string[];
  socialLinks: {
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
  createdBy: UserProfile;
  likes: string[];
  followers: string[];
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const { playTrack } = useAudioPlayer();
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;

  // États principaux
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists' | 'about' | 'activity'>('tracks');
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState<'avatar' | 'banner' | null>(null);

  // Données du profil
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [commonFollowers, setCommonFollowers] = useState<UserProfile[]>([]);

  // États pour l'édition
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    location: '',
    website: '',
    genres: [] as string[],
    instruments: [] as string[],
    socialLinks: {
      instagram: '',
      twitter: '',
      youtube: '',
      soundcloud: ''
    }
  });

  // Charger les données du profil
  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Profil utilisateur
      const profileRes = await fetch(`/api/users/${username}`);
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
        setIsOwnProfile(profileData._id === session?.user?.id);
        setIsFollowing(profileData.followers.includes(session?.user?.id));
        
        // Préparer le formulaire d'édition
        setEditForm({
          name: profileData.name,
          bio: profileData.bio || '',
          location: profileData.location || '',
          website: profileData.website || '',
          genres: profileData.genres || [],
          instruments: profileData.instruments || [],
          socialLinks: profileData.socialLinks || {}
        });
      }

      // Musiques de l'utilisateur
      const tracksRes = await fetch(`/api/tracks?artist=${username}&limit=50`);
      if (tracksRes.ok) {
        const tracksData = await tracksRes.json();
        setTracks(tracksData.tracks || []);
      }

      // Playlists de l'utilisateur
      const playlistsRes = await fetch(`/api/playlists?user=${username}&limit=20`);
      if (playlistsRes.ok) {
        const playlistsData = await playlistsRes.json();
        setPlaylists(playlistsData.playlists || []);
      }

    } catch (error) {
      // Erreur silencieuse
    } finally {
      setLoading(false);
    }
  }, [username, session?.user?.id]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Charger followers/following
  const fetchFollowers = async () => {
    try {
      const res = await fetch(`/api/users/${username}/followers`);
      if (res.ok) {
        const data = await res.json();
        setFollowers(data.followers || []);
      }
    } catch (error) {
      // Erreur silencieuse
    }
  };

  const fetchFollowing = async () => {
    try {
      const res = await fetch(`/api/users/${username}/following`);
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following || []);
      }
    } catch (error) {
      // Erreur silencieuse
    }
  };

  // Charger l'activité et les abonnés communs
  useEffect(() => {
    const fetchActivityAndCommon = async () => {
      try {
        // Feed d'activité
        const activityRes = await fetch(`/api/users/${username}/activity`);
        if (activityRes.ok) {
          const activityData = await activityRes.json();
          setActivity(activityData.activity || []);
        }
        // Abonnés communs
        if (session?.user?.id && profile) {
          const commonRes = await fetch(`/api/users/${username}/common-followers`);
          if (commonRes.ok) {
            const commonData = await commonRes.json();
            setCommonFollowers(commonData.commonFollowers || []);
          }
        }
      } catch {}
    };
    if (profile) fetchActivityAndCommon();
  }, [profile, session?.user?.id, username]);

  // Toggle follow
  const toggleFollow = async () => {
    if (!session?.user?.id) return;
    
    try {
      setActionLoading(true);
      const res = await fetch(`/api/users/${profile!._id}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.ok) {
        setIsFollowing(!isFollowing);
        setProfile(prev => prev ? {
          ...prev,
          followers: isFollowing 
            ? prev.followers.filter(id => id !== session.user.id)
            : [...prev.followers, session.user.id]
        } : null);
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setActionLoading(false);
    }
  };

  // Sauvegarder les modifications du profil
  const saveProfile = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/users/${profile!._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, ...editForm } : null);
        setShowEditProfile(false);
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setActionLoading(false);
    }
  };

  // Upload d'images
  const uploadImage = async (file: File, type: 'avatar' | 'banner') => {
    try {
      setUploadLoading(type);
      
      // Prévisualisation immédiate
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewUrl = e.target?.result as string;
        setProfile(prev => prev ? {
          ...prev,
          [type]: previewUrl
        } : null);
      };
      reader.readAsDataURL(file);

      // Upload vers le serveur
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);
      
      const res = await fetch('/api/users/upload-image', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        // Mettre à jour avec l'URL finale du serveur
        setProfile(prev => prev ? {
          ...prev,
          [type]: data.url
        } : null);
        
        // Afficher un message de succès
        console.log('Image uploadée avec succès:', data.message);
      } else {
        const errorData = await res.json();
        console.error('Erreur upload:', errorData.error);
        // Revenir à l'image précédente en cas d'erreur
        fetchProfileData();
      }
    } catch (error) {
      console.error('Erreur upload image:', error);
      // Revenir à l'image précédente en cas d'erreur
      fetchProfileData();
    } finally {
      setUploadLoading(null);
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-white/40 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Profil non trouvé</h2>
          <p className="text-white/60 mb-4">L'utilisateur @{username} n'existe pas</p>
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
        <img
          src={profile.banner || '/default-cover.jpg'}
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

        {/* Actions du profil */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {isOwnProfile ? (
            <button
              onClick={() => setShowEditProfile(true)}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full font-medium hover:bg-white/30 transition-all"
            >
              <Edit3 size={16} />
              Modifier
            </button>
          ) : (
            <>
              <button
                onClick={toggleFollow}
                disabled={actionLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                  isFollowing 
                    ? 'bg-pink-600 text-white hover:bg-pink-700' 
                    : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                }`}
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <UserPlus size={16} />
                )}
                {isFollowing ? 'Abonné' : 'Suivre'}
              </button>
              <button className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors">
                <MoreVertical size={20} />
              </button>
            </>
          )}
        </div>

        {/* Informations du profil */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end gap-6">
            <div className="relative">
              <img
                src={profile.avatar || '/default-avatar.png'}
                alt={profile.name}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white/20"
              />
              {profile.isVerified && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Verified size={16} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold">{profile.name}</h1>
                {profile.isArtist && (
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    <Mic size={14} className="inline mr-1" />
                    Artiste
                  </span>
                )}
              </div>
              <p className="text-white/80 text-lg">@{profile.username}</p>
              {profile.bio && (
                <p className="text-white/70 mt-2 max-w-2xl">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="glass-effect rounded-xl p-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="cursor-pointer" onClick={() => setActiveTab('tracks')}>
              <div className="text-2xl font-bold text-purple-400">{profile.trackCount}</div>
              <div className="text-sm text-white/60">Morceaux</div>
            </div>
            <div className="cursor-pointer" onClick={() => setActiveTab('playlists')}>
              <div className="text-2xl font-bold text-pink-400">{profile.playlistCount}</div>
              <div className="text-sm text-white/60">Playlists</div>
            </div>
            <div className="cursor-pointer" onClick={() => setShowFollowers(true)}>
              <div className="text-2xl font-bold text-blue-400">{formatNumber(profile.followers.length)}</div>
              <div className="text-sm text-white/60">Abonnés</div>
            </div>
            <div className="cursor-pointer" onClick={() => setShowFollowing(true)}>
              <div className="text-2xl font-bold text-green-400">{formatNumber(profile.following.length)}</div>
              <div className="text-sm text-white/60">Abonnements</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">{formatNumber(profile.totalPlays)}</div>
              <div className="text-sm text-white/60">Écoutes</div>
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
              Morceaux
            </button>
            <button
              onClick={() => setActiveTab('playlists')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'playlists'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <Headphones size={16} className="inline mr-2" />
              Playlists
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'about'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <User size={16} className="inline mr-2" />
              À propos
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'activity'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <TrendingUp size={16} className="inline mr-2" />
              Activité
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
                <h2 className="text-xl font-bold mb-6">Morceaux publiés</h2>
                {tracks.length === 0 ? (
                  <div className="text-center py-12">
                    <Music className="w-16 h-16 text-white/40 mx-auto mb-4" />
                    <p className="text-white/60 mb-4">Aucun morceau publié</p>
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
                  <div className="space-y-3">
                    {tracks.map((track, index) => (
                      <motion.div
                        key={track._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <img
                          src={track.coverUrl || '/default-cover.jpg'}
                          alt={track.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{track.title}</h4>
                          <p className="text-sm text-white/60 truncate">
                            {track.artist?.name || track.artist?.username}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => playTrack(track)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                          >
                            <Play size={16} />
                          </button>
                          <span className="text-white/40 text-sm">
                            {formatDuration(track.duration)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-white/40 text-sm block">
                            {formatNumber(track.plays)} écoutes
                          </span>
                          <span className="text-white/40 text-xs">
                            {formatNumber(track.likes.length)} likes
                          </span>
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
              >
                <h2 className="text-xl font-bold mb-6">Playlists</h2>
                {playlists.length === 0 ? (
                  <div className="text-center py-12">
                    <Headphones className="w-16 h-16 text-white/40 mx-auto mb-4" />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {playlists.map((playlist) => (
                      <motion.div
                        key={playlist._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-effect rounded-xl p-4 cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => router.push(`/playlists/${playlist._id}`)}
                      >
                        <img
                          src={playlist.coverUrl || '/default-cover.jpg'}
                          alt={playlist.name}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                        <h3 className="font-semibold mb-1">{playlist.name}</h3>
                        <p className="text-sm text-white/60 mb-2">{playlist.description}</p>
                        <div className="flex items-center justify-between text-xs text-white/40">
                          <span>{playlist.trackCount} pistes</span>
                          <span>{formatNumber(playlist.likes.length)} likes</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'about' && (
              <motion.div
                key="about"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <div>
                  <h2 className="text-xl font-bold mb-4">Informations</h2>
                  <div className="space-y-4">
                    {profile.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="text-purple-400" size={20} />
                        <span>{profile.location}</span>
                      </div>
                    )}
                    {profile.website && (
                      <div className="flex items-center gap-3">
                        <Globe className="text-blue-400" size={20} />
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          {profile.website}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Calendar className="text-green-400" size={20} />
                      <span>Membre depuis {new Date(profile.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="text-pink-400" size={20} />
                      <span>Dernière activité {new Date(profile.lastActive).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {profile.genres && profile.genres.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold mb-3">Genres préférés</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.genres.map((genre) => (
                          <span key={genre} className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.instruments && profile.instruments.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold mb-3">Instruments</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.instruments.map((instrument) => (
                          <span key={instrument} className="bg-pink-500/20 text-pink-300 px-3 py-1 rounded-full text-sm">
                            {instrument}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-4">Statistiques</h2>
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white/60">Total des écoutes</span>
                        <span className="font-bold">{formatNumber(profile.totalPlays)}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full" style={{ width: `${Math.min(profile.totalPlays / 1000, 100)}%` }}></div>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white/60">Total des likes</span>
                        <span className="font-bold">{formatNumber(profile.totalLikes)}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div className="bg-gradient-to-r from-pink-600 to-red-600 h-2 rounded-full" style={{ width: `${Math.min(profile.totalLikes / 100, 100)}%` }}></div>
                      </div>
                    </div>

                    {profile.badges && profile.badges.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-semibold mb-3">Badges</h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.badges.map((badge) => (
                            <span key={badge} className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                              <Trophy size={14} />
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <h2 className="text-xl font-bold mb-6">Activité récente</h2>
                {activity.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-white/40 mx-auto mb-4" />
                    <p className="text-white/60 mb-4">Aucune activité récente</p>
                  </div>
                ) : (
                  activity.map((act, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      {/* Affichage contextuel selon le type d'activité */}
                      <span className="text-white/80 font-medium">{act.text}</span>
                      <span className="text-xs text-white/40 ml-auto">{new Date(act.date).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Badges et progression */}
        {profile.badges && profile.badges.length > 0 && (
          <div className="glass-effect rounded-xl p-6 mb-8">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Trophy size={18} className="text-yellow-400" /> Badges</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.badges.map((badge) => (
                <span key={badge} className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <Trophy size={14} />
                  {badge}
                </span>
              ))}
            </div>
            {/* Barre de progression vers le prochain badge (exemple) */}
            <div className="w-full bg-white/10 rounded-full h-3">
              <div className="bg-gradient-to-r from-yellow-400 to-pink-500 h-3 rounded-full" style={{ width: `${Math.min(profile.totalPlays / 1000, 100)}%` }}></div>
            </div>
            <div className="text-xs text-white/60 mt-1">Prochain badge à {1000 - (profile.totalPlays % 1000)} écoutes !</div>
          </div>
        )}

        {/* Bouton de partage du profil */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            <Share2 size={16} />
            Partager le profil
          </button>
        </div>

        {/* Abonnés communs */}
        {commonFollowers.length > 0 && (
          <div className="glass-effect rounded-xl p-4 mb-8">
            <h3 className="font-semibold mb-2">Abonnés en commun</h3>
            <div className="flex flex-wrap gap-3">
              {commonFollowers.map((user) => (
                <div key={user._id} className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                  <img src={user.avatar || '/default-avatar.png'} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
                  <span className="text-sm">{user.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal d'édition de profil */}
      <AnimatePresence>
        {showEditProfile && (
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
                  onClick={() => setShowEditProfile(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Photo de profil</label>
                    <div className="relative">
                      <img
                        src={profile.avatar || '/default-avatar.png'}
                        alt="Avatar"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                      {uploadLoading === 'avatar' && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                      )}
                      <label className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-700 transition-colors">
                        <Camera size={16} />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'avatar')}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Bannière</label>
                    <div className="relative">
                      <img
                        src={profile.banner || '/default-cover.jpg'}
                        alt="Bannière"
                        className="w-full h-24 rounded-lg object-cover"
                      />
                      {uploadLoading === 'banner' && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                      )}
                      <label className="absolute bottom-2 right-2 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-700 transition-colors">
                        <Camera size={16} />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'banner')}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Informations de base */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Nom</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Localisation</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Site web</label>
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowEditProfile(false)}
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

      {/* Modal Followers */}
      <AnimatePresence>
        {showFollowers && (
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
              className="glass-effect rounded-xl p-6 w-full max-w-md max-h-96 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Abonnés ({profile.followers.length})</h3>
                <button
                  onClick={() => setShowFollowers(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-3">
                {followers.map((follower) => (
                  <div key={follower._id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <img
                      src={follower.avatar || '/default-avatar.png'}
                      alt={follower.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{follower.name}</h4>
                      <p className="text-sm text-white/60 truncate">@{follower.username}</p>
                    </div>
                    <button
                      onClick={() => router.push(`/profile/${follower.username}`)}
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Following */}
      <AnimatePresence>
        {showFollowing && (
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
              className="glass-effect rounded-xl p-6 w-full max-w-md max-h-96 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Abonnements ({profile.following.length})</h3>
                <button
                  onClick={() => setShowFollowing(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-3">
                {following.map((followed) => (
                  <div key={followed._id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <img
                      src={followed.avatar || '/default-avatar.png'}
                      alt={followed.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{followed.name}</h4>
                      <p className="text-sm text-white/60 truncate">@{followed.username}</p>
                    </div>
                    <button
                      onClick={() => router.push(`/profile/${followed.username}`)}
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 