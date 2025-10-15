'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { useLikeContext } from '@/contexts/LikeContext';
import { useLikeSystem } from '@/hooks/useLikeSystem';
import { useTrackPlays } from '@/contexts/PlaysContext';
import LikeButton from './LikeButton';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Heart, X, AlertCircle, Loader2, MessageCircle, Users, Headphones, Share2, MoreVertical, ChevronUp, ChevronDown, Download, Lock, Disc3, ListMusic } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
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
import { sendTrackEvents } from '@/lib/analyticsClient';
import { getCdnUrl } from '@/lib/cdn';

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
    setTracks,
    setQueueAndPlay,
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
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isNotificationRequested, setIsNotificationRequested] = useState(false);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [albumPlaylist, setAlbumPlaylist] = useState<any | null>(null);
  const [wheelDelta, setWheelDelta] = useState(0);
  const [isChangingTrack, setIsChangingTrack] = useState(false);
  const [boostMultiplier, setBoostMultiplier] = useState<number | null>(null);
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
  const { updateLike } = useLikeContext();

  const currentTrack = audioState.tracks[currentIndex] || null;
  const openAlbumPanel = useCallback(async (e?: React.MouseEvent<HTMLButtonElement>) => {
    try {
      e?.stopPropagation?.();
      const albumName = (currentTrack as any)?.album as string | undefined;
      if (!albumName || !currentTrack?.artist?._id) return;
      setAlbumOpen(true);
      setAlbumLoading(true);
      setAlbumPlaylist(null);
      const res = await fetch(`/api/playlists?user=${encodeURIComponent(currentTrack.artist._id)}`, { cache: 'no-store' });
      if (!res.ok) { setAlbumLoading(false); return; }
      const json = await res.json();
      const name = String(albumName || '').toLowerCase();
      const pl = Array.isArray(json?.playlists) ? json.playlists.find((p: any) => String(p.name || '').toLowerCase() === name) : null;
      setAlbumPlaylist(pl || null);
    } catch {
      setAlbumPlaylist(null);
    } finally {
      setAlbumLoading(false);
    }
  }, [currentTrack?.artist?._id, currentTrack]);

  const playAlbumAll = useCallback(async () => {
    try {
      if (!albumPlaylist?.tracks || albumPlaylist.tracks.length === 0) return;
      const list = albumPlaylist.tracks;
      setTracks(list);
      setCurrentTrackIndex(0);
      setQueueAndPlay(list, 0);
      await play();
      setAlbumOpen(false);
    } catch {}
  }, [albumPlaylist, setTracks, setCurrentTrackIndex, setQueueAndPlay, play]);


  const { isLiked: likeIsLiked, likesCount: likeCount, toggleLike, checkLikeStatus } = useLikeSystem({
    trackId: currentTrack?._id || '',
    initialLikesCount: currentTrack?.likes?.length || 0,
    initialIsLiked: currentTrack?.isLiked || false,
  });
  const handleLikeClick = useCallback(() => {
    if (!currentTrack?._id) return;
    toggleLike();
  }, [currentTrack?._id, toggleLike]);
  useEffect(() => { if (currentTrack?._id) checkLikeStatus(); }, [currentTrack?._id, checkLikeStatus]);

  // Parallax basé sur le drag (motion value, sans re-render)
  const containerY = useMotionValue(0);
  const parallaxY = useTransform(containerY, [-120, 0, 120], [12, 0, -12]);

  // Cache de covers déjà préchargées
  const imageCacheRef = useRef<Set<string>>(new Set());
 
   const getCoverUrl = useCallback((t: any | null): string => {
     const raw = t?.coverUrl || '/default-cover.jpg';
     return raw && typeof raw === 'string' && raw.includes('res.cloudinary.com')
       ? raw.replace('/upload/', '/upload/f_auto,q_auto/')
       : raw;
   }, []);
 
   const preloadImage = useCallback(async (src: string) => {
     if (!src || imageCacheRef.current.has(src)) return;
     imageCacheRef.current.add(src);
     try {
       const img = new Image();
       img.src = src;
       if ((img as any).decode) {
         await (img as any).decode().catch(() => {});
       } else {
         await new Promise<void>((resolve) => {
           img.onload = () => resolve();
           img.onerror = () => resolve();
         });
       }
     } catch {}
   }, []);
 
  // Gradient dynamique basé sur la cover
  const [bgGrad, setBgGrad] = useState<string>('linear-gradient(135deg, rgba(36,26,74,0.6) 0%, rgba(59,11,55,0.6) 100%)');
  const [prevBgGrad, setPrevBgGrad] = useState<string | null>(null);

  const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max - min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  };

  const hslString = (h: number, s: number, l: number, a = 0.65) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

  const stringToHue = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash) % 360;
  };

  const defaultGradientFrom = (seed: string) => {
    const h = stringToHue(seed || 'synaura');
    const c1 = hslString(h, 70, 30, 0.65);
    const c2 = hslString((h + 25) % 360, 70, 20, 0.65);
    return `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
  };

  const computeGradientFromCover = useCallback(async (url: string, seed: string): Promise<string> => {
    try {
      if (!url) return defaultGradientFrom(seed);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.src = url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('img-error'));
      });
      const canvas = document.createElement('canvas');
      const size = 24;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return defaultGradientFrom(seed);
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha < 16) continue;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
      }
      if (count === 0) return defaultGradientFrom(seed);
      r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
      const [h, s, l] = rgbToHsl(r, g, b);
      const c1 = hslString(h, Math.min(80, s + 10), Math.min(60, l + 10), 0.65);
      const c2 = hslString((h + 20) % 360, s, Math.max(15, l - 15), 0.65);
      return `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
    } catch {
      return defaultGradientFrom(seed);
    }
  }, []);

  const prevTrack = useMemo(() => (currentIndex > 0 ? audioState.tracks[currentIndex - 1] : null), [audioState.tracks, currentIndex]);
  const nextTrackMemo = useMemo(() => (currentIndex + 1 < audioState.tracks.length ? audioState.tracks[currentIndex + 1] : null), [audioState.tracks, currentIndex]);

    // Préchargement ciblé des covers adjacentes
    useEffect(() => {
      const urls = [getCoverUrl(prevTrack), getCoverUrl(nextTrackMemo)].filter(Boolean).map(u => getCdnUrl(u)!) as string[];
      urls.forEach((u) => preloadImage(u));
    }, [prevTrack, nextTrackMemo, getCoverUrl, preloadImage]);

  // Variants d'animation de page
  const pageVariants = useMemo(() => ({
    initial: (dir: 1 | -1) => ({ y: dir * 40, opacity: 0 }),
    animate: { y: 0, opacity: 1 },
    exit: (dir: 1 | -1) => ({ y: -dir * 40, opacity: 0 })
  }), []);

  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const totalTracks = audioState.tracks.length;

  // Mettre à jour le gradient quand la piste change
  useEffect(() => {
    let cancelled = false;
    const rawUrl = getCoverUrl(currentTrack);
    const url = getCdnUrl(rawUrl) || rawUrl;
    const seed = `${currentTrack?.title || ''}-${currentTrack?.artist?.name || currentTrack?.artist?.username || ''}`;
    (async () => {
      const next = await computeGradientFromCover(url, seed);
      if (!cancelled) {
        setPrevBgGrad(bgGrad);
        setBgGrad(next);
      }
    })();
    return () => { cancelled = true; };
  }, [currentTrack?._id, currentTrack?.title, currentTrack?.artist?._id, getCoverUrl, computeGradientFromCover]);

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
    for (let i = Math.max(0, startIndex); i <= Math.min(totalTracks - 1, startIndex + Math.max(1, count - 1)); i++) {
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
        const audio = new Audio(getCdnUrl(track.audioUrl) || track.audioUrl);
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
          }, 2000);
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
        // Événement play_start
        if (currentTrack?._id) {
          sendTrackEvents(currentTrack._id, {
            event_type: 'play_start',
            position_ms: Math.round((audioState.currentTime || 0) * 1000),
            duration_ms: Math.round((audioState.duration || 0) * 1000),
            is_ai_track: String(currentTrack._id || '').startsWith('ai-'),
            source: 'tiktok-player',
          });
        }
      }
    } catch (error) {
      // Erreur silencieuse
    }
  }, [audioState.isPlaying, audioState.isLoading, play, pause, currentTrack?._id, audioState.currentTime, audioState.duration]);

  // Gestion du changement de piste avec préchargement
  const handleNextTrack = useCallback(async () => {
    try {
      const now = Date.now();
      if (now - lastNavigationTsRef.current < 140) return;
      lastNavigationTsRef.current = now;
      if (isChangingTrack || totalTracks === 0) return;
      setIsChangingTrack(true);
      const newIndex = Math.min(totalTracks - 1, currentIndex + 1);
      if (newIndex === currentIndex) return;
      navigationHistoryRef.current.push(currentIndex);
      // Utiliser le moteur audio pour changer de piste
      const targetTrack = audioState.tracks[newIndex];
      if (targetTrack?._id) {
        // Skip + Next events
        if (currentTrack?._id) {
          sendTrackEvents(currentTrack._id, { event_type: 'skip', source: 'tiktok-player' });
          sendTrackEvents(currentTrack._id, { event_type: 'next', source: 'tiktok-player' });
        }
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
  }, [audioState.isLoading, currentIndex, totalTracks, isChangingTrack, preloadTracks, play, nextTrack, playTrack, audioState.tracks, currentTrack?._id]);

  const handlePreviousTrack = useCallback(async () => {
    try {
      const now = Date.now();
      if (now - lastNavigationTsRef.current < 140) return;
      lastNavigationTsRef.current = now;
      if (isChangingTrack || totalTracks === 0) return;
      setIsChangingTrack(true);
      const fromHistory = navigationHistoryRef.current.pop();
      const targetIndex = typeof fromHistory === 'number' ? fromHistory : Math.max(0, currentIndex - 1);
      const targetTrack = audioState.tracks[targetIndex];
      if (targetTrack?._id) {
        // Prev event
        if (currentTrack?._id) {
          sendTrackEvents(currentTrack._id, { event_type: 'prev', source: 'tiktok-player' });
        }
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
  }, [audioState.isLoading, currentIndex, totalTracks, isChangingTrack, preloadTracks, play, setCurrentTrackIndex, playTrack, audioState.tracks, currentTrack?._id]);

  // Charger le boost actif pour la piste courante
  useEffect(() => {
    let cancelled = false;
    async function fetchBoost() {
      try {
        if (!currentTrack?._id) {
          setBoostMultiplier(null);
          return;
        }
        // Seules les pistes normales sont boostées pour l'instant
        const id = String(currentTrack._id);
        if (id.startsWith('ai-')) {
          setBoostMultiplier(null);
          return;
        }
        const res = await fetch(`/api/boosters/active?trackIds=${encodeURIComponent(id)}`, { cache: 'no-store' }).catch(() => null);
        if (!res || !res.ok) {
          setBoostMultiplier(null);
          return;
        }
        const json = await res.json();
        const found = Array.isArray(json?.boosts) ? json.boosts.find((b: any) => b.track_id === id) : null;
        if (!cancelled) setBoostMultiplier(found ? Number(found.multiplier) || 1 : null);
      } catch {
        if (!cancelled) setBoostMultiplier(null);
      }
    }
    fetchBoost();
    return () => { cancelled = true; };
  }, [currentTrack?._id]);

  // Gestion du swipe vertical et de la molette
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDrag = useCallback((_event: any, _info: any) => {
    // no-op pour éviter les re-renders pendant le drag
  }, []);

  const handleDragEnd = useCallback((event: any, info: any) => {
    setIsDragging(false);
    
    const threshold = 40;
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
        handleLikeClick();
        setShowLikeBurst(true);
        setTimeout(() => setShowLikeBurst(false), 450);
      }
    } else {
      togglePlay();
    }
    setLastTapTs(now);
  }, [isDragging, isChangingTrack, lastTapTs, togglePlay, handleLikeClick, currentTrack?._id]);

  const shareCurrent = useCallback(async () => {
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
      if (id) {
        sendTrackEvents(id, { event_type: 'share', source: 'tiktok-player' });
      }
    } catch {}
  }, [currentTrack?._id, currentTrack?.title]);

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

  // Effets cover: tilt léger + halo/anneau
  const coverRef = useRef<HTMLDivElement>(null);
  const tiltRafRef = useRef<number | null>(null);
  const handleCoverMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = coverRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;   // 0..1
    const ny = (e.clientY - rect.top) / rect.height;   // 0..1
    const rx = (0.5 - ny) * 6; // max 6deg
    const ry = (nx - 0.5) * 6;
    if (tiltRafRef.current) cancelAnimationFrame(tiltRafRef.current);
    tiltRafRef.current = requestAnimationFrame(() => {
      el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
  }, []);
  const handleCoverMouseLeave = useCallback(() => {
    const el = coverRef.current;
    if (!el) return;
    el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
  }, []);

  // Scrubbing (drag sur la barre de progression)
  const progressRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPct, setScrubPct] = useState<number | null>(null);
  const [scrubTime, setScrubTime] = useState<number>(0);
  const scrubRafRef = useRef<number | null>(null);

  const computeScrubFromClientX = useCallback((clientX: number) => {
    const el = progressRef.current;
    if (!el || !audioState.duration) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const t = pct * audioState.duration;
    // raf pour limiter le re-render
    if (scrubRafRef.current) cancelAnimationFrame(scrubRafRef.current);
    scrubRafRef.current = requestAnimationFrame(() => {
      setScrubPct(pct);
      setScrubTime(t);
    });
  }, [audioState.duration]);

  const onScrubStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!audioState.duration) return;
    setIsScrubbing(true);
    if ('touches' in e && e.touches[0]) {
      computeScrubFromClientX(e.touches[0].clientX);
    } else if ('clientX' in e) {
      computeScrubFromClientX((e as React.MouseEvent<HTMLDivElement>).clientX);
    }
  }, [audioState.duration, computeScrubFromClientX]);

  const onScrubMove = useCallback((ev: MouseEvent | TouchEvent) => {
    if (!isScrubbing) return;
    if ('touches' in ev && (ev as TouchEvent).touches[0]) {
      computeScrubFromClientX((ev as TouchEvent).touches[0].clientX);
    } else if ('clientX' in ev) {
      computeScrubFromClientX((ev as MouseEvent).clientX);
    }
  }, [isScrubbing, computeScrubFromClientX]);

  const onScrubEnd = useCallback(() => {
    if (!isScrubbing || scrubPct == null || !audioState.duration) { setIsScrubbing(false); return; }
    const newTime = scrubPct * audioState.duration;
    seek(newTime);
    setIsScrubbing(false);
    setScrubPct(null);
  }, [isScrubbing, scrubPct, audioState.duration, seek]);

  // Attacher/détacher les listeners globaux pendant le scrubbing
  useEffect(() => {
    if (!isScrubbing) return;
    const move = (e: MouseEvent | TouchEvent) => onScrubMove(e);
    const up = () => onScrubEnd();
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move as any);
      window.removeEventListener('touchend', up);
    };
  }, [isScrubbing, onScrubMove, onScrubEnd]);

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
      preloadTracks(currentIndex, 2);
      
      // Puis précharger plus de tracks en arrière-plan
      setTimeout(() => {
        preloadTracks(currentIndex, 3);
      }, 1000);
    }
  }, [isOpen, currentIndex, totalTracks, preloadTracks]);

  // Précharger les tracks suivantes quand on approche de la fin
  useEffect(() => {
    if (isOpen && currentIndex > 0 && currentIndex % 4 === 0) {
      preloadTracks(currentIndex, 3);
    }
  }, [currentIndex, isOpen, preloadTracks]);

  // Nettoyer le cache des tracks trop éloignées
  useEffect(() => {
    if (preloadedTracks.size > 8) {
      const tracksToKeep = new Set<number>();
      for (let i = Math.max(0, currentIndex - 2); i <= Math.min(totalTracks - 1, currentIndex + 2); i++) {
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

  // Émettre des milestones de progression (25/50/75) et complete
  const lastMilestoneRef = useRef<number>(0);
  useEffect(() => {
    if (!currentTrack?._id || !audioState.duration || audioState.duration <= 0) return;
    const pct = progressPercentage;
    const id = currentTrack._id;
    const milestones = [25, 50, 75];
    for (const m of milestones) {
      if (pct >= m && lastMilestoneRef.current < m) {
        lastMilestoneRef.current = m;
      sendTrackEvents(id, {
          event_type: 'play_progress',
          progress_pct: m,
          position_ms: Math.round((audioState.currentTime || 0) * 1000),
          duration_ms: Math.round((audioState.duration || 0) * 1000),
        is_ai_track: String(id).startsWith('ai-'),
        source: 'tiktok-player',
        });
      }
    }
    if (pct >= 98 && lastMilestoneRef.current < 100) {
      lastMilestoneRef.current = 100;
      sendTrackEvents(id, {
        event_type: 'play_complete',
        position_ms: Math.round((audioState.currentTime || 0) * 1000),
        duration_ms: Math.round((audioState.duration || 0) * 1000),
        is_ai_track: String(id).startsWith('ai-'),
        source: 'tiktok-player',
      });
    }
  }, [progressPercentage, currentTrack?._id, audioState.currentTime, audioState.duration]);

  // Réinitialiser les jalons quand la piste change
  useEffect(() => {
    lastMilestoneRef.current = 0;
  }, [currentTrack?._id]);

  // Événement de vue (impression) lors du changement de piste ou ouverture
  const lastViewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen || !currentTrack?._id) return;
    if (lastViewedRef.current === currentTrack._id) return;
    lastViewedRef.current = currentTrack._id;
    sendTrackEvents(currentTrack._id, {
      event_type: 'view',
      source: 'tiktok-player',
      is_ai_track: String(currentTrack._id).startsWith('ai-')
    });
  }, [isOpen, currentTrack?._id]);

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
        const rawUrl = currentTrack?.audioUrl;
        const url = getCdnUrl(rawUrl) || rawUrl;
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
    <>
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
            style={{ y: containerY }}
          >
            {/* Fond dynamique avec gradient animé */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              {/* Gradient animé basé sur la cover */}
              {prevBgGrad && (
                <motion.div 
                  className="absolute inset-0" 
                  initial={{ opacity: 1 }} 
                  animate={{ opacity: 0 }} 
                  transition={{ duration: 0.5 }} 
                  style={{ background: prevBgGrad }} 
                />
              )}
              <motion.div 
                className="absolute inset-0" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ duration: 0.5 }} 
                style={{ background: bgGrad }} 
              />
              
              {/* Overlay sombre pour contraste */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
              
              {/* Effet de particules/grain subtil */}
              <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]" />
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

              <div className="pointer-events-auto">
                <div className="absolute top-4 left-4 z-[105]" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                  <AudioQualityTooltip>
                    <AudioQualityIndicator size="sm" showUpgrade={true} />
                  </AudioQualityTooltip>
                </div>
              </div>
 
              {/* Zone de swipe avec indicateurs */}
              <div className="flex-1 flex items-center justify-center relative overflow-hidden select-none" onClick={handleSurfaceTap}>
                {/* Pré-rendu GPU des slides adjacentes (invisibles) */}
                <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
                  {prevTrack && (
                    <img
                      src={getCdnUrl(getCoverUrl(prevTrack)) || ''}
                      alt=""
                      className="w-0 h-0 opacity-0 will-change-transform translate-z-0"
                      loading="eager"
                      decoding="async"
                    />
                  )}
                  {nextTrackMemo && (
                    <img
                      src={getCdnUrl(getCoverUrl(nextTrackMemo)) || ''}
                      alt=""
                      className="w-0 h-0 opacity-0 will-change-transform translate-z-0"
                      loading="eager"
                      decoding="async"
                    />
                  )}
                </div>

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
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                  <div 
                    ref={coverRef}
                    className="relative w-64 h-64 rounded-full overflow-hidden shadow-2xl will-change-transform transition-transform duration-150"
                    onMouseMove={handleCoverMouseMove}
                    onMouseLeave={handleCoverMouseLeave}
                  >
                    {/* halo pulsé */}
                    <div className="absolute -inset-6 rounded-full opacity-40 blur-2xl pointer-events-none"
                         style={{
                           background: 'radial-gradient(40% 40% at 50% 50%, rgba(168,85,247,0.6), rgba(236,72,153,0.35), transparent)'
                         }}
                    />
                    {/* anneau dégradé rotatif discret */}
                    <div className="absolute -inset-3 rounded-full border-2 pointer-events-none"
                         style={{
                           borderImage: 'conic-gradient(from 0deg, rgba(168,85,247,0.4), rgba(236,72,153,0.4), rgba(168,85,247,0.4)) 1',
                           animation: audioState.isPlaying ? 'spin-slow 9s linear infinite' : 'none'
                         }}
                    />
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
                    
                     {/* Reflet "sheen" au changement de piste */}
                     <div className="pointer-events-none absolute inset-0 overflow-hidden">
                       <motion.div
                         key={`sheen-${currentTrack?._id}-${isChangingTrack}`}
                         initial={{ x: '-120%', opacity: 0 }}
                         animate={{ x: '140%', opacity: 0.7 }}
                         transition={{ duration: 0.9, ease: 'easeOut' }}
                         className="h-full w-1/3 rotate-12"
                         style={{
                           background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)'
                         }}
                       />
                     </div>

                     {/* Overlay avec icône play/pause */}
                     <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <button
                        onClick={togglePlay}
                        disabled={audioState.isLoading || isChangingTrack}
                        className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center hover:bg-white/30 transition-colors disabled:opacity-50 shadow-[0_0_0_0_rgba(255,255,255,0.0)] hover:shadow-[0_0_32px_4px_rgba(255,255,255,0.15)]"
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
                    {boostMultiplier && boostMultiplier > 1 && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow">
                          Boost x{boostMultiplier.toFixed(2)}
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

                {/* Rail d'actions (droite) */}
                <div className="absolute right-3 sm:right-4 bottom-24 sm:bottom-28 flex flex-col items-center gap-4 pointer-events-auto">
                  <motion.button whileTap={{ scale: 0.9 }} onMouseDown={(e: React.MouseEvent) => e.stopPropagation()} onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleLikeClick(); }} className="flex flex-col items-center text-white/90 hover:text-white">
                     <Heart size={24} className={likeIsLiked ? 'text-white fill-white' : ''} />
                     <span className="text-[11px] leading-none mt-1" aria-label="Nombre de likes">{likeCount}</span>
                   </motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} onMouseDown={(e: React.MouseEvent) => e.stopPropagation()} onClick={(e: React.MouseEvent) => { e.stopPropagation(); setCommentsOpen(true); }} className="flex flex-col items-center text-white/90 hover:text-white">
                    <MessageCircle size={24} />
                    <span className="text-[11px] leading-none mt-1" aria-label="Nombre de commentaires">{(currentTrack?.comments?.length || 0)}</span>
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} onMouseDown={(e: React.MouseEvent) => e.stopPropagation()} onClick={(e: React.MouseEvent) => { e.stopPropagation(); shareCurrent(); }} className="flex flex-col items-center text-white/90 hover:text-white">
                    <Share2 size={24} />
                    <span className="text-[10px] opacity-80">Partager</span>
                  </motion.button>
                  <motion.button
                    whileTap={canDownload ? { scale: 0.9 } : {}}
                    onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      if (!canDownload) {
                        toast.error(upgradeMessage || 'Fonction non disponible pour votre offre');
                        return;
                      }
                      setShowDownloadDialog(true);
                    }}
                    className={`flex flex-col items-center ${canDownload ? 'text-white/90 hover:text-white' : 'text-white/50 cursor-not-allowed'}`}
                    aria-disabled={!canDownload}
                  >
                    {canDownload ? <Download size={24} /> : <Lock size={24} />}
                    <span className="text-[10px] opacity-80">Télécharger</span>
                  </motion.button>
                </div>

                {/* Instructions supprimées à la demande */}

                {/* Méta (bas gauche) */}
                <motion.div className="absolute left-3 sm:left-4 bottom-20 sm:bottom-24 right-24 sm:right-28 pointer-events-none" key={`meta-${currentTrack?._id}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="pointer-events-auto max-w-[70%] sm:max-w-[60%]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                        <img src={currentTrack?.artist?.avatar || computedAvatar || '/default-avatar.jpg'} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-white font-semibold text-sm truncate">{currentTrack?.artist?.name || currentTrack?.artist?.username || 'Artiste'}</div>
                      <span onMouseDown={(e: React.MouseEvent) => e.stopPropagation()} onClick={(e: React.MouseEvent) => e.stopPropagation()} className="inline-flex">
                        <FollowButton 
                          artistId={currentTrack?.artist?._id}
                          artistUsername={currentTrack?.artist?.username}
                          size="sm"
                        />
                      </span>
                    </div>
              <div className="text-white font-bold text-base sm:text-lg leading-tight line-clamp-2 flex items-center gap-2">
                       {currentTrack?.title}
                      {audioState.isPlaying && (
                        <span className="inline-flex gap-0.5 items-end h-3" aria-hidden>
                          <span className="w-0.5 bg-white/80 animate-[bar_1s_ease-in-out_infinite]" style={{height:'60%'}} />
                          <span className="w-0.5 bg-white/70 animate-[bar_1s_ease-in-out_infinite_100ms]" style={{height:'90%'}} />
                          <span className="w-0.5 bg-white/60 animate-[bar_1s_ease-in-out_infinite_200ms]" style={{height:'75%'}} />
                        </span>
                      )}
                     </div>
                      {/* Badge album / single + bouton album */}
                      <div className="mt-1 flex items-center gap-2">
                        { (currentTrack as any)?.album ? (
                          <>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 border border-white/10">
                              <Disc3 size={12} /> Album
                            </span>
                            <button onClick={(e)=>openAlbumPanel(e as any)} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-white/10 hover:bg-white/20 border border-white/10">
                              <Disc3 size={12} /> {(currentTrack as any).album}
                            </button>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/5 border border-white/10 opacity-80">
                            <ListMusic size={12} /> Single
                          </span>
                        )}
                      </div>
                  </div>
                </motion.div>
              </div>

               {/* Barre de progression (scrubbing + bulle temps) */}
               <div className="px-4 pb-4 select-none">
                 <div 
                   ref={progressRef}
                   className="w-full h-1.5 bg-white/15 rounded-full relative cursor-pointer"
                   onClick={handleSeek}
                   onMouseDown={onScrubStart}
                   onTouchStart={onScrubStart}
                 >
                   {/* piste lue */}
                   <div 
                     className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full relative"
                     style={{ width: `${isScrubbing && scrubPct != null ? scrubPct * 100 : progressPercentage}%` }}
                   />
                   {/* poignée */}
                   <div
                     className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow"
                     style={{ left: `calc(${isScrubbing && scrubPct != null ? scrubPct * 100 : progressPercentage}% - 6px)` }}
                   />
                   {/* bulle temps */}
                   {isScrubbing && (
                     <div
                       className="absolute -top-8 px-2 py-1 rounded-md bg-black/70 text-white text-[10px]"
                       style={{ left: `calc(${(scrubPct || 0) * 100}% - 18px)` }}
                     >
                       {formatTime(scrubTime)}
                     </div>
                   )}
                 </div>

                 <div className="flex justify-between text-xs text-white/70 mt-2">
                   <span>{formatTime(isScrubbing ? scrubTime : audioState.currentTime)}</span>
                   <span>{formatTime(audioState.duration)}</span>
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
    {/* Album Panel */}
    <AnimatePresence>
      {albumOpen && (
        <motion.div
          className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setAlbumOpen(false)}
        >
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] rounded-t-2xl p-3 sm:p-4 max-h-[72vh] overflow-y-auto"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-white/10 border border-white/10"><Disc3 size={12}/> Album</span>
                <div className="text-sm font-semibold">{(currentTrack as any)?.album || 'Album'}</div>
              </div>
              <button className="px-3 py-1.5 text-sm rounded-full bg-white text-black" onClick={playAlbumAll} disabled={albumLoading || !albumPlaylist?.tracks?.length}>Lire l'album</button>
            </div>
            {albumLoading && <div className="text-white/70 text-sm p-2">Chargement de l'album…</div>}
            {!albumLoading && !albumPlaylist && <div className="text-white/70 text-sm p-2">Album introuvable.</div>}
            {!albumLoading && albumPlaylist?.tracks?.length > 0 && (
              <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
                {albumPlaylist.tracks.map((t: any, i: number) => (
                  <div key={t._id || i} className="flex items-center gap-3 p-2">
                    <div className="w-6 text-center text-white/50 text-xs">{i+1}</div>
                    <img src={(t.coverUrl || '/default-cover.jpg').replace('/upload/','/upload/f_auto,q_auto/')} alt="" className="w-10 h-10 rounded object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-[var(--text)] truncate">{t.title}</div>
                      <div className="text-xs text-white/50 truncate">{t.artist?.name || t.artist?.username || ''}</div>
                    </div>
                    <button className="px-2 py-1 text-xs rounded-md bg-white/10 hover:bg-white/20" onClick={async()=>{ const list = albumPlaylist.tracks; setTracks(list); setCurrentTrackIndex(i); setQueueAndPlay(list, i); await play(); setAlbumOpen(false); }}>Lire</button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
