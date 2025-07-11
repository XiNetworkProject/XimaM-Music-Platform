'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Heart, MessageCircle, Share2, MoreVertical, Headphones, Clock, User } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import { formatDuration } from '@/lib/utils';

interface TrackCardProps {
  track: {
    _id: string;
    title: string;
    artist: {
      _id: string;
      name: string;
      username: string;
      avatar?: string;
    };
    audioUrl: string;
    coverUrl?: string;
    duration: number;
    likes: string[];
    comments: string[];
    plays: number;
    isLiked?: boolean;
    genre?: string[];
    description?: string;
  };
  variant?: 'default' | 'featured' | 'compact';
  showStats?: boolean;
  className?: string;
}

export default function TrackCard({ 
  track, 
  variant = 'default', 
  showStats = true,
  className = ''
}: TrackCardProps) {
  const { audioState, playTrack, handleLike } = useAudioPlayer();
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isCurrentTrack = audioState.tracks[audioState.currentTrackIndex]?._id === track._id;
  const isCurrentlyPlaying = isCurrentTrack && audioState.isPlaying;

  const handlePlay = useCallback(async () => {
    try {
      if (isCurrentTrack) {
        // Si c'est la piste actuelle, toggle play/pause
        if (audioState.isPlaying) {
          // Pause sera géré par le provider
        } else {
          await playTrack(track._id);
        }
      } else {
        // Nouvelle piste
        await playTrack(track._id);
      }
    } catch (error) {
      console.error('Erreur lecture:', error);
    }
  }, [track._id, isCurrentTrack, audioState.isPlaying, playTrack]);

  const handleLikeClick = useCallback(() => {
    handleLike(track._id);
  }, [track._id, handleLike]);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: track.title,
        text: `Écoutez "${track.title}" par ${track.artist.name} sur XimaM`,
        url: `${window.location.origin}/track/${track._id}`
      });
    } else {
      // Fallback pour copier le lien
      navigator.clipboard.writeText(`${window.location.origin}/track/${track._id}`);
    }
  }, [track]);

  const cardVariants = {
    default: 'p-4 rounded-3xl',
    featured: 'p-6 rounded-3xl',
    compact: 'p-3 rounded-2xl'
  };

  const imageSizes = {
    default: 'w-16 h-16 sm:w-20 sm:h-20',
    featured: 'w-24 h-24 sm:w-32 sm:h-32',
    compact: 'w-12 h-12'
  };

  return (
    <motion.div
      className={`card-modern ${cardVariants[variant]} ${className}`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Effet de particules en arrière-plan */}
      <AnimatePresence>
        {isHovered && (
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`particle-${i}`}
                className="absolute w-1 h-1 bg-white/20 rounded-full"
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{
                  x: [0, Math.random() * 100 - 50],
                  y: [0, Math.random() * 100 - 50],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut"
                }}
                style={{
                  left: `${20 + i * 30}%`,
                  top: '50%',
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex items-center space-x-4">
        {/* Cover avec animation */}
        <motion.div 
          className={`relative ${imageSizes[variant]} rounded-2xl overflow-hidden group`}
          whileHover={{ scale: 1.05, rotate: 2 }}
          transition={{ duration: 0.3 }}
        >
          <img
            src={track.coverUrl || '/default-cover.jpg'}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
          
          {/* Overlay avec bouton play */}
          <AnimatePresence>
            {(isHovered || isCurrentlyPlaying) && (
              <motion.div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.button
                  onClick={handlePlay}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {isCurrentlyPlaying ? (
                    <Pause size={20} className="text-white" />
                  ) : (
                    <Play size={20} className="text-white ml-0.5" />
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Indicateur de lecture */}
          {isCurrentlyPlaying && (
            <motion.div
              className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </motion.div>

        {/* Informations de la piste */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <motion.h3 
                className="font-semibold text-white truncate text-sm sm:text-base"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {track.title}
              </motion.h3>
              
              <motion.div 
                className="flex items-center space-x-2 mt-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <User size={12} className="text-gray-400" />
                <span className="text-xs text-gray-400 truncate">
                  {track.artist.name || track.artist.username}
                </span>
              </motion.div>

              {showStats && (
                <motion.div 
                  className="flex items-center space-x-4 mt-2 text-xs text-gray-500"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center space-x-1">
                    <Headphones size={12} />
                    <span>{track.plays.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock size={12} />
                    <span>{formatDuration(track.duration)}</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 ml-4">
              {/* Bouton like */}
              <motion.button
                onClick={handleLikeClick}
                className={`p-2 rounded-full transition-all duration-200 ${
                  track.isLiked 
                    ? 'bg-red-500/20 text-red-400' 
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Heart 
                  size={16} 
                  className={track.isLiked ? 'fill-current' : ''} 
                />
              </motion.button>

              {/* Bouton commentaires */}
              <motion.button
                className="p-2 rounded-full bg-white/10 text-gray-400 hover:bg-white/20 transition-all duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <MessageCircle size={16} />
              </motion.button>

              {/* Bouton partage */}
              <motion.button
                onClick={handleShare}
                className="p-2 rounded-full bg-white/10 text-gray-400 hover:bg-white/20 transition-all duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Share2 size={16} />
              </motion.button>

              {/* Menu contextuel */}
              <motion.button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-full bg-white/10 text-gray-400 hover:bg-white/20 transition-all duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <MoreVertical size={16} />
              </motion.button>
            </div>
          </div>

          {/* Barre de progression pour la piste en cours */}
          {isCurrentTrack && (
            <motion.div 
              className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{ width: `${(audioState.currentTime / audioState.duration) * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Menu contextuel */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            className="absolute top-full right-0 mt-2 p-2 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/20 shadow-xl"
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-1">
              <button className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors">
                Ajouter à la playlist
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors">
                Télécharger
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors">
                Signaler
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 