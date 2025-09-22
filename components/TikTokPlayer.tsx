'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAudioPlayer } from '@/app/providers';
import { useTrackLike } from '@/contexts/LikeContext';
import { useTrackPlays } from '@/contexts/PlaysContext';
import LikeButton from './LikeButton';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Heart, X, AlertCircle, Loader2, MessageCircle, Users, Headphones, Share2, MoreVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import toast from 'react-hot-toast';
import FloatingParticles from './FloatingParticles';
import InteractiveCounter from './InteractiveCounter';
import CommentDialog from './CommentDialog';
import CommentButton from './CommentButton';

interface TikTokPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TikTokPlayer({ isOpen, onClose }: TikTokPlayerProps) {
  const { 
    audioState, 
    setIsPlaying, 
    setCurrentTrackIndex, 
    setShowPlayer, 
    setIsMinimized, 
    handleLike, 
    setShuffle, 
    setRepeat,
    playTrack,
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
  
  const currentIndex = audioState.currentTrackIndex ?? 0;
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isNotificationRequested, setIsNotificationRequested] = useState(false);
  const [wheelDelta, setWheelDelta] = useState(0);
  const [isChangingTrack, setIsChangingTrack] = useState(false);
  const [preloadedTracks, setPreloadedTracks] = useState<Set<number>>(new Set());
  const [isPreloading, setIsPreloading] = useState(false);
  const navigationHistoryRef = useRef<number[]>([]);
  const lastNavigationTsRef = useRef<number>(0);
  const clearChangeTimerRef = useRef<any>(null);
  const prevIndexRef = useRef<number>(audioState.currentTrackIndex ?? 0);
  const wheelAccumRef = useRef<number>(0);
  const wheelTimerRef = useRef<any>(null);
  const [swipeDirection, setSwipeDirection] = useState<1 | -1>(1);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [lastTapTs, setLastTapTs] = useState(0);
  const [showLikeBurst, setShowLikeBurst] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelArrayRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Variants d'animation de page
  const pageVariants = useMemo(() => ({
    initial: (dir: 1 | -1) => ({ y: dir * 60, opacity: 0 }),
    animate: { y: 0, opacity: 1 },
    exit: (dir: 1 | -1) => ({ y: -dir * 60, opacity: 0 })
  }), []);

  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const currentTrack = audioState.tracks[currentIndex] || null;
  const totalTracks = audioState.tracks.length;

  const formatTime = useCallback((seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Fonction de préchargement des tracks
  const preloadTracks = useCallback(async (startIndex: number, count: number = 3) => {
    if (isPreloading || totalTracks === 0) return;
    
    setIsPreloading(true);
    const tracksToPreload: number[] = [];
    
    // Précharger les tracks autour de l'index actuel
    for (let i = Math.max(0, startIndex - 1); i <= Math.min(totalTracks - 1, startIndex + count); i++) {
      if (!preloadedTracks.has(i)) {
        tracksToPreload.push(i);
      }
    }
    
    if (tracksToPreload.length === 0) {
      setIsPreloading(false);
      return;
    }
    
    // Précharger les tracks en parallèle
    const preloadPromises = tracksToPreload.map(async (index) => {
      const track = audioState.tracks[index];
      if (!track?.audioUrl) return;
      
      try {
        // Créer un élément audio pour précharger
        const audio = new Audio(track.audioUrl);
        audio.preload = 'metadata';
        audio.crossOrigin = 'anonymous';
        
        return new Promise<void>((resolve) => {
          const handleCanPlay = () => {
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('loadedmetadata', handleCanPlay);
            setPreloadedTracks(prev => new Set(Array.from(prev).concat(index)));
            resolve();
          };
          
          const handleError = () => {
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('loadedmetadata', handleCanPlay);
            resolve(); // Continue même en cas d'erreur
          };
          
          audio.addEventListener('canplay', handleCanPlay);
          audio.addEventListener('loadedmetadata', handleCanPlay);
          audio.addEventListener('error', handleError);
          
          // Timeout de sécurité
          setTimeout(() => {
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('loadedmetadata', handleCanPlay);
            resolve();
          }, 3000);
        });
      } catch (error) {
        console.warn(`Erreur préchargement track ${index}:`, error);
      }
    });
    
    await Promise.allSettled(preloadPromises);
    setIsPreloading(false);
  }, [audioState.tracks, preloadedTracks, isPreloading, totalTracks]);

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

  // Gestion du changement de piste avec préchargement
  const handleNextTrack = useCallback(async () => {
    try {
      const now = Date.now();
      if (now - lastNavigationTsRef.current < 200) return;
      lastNavigationTsRef.current = now;
      if (isChangingTrack || totalTracks === 0) return;
      setIsChangingTrack(true);
      const newIndex = Math.min(totalTracks - 1, currentIndex + 1);
      if (newIndex === currentIndex) return;
      navigationHistoryRef.current.push(currentIndex);
      // Utiliser le moteur audio pour changer de piste
      const targetTrack = audioState.tracks[newIndex];
      if (targetTrack?._id) {
        await playTrack(targetTrack._id);
      } else {
        nextTrack();
        await play();
      }
      
      // Précharger les tracks suivantes
      preloadTracks(newIndex, 3);
      
      if (clearChangeTimerRef.current) clearTimeout(clearChangeTimerRef.current);
      clearChangeTimerRef.current = setTimeout(() => setIsChangingTrack(false), 1000);
    } catch (error) {
      setIsChangingTrack(false);
    }
  }, [audioState.isLoading, currentIndex, totalTracks, isChangingTrack, preloadTracks, play, nextTrack, playTrack, audioState.tracks]);

  const handlePreviousTrack = useCallback(async () => {
    try {
      const now = Date.now();
      if (now - lastNavigationTsRef.current < 200) return;
      lastNavigationTsRef.current = now;
      if (isChangingTrack || totalTracks === 0) return;
      setIsChangingTrack(true);
      const fromHistory = navigationHistoryRef.current.pop();
      const targetIndex = typeof fromHistory === 'number' ? fromHistory : Math.max(0, currentIndex - 1);
      const targetTrack = audioState.tracks[targetIndex];
      if (targetTrack?._id) {
        await playTrack(targetTrack._id);
      } else {
        setCurrentTrackIndex(targetIndex);
        await play();
      }
      
      // Précharger les tracks précédentes
      preloadTracks(targetIndex, 3);
      
      if (clearChangeTimerRef.current) clearTimeout(clearChangeTimerRef.current);
      clearChangeTimerRef.current = setTimeout(() => setIsChangingTrack(false), 1000);
    } catch (error) {
      setIsChangingTrack(false);
    }
  }, [audioState.isLoading, currentIndex, totalTracks, isChangingTrack, preloadTracks, play, setCurrentTrackIndex, playTrack, audioState.tracks]);

  // Gestion du swipe vertical et de la molette
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDrag = useCallback((event: any, info: PanInfo) => {
    if (isDragging) {
      setDragY(info.offset.y);
    }
  }, [isDragging]);

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    setIsDragging(false);
    setDragY(0);
    
    const threshold = 60;
    const velocity = info.velocity.y;
    
    if (Math.abs(velocity) > 500 || Math.abs(info.offset.y) > threshold) {
      if (velocity < 0 || info.offset.y < -threshold) {
        // Swipe vers le haut - track suivant
        setSwipeDirection(1);
        if (!isChangingTrack) handleNextTrack();
      } else if (velocity > 0 || info.offset.y > threshold) {
        // Swipe vers le bas - track précédent
        setSwipeDirection(-1);
        if (!isChangingTrack) handlePreviousTrack();
      }
    }
  }, [isDragging, isChangingTrack, handleNextTrack, handlePreviousTrack]);

  // Tap surface: simple tap => play/pause, double tap => like
  const handleSurfaceTap = useCallback(() => {
    if (isDragging || isChangingTrack) return;
    const now = Date.now();
    if (now - lastTapTs < 300) {
      // Double tap => like
      if (currentTrack?._id) {
        try { (navigator as any)?.vibrate?.(10); } catch {}
        handleLike(currentTrack._id);
        setShowLikeBurst(true);
        setTimeout(() => setShowLikeBurst(false), 450);
      }
    } else {
      togglePlay();
    }
    setLastTapTs(now);
  }, [isDragging, isChangingTrack, lastTapTs, togglePlay, handleLike, currentTrack?._id]);

  // Gestion de la molette de souris
  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY;
    wheelAccumRef.current += delta;
    const threshold = 60;
    if (Math.abs(wheelAccumRef.current) >= threshold) {
      if (wheelAccumRef.current > 0) {
        handleNextTrack();
      } else {
        handlePreviousTrack();
      }
      wheelAccumRef.current = 0;
    }
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = setTimeout(() => { wheelAccumRef.current = 0; }, 150);
  }, [handleNextTrack, handlePreviousTrack]);

  // Gestion des touches clavier
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.code === 'ArrowUp' || event.code === 'ArrowLeft') {
      event.preventDefault();
      handlePreviousTrack();
    } else if (event.code === 'ArrowDown' || event.code === 'ArrowRight') {
      event.preventDefault();
      handleNextTrack();
    } else if (event.code === 'Space') {
      event.preventDefault();
      togglePlay();
    } else if (event.code === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }, [handlePreviousTrack, handleNextTrack, togglePlay, onClose]);

  // Gestion du seek
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

  // Plus de synchronisation locale: on s'appuie uniquement sur l'index global

  // Précharger les tracks au démarrage et lors des changements
  useEffect(() => {
    if (isOpen && totalTracks > 0) {
      // Précharger immédiatement les tracks les plus proches
      preloadTracks(currentIndex, 3);
      
      // Puis précharger plus de tracks en arrière-plan
      setTimeout(() => {
        preloadTracks(currentIndex, 7);
      }, 1000);
    }
  }, [isOpen, currentIndex, totalTracks, preloadTracks]);

  // Précharger les tracks suivantes quand on approche de la fin
  useEffect(() => {
    if (isOpen && currentIndex > 0 && currentIndex % 3 === 0) {
      preloadTracks(currentIndex, 5);
    }
  }, [currentIndex, isOpen, preloadTracks]);

  // Nettoyer le cache des tracks trop éloignées
  useEffect(() => {
    if (preloadedTracks.size > 10) {
      const tracksToKeep = new Set<number>();
      for (let i = Math.max(0, currentIndex - 3); i <= Math.min(totalTracks - 1, currentIndex + 3); i++) {
        if (preloadedTracks.has(i)) {
          tracksToKeep.add(i);
        }
      }
      setPreloadedTracks(tracksToKeep);
    }
  }, [currentIndex, preloadedTracks, totalTracks]);

  // Gestion des événements clavier et molette
  useEffect(() => {
    if (isOpen) {
      // Ajouter les événements
      document.addEventListener('wheel', handleWheel, { passive: false });
      document.addEventListener('keydown', handleKeyDown);
      
      // Empêcher le scroll de la page
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Nettoyer les événements
        document.removeEventListener('wheel', handleWheel);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, handleWheel, handleKeyDown]);

  // Clore l'état de changement sur vrai changement d'index
  useEffect(() => {
    const idx = audioState.currentTrackIndex ?? 0;
    if (idx !== prevIndexRef.current) {
      prevIndexRef.current = idx;
      if (clearChangeTimerRef.current) clearTimeout(clearChangeTimerRef.current);
      setIsChangingTrack(false);
      preloadTracks(idx, 3);
    }
  }, [audioState.currentTrackIndex, preloadTracks]);

  // Si la lecture démarre, on termine la transition
  useEffect(() => {
    if (audioState.isPlaying && isChangingTrack) {
      if (clearChangeTimerRef.current) clearTimeout(clearChangeTimerRef.current);
      setIsChangingTrack(false);
    }
  }, [audioState.isPlaying, isChangingTrack]);

  // Demande de permission pour les notifications
  useEffect(() => {
    if (isOpen && currentTrack && !isNotificationRequested) {
      setIsNotificationRequested(true);
      requestNotificationPermission().then((granted) => {
        if (granted) {
          // Notifications activées
        }
      });
    }
  }, [isOpen, currentTrack, isNotificationRequested, requestNotificationPermission]);

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

  // Effet audio‑réactif: récupérer l'analyser du provider et mesurer le niveau
  useEffect(() => {
    try {
      const analyser = (typeof window !== 'undefined' && (useAudioPlayer() as any)?.getAnalyser)
        ? (useAudioPlayer() as any).getAnalyser()
        : null;
      analyserRef.current = analyser;
      if (analyserRef.current && !levelArrayRef.current) {
        levelArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const tick = () => {
      const analyser = analyserRef.current;
      const arr = levelArrayRef.current;
      if (analyser && arr) {
        analyser.getByteFrequencyData(arr);
        // Calculer un RMS simple / moyenne des basses/médiums
        let sum = 0;
        const sampleCount = Math.min(arr.length, 64);
        for (let i = 0; i < sampleCount; i++) sum += arr[i];
        const avg = sum / sampleCount; // 0..255
        const norm = Math.min(1, avg / 200); // normaliser
        setAudioLevel(norm);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  if (!isOpen || !currentTrack || !currentTrack.title) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Conteneur principal avec swipe */}
          <motion.div
            className="relative h-full w-full"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            style={{
              y: isDragging ? dragY : 0,
            }}
          >
            {/* Fond vidéo/audio avec cover animé et glow audio‑réactif */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              <div className="relative w-full h-full bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                {/* Cover image avec rotation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.img
                    src={currentTrack?.coverUrl || '/default-cover.jpg'}
                    alt={currentTrack?.title || 'Track'}
                    className="w-80 h-80 rounded-full object-cover shadow-2xl"
                    animate={{
                      rotate: audioState.isPlaying ? 360 : 0,
                    }}
                    transition={{
                      duration: 6,
                      repeat: audioState.isPlaying ? Infinity : 0,
                      ease: "linear"
                    }}
                    style={{
                      filter: 'blur(20px)',
                      transform: 'scale(1.2)',
                    }}
                  />
                </div>
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* Glow audio‑réactif (cercle flou) */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(600px 600px at 50% 50%, rgba(236,72,153,${0.25 + audioLevel * 0.35}), transparent 60%)`,
                    filter: 'blur(20px)',
                    opacity: 0.8,
                  }}
                />
              </div>
            </div>

            {/* Contenu principal */}
            <div className="relative z-10 h-full flex flex-col">
              {/* Header avec bouton fermer */}
              <div className="flex justify-between items-center p-4 pt-12">
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-lg flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <X size={24} className="text-white" />
                </button>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                    className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-lg flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    {audioState.isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  
                  {showVolumeSlider && (
                    <div className="absolute top-20 right-4 p-3 bg-black/80 backdrop-blur-lg rounded-lg" ref={volumeSliderRef}>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={audioState.volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-2"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Zone de swipe avec indicateurs */}
              <div className="flex-1 flex items-center justify-center relative overflow-hidden select-none" onClick={handleSurfaceTap}>
                {/* Indicateurs de swipe */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                  <motion.div
                    className="w-1 h-8 bg-white/30 rounded-full"
                    animate={{
                      scaleY: currentIndex > 0 ? 1 : 0.3,
                      opacity: currentIndex > 0 ? 1 : 0.5
                    }}
                  />
                  <motion.div
                    className="w-1 h-8 bg-white/30 rounded-full"
                    animate={{
                      scaleY: currentIndex < totalTracks - 1 ? 1 : 0.3,
                      opacity: currentIndex < totalTracks - 1 ? 1 : 0.5
                    }}
                  />
                </div>

                {/* Instructions supprimées à la demande */}

                {/* Cover principale avec animation type page */}
                <AnimatePresence mode="wait" custom={swipeDirection}>
                  <motion.div
                    key={audioState.currentTrackIndex}
                    className="relative"
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    custom={swipeDirection}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  >
                  <div
                    className="relative w-64 h-64 rounded-full overflow-hidden shadow-2xl will-change-transform"
                    style={{
                      transform: `translateY(${(audioLevel - 0.5) * 6}px)`,
                    }}
                  >
                    <img
                      src={currentTrack?.coverUrl || '/default-cover.jpg'}
                      alt={currentTrack?.title || 'Track'}
                      className="w-full h-full object-cover"
                    />
                    {/* Like burst */}
                    {showLikeBurst && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center animate-[tiktok-pulse_450ms_ease-out]">
                        <Heart size={60} className="text-pink-500 drop-shadow-[0_0_12px_rgba(236,72,153,0.7)]" fill="#ec4899" />
                      </div>
                    )}
                    
                    {/* Overlay avec icône play/pause */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <button
                        onClick={togglePlay}
                        disabled={audioState.isLoading || isChangingTrack}
                        className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center hover:bg-white/30 transition-colors disabled:opacity-50"
                      >
                        {audioState.isLoading || isChangingTrack ? (
                          <Loader2 size={24} className="text-white animate-spin" />
                        ) : audioState.isPlaying ? (
                          <Pause size={24} className="text-white" />
                        ) : (
                          <Play size={24} className="text-white ml-1" />
                        )}
                      </button>
                    </div>

                    {/* Indicateur de changement de track */}
                    {isChangingTrack && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="text-white text-sm font-medium">
                          Changement...
                        </div>
                      </div>
                    )}
                  </div>
                  </motion.div>
                </AnimatePresence>

                {/* Indicateurs de swipe à droite */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                  <motion.div
                    className={`w-1 h-8 rounded-full ${
                      preloadedTracks.has(currentIndex - 1) ? 'bg-green-400' : 'bg-white/30'
                    }`}
                    animate={{
                      scaleY: currentIndex > 0 ? 1 : 0.3,
                      opacity: currentIndex > 0 ? 1 : 0.5
                    }}
                  />
                  <motion.div
                    className={`w-1 h-8 rounded-full ${
                      preloadedTracks.has(currentIndex + 1) ? 'bg-green-400' : 'bg-white/30'
                    }`}
                    animate={{
                      scaleY: currentIndex < totalTracks - 1 ? 1 : 0.3,
                      opacity: currentIndex < totalTracks - 1 ? 1 : 0.5
                    }}
                  />
                </div>
              </div>

              {/* Barre de progression */}
              <div className="px-4 pb-4">
                <div 
                  className="w-full h-1 bg-white/20 rounded-full relative cursor-pointer"
                  onClick={handleSeek}
                >
                  <div 
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full relative transition-all duration-100"
                    style={{ width: `${progressPercentage}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
                  </div>
                </div>
                
                <div className="flex justify-between text-xs text-white/70 mt-2">
                  <span>{formatTime(audioState.currentTime)}</span>
                  <span>{formatTime(audioState.duration)}</span>
                </div>
              </div>

              {/* Informations de la track */}
              <div className="px-4 pb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <img
                      src={currentTrack?.artist?.avatar || '/default-avatar.jpg'}
                      alt={currentTrack?.artist?.name || 'Artist'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm truncate">
                      {currentTrack?.title || 'Titre inconnu'}
                    </h3>
                    <p className="text-white/70 text-xs truncate">
                      {currentTrack?.artist?.name || currentTrack?.artist?.username || 'Artiste inconnu'}
                    </p>
                  </div>
                  <button className="px-3 py-1 text-xs font-medium text-white bg-white/10 backdrop-blur-lg rounded-full hover:bg-white/20 transition-colors">
                    Suivre
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <LikeButton
                      trackId={currentTrack?._id || ''}
                      initialLikesCount={currentTrack?.likes?.length || 0}
                      initialIsLiked={currentTrack?.isLiked || false}
                      size="sm"
                      variant="card"
                      showCount={true}
                      className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
                    />
                    
                    <button
                      onClick={() => setCommentsOpen(true)}
                      className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
                    >
                      <MessageCircle size={16} />
                      <span className="text-xs">Commentaires</span>
                    </button>
                    
                    <button className="flex items-center gap-1 text-white/70 hover:text-white transition-colors">
                      <Share2 size={16} />
                      <span className="text-xs">Partager</span>
                    </button>
                  </div>
                  
                  <button className="text-white/70 hover:text-white transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
              {/* Bottom sheet commentaires */}
              <AnimatePresence>
                {commentsOpen && (
                  <motion.div
                    className="fixed inset-x-0 bottom-0 z-[120] comments-sheet rounded-t-2xl"
                    initial={{ y: 300, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 300, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  >
                    <div className="comments-sheet__header flex items-center justify-between">
                      <span className="comments-sheet__title">Commentaires</span>
                      <button onClick={() => setCommentsOpen(false)} className="comments-sheet__close">
                        <X size={18} />
                      </button>
                    </div>
                    <div className="comments-sheet__body custom-scroll">
                      <div className="comments-empty">Aucun commentaire pour l’instant.</div>
                    </div>
                    <div className="comments-sheet__footer">
                      <div className="flex items-center gap-2">
                        <input placeholder="Écrire un commentaire…" className="comments-input outline-none" />
                        <button className="comments-send text-sm">Envoyer</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
