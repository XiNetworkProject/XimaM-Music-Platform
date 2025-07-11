'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Settings, 
  Edit, 
  Camera, 
  Music, 
  Heart, 
  Play,
  Users,
  Calendar,
  MapPin,
  Globe,
  Instagram,
  Twitter,
  Youtube,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserProfile {
  _id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    soundcloud?: string;
    spotify?: string;
  };
  isArtist: boolean;
  artistName?: string;
  genre?: string[];
  totalPlays: number;
  totalLikes: number;
  followers: string[];
  following: string[];
  tracks: any[];
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    fetchProfile();
  }, [session, status, router]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/users/me');
      const data = await response.json();
      
      if (response.ok) {
        setProfile(data.user);
      } else {
        toast.error('Erreur lors du chargement du profil');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!session?.user) {
    return null; // Redirection en cours
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <User size={64} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-300">Erreur de chargement du profil</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header avec bannière */}
      <div className="relative">
        <div 
          className="h-48 bg-gradient-to-r from-purple-600 to-pink-600"
          style={{
            backgroundImage: profile.banner ? `url(${profile.banner})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-black/30"></div>
        </div>
        
        {/* Avatar et infos principales */}
        <div className="relative px-4 pb-6">
          <div className="flex items-end space-x-4 -mt-16">
            <div className="relative">
              <img
                src={profile.avatar || '/default-avatar.png'}
                alt={profile.name}
                className="w-32 h-32 rounded-full border-4 border-white object-cover"
              />
              <button className="absolute bottom-0 right-0 p-2 bg-purple-600 rounded-full hover:bg-purple-700 transition-colors">
                <Camera size={16} className="text-white" />
              </button>
            </div>
            
            <div className="flex-1 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
                {profile.isArtist && (
                  <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                    Artiste
                  </span>
                )}
              </div>
              <p className="text-gray-300">@{profile.username}</p>
              {profile.bio && (
                <p className="text-gray-300 mt-2">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <motion.div 
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center"
            whileHover={{ scale: 1.05 }}
          >
            <Play size={24} className="mx-auto mb-2 text-purple-400" />
            <p className="text-2xl font-bold text-white">{profile.totalPlays.toLocaleString()}</p>
            <p className="text-sm text-gray-300">Écoutes</p>
          </motion.div>
          
          <motion.div 
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center"
            whileHover={{ scale: 1.05 }}
          >
            <Heart size={24} className="mx-auto mb-2 text-pink-400" />
            <p className="text-2xl font-bold text-white">{profile.totalLikes.toLocaleString()}</p>
            <p className="text-sm text-gray-300">J'aime</p>
          </motion.div>
          
          <motion.div 
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center"
            whileHover={{ scale: 1.05 }}
          >
            <Users size={24} className="mx-auto mb-2 text-blue-400" />
            <p className="text-2xl font-bold text-white">{profile.followers.length}</p>
            <p className="text-sm text-gray-300">Abonnés</p>
          </motion.div>
        </div>
      </div>

      {/* Informations détaillées */}
      <div className="px-4 space-y-4">
        {/* Informations personnelles */}
        <motion.div 
          className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-lg font-semibold text-white mb-3">Informations</h3>
          <div className="space-y-2">
            {profile.location && (
              <div className="flex items-center space-x-2">
                <MapPin size={16} className="text-gray-400" />
                <span className="text-gray-300">{profile.location}</span>
              </div>
            )}
            {profile.website && (
              <div className="flex items-center space-x-2">
                <Globe size={16} className="text-gray-400" />
                <a 
                  href={profile.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {profile.website}
                </a>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-gray-300">
                Membre depuis {new Date(profile.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Réseaux sociaux */}
        {profile.socialLinks && Object.values(profile.socialLinks).some(link => link) && (
          <motion.div 
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-lg font-semibold text-white mb-3">Réseaux sociaux</h3>
            <div className="flex space-x-3">
              {profile.socialLinks.instagram && (
                <a 
                  href={profile.socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full hover:scale-110 transition-transform"
                >
                  <Instagram size={20} className="text-white" />
                </a>
              )}
              {profile.socialLinks.twitter && (
                <a 
                  href={profile.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-blue-500 rounded-full hover:scale-110 transition-transform"
                >
                  <Twitter size={20} className="text-white" />
                </a>
              )}
              {profile.socialLinks.youtube && (
                <a 
                  href={profile.socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-red-500 rounded-full hover:scale-110 transition-transform"
                >
                  <Youtube size={20} className="text-white" />
                </a>
              )}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div 
          className="flex space-x-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button 
            onClick={() => router.push('/profile/edit')}
            className="flex-1 flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-xl transition-colors"
          >
            <Edit size={16} />
            <span>Modifier le profil</span>
          </button>
          
          <button 
            onClick={() => router.push('/settings')}
            className="flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-xl transition-colors"
          >
            <Settings size={16} />
          </button>
        </motion.div>
      </div>
    </div>
  );
} 