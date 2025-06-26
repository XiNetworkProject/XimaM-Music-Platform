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

  // Détection du mode minimisé
  const isMini = audioState.isMinimized;

  // Configuration des particules (positions en halo)
  const particles = isMini
    ? [
        { top: '-8px', left: '20%' },
        { top: '-8px', left: '80%' },
        { bottom: '-8px', left: '50%' },
      ]
    : [
        { top: '-10px', left: '10%' },
        { top: '-16px', left: '50%' },
        { top: '-10px', left: '90%' },
        { bottom: '-10px', left: '15%' },
        { bottom: '-16px', left: '50%' },
        { bottom: '-10px', left: '85%' },
        { top: '50%', left: '-12px' },
        { top: '50%', right: '-12px' },
      ];

  return (
    <>
      {/* Conteneur de particules autour du player */}
      <div style={{ position: 'relative', width: '100%', height: 0 }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 0,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        >
          {particles.map((pos, i) => (
            <div
              key={i}
              className="player-particle"
              style={{
                ...pos,
                position: 'absolute',
                width: 4,
                height: 4,
                opacity: 0.13 + (i % 2) * 0.05,
                animationDuration: isMini ? '8s' : '12s',
              }}
            />
          ))}
        </div>
      </div>

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

      {/* Player principal */}
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className={`fixed left-1/2 -translate-x-1/2 z-50 shadow-2xl ${isMini ? 'h-14' : 'h-24'} flex flex-col items-center justify-center w-[90vw] max-w-md rounded-full glass-player border border-white/10 backdrop-blur-xl`}
          style={{ bottom: '80px' }}
        >
          {/* MODE MINIMISÉ : barre + bouton maximiser uniquement */}
          {isMini ? (
            <div className="flex items-center w-full px-4 py-2">
              {/* Barre de progression interactive, centrée, large */}
              <div className="flex-1 flex items-center justify-center">
                <div className="modern-progress-bar h-2 rounded-full relative cursor-pointer w-full"
                  onClick={e => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percent = x / rect.width;
                    const newTime = percent * duration;
                    if (audioRef.current) {
                      audioRef.current.currentTime = newTime;
                      setCurrentTime(newTime);
                      setLastPlayTime(newTime);
                    }
                  }}
                >
                  <motion.div
                    className="modern-progress-fill"
                    style={{ width: progressWidth }}
                  />
                  {/* Curseur draggable */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-md"
                    style={{
                      left: `calc(${progressPercentage}% - 8px)`,
                      width: 16,
                      height: 16,
                      border: '2px solid #fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                      zIndex: 2
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 100 }}
                    dragElastic={0.1}
                    onDrag={(e, info) => {
                      const bar = (e.target as HTMLElement).parentElement;
                      if (bar) {
                        const rect = bar.getBoundingClientRect();
                        let percent = (info.point.x - rect.left) / rect.width;
                        percent = Math.max(0, Math.min(1, percent));
                        const newTime = percent * duration;
                        if (audioRef.current) {
                          audioRef.current.currentTime = newTime;
                          setCurrentTime(newTime);
                          setLastPlayTime(newTime);
                        }
                      }
                    }}
                  />
                </div>
              </div>
              {/* Bouton maximiser, rond, à droite */}
              <motion.button
                onClick={toggleMinimize}
                className="ml-4 flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 transition-all shadow-lg border border-white/20"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Maximiser le player"
              >
                <Maximize2 size={22} className="text-white" />
              </motion.button>
            </div>
          ) : (
            <>
              {/* Barre de progression interactive, bien séparée */}
              <div className="w-full px-6 pt-2">
                <div className="modern-progress-bar h-2 rounded-full relative cursor-pointer"
                  onClick={e => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percent = x / rect.width;
                    const newTime = percent * duration;
                    if (audioRef.current) {
                      audioRef.current.currentTime = newTime;
                      setCurrentTime(newTime);
                      setLastPlayTime(newTime);
                    }
                  }}
                >
                  <motion.div
                    className="modern-progress-fill"
                    style={{ width: progressWidth }}
                  />
                  {/* Curseur draggable */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-md"
                    style={{
                      left: `calc(${progressPercentage}% - 8px)`,
                      width: 16,
                      height: 16,
                      border: '2px solid #fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                      zIndex: 2
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 100 }}
                    dragElastic={0.1}
                    onDrag={(e, info) => {
                      const bar = (e.target as HTMLElement).parentElement;
                      if (bar) {
                        const rect = bar.getBoundingClientRect();
                        let percent = (info.point.x - rect.left) / rect.width;
                        percent = Math.max(0, Math.min(1, percent));
                        const newTime = percent * duration;
                        if (audioRef.current) {
                          audioRef.current.currentTime = newTime;
                          setCurrentTime(newTime);
                          setLastPlayTime(newTime);
                        }
                      }
                    }}
                  />
                </div>
              </div>
              {/* Contenu du player (normal) */}
              <div className={`flex items-center justify-between w-full px-6 py-1 h-16`}>
                {/* Infos piste */}
                <div className="flex items-center min-w-0 flex-1">
                  <img
                    src={currentTrack.coverUrl || '/default-cover.jpg'}
                    alt={currentTrack.title}
                    className={`object-cover w-12 h-12 rounded-xl mr-3 cover-animation`}
                  />
                  <span className={`truncate font-semibold text-white text-base animated-text`}>{currentTrack.title}</span>
                </div>
                {/* Contrôles principaux */}
                <div className="flex items-center space-x-1">
                  <motion.button
                    onClick={togglePlay}
                    className={`play-button flex items-center justify-center w-10 h-10 text-white`}
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
                    onClick={handleLikeTrack}
                    className={`control-button p-1 rounded-lg transition-all duration-300 ${currentTrack.isLiked ? 'text-red-400' : 'text-gray-400 hover:text-white'}`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Heart size={18} fill={currentTrack.isLiked ? 'currentColor' : 'none'} />
                  </motion.button>
                  <div className="relative">
                    <motion.button
                      onClick={toggleMute}
                      className="control-button text-gray-400 hover:text-white transition-colors p-1"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </motion.button>
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
                          className="volume-slider w-20"
                        />
                      </motion.div>
                    )}
                  </div>
                  <motion.button
                    onClick={toggleMinimize}
                    className="control-button text-gray-400 hover:text-white transition-colors p-1"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Minimize2 size={18} />
                  </motion.button>
                  <motion.button
                    onClick={closePlayer}
                    className="control-button text-gray-400 hover:text-red-400 transition-colors p-1"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X size={18} />
                  </motion.button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
} 