'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Heart, MessageCircle, Share2, MoreVertical, Clock, Headphones } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import SocialStats from './SocialStats';
import CommentSection from './CommentSection';
import { useAudioService } from '@/hooks/useAudioService';
import AudioQualityIndicator, { AudioQualityTooltip } from './AudioQualityIndicator';

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

import PlaysCounter from './PlaysCounter';
import LikeButton from './LikeButton';
import { useTrackLike } from '@/contexts/LikeContext';
import { useTrackPlays } from '@/contexts/PlaysContext';

export default function TrackCard({
  track,
  showComments = false,
  showStats = true,
  size = 'sm',
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
      whileHover={{ y: -2, scale: 1.04 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`panel-suno rounded-2xl hover:shadow-xl transition-all duration-200 border border-[var(--border)]/80 bg-[var(--surface)]/70 ${sizeClasses[size].card} ${className}`}
    >
      <div className="flex flex-col items-center gap-1.5">
        {/* Image de couverture avec bouton play */}
        <div className="relative group">
          <div className={`${sizeClasses[size].image} relative overflow-hidden rounded-xl bg-[var(--surface-2)] border border-[var(--border)]`}> 
            {track.coverUrl ? (
              <Image
                src={track.coverUrl}
                alt={track.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-pink-500 flex items-center justify-center">
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
                  className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm"
                >
                  <motion.button
                    onClick={handlePlayPause}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white hover:opacity-90 transition-colors btn-suno"
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
            <h3 className={`font-semibold text-[var(--text)] truncate w-full text-center ${sizeClasses[size].title} title-suno`}>
              {track.title}
            </h3>
            <Link
              href={`/profile/${track.artist?.username || 'unknown'}`}
              className={`text-[var(--text-muted)] hover:text-[var(--color-accent)] transition-colors ${sizeClasses[size].artist} w-full text-center`}
            >
              {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
            </Link>
            <div className="flex items-center gap-2 text-[var(--text-muted)] justify-center mt-1">
              <span className={`${sizeClasses[size].duration}`}>{formatDuration(track.duration)}</span>
              <PlaysCounter trackId={track._id} initialPlays={track.plays || 0} size={size} />
              <button className="p-1 hover:bg-white/10 rounded border border-[var(--border)]">
                <MoreVertical size={10} />
              </button>
            </div>
          </div>
          {/* Statistiques sociales */}
          {showStats && (
            <div className="mt-1.5 flex items-center justify-center gap-2">
              <SocialStats
                trackId={track._id}
                initialStats={{
                  likes: track.likes.length,
                  comments: track.comments.length
                }}
                size="sm"
              />
              <AudioQualityTooltip>
                <AudioQualityIndicator size="sm" />
              </AudioQualityTooltip>
            </div>
          )}
        </div>
      </div>
      {/* Section commentaires (optionnelle) */}
      {showComments && (
        <AnimatePresence>
          {showCommentSection && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-2"
            >
              <CommentSection trackId={track._id} initialComments={[]} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
} 