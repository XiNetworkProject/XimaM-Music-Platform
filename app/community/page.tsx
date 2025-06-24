'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, TrendingUp, UserPlus, Music, Heart, MessageCircle, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

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

export default function CommunityPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'artists' | 'trending'>('artists');
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<User[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Charger les données depuis l'API
  useEffect(() => {
    const fetchCommunityData = async () => {
      try {
        setLoading(true);
        
        // Charger les utilisateurs
        const usersResponse = await fetch('/api/users?limit=20');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData.users || []);
        }

        // Charger les pistes tendances
        const trendingResponse = await fetch('/api/tracks?trending=true&limit=10');
        if (trendingResponse.ok) {
          const trendingData = await trendingResponse.json();
          setTrendingTracks(trendingData.tracks || []);
        }

      } catch (error) {
        console.error('Erreur chargement communauté:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityData();
  }, []);

  const toggleFollow = async (userId: string) => {
    const newFollowing = new Set(followingUsers);
    if (newFollowing.has(userId)) {
      newFollowing.delete(userId);
    } else {
      newFollowing.add(userId);
    }
    setFollowingUsers(newFollowing);

    // Appel API pour suivre/ne plus suivre
    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du follow');
      }
    } catch (error) {
      console.error('Erreur follow:', error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Chargement de la communauté...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-effect">
        <div className="p-4">
          <h1 className="text-2xl font-bold gradient-text mb-4">Communauté</h1>
          
          {/* Onglets */}
          <div className="flex space-x-1 bg-white/10 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('artists')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'artists'
                  ? 'bg-primary-500 text-white'
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
                  ? 'bg-primary-500 text-white'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <TrendingUp size={16} className="inline mr-2" />
              Tendances
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-32">
        <div className="container mx-auto px-4">
          <AnimatePresence mode="wait">
            {activeTab === 'artists' && (
              <motion.div
                key="artists"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {users.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-white/60 mb-4">Aucun artiste trouvé</p>
                    <a
                      href="/upload"
                      className="bg-primary-500 text-white px-6 py-3 rounded-full font-medium hover:bg-primary-600 transition-colors"
                    >
                      Devenir le premier artiste
                    </a>
                  </div>
                ) : (
                  users.map((user) => (
                    <motion.div
                      key={user._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-effect rounded-xl p-4"
                    >
                      <div className="flex items-center space-x-4">
                        {/* Avatar */}
                        <div className="relative">
                          <img
                            src={user.avatar || '/default-avatar.png'}
                            alt={user.name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          {user.isVerified && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>

                        {/* Informations utilisateur */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold">{user.name}</h3>
                            <span className="text-sm text-white/60">@{user.username}</span>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-white/60 mb-2">
                            <span>{formatNumber(user.followers.length)} abonnés</span>
                            <span>{user.trackCount} pistes</span>
                          </div>

                          {/* Dernière piste */}
                          {user.latestTrack && (
                            <div className="flex items-center space-x-2">
                              <img
                                src={user.latestTrack.coverUrl || '/default-cover.jpg'}
                                alt={user.latestTrack.title}
                                className="w-8 h-8 rounded object-cover"
                              />
                              <span className="text-xs text-white/80">
                                {user.latestTrack.title} • {formatNumber(user.latestTrack.plays)} écoutes
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end space-y-2">
                          <button
                            onClick={() => toggleFollow(user._id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                              followingUsers.has(user._id) || user.isFollowing
                                ? 'bg-white/20 text-white'
                                : 'bg-primary-500 text-white hover:bg-primary-600'
                            }`}
                          >
                            {followingUsers.has(user._id) || user.isFollowing ? 'Suivi' : 'Suivre'}
                          </button>
                          
                          <button
                            onClick={() => router.push(`/profile/${user.username}`)}
                            className="text-xs text-white/60 hover:text-white/80"
                          >
                            Voir profil
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
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
                className="space-y-4"
              >
                <h2 className="text-xl font-bold mb-6">Pistes Tendances</h2>
                
                {trendingTracks.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-white/60 mb-4">Aucune piste tendance pour le moment</p>
                    <a
                      href="/upload"
                      className="bg-primary-500 text-white px-6 py-3 rounded-full font-medium hover:bg-primary-600 transition-colors"
                    >
                      Uploader une piste
                    </a>
                  </div>
                ) : (
                  trendingTracks.map((track, index) => (
                    <motion.div
                      key={track._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="glass-effect rounded-xl p-4"
                    >
                      <div className="flex items-center space-x-4">
                        {/* Cover */}
                        <img
                          src={track.coverUrl || '/default-cover.jpg'}
                          alt={track.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />

                        {/* Info */}
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{track.title}</h3>
                          <p className="text-sm text-white/60 mb-2">
                            {track.artist?.name || track.artist?.username}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-white/40">
                            <span>{formatNumber(track.plays)} écoutes</span>
                            <span>{formatNumber(track.likes.length)} likes</span>
                            <span>{formatNumber(track.comments.length)} commentaires</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            <Heart size={16} />
                          </button>
                          <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            <MessageCircle size={16} />
                          </button>
                          <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            <Share2 size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
} 