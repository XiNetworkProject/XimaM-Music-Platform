'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Users, UserPlus } from 'lucide-react';

interface InteractiveCounterProps {
  type: 'likes' | 'comments' | 'followers' | 'following';
  initialCount: number;
  isActive?: boolean;
  onToggle?: (newState: boolean) => Promise<void>;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  disabled?: boolean;
}

const icons = {
  likes: Heart,
  comments: MessageCircle,
  followers: Users,
  following: UserPlus
};

const colors = {
  likes: {
    active: '#ef4444',
    inactive: '#6b7280'
  },
  comments: {
    active: '#3b82f6',
    inactive: '#6b7280'
  },
  followers: {
    active: '#10b981',
    inactive: '#6b7280'
  },
  following: {
    active: '#8b5cf6',
    inactive: '#6b7280'
  }
};

export default function InteractiveCounter({
  type,
  initialCount,
  isActive = false,
  onToggle,
  className = '',
  size = 'md',
  showIcon = true,
  disabled = false
}: InteractiveCounterProps) {
  const [count, setCount] = useState(initialCount);
  const [isLiked, setIsLiked] = useState(isActive);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const Icon = icons[type];
  const colorConfig = colors[type];

  // Synchroniser avec les props externes
  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    setIsLiked(isActive);
  }, [isActive]);

  // Réinitialiser l'état local quand les props changent
  useEffect(() => {
    setCount(initialCount);
    setIsLiked(isActive);
  }, [initialCount, isActive]);

  const handleToggle = async () => {
    if (disabled || isLoading || !onToggle) return;

    setIsLoading(true);
    setIsAnimating(true);

    try {
      const newState = !isLiked;
      await onToggle(newState);
      
      // Ne pas modifier l'état local ici, laisser les props externes gérer
      // L'état sera mis à jour via les useEffect ci-dessus
      
    } catch (error) {
      console.error('Erreur lors du toggle:', error);
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const formatCount = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
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

  return (
    <motion.button
      onClick={handleToggle}
      disabled={disabled || isLoading}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all duration-200 ${
        isLiked 
          ? 'bg-opacity-10' 
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      } ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
    >
      {/* Icône avec animation */}
      {showIcon && (
        <motion.div
          animate={isAnimating ? {
            scale: [1, 1.3, 1],
            rotate: isLiked ? [0, 10, -10, 0] : [0, -5, 5, 0]
          } : {}}
          transition={{ duration: 0.3 }}
        >
          <Icon 
            size={iconSizes[size]} 
            className={`transition-colors duration-200 ${
              isLiked ? 'fill-current' : ''
            }`}
            style={{ 
              color: isLiked ? colorConfig.active : colorConfig.inactive 
            }}
          />
        </motion.div>
      )}

      {/* Compteur avec animation */}
      <motion.span
        key={count}
        initial={{ scale: 1, y: 0 }}
        animate={isAnimating ? {
          scale: [1, 1.2, 1],
          y: isLiked ? [-2, -8, 0] : [0, 2, 0]
        } : {}}
        transition={{ duration: 0.3 }}
        className={`font-medium ${sizeClasses[size]} ${
          isLiked ? 'font-semibold' : ''
        }`}
        style={{ 
          color: isLiked ? colorConfig.active : 'inherit' 
        }}
      >
        {formatCount(count)}
      </motion.span>

      {/* Indicateur de chargement */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="w-2 h-2 rounded-full border-2 border-current border-t-transparent animate-spin"
            style={{ color: colorConfig.active }}
          />
        )}
      </AnimatePresence>

      {/* Effet de particules pour les likes */}
      <AnimatePresence>
        {isAnimating && isLiked && type === 'likes' && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(3)].map((item, i) => (
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
  );
} 