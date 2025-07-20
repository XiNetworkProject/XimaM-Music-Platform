'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Users, UserPlus, TrendingUp } from 'lucide-react';
import { useSocialInteractions } from '@/hooks/useSocialInteractions';
import { useTrackLike } from '@/contexts/LikeContext';
import { useTrackPlays } from '@/contexts/PlaysContext';
import { AnimatedLikeCounter, AnimatedPlaysCounter, AnimatedSubscriptionCounter } from './AnimatedCounter';

interface SocialStatsProps {
  trackId?: string;
  userId?: string;
  initialStats?: {
    likes?: number;
    comments?: number;
    followers?: number;
    following?: number;
  };
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical' | 'grid';
  className?: string;
  onStatsUpdate?: (stats: any) => void;
}

export default function SocialStats({
  trackId,
  userId,
  initialStats = {},
  showLabels = true,
  size = 'md',
  layout = 'horizontal',
  className = '',
  onStatsUpdate
}: SocialStatsProps) {
  const {
    stats,
    isLiked,
    isFollowing,
    isLoading,
    handleLike,
    handleFollow,
    refreshStats
  } = useSocialInteractions({
    trackId,
    userId,
    initialStats,
    onStatsUpdate
  });

  const layoutClasses = {
    horizontal: 'flex items-center gap-4',
    vertical: 'flex flex-col gap-3',
    grid: 'grid grid-cols-2 gap-3'
  };

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${layoutClasses[layout]} ${className}`}
    >
      {/* Likes */}
      {trackId && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2"
        >
          <div onClick={handleLike} className="cursor-pointer">
            <AnimatedLikeCounter
              value={stats.likes}
              isLiked={isLiked}
              size={size}
              variant="minimal"
              showIcon={true}
              icon={<Heart size={iconSizes[size]} />}
              className="hover:bg-red-50 dark:hover:bg-red-900/20"
            />
          </div>
          {showLabels && (
            <span className={`text-gray-600 dark:text-gray-400 ${sizeClasses[size]}`}>
              J'aime
            </span>
          )}
        </motion.div>
      )}

      {/* Commentaires */}
      {trackId && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2"
        >
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-blue-600">
            <MessageCircle size={iconSizes[size]} />
            <span className={`font-medium ${sizeClasses[size]}`}>
              {formatNumber(stats.comments)}
            </span>
          </div>
          {showLabels && (
            <span className={`text-gray-600 dark:text-gray-400 ${sizeClasses[size]}`}>
              Commentaires
            </span>
          )}
        </motion.div>
      )}

      {/* Abonnés */}
      {userId && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2"
        >
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-green-600">
            <Users size={iconSizes[size]} />
            <span className={`font-medium ${sizeClasses[size]}`}>
              {formatNumber(stats.followers)}
            </span>
          </div>
          {showLabels && (
            <span className={`text-gray-600 dark:text-gray-400 ${sizeClasses[size]}`}>
              Abonnés
            </span>
          )}
        </motion.div>
      )}

      {/* Abonnements */}
      {userId && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-2"
        >
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-purple-600">
            <UserPlus size={iconSizes[size]} />
            <span className={`font-medium ${sizeClasses[size]}`}>
              {formatNumber(stats.following)}
            </span>
          </div>
          {showLabels && (
            <span className={`text-gray-600 dark:text-gray-400 ${sizeClasses[size]}`}>
              Abonnements
            </span>
          )}
        </motion.div>
      )}

      {/* Bouton Follow */}
      {userId && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div onClick={handleFollow} className="cursor-pointer">
            <AnimatedSubscriptionCounter
              value={0}
              isActive={isFollowing}
              size={size}
              variant="minimal"
              showIcon={true}
              icon={<UserPlus size={iconSizes[size]} />}
              className="bg-purple-600 text-white hover:bg-purple-700"
            />
          </div>
        </motion.div>
      )}

      {/* Indicateur de tendance */}
      <AnimatePresence>
        {stats.likes > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="flex items-center gap-1 text-orange-500"
          >
            <TrendingUp size={iconSizes[size]} />
            <span className={`font-medium ${sizeClasses[size]}`}>
              Populaire
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bouton de rafraîchissement */}
      <motion.button
        onClick={refreshStats}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Rafraîchir les statistiques"
      >
        <svg
          className={`${sizeClasses[size]} ${isLoading ? 'animate-spin' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </motion.button>
    </motion.div>
  );
} 