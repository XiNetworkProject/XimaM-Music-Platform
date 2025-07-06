'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAudioPlayer } from '@/app/providers';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Heart, X, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import FloatingParticles from './FloatingParticles';

export default function FullScreenPlayer() {
  const { 
    audioState, 
    setIsPlaying, 
    setCurrentTrackIndex, 
    setShowPlayer, 
    setIsMinimized, 
    handleLike, 
    setShuffle, 
    setRepeat,
    play,
    pause,
    seek,
    setVolume,
    toggleMute,
    nextTrack,
    previousTrack,
    toggleShuffle,
    cycleRepeat,
    requestNotificationPermission
  } = useAudioPlayer();
  
  const [showFull, setShowFull] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isNotificationRequested, setIsNotificationRequested] = useState(false);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const currentTrack = audioState.tracks[audioState.currentTrackIndex];

  const formatTime = useCallback((seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Gestion de la lecture/pause optimisée
  const togglePlay = useCallback(async () => {
    try {
      if (audioState.isLoading) return;
      
      if (audioState.isPlaying) {
        pause();
      } else {
        await play();
      }
    } catch (error) {
      // Erreur silencieuse
    }
  }, [audioState.isPlaying, audioState.isLoading, play, pause]);

  // Gestion du changement de piste optimisée
  const handleNextTrack = useCallback(() => {
    try {
      if (audioState.isLoading) return;
      nextTrack();
    } catch (error) {
      // Erreur silencieuse
    }
  }, [nextTrack, audioState.isLoading]);

  const handlePreviousTrack = useCallback(() => {
    try {
      if (audioState.isLoading) return;
      previousTrack();
    } catch (error) {
      // Erreur silencieuse
    }
  }, [previousTrack, audioState.isLoading]);

  // Gestion du seek optimisée
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (audioState.isLoading || !audioState.duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = percent * audioState.duration;
    seek(newTime);
  }, [audioState.duration, audioState.isLoading, seek]);

  // Gestion du volume
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    setVolume(volume);
  }, [setVolume]);

  // Fermer le slider de volume quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volumeSliderRef.current && !volumeSliderRef.current.contains(event.target as Node)) {
        setShowVolumeSlider(false);
      }
    };

    if (showVolumeSlider) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showVolumeSlider]);

  // Demande de permission pour les notifications
  useEffect(() => {
    if (audioState.showPlayer && currentTrack && !isNotificationRequested) {
      setIsNotificationRequested(true);
      requestNotificationPermission().then((granted) => {
        if (granted) {
          // Notifications activées
        }
      });
    }
  }, [audioState.showPlayer, currentTrack, isNotificationRequested, requestNotificationPermission]);

  // Gestion des erreurs
  useEffect(() => {
    if (audioState.error) {
      setShowError(true);
      toast.error(audioState.error);
    } else {
      setShowError(false);
    }
  }, [audioState.error]);

  // Calculs optimisés
  const progressPercentage = useMemo(() => {
    if (!audioState.duration || audioState.duration <= 0 || currentTrack?._id === 'radio-mixx-party') return 0;
    return Math.min(100, (audioState.currentTime / audioState.duration) * 100);
  }, [audioState.currentTime, audioState.duration, currentTrack?._id]);

  const isCurrentTrack = useMemo(() => {
    return currentTrack?._id === audioState.tracks[audioState.currentTrackIndex]?._id;
  }, [currentTrack?._id, audioState.tracks, audioState.currentTrackIndex]);

  // Mini-player (toujours visible en bas)
  if (!audioState.showPlayer || !currentTrack) {
    return null;
  }

  return (
    <>
      {/* Mini-player */}
      <motion.div
        className="glass-player relative"
        style={{
          display: showFull ? 'none' : 'flex'
        }}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        onClick={() => setShowFull(true)}
      >
        {/* Particules volantes quand en lecture */}
        <FloatingParticles 
          isPlaying={audioState.isPlaying && !audioState.isLoading} 
          className="rounded-[50px]"
        />
        
        <img 
          src={currentTrack.coverUrl || '/default-cover.jpg'} 
          alt={currentTrack.title} 
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover mr-2 sm:mr-3 flex-shrink-0 relative z-10" 
          loading="lazy"
        />
        <div className="flex-1 min-w-0 relative z-10">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <span className="truncate font-semibold text-white text-xs sm:text-sm">{currentTrack.title}</span>
            {/* Animation d'onde/barre */}
            {audioState.isPlaying && !audioState.isLoading && (
              <div className="flex space-x-0.5 sm:space-x-1 flex-shrink-0">
                <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-purple-400 rounded-full animate-pulse-wave" style={{ animationDelay: '0s' }}></div>
                <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-pink-400 rounded-full animate-pulse-wave" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-purple-400 rounded-full animate-pulse-wave" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
          </div>
          <span className="text-xs text-gray-300 truncate text-xs sm:text-xs">{currentTrack.artist?.name || currentTrack.artist?.username}</span>
        </div>
        
        {/* Indicateur de chargement */}
        {audioState.isLoading && (
          <div className="ml-2 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 relative z-10">
            <Loader2 size={16} className="text-white animate-spin" />
          </div>
        )}
        
        {/* Indicateur d'erreur */}
        {showError && (
          <div className="ml-2 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 relative z-10">
            <AlertCircle size={16} className="text-red-400" />
          </div>
        )}
        
        {/* Message d'aide pour première lecture mobile */}
        {audioState.error && audioState.error.includes('Première lecture') && (
          <div className="ml-2 px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-300 max-w-32 relative z-10">
            Cliquez sur play
          </div>
        )}
        
        <button
          className="ml-2 sm:ml-3 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 hover:bg-white/40 transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
          onClick={e => { e.stopPropagation(); togglePlay(); }}
          disabled={audioState.isLoading}
        >
          {audioState.isLoading ? (
            <Loader2 size={14} className="text-white animate-spin sm:w-[18px] sm:h-[18px]" />
          ) : audioState.isPlaying ? (
            <Pause size={14} className="text-white sm:w-[18px] sm:h-[18px]" />
          ) : (
            <Play size={14} className="text-white sm:w-[18px] sm:h-[18px]" />
          )}
        </button>
      </motion.div>

      {/* Player plein écran (modal/dialog) */}
      <AnimatePresence>
        {showFull && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Contenu centré */}
            <motion.div
              className="flex flex-col items-center justify-center w-full h-full max-w-2xl mx-auto px-6"
              style={{
                paddingTop: 'env(safe-area-inset-top, 20px)',
                paddingBottom: 'env(safe-area-inset-bottom, 20px)',
                minHeight: '100vh',
                justifyContent: 'space-between'
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header : jaquette grande + bouton fermer */}
              <div className="relative w-full flex flex-col items-center mt-4">
                <motion.img 
                  src={currentTrack.coverUrl || '/default-cover.jpg'} 
                  alt={currentTrack.title} 
                  className="w-40 h-40 md:w-56 md:h-56 rounded-2xl object-cover shadow-2xl cover-float-animation" 
                  loading="lazy"
                />
                <button
                  className="absolute w-10 h-10 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                  style={{
                    top: '-20px',
                    right: '20px'
                  }}
                  onClick={() => setShowFull(false)}
                >
                  <X size={22} className="text-white" />
                </button>
              </div>
              
              {/* Centre : titre, artiste, animation d'onde/barre */}
              <div className="flex flex-col items-center flex-1 justify-center">
                <span className="text-2xl md:text-3xl font-bold text-white mb-2 truncate max-w-[90vw] text-center">{currentTrack.title}</span>
                <span className="text-lg text-gray-300 mb-2 text-center">{currentTrack.artist?.name || currentTrack.artist?.username}</span>
                {audioState.isPlaying && !audioState.isLoading && (
                  <div className="flex space-x-1 mb-2">
                    <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse-wave" style={{ animationDelay: '0s' }}></div>
                    <div className="w-1 h-4 bg-pink-400 rounded-full animate-pulse-wave" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse-wave" style={{ animationDelay: '0.4s' }}></div>
                    <div className="w-1 h-4 bg-pink-400 rounded-full animate-pulse-wave" style={{ animationDelay: '0.6s' }}></div>
                    <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse-wave" style={{ animationDelay: '0.8s' }}></div>
                  </div>
                )}
              </div>
              
              {/* Bas : barre de progression + contrôles */}
              <div className="w-full mt-auto">
                {/* Barre de progression améliorée */}
                <div className="mb-4">
                  <div 
                    className="w-full h-2 bg-gray-700 rounded-full relative cursor-pointer"
                    onClick={handleSeek}
                  >
                    <div 
                      className="h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full relative transition-all duration-100"
                      style={{ width: `${progressPercentage}%` }}
                    >
                      <div className="progress-shimmer absolute inset-0 rounded-full"></div>
                    </div>
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg cursor-pointer transition-all duration-100"
                      style={{ left: `calc(${progressPercentage}% - 8px)` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formatTime(audioState.currentTime)}</span>
                    <span>{formatTime(audioState.duration)}</span>
                  </div>
                </div>
                
                {/* Contrôles principaux */}
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <button 
                    className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    onClick={handlePreviousTrack}
                    disabled={audioState.isLoading}
                  >
                    <SkipBack size={28} className="text-white" />
                  </button>
                  <button 
                    className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    onClick={togglePlay}
                    disabled={audioState.isLoading}
                  >
                    {audioState.isLoading ? (
                      <Loader2 size={32} className="text-white animate-spin" />
                    ) : audioState.isPlaying ? (
                      <Pause size={32} className="text-white" />
                    ) : (
                      <Play size={32} className="text-white" />
                    )}
                  </button>
                  <button 
                    className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    onClick={handleNextTrack}
                    disabled={audioState.isLoading}
                  >
                    <SkipForward size={28} className="text-white" />
                  </button>
                </div>
                
                {/* Contrôles secondaires */}
                <div className="flex items-center justify-center space-x-4">
                  <button 
                    className={`p-2 hover:bg-white/10 rounded-full transition-colors ${audioState.shuffle ? 'text-purple-400' : 'text-white/60'}`} 
                    onClick={toggleShuffle}
                  >
                    <Shuffle size={22} />
                  </button>
                  <button 
                    className={`p-2 hover:bg-white/10 rounded-full transition-colors ${audioState.repeat !== 'none' ? 'text-purple-400' : 'text-white/60'}`} 
                    onClick={cycleRepeat}
                  >
                    <Repeat size={22} />
                  </button>
                  <button 
                    className={`p-2 hover:bg-white/10 rounded-full transition-colors ${currentTrack.isLiked ? 'text-red-400' : 'text-white/60'}`} 
                    onClick={() => handleLike(currentTrack._id)}
                  >
                    <Heart size={22} fill={currentTrack.isLiked ? 'currentColor' : 'none'} />
                  </button>
                  <div className="relative" ref={volumeSliderRef}>
                    <button 
                      className="p-2 text-white/60 hover:bg-white/10 rounded-full transition-colors"
                      onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                    >
                      {audioState.isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                    </button>
                    {showVolumeSlider && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-black/80 rounded-lg">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={audioState.volume}
                          onChange={handleVolumeChange}
                          className="volume-slider w-20 h-2"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 