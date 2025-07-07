'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Heart, MessageCircle, Share2, MoreVertical, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import SocialStats from './SocialStats';
import CommentSection from './CommentSection';
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
}

interface TrackCardProps {
  track: Track;
  showComments?: boolean;
  showStats?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onTrackUpdate?: (track: Track) => void;
}

export default function TrackCard({
  track,
  showComments = false,
  showStats = true,
  size = 'md',
  className = '',
  onTrackUpdate
}: TrackCardProps) {
  const { state, actions } = useAudioService();
  const [showCommentSection, setShowCommentSection] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isCurrentTrack = state.currentTrack?._id === track._id;
  const isCurrentlyPlaying = isCurrentTrack && state.isPlaying;

  const sizeClasses = {
    sm: {
      card: 'p-3',
      image: 'w-12 h-12',
      title: 'text-sm',
      artist: 'text-xs',
      duration: 'text-xs'
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

  const handleStatsUpdate = (stats: any) => {
    if (onTrackUpdate) {
      onTrackUpdate({
        ...track,
        likes: Array(stats.likes).fill('temp'),
        comments: Array(stats.comments).fill('temp')
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700 ${sizeClasses[size].card} ${className}`}
    >
      <div className="flex items-center gap-4">
        {/* Image de couverture avec bouton play */}
        <div className="relative group">
          <div className={`${sizeClasses[size].image} relative overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700`}>
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
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-900 hover:bg-gray-100 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isCurrentlyPlaying ? (
                      <Pause size={16} fill="currentColor" />
                    ) : (
                      <Play size={16} fill="currentColor" className="ml-0.5" />
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
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-gray-900 dark:text-white truncate ${sizeClasses[size].title}`}>
                {track.title}
              </h3>
              <Link
                href={`/profile/${track.artist.username}`}
                className={`text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors ${sizeClasses[size].artist}`}
              >
                {track.artist.name}
              </Link>
            </div>
            
            <div className="flex items-center gap-2 text-gray-500">
              <span className={`${sizeClasses[size].duration}`}>
                {formatDuration(track.duration)}
              </span>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <MoreVertical size={14} />
              </button>
            </div>
          </div>

          {/* Statistiques sociales */}
          {showStats && (
            <div className="mt-3">
              <SocialStats
                trackId={track._id}
                initialStats={{
                  likes: track.likes.length,
                  comments: track.comments.length
                }}
                size="sm"
                showLabels={false}
                onStatsUpdate={handleStatsUpdate}
              />
            </div>
          )}
        </div>
      </div>

      {/* Section commentaires */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowCommentSection(!showCommentSection)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <MessageCircle size={16} />
              <span className="text-sm">Commentaires ({track.comments.length})</span>
            </button>
          </div>

          <AnimatePresence>
            {showCommentSection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CommentSection
                  trackId={track._id}
                  initialComments={[]}
                  onCommentAdded={(comment) => {
                    if (onTrackUpdate) {
                      onTrackUpdate({
                        ...track,
                        comments: [...track.comments, comment._id]
                      });
                    }
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions rapides */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCommentSection(!showCommentSection)}
              className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors"
            >
              <MessageCircle size={16} />
              <span className="text-sm">Commenter</span>
            </button>
            
            <button className="flex items-center gap-1 text-gray-500 hover:text-green-600 transition-colors">
              <Share2 size={16} />
              <span className="text-sm">Partager</span>
            </button>
          </div>

          <div className="flex items-center gap-1 text-gray-400">
            <Clock size={14} />
            <span className="text-xs">{formatDuration(track.duration)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 