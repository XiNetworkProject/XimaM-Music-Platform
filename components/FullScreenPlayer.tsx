'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAudioPlayer } from '@/app/providers';
import { useTrackLike } from '@/contexts/LikeContext';
import { useTrackPlays } from '@/contexts/PlaysContext';
import LikeButton from './LikeButton';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Heart, X, AlertCircle, Loader2, MessageCircle, Users, Headphones, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import FloatingParticles from './FloatingParticles';
import InteractiveCounter from './InteractiveCounter';
import CommentDialog from './CommentDialog';
import CommentButton from './CommentButton';
import TikTokPlayer from './TikTokPlayer';
import AudioQualityIndicator, { AudioQualityTooltip } from './AudioQualityIndicator';

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
  const [showTikTok, setShowTikTok] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isNotificationRequested, setIsNotificationRequested] = useState(false);

  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const currentTrack = audioState.tracks[audioState.currentTrackIndex] || null;

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

  // Mini-player (toujours visible en bas) - masqué en mode TikTok
  if (!audioState.showPlayer || !currentTrack || !currentTrack.title) {
    return null;
  }

  return (
    <>
      {/* Player TikTok */}
      {showTikTok && (
        <TikTokPlayer
          isOpen={showTikTok}
          onClose={() => setShowTikTok(false)}
        />
      )}

      {/* Mini-player - Suno-like playbar - masqué en mode TikTok */}
      {!showTikTok && (
        <motion.div
          className="glass-player relative w-full"
          style={{ display: showFull ? 'none' : 'flex' }}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          onClick={() => setShowTikTok(true)}
        >
          <FloatingParticles isPlaying={audioState.isPlaying && !audioState.isLoading} />

          <div className="flex flex-1 flex-row content-between items-center p-2 w-full">
            {/* Left: cover */}
            <div className="md:w-8 relative flex items-center">
              <a className="mr-2 h-16 w-10 shrink-0 overflow-clip rounded-md md:h-14" onClick={(e) => { e.stopPropagation(); }} href={currentTrack?._id ? `/song/${currentTrack._id}` : '#'} aria-label={`Playbar: Title for ${currentTrack?.title || 'Track'}`}>
            <img src={(currentTrack?.coverUrl || '/default-cover.jpg').replace('/upload/','/upload/f_auto,q_auto/')} alt={`Cover image for ${currentTrack?.title || 'Track'}`} className="h-full w-full object-cover" loading="lazy" decoding="async" />
              </a>
            </div>

            {/* Middle: title/artist (mobile au-dessus des boutons) */}
            <div className="flex flex-col flex-1 min-w-0 pr-2">
              {/* Title marquee */}
              <div className="relative flex w-fit cursor-pointer overflow-x-hidden text-sm font-medium hover:underline" onClick={(e)=>{e.stopPropagation();}}>
                <div className="animate-marquee md:animate-none">
                  <a className="mr-24 whitespace-nowrap" href={currentTrack?._id ? `/song/${currentTrack._id}` : '#'} aria-label={`Playbar: Title for ${currentTrack?.title || 'Track'}`}>{currentTrack?.title || 'Titre inconnu'}</a>
                </div>
                <div className="absolute top-0 animate-marquee2 md:animate-none">
                  <a className="mr-24 whitespace-nowrap md:hidden" href={currentTrack?._id ? `/song/${currentTrack._id}` : '#'} aria-label={`Playbar: Title for ${currentTrack?.title || 'Track'}`}>{currentTrack?.title || 'Titre inconnu'}</a>
                </div>
                <div className="absolute right-0 h-full w-full bg-gradient-to-r from-transparent to-black/20 md:hidden"></div>
              </div>
              <span className="flex flex-col text-sm font-medium md:flex-row">
                <a className="relative w-full flex md:w-fit hover:underline" onClick={(e)=>e.stopPropagation()} href={currentTrack?.artist?.username ? `/@${currentTrack.artist.username}` : '#'} aria-label={`Playbar: Artist for ${currentTrack?.title || 'Track'}`}>
                  <span className="line-clamp-1 w-full lg:max-w-[220px] md:max-w-[180px]">{currentTrack?.artist?.name || currentTrack?.artist?.username || 'Artiste inconnu'}</span>
                </a>
                <div className="hidden md:block ml-2">
                  <AudioQualityTooltip>
                    <AudioQualityIndicator size="sm" />
                  </AudioQualityTooltip>
                </div>
              </span>
            </div>

            {/* Mobile controls (always visible on mobile) */}
            <div className="flex items-center gap-1 md:hidden ml-2" onClick={(e)=>e.stopPropagation()}>
              <button onClick={handlePreviousTrack} disabled={audioState.isLoading} className="p-2 rounded-full text-white/80 hover:bg-white/10 disabled:opacity-50" aria-label="Previous">
                <SkipBack size={18} />
              </button>
              <button onClick={togglePlay} disabled={audioState.isLoading} className="p-2 rounded-full bg-[var(--color-primary)]/85 hover:bg-[var(--color-primary)] text-white disabled:opacity-50" aria-label={audioState.isPlaying? 'Pause':'Play'}>
                {audioState.isPlaying ? <Pause size={18}/> : <Play size={18}/>}
              </button>
              <button onClick={handleNextTrack} disabled={audioState.isLoading} className="p-2 rounded-full text-white/80 hover:bg-white/10 disabled:opacity-50" aria-label="Next">
                <SkipForward size={18} />
              </button>
            </div>
        
            {/* Center controls (md and up) */}
            <div className="hidden flex-1 flex-row items-center justify-center gap-1 w-8 md:flex" onClick={(e)=>e.stopPropagation()}>
              <button onClick={toggleShuffle} className="p-2 rounded-full text-white/60 hover:bg-white/10" aria-label="Shuffle"><Shuffle size={16} /></button>
              <button onClick={handlePreviousTrack} disabled={audioState.isLoading} className="p-2 rounded-full text-white hover:bg-white/10 disabled:opacity-50" aria-label="Previous"><SkipBack size={20} /></button>
              <button onClick={togglePlay} disabled={audioState.isLoading} className="p-2 rounded-full text-white hover:bg-white/10 disabled:opacity-50" aria-label={audioState.isPlaying? 'Pause':'Play'}>{audioState.isPlaying? <Pause size={24}/> : <Play size={24}/>}</button>
              <button onClick={handleNextTrack} disabled={audioState.isLoading} className="p-2 rounded-full text-white hover:bg-white/10 disabled:opacity-50" aria-label="Next"><SkipForward size={20} /></button>
              <button onClick={cycleRepeat} className="p-2 rounded-full text-white/60 hover:bg-white/10" aria-label="Repeat"><Repeat size={16} /></button>
          </div>

            {/* Right: volume + duration + hide button (md), minimal on mobile */}
            <div className="items-left justify-right flex w-fit flex-row-reverse gap-2 md:flex-1" onClick={(e)=>e.stopPropagation()}>
              {/* Hide button */}
              <button 
                onClick={() => setShowPlayer(false)} 
                className="p-2 text-white/70 hover:bg-white/10 rounded-full" 
                aria-label="Masquer le player"
              >
                <ChevronDown size={18} />
              </button>
              {/* Duration */}
              <span className="flex md:flex items-center whitespace-nowrap text-white/70 text-[11px] md:text-[12px]">
                <span className="w-12 text-right">{formatTime(audioState.currentTime)}</span>
                <span className="w-3 text-center">/</span>
                <span className="w-12">{formatTime(audioState.duration)}</span>
              </span>
              {/* Volume */}
              <div className="relative hidden md:block" ref={volumeSliderRef}>
                <button className="p-2 text-white/70 hover:bg-white/10 rounded-full" onClick={()=>setShowVolumeSlider(!showVolumeSlider)} aria-label="Volume">
                  {audioState.isMuted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
                </button>
                {showVolumeSlider && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3">
                    <div className="volume-popover">
                      <div className="volume-vertical-wrapper">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={audioState.volume}
                          onChange={handleVolumeChange}
                          className="volume-slider-vertical"
                        />
                        <div className="volume-tooltip">{Math.round((audioState.volume || 0) * 100)}%</div>
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-2">
                        <button className="volume-chip" onClick={() => setVolume(0)}>0%</button>
                        <button className="volume-chip" onClick={() => setVolume(0.5)}>50%</button>
                        <button className="volume-chip" onClick={() => setVolume(1)}>100%</button>
                      </div>
                      <div className="popover-arrow" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        
        {/* Mini progress bar: plus longue et plus fine */}
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-1 w-[92%] md:w-[94%]">
          <div className="h-[2px] md:h-[3px] bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-primary)] to-pink-400 rounded-full transition-[width] duration-150 ease-linear"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </motion.div>
      )}


      {/* Player plein écran (modal/dialog) */}
      <AnimatePresence>
        {showFull && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--surface)]/80 backdrop-blur-lg"
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
                  src={currentTrack?.coverUrl || '/default-cover.jpg'} 
                  alt={currentTrack?.title || 'Track'} 
                  className="w-40 h-40 md:w-56 md:h-56 rounded-2xl object-cover shadow-2xl cover-float-animation border border-[var(--border)]" 
                  loading="lazy"
                />
                <button
                  className="absolute w-10 h-10 rounded-full bg-[var(--surface-2)]/80 flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors border border-[var(--border)]"
                  style={{
                    top: '-20px',
                    right: '20px'
                  }}
                  onClick={() => setShowFull(false)}
                >
                  <X size={22} className="text-white" />
                </button>
                {/* Bouton TikTok */}
                <button
                  className="absolute w-10 h-10 rounded-full bg-[var(--surface-2)]/80 flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors border border-[var(--border)]"
                  style={{
                    top: '-20px',
                    left: '20px'
                  }}
                  onClick={() => {
                    setShowFull(false);
                    setShowTikTok(true);
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </button>
                
                {/* Bouton minimiser */}
                <button
                  className="absolute w-10 h-10 rounded-full bg-[var(--surface-2)]/80 flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors border border-[var(--border)]"
                  style={{
                    top: '-20px',
                    left: '60px'
                  }}
                  onClick={() => setShowPlayer(false)}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-chevron-down text-white"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
              </div>
              
              {/* Centre : titre, artiste, animation d'onde/barre + statistiques */}
              <div className="flex flex-col items-center flex-1 justify-center">
                <span className="text-2xl md:text-3xl font-bold text-white mb-2 truncate max-w-[90vw] text-center title-suno">{currentTrack?.title || 'Titre inconnu'}</span>
                <span className="text-lg text-gray-300 mb-2 text-center">{currentTrack?.artist?.name || currentTrack?.artist?.username || 'Artiste inconnu'}</span>
                
                {/* Statistiques de la piste */}
                <div className="flex items-center space-x-6 mb-4 text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Headphones size={16} />
                    <span>{currentTrack?.plays || 0}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Heart size={16} />
                    <span>{currentTrack?.likes?.length || 0}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle size={16} />
                    <span>{currentTrack?.comments?.length || 0}</span>
                  </div>
                  <AudioQualityTooltip>
                    <AudioQualityIndicator size="sm" showUpgrade={true} />
                  </AudioQualityTooltip>
                </div>
                
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
                {/* Barre de progression améliorée (plus longue et plus fine) */}
                <div className="mb-4 mx-[-8px] md:mx-[-12px]">
                  <div 
                    className="w-full h-[4px] md:h-[6px] bg-white/10 rounded-full relative cursor-pointer border border-[var(--border)]"
                    onClick={handleSeek}
                  >
                    <div 
                      className="h-[4px] md:h-[6px] bg-gradient-to-r from-[var(--color-primary)] to-pink-400 rounded-full relative transition-all duration-100"
                      style={{ width: `${progressPercentage}%` }}
                    >
                      <div className="progress-shimmer absolute inset-0 rounded-full"></div>
                    </div>
                    {/* Mobile knob (12px) */}
                    <div 
                      className="absolute md:hidden top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg cursor-pointer transition-all duration-100 border border-[var(--border)]"
                      style={{ left: `calc(${progressPercentage}% - 6px)` }}
                    />
                    {/* Desktop knob (16px) */}
                    <div 
                      className="absolute hidden md:block top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg cursor-pointer transition-all duration-100 border border-[var(--border)]"
                      style={{ left: `calc(${progressPercentage}% - 8px)` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1 px-2 md:px-3">
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
                    className="p-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-suno" 
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
                    className={`p-2 hover:bg-white/10 rounded-full transition-colors ${audioState.shuffle ? 'text-[var(--color-accent)]' : 'text-white/60'}`} 
                    onClick={toggleShuffle}
                  >
                    <Shuffle size={22} />
                  </button>
                  <button 
                    className={`p-2 hover:bg-white/10 rounded-full transition-colors ${audioState.repeat !== 'none' ? 'text-[var(--color-accent)]' : 'text-white/60'}`} 
                    onClick={cycleRepeat}
                  >
                    <Repeat size={22} />
                  </button>
                  <LikeButton
                    trackId={currentTrack?._id || ''}
                    initialLikesCount={currentTrack?.likes?.length || 0}
                    initialIsLiked={currentTrack?.isLiked || false}
                    size="sm"
                    variant="card"
                    showCount={false}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  />
                  <CommentButton
                    trackId={currentTrack?._id || ''}
                    trackTitle={currentTrack?.title || 'Titre inconnu'}
                    trackArtist={currentTrack?.artist?.name || currentTrack?.artist?.username || 'Artiste inconnu'}
                    commentCount={currentTrack?.comments?.length || 0}
                    variant="minimal"
                    size="sm"
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  />
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
                          className="volume-slider w-32"
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