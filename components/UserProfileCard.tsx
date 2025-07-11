'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, Music, Heart, Play, Plus, Check, Star, MapPin, Globe, Instagram, Twitter, Youtube } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatNumber, formatDate } from '@/lib/utils';

interface UserProfileCardProps {
  user: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
    banner?: string;
    bio?: string;
    location?: string;
    website?: string;
    socialLinks?: {
      instagram?: string;
      twitter?: string;
      youtube?: string;
    };
    followers: string[];
    following: string[];
    tracks: string[];
    totalPlays: number;
    totalLikes: number;
    isVerified: boolean;
    isArtist: boolean;
    artistName?: string;
    createdAt: string;
  };
  variant?: 'default' | 'compact' | 'featured';
  showActions?: boolean;
  className?: string;
}

export default function UserProfileCard({ 
  user, 
  variant = 'default',
  showActions = true,
  className = ''
}: UserProfileCardProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showSocialLinks, setShowSocialLinks] = useState(false);

  const handleFollow = async () => {
    try {
      const response = await fetch(`/api/users/${user._id}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
      }
    } catch (error) {
      console.error('Erreur follow:', error);
    }
  };

  const handleProfileClick = () => {
    router.push(`/profile/${user.username}`);
  };

  const cardVariants = {
    default: 'p-6 rounded-3xl',
    compact: 'p-4 rounded-2xl',
    featured: 'p-8 rounded-3xl'
  };

  const imageSizes = {
    default: 'w-20 h-20',
    compact: 'w-16 h-16',
    featured: 'w-32 h-32'
  };

  return (
    <motion.div
      className={`card-modern ${cardVariants[variant]} ${className}`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Effet de particules en arrière-plan */}
      <AnimatePresence>
        {isHovered && (
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`particle-${i}`}
                className="absolute w-1 h-1 bg-white/20 rounded-full"
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{
                  x: [0, Math.random() * 100 - 50],
                  y: [0, Math.random() * 100 - 50],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut"
                }}
                style={{
                  left: `${20 + i * 30}%`,
                  top: '50%',
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="relative z-10">
        {/* Header avec avatar et infos principales */}
        <div className="flex items-start space-x-4">
          {/* Avatar avec animation */}
          <motion.div 
            className={`relative ${imageSizes[variant]} rounded-2xl overflow-hidden group cursor-pointer`}
            whileHover={{ scale: 1.05, rotate: 2 }}
            transition={{ duration: 0.3 }}
            onClick={handleProfileClick}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <User size={32} className="text-white" />
              </div>
            )}

            {/* Badge vérifié */}
            {user.isVerified && (
              <motion.div
                className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Check size={12} className="text-white" />
              </motion.div>
            )}

            {/* Badge artiste */}
            {user.isArtist && (
              <motion.div
                className="absolute -bottom-1 -left-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Star size={12} className="text-white" />
              </motion.div>
            )}
          </motion.div>

          {/* Informations utilisateur */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <motion.h3 
                  className="font-bold text-white text-lg sm:text-xl truncate"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {user.name}
                  {user.isArtist && user.artistName && (
                    <span className="text-purple-400 ml-2">({user.artistName})</span>
                  )}
                </motion.h3>
                
                <motion.p 
                  className="text-gray-400 text-sm sm:text-base"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  @{user.username}
                </motion.p>

                {user.bio && (
                  <motion.p 
                    className="text-gray-300 text-sm mt-2 line-clamp-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {user.bio}
                  </motion.p>
                )}

                {/* Localisation et site web */}
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  {user.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin size={12} />
                      <span>{user.location}</span>
                    </div>
                  )}
                  {user.website && (
                    <div className="flex items-center space-x-1">
                      <Globe size={12} />
                      <span>{user.website}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {showActions && (
                <div className="flex items-center space-x-2 ml-4">
                  <motion.button
                    onClick={handleFollow}
                    className={`px-4 py-2 rounded-2xl font-semibold transition-all duration-200 ${
                      isFollowing 
                        ? 'bg-gray-600 text-white' 
                        : 'bg-purple-500 text-white hover:bg-purple-600'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isFollowing ? (
                      <div className="flex items-center space-x-1">
                        <Check size={16} />
                        <span>Suivi</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <Plus size={16} />
                        <span>Suivre</span>
                      </div>
                    )}
                  </motion.button>
                </div>
              )}
            </div>

            {/* Statistiques */}
            <motion.div 
              className="flex items-center space-x-6 mt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center space-x-2">
                <Users size={16} className="text-blue-400" />
                <div>
                  <div className="text-white font-semibold">{formatNumber(user.followers.length)}</div>
                  <div className="text-xs text-gray-400">Abonnés</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Music size={16} className="text-green-400" />
                <div>
                  <div className="text-white font-semibold">{formatNumber(user.tracks.length)}</div>
                  <div className="text-xs text-gray-400">Pistes</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Play size={16} className="text-purple-400" />
                <div>
                  <div className="text-white font-semibold">{formatNumber(user.totalPlays)}</div>
                  <div className="text-xs text-gray-400">Écoutes</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Heart size={16} className="text-red-400" />
                <div>
                  <div className="text-white font-semibold">{formatNumber(user.totalLikes)}</div>
                  <div className="text-xs text-gray-400">Likes</div>
                </div>
              </div>
            </motion.div>

            {/* Liens sociaux */}
            {user.socialLinks && Object.keys(user.socialLinks).length > 0 && (
              <motion.div 
                className="flex items-center space-x-3 mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {user.socialLinks.instagram && (
                  <motion.a
                    href={user.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-110 transition-all duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Instagram size={16} />
                  </motion.a>
                )}

                {user.socialLinks.twitter && (
                  <motion.a
                    href={user.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-blue-500 text-white hover:scale-110 transition-all duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Twitter size={16} />
                  </motion.a>
                )}

                {user.socialLinks.youtube && (
                  <motion.a
                    href={user.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-red-500 text-white hover:scale-110 transition-all duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Youtube size={16} />
                  </motion.a>
                )}
              </motion.div>
            )}

            {/* Date d'inscription */}
            <motion.div 
              className="text-xs text-gray-500 mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Membre depuis {formatDate(user.createdAt)}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 