'use client';

import { useEffect, useRef, useState } from 'react';
import { useAudioPlayer } from '@/app/providers';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  X, Minimize2, Maximize2, Shuffle, Repeat, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  
  // États pour gérer la visibilité de la page
  const [wasPlayingBeforeHidden, setWasPlayingBeforeHidden] = useState(false);
  const [lastPlayTime, setLastPlayTime] = useState(0);

  const currentTrack = audioState.tracks[audioState.currentTrackIndex];

  // Gestion de la visibilité de la page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page cachée
        if (audioState.isPlaying) {
          setWasPlayingBeforeHidden(true);
          setLastPlayTime(audioRef.current?.currentTime || 0);
        }
      } else {
        // Page visible à nouveau
        if (wasPlayingBeforeHidden && audioRef.current) {
          // Restaurer la position de lecture
          audioRef.current.currentTime = lastPlayTime;
          
          // Redémarrer la lecture après un court délai
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
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [audioState.isPlaying, wasPlayingBeforeHidden, lastPlayTime, setIsPlaying]);

  // Gestion du focus de la fenêtre
  useEffect(() => {
    const handleWindowFocus = () => {
      if (wasPlayingBeforeHidden && audioRef.current) {
        // Restaurer la position de lecture
        audioRef.current.currentTime = lastPlayTime;
        
        // Redémarrer la lecture
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
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [wasPlayingBeforeHidden, lastPlayTime, setIsPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.audioUrl;
      audioRef.current.load();
      setCurrentTime(0);
      setLastPlayTime(0);
    }
  }, [currentTrack]);

  useEffect(() => {
    if (!audioState.isPlaying && audioRef.current) {
      audioRef.current.pause();
    }
  }, [audioState.isPlaying]);

  const playTrack = async () => {
    if (!currentTrack) return;
    try {
      if (audioRef.current) {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Erreur lecture audio:', error);
    }
  };

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (audioState.isPlaying) {
      pauseTrack();
    } else {
      playTrack();
    }
  };

  const nextTrack = () => {
    console.log('Tentative de passage à la piste suivante');
    console.log('Pistes disponibles:', audioState.tracks.length);
    console.log('Index actuel:', audioState.currentTrackIndex);
    
    if (audioState.tracks.length === 0) {
      console.log('Aucune piste disponible');
      return;
    }
    
    let nextIndex = audioState.currentTrackIndex + 1;
    if (nextIndex >= audioState.tracks.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
        console.log('Mode repeat all: retour au début');
      } else {
        console.log('Fin de la playlist, arrêt de la lecture');
        setIsPlaying(false);
        return;
      }
    }
    
    console.log('Nouvel index:', nextIndex);
    setCurrentTrackIndex(nextIndex);
    
    // S'assurer que la lecture continue
    if (audioState.isPlaying) {
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(error => {
            console.error('Erreur lecture piste suivante:', error);
          });
        }
      }, 100);
    }
  };

  const previousTrack = () => {
    console.log('Tentative de passage à la piste précédente');
    console.log('Pistes disponibles:', audioState.tracks.length);
    console.log('Index actuel:', audioState.currentTrackIndex);
    
    if (audioState.tracks.length === 0) {
      console.log('Aucune piste disponible');
      return;
    }
    
    let prevIndex = audioState.currentTrackIndex - 1;
    if (prevIndex < 0) {
      if (repeatMode === 'all') {
        prevIndex = audioState.tracks.length - 1;
        console.log('Mode repeat all: aller à la fin');
      } else {
        console.log('Début de la playlist, arrêt de la lecture');
        setIsPlaying(false);
        return;
      }
    }
    
    console.log('Nouvel index:', prevIndex);
    setCurrentTrackIndex(prevIndex);
    
    // S'assurer que la lecture continue
    if (audioState.isPlaying) {
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(error => {
            console.error('Erreur lecture piste précédente:', error);
          });
        }
      }, 100);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentTimeValue = audioRef.current.currentTime;
      setCurrentTime(currentTimeValue);
      setLastPlayTime(currentTimeValue);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      if (audioState.isPlaying) {
        audioRef.current.play().catch(error => {
          console.error('Erreur lecture nouvelle piste:', error);
          setIsPlaying(false);
        });
      }
    }
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      // Rejouer la même piste
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      nextTrack();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setLastPlayTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
  };

  const toggleRepeat = () => {
    if (repeatMode === 'none') setRepeatMode('one');
    else if (repeatMode === 'one') setRepeatMode('all');
    else setRepeatMode('none');
  };

  const closePlayer = () => {
    setShowPlayer(false);
    setIsPlaying(false);
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!audioState.isMinimized);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
        }}
        preload="metadata"
      />

      {/* Interface du lecteur */}
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 1 }}
          animate={{ y: 0, opacity: 1, scale: audioState.isMinimized ? 0.98 : 1 }}
          exit={{ y: 100, opacity: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className={`fixed left-0 right-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-gray-700 z-50 shadow-2xl ${
            audioState.isMinimized ? 'h-16' : 'h-20'
          }`}
          style={{ bottom: '80px', overflow: 'visible' }}
        >
          {/* Barre de progression multicolore en mode minimisé */}
          {audioState.isMinimized && (
            <div className="absolute left-0 right-0 top-0 h-1">
              <div className="relative w-full h-full">
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{
                    width: `${(currentTime / (duration || 1)) * 100}%`,
                    background: 'linear-gradient(90deg, #ff00cc, #3333ff, #00ff99, #ffea00, #ff00cc)',
                    backgroundSize: '200% 200%',
                    animation: 'rainbow-bar 2s linear infinite',
                    transition: 'width 0.2s cubic-bezier(.4,2,.6,1)',
                  }}
                />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-2 h-full">
            {/* Informations de la piste */}
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <img
                src={currentTrack.coverUrl || '/default-cover.jpg'}
                alt={currentTrack.title}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-medium truncate text-sm">
                  {currentTrack.title}
                </h3>
                <p className="text-gray-400 text-xs truncate">
                  {currentTrack.artist.name}
                </p>
              </div>
            </div>

            {/* Contrôles principaux */}
            <div className="flex items-center space-x-2">
              {/* Boutons de contrôle */}
              <button
                onClick={toggleShuffle}
                className={`p-1 rounded transition-colors ${
                  isShuffled ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Shuffle size={16} />
              </button>

              <button
                onClick={previousTrack}
                className="text-gray-400 hover:text-white transition-colors p-1"
                disabled={audioState.tracks.length <= 1 && repeatMode !== 'all'}
              >
                <SkipBack size={18} />
              </button>

              <button
                onClick={togglePlay}
                className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white hover:bg-purple-700 transition-colors"
              >
                {audioState.isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>

              <button
                onClick={nextTrack}
                className="text-gray-400 hover:text-white transition-colors p-1"
                disabled={audioState.tracks.length <= 1 && repeatMode !== 'all'}
              >
                <SkipForward size={18} />
              </button>

              <button
                onClick={toggleRepeat}
                className={`p-1 rounded transition-colors ${
                  repeatMode !== 'none' ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Repeat size={16} />
              </button>
            </div>

            {/* Contrôles secondaires */}
            <div className="flex items-center space-x-3">
              {/* Like */}
              <button
                onClick={() => handleLike(currentTrack._id)}
                className={`p-1 rounded transition-colors ${
                  currentTrack.isLiked ? 'text-red-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Heart size={16} fill={currentTrack.isLiked ? 'currentColor' : 'none'} />
              </button>

              {/* Volume */}
              <div 
                className="relative"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <button
                  onClick={toggleMute}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                >
                  {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                
                <AnimatePresence>
                  {showVolumeSlider && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 rounded-lg p-2 shadow-lg"
                    >
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Minimiser/Maximiser */}
              <button
                onClick={toggleMinimize}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                {audioState.isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>

              {/* Fermer */}
              <button
                onClick={closePlayer}
                className="text-gray-400 hover:text-red-400 transition-colors p-1"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Barre de progression (visible seulement quand pas minimisé) */}
          {!audioState.isMinimized && (
            <div className="px-4 pb-2">
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <span>{formatDuration(currentTime)}</span>
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
} 