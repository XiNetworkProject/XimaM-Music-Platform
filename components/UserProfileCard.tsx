'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Music, Heart, Users, Calendar, MapPin, Link as LinkIcon, Edit, Settings } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import SocialStats from './SocialStats';

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
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  trackCount: number;
  playlistCount: number;
  totalPlays: number;
  totalLikes: number;
  createdAt: string;
  isFollowing: boolean;
}

interface UserProfileCardProps {
  user: UserProfile;
  showActions?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onProfileUpdate?: (user: UserProfile) => void;
}

export default function UserProfileCard({
  user,
  showActions = true,
  size = 'md',
  className = '',
  onProfileUpdate
}: UserProfileCardProps) {
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const isOwnProfile = session?.user?.id === user._id;

  const sizeClasses = {
    sm: {
      container: 'p-4',
      avatar: 'w-16 h-16',
      banner: 'h-20',
      name: 'text-lg',
      username: 'text-sm',
      bio: 'text-sm'
    },
    md: {
      container: 'p-6',
      avatar: 'w-20 h-20',
      banner: 'h-24',
      name: 'text-xl',
      username: 'text-base',
      bio: 'text-base'
    },
    lg: {
      container: 'p-8',
      avatar: 'w-24 h-24',
      banner: 'h-32',
      name: 'text-2xl',
      username: 'text-lg',
      bio: 'text-lg'
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long'
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const handleStatsUpdate = (stats: any) => {
    if (onProfileUpdate) {
      onProfileUpdate({
        ...user,
        followerCount: stats.followers || user.followerCount,
        followingCount: stats.following || user.followingCount
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${sizeClasses[size].container} ${className}`}
    >
      {/* Bannière */}
      <div className={`relative ${sizeClasses[size].banner} bg-gradient-to-r from-purple-500 to-pink-500`}>
        {user.banner && (
          <Image
            src={user.banner}
            alt="Bannière"
            fill
            className="object-cover"
          />
        )}
        
        {/* Avatar */}
        <div className={`absolute -bottom-8 left-6 ${sizeClasses[size].avatar} rounded-full border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden`}>
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt={user.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <User className="text-white" size={size === 'sm' ? 20 : size === 'md' ? 24 : 28} />
            </div>
          )}
        </div>

        {/* Badge vérifié */}
        {user.isVerified && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
          >
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </motion.div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="absolute top-2 right-2 flex gap-2">
            {isOwnProfile ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit size={16} />
                </motion.button>
                <Link href="/settings">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                  >
                    <Settings size={16} />
                  </motion.button>
                </Link>
              </>
            ) : (
              <SocialStats
                userId={user._id}
                initialStats={{
                  followers: user.followerCount,
                  following: user.followingCount
                }}
                size="sm"
                showLabels={false}
                onStatsUpdate={handleStatsUpdate}
              />
            )}
          </div>
        )}
      </div>

      {/* Informations du profil */}
      <div className="mt-8 space-y-4">
        {/* Nom et nom d'utilisateur */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`font-bold text-gray-900 dark:text-white ${sizeClasses[size].name}`}>
              {user.name}
            </h1>
            {user.isVerified && (
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <p className={`text-gray-600 dark:text-gray-400 ${sizeClasses[size].username}`}>
            @{user.username}
          </p>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className={`text-gray-700 dark:text-gray-300 ${sizeClasses[size].bio}`}>
            {user.bio}
          </p>
        )}

        {/* Informations supplémentaires */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          {user.location && (
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>{user.location}</span>
            </div>
          )}
          
          {user.website && (
            <a
              href={user.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <LinkIcon size={14} />
              <span>Site web</span>
            </a>
          )}
          
          <div className="flex items-center gap-1">
            <Calendar size={14} />
            <span>Membre depuis {formatDate(user.createdAt)}</span>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
              <Music size={16} />
              <span className="font-semibold">{formatNumber(user.trackCount)}</span>
            </div>
            <span className="text-xs text-gray-500">Pistes</span>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <Users size={16} />
              <span className="font-semibold">{formatNumber(user.followerCount)}</span>
            </div>
            <span className="text-xs text-gray-500">Abonnés</span>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <Heart size={16} />
              <span className="font-semibold">{formatNumber(user.totalLikes)}</span>
            </div>
            <span className="text-xs text-gray-500">J'aime</span>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">{formatNumber(user.totalPlays)}</span>
            </div>
            <span className="text-xs text-gray-500">Écoutes</span>
          </div>
        </div>

        {/* Actions principales */}
        {showActions && !isOwnProfile && (
          <div className="flex gap-3 pt-4">
            <SocialStats
              userId={user._id}
              initialStats={{
                followers: user.followerCount,
                following: user.followingCount
              }}
              size="md"
              showLabels={true}
              onStatsUpdate={handleStatsUpdate}
            />
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Voir les pistes
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
} 