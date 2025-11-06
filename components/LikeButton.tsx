'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useLikeSystem } from '@/hooks/useLikeSystem';
import { AnimatedLikeCounter } from './AnimatedCounter';

interface LikeButtonProps {
  trackId: string;
  initialLikesCount?: number;
  initialIsLiked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'card';
  showCount?: boolean;
  className?: string;
  onUpdate?: (state: { isLiked: boolean; likesCount: number }) => void;
}

const sizeConfig = {
  sm: {
    button: 'w-8 h-8',
    icon: 14,
    text: 'text-xs'
  },
  md: {
    button: 'w-10 h-10',
    icon: 16,
    text: 'text-sm'
  },
  lg: {
    button: 'w-12 h-12',
    icon: 20,
    text: 'text-base'
  }
};

const variantConfig = {
  default: {
    base: 'bg-white/10 hover:bg-white/20 text-white/60 hover:text-white',
    active: 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
    border: 'border border-white/20'
  },
  minimal: {
    base: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400',
    active: 'bg-red-50 dark:bg-red-900/20 text-red-500',
    border: ''
  },
  card: {
    base: 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white',
    active: 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
    border: 'border border-white/10'
  }
};

export default function LikeButton({
  trackId,
  initialLikesCount = 0,
  initialIsLiked = false,
  size = 'md',
  variant = 'default',
  showCount = true,
  className = '',
  onUpdate
}: LikeButtonProps) {
  const {
    isLiked,
    likesCount,
    isLoading,
    error,
    toggleLike
  } = useLikeSystem({
    trackId,
    initialLikesCount,
    initialIsLiked,
    onUpdate
  });

  const config = sizeConfig[size];

  const formatCount = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLike();
  };

  // Style simple : juste le cœur blanc
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="hover:scale-110 transition disabled:opacity-50"
        title={isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <Heart 
          size={config.icon} 
          className={`transition-all ${
            isLiked ? 'fill-white text-white' : 'text-white/50'
          }`}
        />
      </button>

      {/* Compteur de likes */}
      {showCount && (
        <span className={`${config.text} text-white/50`}>
          {formatCount(likesCount)}
        </span>
      )}
    </div>
  );
} 