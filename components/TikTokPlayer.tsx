'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { useTrackLike } from '@/contexts/LikeContext';
import { useTrackPlays } from '@/contexts/PlaysContext';
import LikeButton from './LikeButton';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Heart, X, AlertCircle, Loader2, MessageCircle, Users, Headphones, Share2, MoreVertical, ChevronUp, ChevronDown, Download, Lock } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import toast from 'react-hot-toast';
import FloatingParticles from './FloatingParticles';
import InteractiveCounter from './InteractiveCounter';
import CommentDialog from './CommentDialog';
import CommentButton from './CommentButton';
import AudioQualityIndicator, { AudioQualityTooltip } from './AudioQualityIndicator';
import DownloadButton, { DownloadTooltip } from './DownloadButton';
import DownloadDialog from './DownloadDialog';
import { useDownloadPermission, downloadAudioFile } from '@/hooks/useDownloadPermission';
import FollowButton from './FollowButton';

interface TikTokPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TikTokPlayer({ isOpen, onClose }: TikTokPlayerProps) {
  const { data: session } = useSession();
  const [computedAvatar, setComputedAvatar] = useState<string | null>(null);
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
  // Résoudre avatar si manquant côté piste
  useEffect(() => {
    let cancelled = false;
    async function resolveAvatar() {
      try {
        if (audioState.tracks[audioState.currentTrackIndex]?.artist?.avatar) return;
        const sessImg = ((session?.user as any)?.avatar as string) || (session?.user?.image as string);
        if (sessImg) {
          if (!cancelled) setComputedAvatar(sessImg);
          return;
        }
        const username = (session?.user as any)?.username;
        if (username) {
          const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
          if (res.ok) {
            const json = await res.json();
            const avatar = json?.avatar as string | undefined;
            if (avatar && !cancelled) setComputedAvatar(avatar);
          }
        }
      } catch {}
    }
    resolveAvatar();
    return () => { cancelled = true; };
  }, [session?.user, audioState.currentTrackIndex, audioState.tracks]);
  
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
  const [showLyricsMobile, setShowLyricsMobile] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const { canDownload, upgradeMessage } = useDownloadPermission();
  const [lastTapTs, setLastTapTs] = useState(0);
  const [showLikeBurst, setShowLikeBurst] = useState(false);

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

  // Fermer les menus/slider quand on clique ailleurs + gestion ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volumeSliderRef.current && !volumeSliderRef.current.contains(event.target as Node)) {
        setShowVolumeSlider(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowVolumeSlider(false);
        setShowMoreMenu(false);
      }
    };

    if (showVolumeSlider || showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showVolumeSlider, showMoreMenu]);

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

  // Paroles: parsing LRC + fallback simple
  type TimedLine = { t: number; text: string };
  const parseLRC = useCallback((text: string): TimedLine[] => {
    const lines = text.split(/\r?\n/);
    const result: TimedLine[] = [];
    for (const line of lines) {
      const matches = line.match(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g) || [];
      if (!matches.length) continue;
      const content = line.replace(/\[[^\]]+\]/g, '').trim();
      if (!content) continue;
      for (const tag of matches) {
        const m = tag.match(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/);
        if (!m) continue;
        const min = parseInt(m[1] || '0', 10);
        const sec = parseInt(m[2] || '0', 10);
        const ms = m[3] ? parseInt((m[3] + '00').slice(0, 3), 10) : 0;
        const t = min * 60 + sec + ms / 1000;
        result.push({ t, text: content });
      }
    }
    return result.sort((a, b) => a.t - b.t);
  }, []);

  const rawLyrics = (currentTrack as any)?.lyrics as string | undefined;
  const timedLyrics = useMemo(() => (rawLyrics ? parseLRC(rawLyrics) : []), [rawLyrics, parseLRC]);
  const plainLyrics = useMemo(() => {
    if (!rawLyrics) return [] as string[];
    return rawLyrics.split(/\r?\n+/).map(l => l.trim()).filter(Boolean);
  }, [rawLyrics]);

  const hasTimed = timedLyrics.length > 0;

  const [autoTimes, setAutoTimes] = useState<number[] | null>(null);

  const activeLineIndex = useMemo(() => {
    if (hasTimed) {
      const ct = audioState.currentTime || 0;
      if (timedLyrics.length === 0) return -1;
      // Trouver la dernière ligne dont t <= currentTime (recherche binaire simple)
      let lo = 0, hi = timedLyrics.length - 1, ans = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (timedLyrics[mid].t <= ct) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
      }
      return ans;
    } else {
      if (!plainLyrics.length || !audioState.duration) return -1;
      // Si autoTimes dispo, mapper chaque pic à une ligne
      if (autoTimes && autoTimes.length >= Math.min(plainLyrics.length, 4)) {
        const t = audioState.currentTime || 0;
        let idx = 0;
        while (idx + 1 < autoTimes.length && autoTimes[idx + 1] <= t) idx++;
        // Ajuster à l'échelle du nombre de lignes
        const ratio = idx / Math.max(1, autoTimes.length - 1);
        const mapped = Math.round(ratio * (plainLyrics.length - 1));
        return Math.min(plainLyrics.length - 1, Math.max(0, mapped));
      }
      const secondsPerLine = Math.max(1, audioState.duration / plainLyrics.length);
      const idx = Math.floor((audioState.currentTime || 0) / secondsPerLine);
      return Math.min(plainLyrics.length - 1, Math.max(0, idx));
    }
  }, [hasTimed, timedLyrics, plainLyrics, autoTimes, audioState.currentTime, audioState.duration]);

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (activeLineIndex < 0) return;
    const el = lineRefs.current[activeLineIndex];
    const container = lyricsContainerRef.current;
    if (!el || !container) return;
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {}
  }, [activeLineIndex]);

  // Auto-sync (beta) sans timestamps: détecter les pics d'énergie et mapper aux lignes
  useEffect(() => {
    let cancelled = false;
    async function analyze() {
      try {
        setAutoTimes(null);
        if (hasTimed) return; // inutil
        const url = currentTrack?.audioUrl;
        if (!url || !plainLyrics.length) return;
        const res = await fetch(url, { cache: 'force-cache' }).catch(() => null);
        if (!res || !res.ok) return;
        const arrayBuf = await res.arrayBuffer();
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
        // Extraire mono mixdown
        const ch = audioBuf.numberOfChannels > 0 ? audioBuf.getChannelData(0) : new Float32Array();
        if (ch.length === 0) { ctx.close(); return; }
        const sampleRate = audioBuf.sampleRate;
        // Calculer une enveloppe RMS avec un hop raisonnable
        const hop = Math.floor(sampleRate * 0.05); // 50ms
        const win = Math.floor(sampleRate * 0.2); // 200ms
        const env: number[] = [];
        for (let i = 0; i < ch.length; i += hop) {
          let sum = 0;
          const start = i;
          const end = Math.min(ch.length, i + win);
          for (let j = start; j < end; j++) {
            const s = ch[j];
            sum += s * s;
          }
          const rms = Math.sqrt(sum / Math.max(1, end - start));
          env.push(rms);
        }
        // Lissage simple
        for (let i = 1; i < env.length; i++) env[i] = env[i - 1] * 0.6 + env[i] * 0.4;
        // Détection de pics (seuil relatif et distance mini)
        const maxEnv = env.reduce((m, v) => Math.max(m, v), 0) || 1;
        const threshold = maxEnv * 0.35;
        const minDist = Math.floor((1.5 /*s*/ / 0.05));
        const peaks: number[] = [];
        for (let i = 1; i < env.length - 1; i++) {
          if (env[i] > threshold && env[i] >= env[i - 1] && env[i] >= env[i + 1]) {
            if (peaks.length === 0 || i - peaks[peaks.length - 1] > minDist) {
              peaks.push(i);
            } else if (env[i] > env[peaks[peaks.length - 1]]) {
              peaks[peaks.length - 1] = i; // garder le plus haut
            }
          }
        }
        // Convertir en secondes
        const times = peaks.map(p => p * hop / sampleRate).filter(t => t < audioBuf.duration - 0.2);
        ctx.close();
        if (cancelled) return;
        if (times.length) setAutoTimes(times);
      } catch {}
    }
    analyze();
    return () => { cancelled = true; };
  }, [hasTimed, plainLyrics.length, currentTrack?.audioUrl]);

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
            {/* Fond vidéo/audio avec cover animé */}
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

            {/* Cover principale + Panneau paroles */}
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
                  <div className="relative w-64 h-64 rounded-full overflow-hidden shadow-2xl">
                    {currentTrack?.coverUrl?.includes('res.cloudinary.com') ? (
                      <img
                        src={currentTrack.coverUrl.replace('/upload/', '/upload/f_auto,q_auto/')} 
                        alt={currentTrack?.title || 'Track'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <img
                        src={currentTrack?.coverUrl || '/default-cover.jpg'}
                        alt={currentTrack?.title || 'Track'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    {currentTrack?.coverUrl?.includes('res.cloudinary.com') ? (
                      <img
                        src={currentTrack.coverUrl.replace('/upload/', '/upload/f_auto,q_auto/')} 
                        alt={currentTrack?.title || 'Track'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <img
                        src={currentTrack?.coverUrl || '/default-cover.jpg'}
                        alt={currentTrack?.title || 'Track'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
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

            {/* Paroles synchronisées si disponibles */}
            {(hasTimed ? timedLyrics.length > 0 : plainLyrics.length > 0) && (
              <div className="absolute inset-y-20 right-4 w-[44%] hidden md:block">
                <div className="h-full rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-4 overflow-hidden">
                  <div ref={lyricsContainerRef} className="h-full overflow-y-auto custom-scroll pr-2">
                    {hasTimed
                      ? timedLyrics.map((item, i) => (
                          <div
                            key={`${i}-${item.t}`}
                        ref={(el) => { lineRefs.current[i] = el; }}
                            className={`py-1.5 text-sm transition-colors ${i === activeLineIndex ? 'text-white font-semibold' : 'text-white/60'}`}
                          >
                            {item.text}
                          </div>
                        ))
                      : plainLyrics.map((line, i) => (
                          <div
                            key={i}
                            ref={(el) => { lineRefs.current[i] = el; }}
                            className={`py-1.5 text-sm transition-colors ${i === activeLineIndex ? 'text-white font-semibold' : 'text-white/60'}`}
                          >
                            {line}
                          </div>
                        ))}
                  </div>
                </div>
              </div>
            )}

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
                      src={
                        currentTrack?.artist?.avatar ||
                        computedAvatar ||
                        ((session?.user as any)?.avatar as string) ||
                        (session?.user?.image as string) ||
                        '/default-avatar.jpg'
                      }
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
                  <FollowButton 
                    artistId={currentTrack?.artist?._id}
                    artistUsername={currentTrack?.artist?.username}
                    size="sm"
                  />
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

                  {(hasTimed ? timedLyrics.length > 0 : plainLyrics.length > 0) && (
                    <button
                      onClick={() => setShowLyricsMobile(true)}
                      className="flex items-center gap-1 text-white/70 hover:text-white transition-colors md:hidden"
                      aria-label="Afficher les paroles"
                    >
                      <span className="text-xs">Paroles</span>
                    </button>
                  )}
                  </div>
                  
                  <AudioQualityTooltip>
                    <AudioQualityIndicator size="sm" showUpgrade={true} />
                  </AudioQualityTooltip>
                  
                  <div className="relative" ref={moreMenuRef}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowMoreMenu(v => !v); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="text-white/70 hover:text-white transition-colors"
                      aria-haspopup="menu"
                      aria-expanded={showMoreMenu}
                      aria-label="Plus d'options"
                    >
                      <MoreVertical size={16} />
                    </button>
                    <AnimatePresence>
                      {showMoreMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.15 }}
                          className="fixed right-4 bottom-28 w-56 max-h-[50vh] overflow-auto bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1 z-[200] pointer-events-auto"
                          role="menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={async () => {
                              try {
                                const id = currentTrack?._id || '';
                                const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/track/${id}?autoplay=1` : '';
                                const shareData = {
                                  title: currentTrack?.title || 'Musique',
                                  text: `Écoutez ${currentTrack?.title || 'ma musique'}`,
                                  url: shareUrl
                                } as any;
                                if ((navigator as any).share) {
                                  await (navigator as any).share(shareData);
                                } else if (navigator.clipboard) {
                                  await navigator.clipboard.writeText(shareData.url);
                                  toast.success('Lien copié');
                                }
                              } catch {}
                              setShowMoreMenu(false);
                            }}
                            className="w-full text-left text-white/90 hover:text-white hover:bg-white/10 rounded-lg px-3 py-2 text-sm flex items-center gap-2"
                            role="menuitem"
                          >
                            <Share2 size={16} /> Partager
                          </button>

                          <button
                            onClick={() => {
                              setShowMoreMenu(false);
                              if (!canDownload) {
                                toast.error(upgradeMessage || 'Fonction non disponible pour votre offre');
                                return;
                              }
                              setShowDownloadDialog(true);
                            }}
                            className={`w-full text-left rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${canDownload ? 'text-white/90 hover:text-white hover:bg-white/10' : 'text-white/40 hover:text-white/50 hover:bg-white/5 cursor-not-allowed'}`}
                            role="menuitem"
                          >
                            {canDownload ? <Download size={16} /> : <Lock size={16} />}
                            Télécharger
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
              {/* Bottom sheet commentaires */}
              <AnimatePresence>
                {commentsOpen && (
                  <motion.div
                    className="fixed inset-x-0 bottom-0 z-[120] bg-black/80 backdrop-blur-xl border-t border-white/10 rounded-t-2xl"
                    initial={{ y: 300, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 300, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  >
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-white/80 text-sm">Commentaires</span>
                      <button onClick={() => setCommentsOpen(false)} className="text-white/60 hover:text-white">
                        <X size={18} />
                      </button>
                    </div>
                    <div className="px-4 pb-20 max-h-[40vh] overflow-y-auto custom-scroll">
                      {/* Placeholder liste commentaires (brancher API plus tard) */}
                      <div className="text-white/60 text-sm">Aucun commentaire pour l’instant.</div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-black/60 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <input placeholder="Écrire un commentaire…" className="flex-1 bg-white/10 text-white text-sm rounded-xl px-3 py-2 placeholder-white/50 outline-none" />
                        <button className="px-3 py-2 text-sm rounded-xl bg-white/15 hover:bg-white/25 text-white">Envoyer</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom sheet paroles (mobile) */}
              <AnimatePresence>
                {showLyricsMobile && (
                  <motion.div
                    className="fixed inset-x-0 bottom-0 z-[120] bg-black/85 backdrop-blur-xl border-t border-white/10 rounded-t-2xl md:hidden"
                    initial={{ y: 300, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 300, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    role="dialog"
                    aria-label="Paroles"
                  >
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-white/80 text-sm">Paroles</span>
                      <button onClick={() => setShowLyricsMobile(false)} className="text-white/60 hover:text-white">
                        <X size={18} />
                      </button>
                    </div>
                    <div className="px-4 pb-24 max-h-[50vh] overflow-y-auto custom-scroll">
                      <div className="space-y-1.5">
                        {(hasTimed ? timedLyrics.length > 0 : plainLyrics.length > 0) ? (
                          hasTimed ? (
                            timedLyrics.map((item, i) => (
                              <div
                                key={`${i}-${item.t}`}
                                className={`text-sm ${i === activeLineIndex ? 'text-white font-semibold' : 'text-white/70'}`}
                              >
                                {item.text}
                              </div>
                            ))
                          ) : (
                            plainLyrics.map((line, i) => (
                              <div
                                key={i}
                                className={`text-sm ${i === activeLineIndex ? 'text-white font-semibold' : 'text-white/70'}`}
                              >
                                {line}
                              </div>
                            ))
                          )
                        ) : (
                          <div className="text-white/60 text-sm">Aucune parole disponible.</div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Download Dialog (global, en dehors du menu) */}
              <AnimatePresence>
                {showDownloadDialog && (
                  <DownloadDialog
                    isOpen={showDownloadDialog}
                    onClose={() => setShowDownloadDialog(false)}
                    onConfirm={async () => {
                      try {
                        setIsDownloading(true);
                        setDownloadProgress(0);
                        const filename = `${(currentTrack?.artist?.name || currentTrack?.artist?.username || 'Artiste')}-${(currentTrack?.title || 'Titre')}.wav`.replace(/\s+/g, '_');
                        await downloadAudioFile(currentTrack?.audioUrl || '', filename, (p) => setDownloadProgress(p));
                        toast.success('Téléchargement terminé !');
                      } catch {
                        toast.error('Échec du téléchargement');
                      } finally {
                        setIsDownloading(false);
                        setShowDownloadDialog(false);
                      }
                    }}
                    trackTitle={currentTrack?.title || 'Titre inconnu'}
                    artistName={currentTrack?.artist?.name || currentTrack?.artist?.username || 'Artiste inconnu'}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
