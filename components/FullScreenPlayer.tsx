'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAudioPlayer } from '@/app/providers';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Heart, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FullScreenPlayer() {
  const { audioState, setIsPlaying, setCurrentTrackIndex, setShowPlayer, setIsMinimized, handleLike, setShuffle, setRepeat } = useAudioPlayer();
  const [showFull, setShowFull] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentTrack = audioState.tracks[audioState.currentTrackIndex];

  // Gestion du temps audio
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Gestion de la lecture/pause
  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (audioState.isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!audioState.isPlaying);
    }
  }, [audioState.isPlaying, setIsPlaying]);

  // Gestion du changement de piste
  const nextTrack = useCallback(() => {
    if (audioState.tracks.length === 0) return;
    let nextIndex = audioState.currentTrackIndex + 1;
    if (nextIndex >= audioState.tracks.length) {
      if (audioState.repeat === 'all') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }
    setCurrentTrackIndex(nextIndex);
  }, [audioState.tracks.length, audioState.currentTrackIndex, audioState.repeat, setCurrentTrackIndex, setIsPlaying]);

  const previousTrack = useCallback(() => {
    if (audioState.tracks.length === 0) return;
    let prevIndex = audioState.currentTrackIndex - 1;
    if (prevIndex < 0) {
      if (audioState.repeat === 'all') {
        prevIndex = audioState.tracks.length - 1;
      } else {
        setIsPlaying(false);
        return;
      }
    }
    setCurrentTrackIndex(prevIndex);
  }, [audioState.tracks.length, audioState.currentTrackIndex, audioState.repeat, setCurrentTrackIndex, setIsPlaying]);

  // Gestion de la fin de piste
  const handleEnded = useCallback(() => {
    if (audioState.repeat === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      nextTrack();
    }
  }, [audioState.repeat, nextTrack]);

  // Mise à jour de la source audio quand la piste change
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.audioUrl;
      audioRef.current.load();
      setCurrentTime(0);
    }
  }, [currentTrack]);

  // Gestion de la lecture/pause
  useEffect(() => {
    if (audioRef.current) {
      if (audioState.isPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [audioState.isPlaying]);

  // Mini-player (toujours visible en bas)
  if (!audioState.showPlayer || !currentTrack) return null;

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Élément audio caché */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Mini-player */}
      <motion.div
        className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50 w-[95vw] max-w-xl rounded-full glass-player flex items-center px-3 py-2 shadow-lg cursor-pointer"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        onClick={() => setShowFull(true)}
      >
        <img 
          src={currentTrack.coverUrl || '/default-cover.jpg'} 
          alt={currentTrack.title} 
          className="w-10 h-10 rounded-lg object-cover mr-3" 
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="truncate font-semibold text-white text-sm">{currentTrack.title}</span>
            {/* Animation d'onde/barre */}
            {audioState.isPlaying && (
              <div className="flex space-x-1">
                <div className="w-1 h-3 bg-purple-400 rounded-full animate-pulse-wave" style={{ animationDelay: '0s' }}></div>
                <div className="w-1 h-3 bg-pink-400 rounded-full animate-pulse-wave" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-3 bg-purple-400 rounded-full animate-pulse-wave" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
          </div>
          <span className="text-xs text-gray-300 truncate">{currentTrack.artist?.name || currentTrack.artist?.username}</span>
        </div>
        <button
          className="ml-3 flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 transition-all"
          onClick={e => { e.stopPropagation(); togglePlay(); }}
        >
          {audioState.isPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white" />}
        </button>
      </motion.div>

      {/* Player plein écran (modal/dialog) */}
      <AnimatePresence>
        {showFull && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header : jaquette grande + bouton fermer */}
            <div className="relative w-full flex flex-col items-center">
              <motion.img 
                src={currentTrack.coverUrl || '/default-cover.jpg'} 
                alt={currentTrack.title} 
                className="w-48 h-48 md:w-64 md:h-64 rounded-2xl object-cover shadow-2xl mt-8 cover-float-animation" 
              />
              <button
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                onClick={() => setShowFull(false)}
              >
                <X size={22} className="text-white" />
              </button>
            </div>
            
            {/* Centre : titre, artiste, animation d'onde/barre */}
            <div className="flex flex-col items-center mt-6 mb-4">
              <span className="text-2xl md:text-3xl font-bold text-white mb-2 truncate max-w-[90vw]">{currentTrack.title}</span>
              <span className="text-lg text-gray-300 mb-2">{currentTrack.artist?.name || currentTrack.artist?.username}</span>
              {audioState.isPlaying && (
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
            <div className="w-full max-w-xl px-6 mt-auto mb-8">
              {/* Barre de progression améliorée */}
              <div className="mb-4">
                <div 
                  className="w-full h-2 bg-gray-700 rounded-full relative cursor-pointer"
                  onClick={handleSeek}
                >
                  <div 
                    className="h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full relative"
                    style={{ width: `${progressPercentage}%` }}
                  >
                    <div className="progress-shimmer absolute inset-0 rounded-full"></div>
                  </div>
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg cursor-pointer"
                    style={{ left: `calc(${progressPercentage}% - 8px)` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              
              {/* Contrôles principaux */}
              <div className="flex items-center justify-center space-x-4 mb-4">
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors" onClick={previousTrack}>
                  <SkipBack size={28} className="text-white" />
                </button>
                <button 
                  className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors" 
                  onClick={togglePlay}
                >
                  {audioState.isPlaying ? <Pause size={32} className="text-white" /> : <Play size={32} className="text-white" />}
                </button>
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors" onClick={nextTrack}>
                  <SkipForward size={28} className="text-white" />
                </button>
              </div>
              
              {/* Contrôles secondaires */}
              <div className="flex items-center justify-center space-x-4">
                <button 
                  className={`p-2 hover:bg-white/10 rounded-full transition-colors ${audioState.shuffle ? 'text-purple-400' : 'text-white/60'}`} 
                  onClick={() => setShuffle(!audioState.shuffle)}
                >
                  <Shuffle size={22} />
                </button>
                <button 
                  className={`p-2 hover:bg-white/10 rounded-full transition-colors ${audioState.repeat !== 'none' ? 'text-purple-400' : 'text-white/60'}`} 
                  onClick={() => setRepeat(audioState.repeat === 'none' ? 'one' : audioState.repeat === 'one' ? 'all' : 'none')}
                >
                  <Repeat size={22} />
                </button>
                <button 
                  className={`p-2 hover:bg-white/10 rounded-full transition-colors ${currentTrack.isLiked ? 'text-red-400' : 'text-white/60'}`} 
                  onClick={() => handleLike(currentTrack._id)}
                >
                  <Heart size={22} fill={currentTrack.isLiked ? 'currentColor' : 'none'} />
                </button>
                <button className="p-2 text-white/60 hover:bg-white/10 rounded-full transition-colors">
                  <Volume2 size={22} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 