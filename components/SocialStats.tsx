'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Headphones, TrendingUp, Users, Play, Star, Eye } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface SocialStatsProps {
  trackId: string;
  initialStats: {
    likes: number;
    comments: number;
    plays?: number;
    shares?: number;
    followers?: number;
  };
  size?: 'sm' | 'md' | 'lg';
  showAnimations?: boolean;
  className?: string;
}

export default function SocialStats({ 
  trackId, 
  initialStats, 
  size = 'md',
  showAnimations = true,
  className = ''
}: SocialStatsProps) {
  const [stats, setStats] = useState(initialStats);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const sizeClasses = {
    sm: {
      container: 'space-x-2',
      icon: 'w-4 h-4',
      text: 'text-xs',
      button: 'p-1.5'
    },
    md: {
      container: 'space-x-3',
      icon: 'w-5 h-5',
      text: 'text-sm',
      button: 'p-2'
    },
    lg: {
      container: 'space-x-4',
      icon: 'w-6 h-6',
      text: 'text-base',
      button: 'p-3'
    }
  };

  const handleLike = async () => {
    try {
      const response = await fetch(`/api/tracks/${trackId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setIsLiked(!isLiked);
        setStats(prev => ({
          ...prev,
          likes: isLiked ? prev.likes - 1 : prev.likes + 1
        }));
      }
    } catch (error) {
      console.error('Erreur like:', error);
    }
  };

  const handleFollow = async () => {
    try {
      const response = await fetch(`/api/users/${trackId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
        setStats(prev => ({
          ...prev,
          followers: isFollowing ? (prev.followers || 0) - 1 : (prev.followers || 0) + 1
        }));
      }
    } catch (error) {
      console.error('Erreur follow:', error);
    }
  };

  const StatItem = ({ 
    icon: Icon, 
    count, 
    label, 
    color = 'text-gray-400',
    hoverColor = 'hover:text-white',
    onClick,
    isActive = false,
    showCount = true
  }: {
    icon: any;
    count: number;
    label: string;
    color?: string;
    hoverColor?: string;
    onClick?: () => void;
    isActive?: boolean;
    showCount?: boolean;
  }) => (
    <motion.div
      className={`flex items-center space-x-1 ${sizeClasses[size].container} ${onClick ? 'cursor-pointer' : ''}`}
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(label)}
      onMouseLeave={() => setShowTooltip(null)}
    >
      <motion.div
        className={`${sizeClasses[size].icon} ${color} ${hoverColor} transition-colors duration-200 ${
          isActive ? 'text-red-500' : ''
        }`}
        animate={isActive && showAnimations ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <Icon className="w-full h-full" />
      </motion.div>
      
      {showCount && (
        <motion.span 
          className={`${sizeClasses[size].text} font-medium text-gray-300`}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {formatNumber(count)}
        </motion.span>
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip === label && (
          <motion.div
            className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded-lg whitespace-nowrap z-10"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <div className={`relative flex items-center ${sizeClasses[size].container} ${className}`}>
      {/* Likes */}
      <StatItem
        icon={Heart}
        count={stats.likes}
        label="J'aime"
        color={isLiked ? 'text-red-500' : 'text-gray-400'}
        hoverColor="hover:text-red-500"
        onClick={handleLike}
        isActive={isLiked}
      />

      {/* Comments */}
      <StatItem
        icon={MessageCircle}
        count={stats.comments}
        label="Commentaires"
        color="text-gray-400"
        hoverColor="hover:text-blue-400"
      />

      {/* Plays */}
      {stats.plays !== undefined && (
        <StatItem
          icon={Headphones}
          count={stats.plays}
          label="Écoutes"
          color="text-gray-400"
          hoverColor="hover:text-green-400"
        />
      )}

      {/* Shares */}
      {stats.shares !== undefined && (
        <StatItem
          icon={TrendingUp}
          count={stats.shares}
          label="Partages"
          color="text-gray-400"
          hoverColor="hover:text-purple-400"
        />
      )}

      {/* Followers */}
      {stats.followers !== undefined && (
        <StatItem
          icon={Users}
          count={stats.followers}
          label="Abonnés"
          color={isFollowing ? 'text-blue-500' : 'text-gray-400'}
          hoverColor="hover:text-blue-500"
          onClick={handleFollow}
          isActive={isFollowing}
        />
      )}

      {/* Animation de particules pour les interactions */}
      <AnimatePresence>
        {isLiked && showAnimations && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={`like-particle-${i}`}
                className="absolute w-1 h-1 bg-red-500 rounded-full"
                initial={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 1, 
                  scale: 0 
                }}
                animate={{
                  x: [0, Math.random() * 50 - 25],
                  y: [0, -Math.random() * 50 - 25],
                  opacity: [1, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 1,
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

      {/* Statistiques avancées (optionnel) */}
      {size === 'lg' && (
        <motion.div
          className="ml-4 pl-4 border-l border-white/10"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Star size={14} className="text-yellow-400" />
              <span className="text-xs text-gray-400">4.8</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye size={14} className="text-blue-400" />
              <span className="text-xs text-gray-400">{formatNumber(stats.plays || 0)}</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
} 