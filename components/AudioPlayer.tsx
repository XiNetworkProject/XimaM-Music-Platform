'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAudioPlayer } from '@/app/providers';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  X, Minimize2, Maximize2, Shuffle, Repeat, Heart, Loader2
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

export default function AudioPlayer() {
  const { audioState, setIsPlaying, setCurrentTrackIndex, setShowPlayer, setIsMinimized, handleLike } = useAudioPlayer();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  
  // États pour gérer la visibilité de la page
  const [wasPlayingBeforeHidden, setWasPlayingBeforeHidden] = useState(false);
  const [lastPlayTime, setLastPlayTime] = useState(0);

  // Motion values pour les animations
  const progressMotion = useMotionValue(0);
  const scaleMotion = useMotionValue(1);
  const rotationMotion = useMotionValue(0);

  const currentTrack = audioState.tracks[audioState.currentTrackIndex];

  // Calcul du pourcentage de progression
  const progressPercentage = useMemo(() => {
    return duration > 0 ? (currentTime / duration) * 100 : 0;
  }, [currentTime, duration]);

  // Transform pour l'animation de la barre de progression
  const progressWidth = useTransform(progressMotion, [0, 100], ['0%', '100%']);

  // Optimisation des callbacks
  const playTrack = useCallback(async () => {
    if (!currentTrack) return;
    
    setIsLoading(true);
    try {
      if (audioRef.current) {
        await audioRef.current.play();
        setIsPlaying(true);
        setNotificationMessage('Lecture démarrée');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 2000);
      }
    } catch (error) {
      console.error('Erreur lecture audio:', error);
      setNotificationMessage('Erreur de lecture');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
    } finally {
      setIsLoading(false);
    }
  }, [currentTrack, setIsPlaying]);

  const pauseTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setNotificationMessage('Lecture en pause');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
    }
  }, [setIsPlaying]);

  const togglePlay = useCallback(() => {
    if (audioState.isPlaying) {
      pauseTrack();
    } else {
      playTrack();
    }
  }, [audioState.isPlaying, playTrack, pauseTrack]);

  const nextTrack = useCallback(() => {
    if (audioState.tracks.length === 0) return;
    
    let nextIndex = audioState.currentTrackIndex + 1;
    if (nextIndex >= audioState.tracks.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }
    
    setCurrentTrackIndex(nextIndex);
    setNotificationMessage('Piste suivante');
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
    
    // Continuer la lecture si elle était active
    if (audioState.isPlaying) {
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(error => {
            console.error('Erreur lecture piste suivante:', error);
          });
        }
      }, 100);
    }
  }, [audioState.tracks.length, audioState.currentTrackIndex, audioState.isPlaying, repeatMode, setCurrentTrackIndex, setIsPlaying]);

  const previousTrack = useCallback(() => {
    if (audioState.tracks.length === 0) return;
    
    let prevIndex = audioState.currentTrackIndex - 1;
    if (prevIndex < 0) {
      if (repeatMode === 'all') {
        prevIndex = audioState.tracks.length - 1;
      } else {
        setIsPlaying(false);
        return;
      }
    }
    
    setCurrentTrackIndex(prevIndex);
    setNotificationMessage('Piste précédente');
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
    
    // Continuer la lecture si elle était active
    if (audioState.isPlaying) {
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(error => {
            console.error('Erreur lecture piste précédente:', error);
          });
        }
      }, 100);
    }
  }, [audioState.tracks.length, audioState.currentTrackIndex, audioState.isPlaying, repeatMode, setCurrentTrackIndex, setIsPlaying]);

  // Gestion de la visibilité de la page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (audioState.isPlaying) {
          setWasPlayingBeforeHidden(true);
          setLastPlayTime(audioRef.current?.currentTime || 0);
        }
      } else {
        if (wasPlayingBeforeHidden && audioRef.current) {
          audioRef.current.currentTime = lastPlayTime;
          setTimeout(() => {
            if (audioRef.current && wasPlayingBeforeHidden) {
              audioRef.current.play().catch(error => {
                console.error('Erreur reprise lecture après visibilité:', error);
                setIsPlaying(false);
              });
            }
          }, 100);
          setWasPlayingBeforeHidden(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [audioState.isPlaying, wasPlayingBeforeHidden, lastPlayTime, setIsPlaying]);

  // Gestion du focus de la fenêtre
  useEffect(() => {
    const handleWindowFocus = () => {
      if (wasPlayingBeforeHidden && audioRef.current) {
        audioRef.current.currentTime = lastPlayTime;
        setTimeout(() => {
          if (audioRef.current && wasPlayingBeforeHidden) {
            audioRef.current.play().catch(error => {
              console.error('Erreur reprise lecture après focus:', error);
              setIsPlaying(false);
            });
          }
        }, 100);
        setWasPlayingBeforeHidden(false);
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [wasPlayingBeforeHidden, lastPlayTime, setIsPlaying]);

  // Gestion du volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Gestion du changement de piste
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      setIsLoading(true);
      audioRef.current.src = currentTrack.audioUrl;
      audioRef.current.load();
      setCurrentTime(0);
      setLastPlayTime(0);
      progressMotion.set(0);
    }
  }, [currentTrack, progressMotion]);

  // Gestion de la lecture/pause
  useEffect(() => {
    if (!audioState.isPlaying && audioRef.current) {
      audioRef.current.pause();
    }
  }, [audioState.isPlaying]);

  // Mise à jour de la progression
  useEffect(() => {
    progressMotion.set(progressPercentage);
  }, [progressPercentage, progressMotion]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const currentTimeValue = audioRef.current.currentTime;
      setCurrentTime(currentTimeValue);
      setLastPlayTime(currentTimeValue);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
      if (audioState.isPlaying) {
        audioRef.current.play().catch(error => {
          console.error('Erreur lecture nouvelle piste:', error);
          setIsPlaying(false);
        });
      }
    }
  }, [audioState.isPlaying, setIsPlaying]);

  const handleEnded = useCallback(() => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      nextTrack();
    }
  }, [repeatMode, nextTrack]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setLastPlayTime(newTime);
    }
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    setNotificationMessage(isMuted ? 'Son activé' : 'Son coupé');
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  }, [isMuted]);

  const toggleShuffle = useCallback(() => {
    setIsShuffled(!isShuffled);
    setNotificationMessage(isShuffled ? 'Lecture aléatoire désactivée' : 'Lecture aléatoire activée');
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  }, [isShuffled]);

  const toggleRepeat = useCallback(() => {
    const newMode = repeatMode === 'none' ? 'one' : repeatMode === 'one' ? 'all' : 'none';
    setRepeatMode(newMode);
    const messages = {
      none: 'Répétition désactivée',
      one: 'Répétition d\'une piste',
      all: 'Répétition de la playlist'
    };
    setNotificationMessage(messages[newMode]);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  }, [repeatMode]);

  const closePlayer = useCallback(() => {
    setShowPlayer(false);
    setIsPlaying(false);
    setIsMinimized(false);
  }, [setShowPlayer, setIsPlaying, setIsMinimized]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(!audioState.isMinimized);
  }, [audioState.isMinimized, setIsMinimized]);

  const handleLikeTrack = useCallback(() => {
    if (currentTrack) {
      handleLike(currentTrack._id);
      setNotificationMessage(currentTrack.isLiked ? 'Retiré des favoris' : 'Ajouté aux favoris');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
    }
  }, [currentTrack, handleLike]);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  if (!audioState.showPlayer || !currentTrack) {
    return null;
  }

  return (
    <>
      {/* Élément audio caché */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={(e) => {
          console.error('Erreur audio:', e);
          setIsPlaying(false);
          setNotificationMessage('Erreur de lecture audio');
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 2000);
        }}
        preload="metadata"
      />

      {/* Notification toast */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="fixed top-4 right-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-[60] notification"
          >
            {notificationMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interface du lecteur */}
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className={`fixed left-0 right-0 glass-player z-50 shadow-2xl ${
            audioState.isMinimized ? 'h-16' : 'h-24'
          }`}
          style={{ bottom: '80px' }}
        >
          {/* Barre de progression multicolore animée AU-DESSUS du lecteur */}
          <div className="absolute left-0 right-0 top-0 h-2 modern-progress-bar">
            <motion.div
              className="modern-progress-fill"
              style={{ width: progressWidth }}
            />
          </div>

          {/* Particules flottantes */}
          <div className="floating-particles">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="particle" />
            ))}
          </div>

          <div className="flex items-center justify-between px-4 py-2 h-full mt-2">
            {/* Informations de la piste avec animation */}
            <motion.div 
              className="flex items-center space-x-3 flex-1 min-w-0"
              layout
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <motion.img
                src={currentTrack.coverUrl || '/default-cover.jpg'}
                alt={currentTrack.title}
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0 cover-animation"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              />
              <div className="min-w-0 flex-1">
                <motion.h3 
                  className="text-white font-semibold truncate text-sm animated-text"
                  layout
                >
                  {currentTrack.title}
                </motion.h3>
                <motion.p 
                  className="text-gray-300 text-xs truncate"
                  layout
                >
                  {currentTrack.artist.name}
                </motion.p>
              </div>
            </motion.div>

            {/* Contrôles principaux avec animations */}
            <div className="flex items-center space-x-3">
              <motion.button
                onClick={toggleShuffle}
                className={`control-button p-2 rounded-lg transition-all duration-300 ${
                  isShuffled ? 'active' : 'text-gray-400 hover:text-white'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Shuffle size={18} />
              </motion.button>

              <motion.button
                onClick={previousTrack}
                className="control-button text-gray-400 hover:text-white transition-colors p-2"
                disabled={audioState.tracks.length <= 1 && repeatMode !== 'all'}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <SkipBack size={20} />
              </motion.button>

              <motion.button
                onClick={togglePlay}
                className="play-button w-12 h-12 flex items-center justify-center text-white"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : audioState.isPlaying ? (
                  <Pause size={20} />
                ) : (
                  <Play size={20} />
                )}
              </motion.button>

              <motion.button
                onClick={nextTrack}
                className="control-button text-gray-400 hover:text-white transition-colors p-2"
                disabled={audioState.tracks.length <= 1 && repeatMode !== 'all'}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <SkipForward size={20} />
              </motion.button>

              <motion.button
                onClick={toggleRepeat}
                className={`control-button p-2 rounded-lg transition-all duration-300 ${
                  repeatMode !== 'none' ? 'active' : 'text-gray-400 hover:text-white'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Repeat size={18} />
              </motion.button>
            </div>

            {/* Contrôles secondaires */}
            <div className="flex items-center space-x-3">
              <motion.button
                onClick={handleLikeTrack}
                className={`control-button p-2 rounded-lg transition-all duration-300 ${
                  currentTrack.isLiked ? 'text-red-400' : 'text-gray-400 hover:text-white'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Heart size={18} fill={currentTrack.isLiked ? 'currentColor' : 'none'} />
              </motion.button>

              {/* Volume avec slider moderne */}
              <div 
                className="relative"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <motion.button
                  onClick={toggleMute}
                  className="control-button text-gray-400 hover:text-white transition-colors p-2"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </motion.button>
                
                <AnimatePresence>
                  {showVolumeSlider && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.8 }}
                      className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 glass-player rounded-xl p-3 shadow-2xl"
                    >
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="volume-slider w-24"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                onClick={toggleMinimize}
                className="control-button text-gray-400 hover:text-white transition-colors p-2"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {audioState.isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
              </motion.button>

              <motion.button
                onClick={closePlayer}
                className="control-button text-gray-400 hover:text-red-400 transition-colors p-2"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <X size={18} />
              </motion.button>
            </div>
          </div>

          {/* Barre de progression détaillée (visible seulement quand pas minimisé) */}
          {!audioState.isMinimized && (
            <motion.div 
              className="px-4 pb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center space-x-3 text-xs text-gray-400">
                <span className="font-mono">{formatDuration(currentTime)}</span>
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer volume-slider"
                  />
                </div>
                <span className="font-mono">{formatDuration(duration)}</span>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
} 