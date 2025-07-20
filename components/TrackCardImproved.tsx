'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, MessageCircle, Share2, MoreVertical, Clock, Headphones } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import LikeButton from './LikeButton';
import { useTrackLike } from '@/contexts/LikeContext';
import { useAudioService } from '@/hooks/useAudioService';

interface Track {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  coverUrl?: string;
  audioUrl: string;
  duration: number;
  likes: string[];
  comments: string[];
  plays: number;
  createdAt: string;
  isLiked?: boolean;
}

interface TrackCardImprovedProps {
  track: Track;
  showComments?: boolean;
  showStats?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onTrackUpdate?: (track: Track) => void;
}

// Composant pour afficher les écoutes de manière stable
function PlaysCounter({ trackId, plays, size = 'sm' }: { 
  trackId: string; 
  plays: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  // Formater le nombre d'écoutes
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="flex items-center gap-1 text-gray-500">
      <Headphones size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />
      <span className={`font-medium ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}>
        {formatNumber(plays)}
      </span>
    </div>
  );
}

export default function TrackCardImproved({
  track,
  showComments = false,
  showStats = true,
  size = 'sm',
  className = '',
  onTrackUpdate
}: TrackCardImprovedProps) {
  const { state, actions } = useAudioService();
  const [isHovered, setIsHovered] = useState(false);

  // Utiliser le nouveau système de likes
  const { isLiked, likesCount, hasCachedState } = useTrackLike(
    track._id, 
    track.likes.length, 
    track.likes.includes('temp') ? false : track.isLiked || false
  );

  const isCurrentTrack = state.currentTrack?._id === track._id;
  const isCurrentlyPlaying = isCurrentTrack && state.isPlaying;

  const sizeClasses = {
    sm: {
      card: 'p-1.5 w-28 h-40',
      image: 'w-20 h-20',
      title: 'text-[10px]',
      artist: 'text-[9px]',
      duration: 'text-[9px]'
    },
    md: {
      card: 'p-4',
      image: 'w-16 h-16',
      title: 'text-base',
      artist: 'text-sm',
      duration: 'text-sm'
    },
    lg: {
      card: 'p-6',
      image: 'w-20 h-20',
      title: 'text-lg',
      artist: 'text-base',
      duration: 'text-base'
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (isCurrentlyPlaying) {
      actions.pause();
    } else {
      actions.play(track);
    }
  };

  const handleLikeUpdate = (likeState: { isLiked: boolean; likesCount: number }) => {
    if (onTrackUpdate) {
      onTrackUpdate({
        ...track,
        isLiked: likeState.isLiked,
        likes: Array(likeState.likesCount).fill('temp')
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.04 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-200 border border-gray-200 dark:border-gray-700 ${sizeClasses[size].card} ${className}`}
    >
      <div className="flex flex-col items-center gap-1.5">
        {/* Image de couverture avec bouton play */}
        <div className="relative group">
          <div className={`${sizeClasses[size].image} relative overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700`}>
            {track.coverUrl ? (
              <Image
                src={track.coverUrl}
                alt={track.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {track.title[0].toUpperCase()}
                </span>
              </div>
            )}
            {/* Overlay avec bouton play */}
            <AnimatePresence>
              {(isHovered || isCurrentlyPlaying) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"
                >
                  <motion.button
                    onClick={handlePlayPause}
                    className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-gray-900 hover:bg-gray-100 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isCurrentlyPlaying ? (
                      <Pause size={12} fill="currentColor" />
                    ) : (
                      <Play size={12} fill="currentColor" className="ml-0.5" />
                    )}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Indicateur de lecture */}
            {isCurrentlyPlaying && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"
              />
            )}
          </div>
        </div>
        {/* Informations de la piste */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-col items-center justify-between gap-1 w-full">
            <h3 className={`font-semibold text-gray-900 dark:text-white truncate w-full text-center ${sizeClasses[size].title}`}>
              {track.title}
            </h3>
            <Link
              href={`/profile/${track.artist?.username || 'unknown'}`}
              className={`text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors ${sizeClasses[size].artist} w-full text-center`}
            >
              {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
            </Link>
            
            {/* Statistiques et actions */}
            <div className="flex items-center justify-between w-full mt-1">
              <div className="flex items-center gap-1">
                <PlaysCounter 
                  trackId={track._id} 
                  plays={track.plays} 
                  size={size} 
                />
              </div>
              
              {/* Bouton like amélioré */}
              <LikeButton
                trackId={track._id}
                initialLikesCount={likesCount}
                initialIsLiked={isLiked}
                size={size === 'sm' ? 'sm' : 'md'}
                variant="minimal"
                showCount={false}
                onUpdate={handleLikeUpdate}
                className="ml-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 