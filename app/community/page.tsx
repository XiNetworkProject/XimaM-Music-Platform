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
  Star,
  Search,
  List,
  Grid,
  Plus,
  X,
  Check,
  Calendar,
  ArrowUpRight,
  User,
  Flame,
  Trophy,
  Eye,
  EyeOff,
  Play
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
}

interface Post {
  _id: string;
  type: 'track' | 'playlist' | 'message';
  user: User;
  content: string;
  track?: Track;
  playlist?: Playlist;
  createdAt: string;
  likes: string[];
  comments: Comment[];
}

interface Comment {
  _id: string;
  user: User;
  content: string;
  createdAt: string;
}

export default function CommunityPage() {
  const { data: session } = useSession();
  const { playTrack } = useAudioPlayer();
  const [activeTab, setActiveTab] = useState<'feed' | 'artists' | 'playlists' | 'classement'>('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [topUsers, setTopUsers] = useState<User[]>([]);
  const [topPlaylists, setTopPlaylists] = useState<Playlist[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  // Charger les données communautaires
  const fetchCommunityData = useCallback(async () => {
      try {
        setLoading(true);
      // Feed communautaire (posts)
      const postsRes = await fetch('/api/community/feed?limit=20');
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData.posts || []);
      }
      // Utilisateurs
      const usersRes = await fetch('/api/users?limit=20');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
          setUsers(usersData.users || []);
        }
      // Playlists publiques
      const playlistsRes = await fetch('/api/playlists?limit=20');
      if (playlistsRes.ok) {
        const playlistsData = await playlistsRes.json();
        setPlaylists(playlistsData.playlists || []);
      }
      // Classements
      const topUsersRes = await fetch('/api/users?sort=followers&limit=10');
      if (topUsersRes.ok) {
        const topUsersData = await topUsersRes.json();
        setTopUsers(topUsersData.users || []);
      }
      const topPlaylistsRes = await fetch('/api/playlists?sort=likes&limit=10');
      if (topPlaylistsRes.ok) {
        const topPlaylistsData = await topPlaylistsRes.json();
        setTopPlaylists(topPlaylistsData.playlists || []);
        }
      } catch (error) {
      // Erreur silencieuse
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    fetchCommunityData();
  }, [fetchCommunityData]);

  // Création d'un post
  const createPost = async () => {
    if (!newPostContent.trim()) return;
    try {
      setActionLoading(true);
      const res = await fetch('/api/community/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPostContent })
      });
      if (res.ok) {
        setNewPostContent('');
        setShowCreatePost(false);
        fetchCommunityData();
      }
    } catch (e) {
      // Erreur silencieuse
    } finally {
      setActionLoading(false);
    }
  };

  // Like/unlike post
  const toggleLikePost = async (postId: string) => {
    setPosts(prev => prev.map(post => post._id === postId ? {
      ...post,
      likes: post.likes.includes(session?.user?.id || '')
        ? post.likes.filter(id => id !== session?.user?.id)
        : [...post.likes, session?.user?.id || '']
    } : post));
    await fetch(`/api/community/feed/${postId}/like`, { method: 'POST' });
  };

  // Like/unlike playlist
  const toggleLikePlaylist = async (playlistId: string) => {
    setPlaylists(prev => prev.map(pl => pl._id === playlistId ? {
      ...pl,
      likes: pl.likes.includes(session?.user?.id || '')
        ? pl.likes.filter(id => id !== session?.user?.id)
        : [...pl.likes, session?.user?.id || '']
    } : pl));
    await fetch(`/api/playlists/${playlistId}/like`, { method: 'POST' });
  };

  // Follow/unfollow user
  const toggleFollow = async (userId: string) => {
    setUsers(prev => prev.map(u => u._id === userId ? {
      ...u,
      isFollowing: !u.isFollowing
    } : u));
    await fetch(`/api/users/${userId}/follow`, { method: 'POST' });
  };

  // Formatage
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Recherche filtrée
  const filteredPosts = posts.filter(post =>
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (post.track && post.track.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (post.playlist && post.playlist.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredPlaylists = playlists.filter(pl =>
    pl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pl.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="max-w-5xl mx-auto">
      {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold gradient-text flex items-center gap-3 mb-2">
              <Users size={28} className="text-purple-400" />
              Communauté
            </h1>
            <p className="text-white/60 text-lg">Partagez, découvrez et interagissez avec la communauté musicale.</p>
          </div>

          {/* Barre de recherche et création de post */}
          <div className="glass-effect rounded-xl p-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
              <input
                type="text"
                placeholder="Rechercher dans la communauté..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 rounded-xl border border-white/20 focus:border-purple-400 focus:outline-none text-white placeholder-white/60"
              />
            </div>
            <button
              onClick={() => setShowCreatePost(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              <Plus size={16} />
              <span>Nouveau post</span>
            </button>
          </div>

          {/* Modal création post */}
          <AnimatePresence>
            {showCreatePost && (
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
                  className="glass-effect rounded-xl p-6 w-full max-w-md"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Créer un post</h3>
                    <button
                      onClick={() => setShowCreatePost(false)}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <textarea
                    value={newPostContent}
                    onChange={e => setNewPostContent(e.target.value)}
                    placeholder="Exprimez-vous, partagez une playlist ou un morceau..."
                    rows={4}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none resize-none mb-4"
                  />
                  <div className="flex space-x-3 pt-2">
                    <button
                      onClick={() => setShowCreatePost(false)}
                      className="flex-1 py-2 px-4 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={createPost}
                      disabled={!newPostContent.trim() || actionLoading}
                      className="flex-1 py-2 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? 'Publication...' : 'Publier'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          
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
                <List size={16} className="inline mr-2" />
                Fil d'actualité
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
                onClick={() => setActiveTab('playlists')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'playlists'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <Music size={16} className="inline mr-2" />
                Playlists
              </button>
              <button
                onClick={() => setActiveTab('classement')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'classement'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
                <Trophy size={16} className="inline mr-2" />
                Classements
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
                  className="space-y-6"
                >
                  {filteredPosts.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-white/60 mb-4">Aucun post pour le moment</p>
                      <button
                        onClick={() => setShowCreatePost(true)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                      >
                        Créer le premier post
                      </button>
                    </div>
                  ) : (
                    filteredPosts.map((post) => (
                      <motion.div
                        key={post._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-effect rounded-xl p-5 flex flex-col gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={post.user.avatar || '/default-avatar.svg'}
                            alt={post.user.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-purple-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold truncate">{post.user.name}</span>
                              {post.user.isVerified && <Check className="text-blue-400 w-4 h-4" />}
                            </div>
                            <span className="text-xs text-white/40">@{post.user.username}</span>
                          </div>
                          <span className="text-xs text-white/40">{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-white/90 text-base whitespace-pre-line">{post.content}</div>
                        {post.track && (
                          <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                            <img
                              src={post.track.coverUrl || '/default-cover.svg'}
                              alt={post.track.title}
                              className="w-12 h-12 rounded object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{post.track.title}</h4>
                              <p className="text-sm text-white/60 truncate">{post.track.artist?.name || post.track.artist?.username}</p>
                            </div>
                            <button
                              onClick={() => playTrack(post.track!)}
                              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                              <Play size={16} />
                            </button>
                          </div>
                        )}
                        {post.playlist && (
                          <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                            <img
                              src={post.playlist.coverUrl || '/default-cover.svg'}
                              alt={post.playlist.name}
                              className="w-12 h-12 rounded object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{post.playlist.name}</h4>
                              <p className="text-sm text-white/60 truncate">{post.playlist.description}</p>
                            </div>
                            <button
                              onClick={() => router.push(`/playlists/${post.playlist!._id}`)}
                              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                              <ArrowUpRight size={16} />
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <button
                            onClick={() => toggleLikePost(post._id)}
                            className={`flex items-center gap-1 text-sm ${post.likes.includes(session?.user?.id || '') ? 'text-pink-400' : 'text-white/60 hover:text-white'}`}
                          >
                            <Heart size={16} /> {formatNumber(post.likes.length)}
                          </button>
                          <button className="flex items-center gap-1 text-sm text-white/60 hover:text-white">
                            <MessageCircle size={16} /> {formatNumber(post.comments.length)}
                          </button>
                          <button className="flex items-center gap-1 text-sm text-white/60 hover:text-white">
                            <Share2 size={16} /> Partager
                          </button>
                        </div>
                      </motion.div>
                    ))
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
                className="space-y-4"
              >
                  {filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-white/60 mb-4">Aucun artiste trouvé</p>
                    <a
                      href="/upload"
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                    >
                      Devenir le premier artiste
                    </a>
                  </div>
                ) : (
                    filteredUsers.map((user) => (
                    <motion.div
                      key={user._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                        className="glass-effect rounded-xl p-4 flex items-center gap-4"
                    >
                          <img
                            src={user.avatar || '/default-avatar.svg'}
                            alt={user.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-purple-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold truncate">{user.name}</span>
                            {user.isVerified && <Check className="text-blue-400 w-4 h-4" />}
                          </div>
                          <span className="text-xs text-white/40">@{user.username}</span>
                          <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                            <span><Music size={12} className="inline mr-1" />{user.trackCount} morceaux</span>
                            <span><UserPlus size={12} className="inline mr-1" />{formatNumber(user.followers.length)} abonnés</span>
                          </div>
                        </div>
                          <button
                            onClick={() => toggleFollow(user._id)}
                          className={`px-4 py-2 rounded-full font-medium transition-all ${user.isFollowing ? 'bg-pink-600 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
                          >
                          {user.isFollowing ? 'Abonné' : 'Suivre'}
                          </button>
                    </motion.div>
                  ))
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
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {filteredPlaylists.length === 0 ? (
                    <div className="text-center py-12 col-span-full">
                      <p className="text-white/60 mb-4">Aucune playlist publique trouvée</p>
                    <a
                        href="/library"
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                    >
                        Créer une playlist
                    </a>
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
                          src={playlist.coverUrl || '/default-cover.svg'}
                          alt={playlist.name}
                          className="w-full h-32 object-cover rounded-lg mb-2"
                        />
                        <h3 className="font-semibold mb-1 truncate">{playlist.name}</h3>
                        <p className="text-sm text-white/60 truncate">{playlist.description}</p>
                        <div className="flex items-center justify-between text-xs text-white/40">
                          <span>{playlist.trackCount} pistes</span>
                          <span>{formatNumber(playlist.likes.length)} likes</span>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); toggleLikePlaylist(playlist._id); }}
                          className={`flex items-center gap-1 text-sm mt-2 ${playlist.likes.includes(session?.user?.id || '') ? 'text-pink-400' : 'text-white/60 hover:text-white'}`}
                        >
                          <Heart size={16} /> {formatNumber(playlist.likes.length)}
                          </button>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

              {activeTab === 'classement' && (
                <motion.div
                  key="classement"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  <div>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Trophy size={20} className="text-yellow-400" /> Top Artistes</h3>
                    <div className="space-y-3">
                      {topUsers.length === 0 ? (
                        <p className="text-white/60">Aucun utilisateur trouvé</p>
                      ) : (
                        topUsers.map((user, idx) => (
                          <div key={user._id} className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                            <span className="font-bold text-lg text-yellow-400 w-6 text-center">#{idx + 1}</span>
                            <img
                              src={user.avatar || '/default-avatar.svg'}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-purple-500"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold truncate">{user.name}</span>
                              <span className="block text-xs text-white/40">@{user.username}</span>
                            </div>
                            <span className="text-xs text-white/40"><UserPlus size={14} className="inline mr-1" />{formatNumber(user.followers.length)} abonnés</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Flame size={20} className="text-pink-500" /> Playlists Populaires</h3>
                    <div className="space-y-3">
                      {topPlaylists.length === 0 ? (
                        <p className="text-white/60">Aucune playlist trouvée</p>
                      ) : (
                        topPlaylists.map((playlist, idx) => (
                          <div key={playlist._id} className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                            <span className="font-bold text-lg text-pink-500 w-6 text-center">#{idx + 1}</span>
                            <img
                              src={playlist.coverUrl || '/default-cover.svg'}
                              alt={playlist.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold truncate">{playlist.name}</span>
                              <span className="block text-xs text-white/40">{playlist.trackCount} pistes</span>
                            </div>
                            <span className="text-xs text-white/40"><Heart size={14} className="inline mr-1" />{formatNumber(playlist.likes.length)} likes</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
          </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
} 