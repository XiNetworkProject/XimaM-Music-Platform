'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Headphones } from 'lucide-react';
import { usePlaysSystem } from '@/hooks/usePlaysSystem';
import { AnimatedPlaysCounter } from './AnimatedCounter';

interface PlaysCounterProps {
  trackId: string;
  initialPlays?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'card';
  showIcon?: boolean;
  className?: string;
  onUpdate?: (state: { plays: number; isLoading: boolean; error: string | null }) => void;
  autoSync?: boolean;
}

const sizeConfig = {
  sm: {
    container: 'text-xs',
    icon: 12,
    gap: 'gap-1'
  },
  md: {
    container: 'text-sm',
    icon: 14,
    gap: 'gap-1.5'
  },
  lg: {
    container: 'text-base',
    icon: 16,
    gap: 'gap-2'
  }
};

const variantConfig = {
  default: {
    base: 'text-gray-500 dark:text-gray-400',
    loading: 'text-blue-500',
    error: 'text-red-500'
  },
  minimal: {
    base: 'text-gray-600 dark:text-gray-300',
    loading: 'text-blue-600',
    error: 'text-red-600'
  },
  card: {
    base: 'text-white/70',
    loading: 'text-blue-400',
    error: 'text-red-400'
  }
};

export default function PlaysCounter({
  trackId,
  initialPlays = 0,
  size = 'md',
  variant = 'default',
  showIcon = true,
  className = '',
  onUpdate,
  autoSync = true
}: PlaysCounterProps) {
  const {
    plays,
    formattedPlays,
    isLoading,
    error,
    incrementPlays,
    fetchPlays
  } = usePlaysSystem({
    trackId,
    initialPlays,
    onUpdate,
    autoSync
  });

  const config = sizeConfig[size];
  const variantStyle = variantConfig[variant];

  const getTextColor = () => {
    if (error) return variantStyle.error;
    if (isLoading) return variantStyle.loading;
    return variantStyle.base;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center ${config.gap} ${config.container} ${getTextColor()} ${className}`}
    >
      {/* Icône */}
      {showIcon && (
        <motion.div
          animate={isLoading ? {
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          } : {}}
          transition={{ duration: 0.5, repeat: isLoading ? Infinity : 0 }}
        >
          <Headphones 
            size={config.icon} 
            className={`transition-colors duration-200 ${
              isLoading ? 'text-blue-500' : error ? 'text-red-500' : ''
            }`}
          />
        </motion.div>
      )}

      {/* Compteur animé */}
      <AnimatedPlaysCounter
        value={plays}
        size={size}
        variant={variant}
        className={`font-medium transition-colors duration-200 ${
          isLoading ? 'font-semibold' : ''
        }`}
      />

      {/* Indicateur de chargement */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"
          />
        )}
      </AnimatePresence>

      {/* Indicateur d'erreur */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="w-1.5 h-1.5 rounded-full bg-red-500"
            title={error}
          />
        )}
      </AnimatePresence>

      {/* Bouton de rafraîchissement (optionnel) */}
      {error && (
        <motion.button
          onClick={fetchPlays}
          className="ml-1 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Rafraîchir les écoutes"
        >
          <svg 
            width={config.icon - 2} 
            height={config.icon - 2} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className="animate-spin"
          >
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        </motion.button>
      )}
    </motion.div>
  );
}

// Composant pour afficher les écoutes avec incrémentation automatique
export function PlaysCounterWithIncrement({
  trackId,
  initialPlays = 0,
  size = 'md',
  variant = 'default',
  showIcon = true,
  className = '',
  onUpdate,
  autoSync = true
}: PlaysCounterProps) {
  const {
    plays,
    formattedPlays,
    isLoading,
    error,
    incrementPlays,
    fetchPlays
  } = usePlaysSystem({
    trackId,
    initialPlays,
    onUpdate,
    autoSync
  });

  const config = sizeConfig[size];
  const variantStyle = variantConfig[variant];

  const getTextColor = () => {
    if (error) return variantStyle.error;
    if (isLoading) return variantStyle.loading;
    return variantStyle.base;
  };

  return (
    <motion.button
      onClick={incrementPlays}
      disabled={isLoading}
      className={`flex items-center ${config.gap} ${config.container} ${getTextColor()} ${className} ${
        isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
      } transition-all duration-200`}
      whileHover={!isLoading ? { scale: 1.05 } : {}}
      whileTap={!isLoading ? { scale: 0.95 } : {}}
      title={isLoading ? 'Mise à jour en cours...' : 'Cliquer pour incrémenter les écoutes'}
    >
      {/* Icône */}
      {showIcon && (
        <motion.div
          animate={isLoading ? {
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          } : {}}
          transition={{ duration: 0.5, repeat: isLoading ? Infinity : 0 }}
        >
          <Headphones 
            size={config.icon} 
            className={`transition-colors duration-200 ${
              isLoading ? 'text-blue-500' : error ? 'text-red-500' : ''
            }`}
          />
        </motion.div>
      )}

      {/* Compteur */}
      <motion.span
        key={plays}
        initial={{ scale: 1, y: 0 }}
        animate={isLoading ? {
          scale: [1, 1.05, 1],
          y: [0, -2, 0]
        } : {}}
        transition={{ duration: 0.3 }}
        className={`font-medium transition-colors duration-200 ${
          isLoading ? 'font-semibold' : ''
        }`}
      >
        {formattedPlays}
      </motion.span>

      {/* Indicateur de chargement */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"
          />
        )}
      </AnimatePresence>

      {/* Indicateur d'erreur */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="w-1.5 h-1.5 rounded-full bg-red-500"
            title={error}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
} 