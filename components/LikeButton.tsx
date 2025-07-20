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
  const variantStyle = variantConfig[variant];

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

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <motion.button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          ${config.button} 
          ${variantStyle.border}
          rounded-full 
          flex items-center justify-center 
          transition-all duration-200 
          ${isLiked ? variantStyle.active : variantStyle.base}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${error ? 'ring-2 ring-red-500' : ''}
        `}
        whileHover={!isLoading ? { scale: 1.05 } : {}}
        whileTap={!isLoading ? { scale: 0.95 } : {}}
        title={isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        {/* Icône avec animation */}
        <motion.div
          animate={isLiked ? {
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0]
          } : {}}
          transition={{ duration: 0.3 }}
        >
          <Heart 
            size={config.icon} 
            className={`transition-all duration-200 ${
              isLiked ? 'fill-current' : ''
            }`}
          />
        </motion.div>

        {/* Indicateur de chargement */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute w-2 h-2 rounded-full border-2 border-current border-t-transparent animate-spin"
            />
          )}
        </AnimatePresence>

        {/* Effet de particules pour les likes */}
        <AnimatePresence>
          {isLiked && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-red-500 rounded-full"
                  initial={{ 
                    x: 0, 
                    y: 0, 
                    opacity: 1,
                    scale: 0
                  }}
                  animate={{
                    x: [0, Math.random() * 20 - 10],
                    y: [0, -20 - Math.random() * 10],
                    opacity: [1, 0],
                    scale: [0, 1, 0]
                  }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                  style={{
                    left: '50%',
                    top: '50%'
                  }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Compteur animé */}
      {showCount && (
        <AnimatedLikeCounter
          value={likesCount}
          isLiked={isLiked}
          size={size}
          variant={variant}
          className={config.text}
        />
      )}

      {/* Message d'erreur */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 