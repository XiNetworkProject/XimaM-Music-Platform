'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Users, UserPlus, TrendingUp } from 'lucide-react';
import InteractiveCounter from './InteractiveCounter';
import { useSocialInteractions } from '@/hooks/useSocialInteractions';

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
  // Ajout pour mode contrôlé
  likes?: number;
  isLiked?: boolean;
  onToggle?: () => void;
}

export default function SocialStats({
  trackId,
  userId,
  initialStats = {},
  showLabels = true,
  size = 'md',
  layout = 'horizontal',
  className = '',
  onStatsUpdate,
  // Ajout pour mode contrôlé
  likes: controlledLikes,
  isLiked: controlledIsLiked,
  onToggle: controlledOnToggle,
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

  // Mode contrôlé pour les likes
  const useControlledLikes = typeof controlledLikes === 'number' && typeof controlledIsLiked === 'boolean' && typeof controlledOnToggle === 'function';

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
          <InteractiveCounter
            type="likes"
            initialCount={useControlledLikes ? controlledLikes! : stats.likes}
            isActive={useControlledLikes ? controlledIsLiked! : isLiked}
            onToggle={useControlledLikes ? async () => controlledOnToggle!() : handleLike}
            size={size}
            disabled={isLoading}
            className="hover:bg-red-50 dark:hover:bg-red-900/20"
          />
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
          <InteractiveCounter
            type="followers"
            initialCount={0}
            isActive={isFollowing}
            onToggle={handleFollow}
            size={size}
            disabled={isLoading}
            className="bg-purple-600 text-white hover:bg-purple-700"
          />
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