'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Play, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SocialStatsProps {
  trackId: string;
  initialStats: {
    likes: number;
    comments: number;
    plays?: number;
  };
  size?: 'sm' | 'md' | 'lg';
  showPlays?: boolean;
  onStatsUpdate?: (stats: any) => void;
}

export default function SocialStats({
  trackId,
  initialStats,
  size = 'sm',
  showPlays = true,
  onStatsUpdate
}: SocialStatsProps) {
  const [stats, setStats] = useState(initialStats);
  const [isLiked, setIsLiked] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Validation des données initiales
  const validateStats = useCallback((data: any) => {
    return {
      likes: typeof data.likes === 'number' && data.likes >= 0 ? data.likes : 0,
      comments: typeof data.comments === 'number' && data.comments >= 0 ? data.comments : 0,
      plays: typeof data.plays === 'number' && data.plays >= 0 ? data.plays : 0
    };
  }, []);

  // Mettre à jour les stats avec validation
  const updateStats = useCallback((newStats: any) => {
    const validatedStats = validateStats(newStats);
    setStats(validatedStats);
    if (onStatsUpdate) {
      onStatsUpdate(validatedStats);
    }
  }, [validateStats, onStatsUpdate]);

  // Charger les vraies statistiques depuis l'API
  const loadRealStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/tracks/${trackId}`);
      if (response.ok) {
        const data = await response.json();
        const validatedStats = validateStats({
          likes: data.likes?.length || 0,
          comments: data.comments?.length || 0,
          plays: data.plays || 0
        });
        updateStats(validatedStats);
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  }, [trackId, validateStats, updateStats]);

  // Charger les stats au montage
  useEffect(() => {
    loadRealStats();
  }, [loadRealStats]);

  // Fonction pour formater les nombres
  const formatNumber = useCallback((num: number) => {
    if (typeof num !== 'number' || isNaN(num) || num < 0) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }, []);

  // Gérer le like
  const handleLike = useCallback(async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    const newLikeState = !isLiked;
    
    // Optimistic update
    setIsLiked(newLikeState);
    setStats(prev => ({
      ...prev,
      likes: newLikeState ? prev.likes + 1 : Math.max(0, prev.likes - 1)
    }));

    try {
      const response = await fetch(`/api/tracks/${trackId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        // Synchroniser avec les vraies données
        updateStats({
          likes: data.likes?.length || 0,
          comments: stats.comments,
          plays: stats.plays
        });
        setIsLiked(data.isLiked || false);
      } else {
        // Revenir à l'état précédent en cas d'erreur
        setIsLiked(!newLikeState);
        setStats(prev => ({
          ...prev,
          likes: newLikeState ? Math.max(0, prev.likes - 1) : prev.likes + 1
        }));
      }
    } catch (error) {
      console.error('Erreur like:', error);
      // Revenir à l'état précédent
      setIsLiked(!newLikeState);
      setStats(prev => ({
        ...prev,
        likes: newLikeState ? Math.max(0, prev.likes - 1) : prev.likes + 1
      }));
    } finally {
      setIsUpdating(false);
    }
  }, [trackId, isLiked, isUpdating, stats.comments, stats.plays, updateStats]);

  const sizeClasses = {
    sm: {
      container: 'flex items-center gap-2 text-xs',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    md: {
      container: 'flex items-center gap-3 text-sm',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    lg: {
      container: 'flex items-center gap-4 text-base',
      icon: 'w-5 h-5',
      text: 'text-base'
    }
  };

  return (
    <div className={sizeClasses[size].container}>
      {/* Likes */}
      <motion.button
        onClick={handleLike}
        disabled={isUpdating}
        className={`flex items-center gap-1 transition-colors ${
          isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Heart 
          size={sizeClasses[size].icon} 
          className={isLiked ? 'fill-current' : ''}
        />
        <span className={sizeClasses[size].text}>
          {formatNumber(stats.likes)}
        </span>
      </motion.button>

      {/* Commentaires */}
      <div className="flex items-center gap-1 text-gray-400">
        <MessageCircle size={sizeClasses[size].icon} />
        <span className={sizeClasses[size].text}>
          {formatNumber(stats.comments)}
        </span>
      </div>

      {/* Écoutes */}
      {showPlays && (
        <div className="flex items-center gap-1 text-gray-400">
          <Play size={sizeClasses[size].icon} />
          <span className={sizeClasses[size].text}>
            {formatNumber(stats.plays || 0)}
          </span>
        </div>
      )}
    </div>
  );
} 