'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  ChevronUp,
  ChevronDown,
  Heart,
  MessageCircle,
  Share2,
  Download,
  Play,
  Pause,
  FileText,
  Lock,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';

import { useAudioPlayer } from '@/app/providers';
import { useLikeSystem } from '@/hooks/useLikeSystem';
import { useDownloadPermission, downloadAudioFile } from '@/hooks/useDownloadPermission';
import { sendTrackEvents } from '@/lib/analyticsClient';
import { getCdnUrl } from '@/lib/cdn';
import { applyCdnToTracks } from '@/lib/cdnHelpers';

import FollowButton from '@/components/FollowButton';
import CommentDialog from '@/components/CommentDialog';
import DownloadDialog from '@/components/DownloadDialog';

type Track = {
  _id: string;
  title: string;
  artist: { _id: string; name: string; username: string; avatar?: string; isVerified?: boolean };
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  likes: any;
  comments: any;
  plays: number;
  isLiked?: boolean;
  genre?: string[];
  lyrics?: string;
  shares?: number;
};

interface TikTokPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrackId?: string;
}

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const getTrackId = (t: any): string => t?.id ?? t?._id ?? '';

const fmtTime = (t = 0) => {
  const minutes = Math.floor(t / 60);
  const seconds = Math.floor(t % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const fmtCount = (n: number) => {
  if (!isFinite(n) || n < 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

function getLikesCount(likes: any) {
  if (Array.isArray(likes)) return likes.length;
  if (typeof likes === 'number') return likes;
  return 0;
}

function getCommentsCount(comments: any) {
  if (Array.isArray(comments)) return comments.length;
  if (typeof comments === 'number') return comments;
  return 0;
}

function HeartBurst({ burstKey }: { burstKey: number }) {
  return (
    <AnimatePresence>
      {burstKey > 0 && (
        <motion.div
          key={burstKey}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.9 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 16 }}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[140]"
        >
          <div className="h-24 w-24 rounded-full bg-white/10 grid place-items-center border border-white/30">
            <Heart size={48} fill="currentColor" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type SeekBarProps = {
  onSeek: (time: number) => void;
  getAudioElement: () => HTMLAudioElement | null;
};

function SeekBar({ onSeek, getAudioElement }: SeekBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const durRef = useRef<HTMLSpanElement>(null);
  const [bubble, setBubble] = useState<{ shown: boolean; left: number; value: number }>({ shown: false, left: 0, value: 0 });

  const commit = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const audioEl = getAudioElement();
    const dur = audioEl && Number.isFinite(audioEl.duration) ? audioEl.duration : 0;
    const x = clamp(clientX - rect.left, 0, rect.width);
    const value = (x / rect.width) * (dur || 0);
    setBubble({ shown: true, left: x, value });
    onSeek(value);
  };

  const hide = () => setBubble((prev) => ({ ...prev, shown: false }));

  // RAF: mise à jour DOM-only
  useEffect(() => {
    let raf = 0;
    let lastTime = -1;
    let lastDur = -1;

    const tick = () => {
      const a = getAudioElement();
      const time = a && Number.isFinite(a.currentTime) ? a.currentTime : 0;
      const dur = a && Number.isFinite(a.duration) ? a.duration : 0;

      if (dur !== lastDur || time !== lastTime) {
        const pct = dur > 0 ? Math.max(0, Math.min(100, (time / dur) * 100)) : 0;
        if (fillRef.current) fillRef.current.style.width = `${pct}%`;
        if (knobRef.current) knobRef.current.style.left = `calc(${pct}% - 10px)`;
        if (timeRef.current) timeRef.current.textContent = fmtTime(time);
        if (durRef.current) durRef.current.textContent = fmtTime(dur || 0);
        lastTime = time;
        lastDur = dur;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getAudioElement]);

  return (
    <div
      className="w-full"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        ref={ref}
        className="relative h-3 w-full rounded-full bg-white/12 overflow-hidden cursor-pointer"
        onPointerDown={(e) => commit(e.clientX)}
        onPointerMove={(e) => e.buttons === 1 && commit(e.clientX)}
        onPointerUp={hide}
        onPointerLeave={hide}
        onTouchStart={(e) => commit(e.touches[0].clientX)}
        onTouchMove={(e) => commit(e.touches[0].clientX)}
        onTouchEnd={hide}
      >
        <div
          ref={fillRef}
          className="absolute inset-y-0 left-0"
          style={{ width: '0%', background: 'linear-gradient(90deg,#ff4bd1,#7aa8ff)' }}
        />
        <div
          ref={knobRef}
          className="absolute -top-1 h-5 w-5 rounded-full bg-white shadow"
          style={{ left: 'calc(0% - 10px)' }}
        />
        {bubble.shown && (
          <div
            className="absolute -top-8"
            style={{ left: clamp(bubble.left - 20, 0, (ref.current?.getBoundingClientRect().width || 0) - 40) }}
          >
            <div className="rounded-md bg-black/70 px-2 py-1 text-[11px] tabular-nums border border-white/10">
              {fmtTime(bubble.value)}
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[12px] text-white/80 tabular-nums">
        <span ref={timeRef}>{fmtTime(0)}</span>
        <span ref={durRef}>{fmtTime(0)}</span>
      </div>
    </div>
  );
}

function getCoverUrl(track: any) {
  const raw = track?.coverUrl || '/default-cover.jpg';
  const url = getCdnUrl(raw) || raw;
  return url && typeof url === 'string' && url.includes('res.cloudinary.com')
    ? url.replace('/upload/', '/upload/f_auto,q_auto/')
    : url;
}

export default function TikTokPlayer({ isOpen, onClose, initialTrackId }: TikTokPlayerProps) {
  const reduceMotion = useReducedMotion();

  const {
    audioState,
    setTracks,
    setCurrentTrackIndex,
    playTrack,
    play,
    pause,
    seek,
    getAudioElement,
  } = useAudioPlayer();

  const { canDownload, upgradeMessage } = useDownloadPermission();

  const [loading, setLoading] = useState(false);
  const [tracks, setLocalTracks] = useState<Track[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [coverLoadedById, setCoverLoadedById] = useState<Record<string, boolean>>({});

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wheelLockRef = useRef(false);
  const didBootRef = useRef(false);
  const lastTap = useRef(0);
  const lastViewedRef = useRef<string | null>(null);
  const prevQueueRef = useRef<{ tracks: any[]; currentTrackIndex: number } | null>(null);

  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  const currentId = currentTrack?._id;

  const activeTrack = tracks[activeIndex] || null;
  const activeTrackId = getTrackId(activeTrack);

  const { isLiked, likesCount, toggleLike, checkLikeStatus } = useLikeSystem({
    trackId: activeTrackId,
    initialLikesCount: getLikesCount(activeTrack?.likes),
    initialIsLiked: !!activeTrack?.isLiked,
  });

  useEffect(() => {
    if (activeTrackId) checkLikeStatus();
  }, [activeTrackId, checkLikeStatus]);

  const close = useCallback(() => {
    try {
      pause();
    } catch {}
    if (prevQueueRef.current) {
      try {
        setTracks(prevQueueRef.current.tracks as any);
        setCurrentTrackIndex(prevQueueRef.current.currentTrackIndex);
      } catch {}
      prevQueueRef.current = null;
    }
    onClose();
  }, [onClose, pause, setCurrentTrackIndex, setTracks]);

  // Plein écran: bloque le scroll du body uniquement quand ouvert
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Sauvegarder la queue actuelle à l'ouverture (pour restoration)
  useEffect(() => {
    if (!isOpen) return;
    if (!prevQueueRef.current) {
      prevQueueRef.current = {
        tracks: audioState.tracks || [],
        currentTrackIndex: audioState.currentTrackIndex || 0,
      };
    }
  }, [audioState.currentTrackIndex, audioState.tracks, isOpen]);

  // Charge le feed à l'ouverture (même endpoint que l'accueil)
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    didBootRef.current = false;
    setCommentsOpen(false);
    setLyricsOpen(false);

    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/ranking/feed?limit=50&ai=1', { cache: 'no-store' });
        const json = await res.json();
        const list: Track[] = Array.isArray(json?.tracks) ? json.tracks : [];
        const cdnTracks = applyCdnToTracks(list as any) as any;
        if (!mounted) return;

        setLocalTracks(cdnTracks);
        setTracks(cdnTracks as any);
        setCurrentTrackIndex(0);
      } catch {
        // silencieux
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, setTracks, setCurrentTrackIndex]);

  const scrollToIndex = useCallback((i: number, behavior: ScrollBehavior = 'smooth') => {
    const el = itemRefs.current[i];
    if (!el) return;
    el.scrollIntoView({ behavior, block: 'start' });
  }, []);

  // Sync initialTrackId -> activeIndex + scroll (une fois quand la liste est prête)
  useEffect(() => {
    if (!isOpen) return;
    if (!tracks.length) return;
    if (!initialTrackId) return;
    if (didBootRef.current) return;

    const idx = tracks.findIndex((t) => t?._id === initialTrackId);
    if (idx >= 0) {
      didBootRef.current = true;
      setActiveIndex(idx);
      requestAnimationFrame(() => scrollToIndex(idx, 'auto'));
    }
  }, [isOpen, tracks, initialTrackId, scrollToIndex]);

  // Observer: détecte quel écran est “actif”
  useEffect(() => {
    if (!isOpen) return;
    if (!tracks.length) return;

    const els = itemRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];
        if (!best) return;
        const idx = Number((best.target as HTMLElement).dataset.index);
        if (Number.isFinite(idx)) setActiveIndex(idx);
      },
      { root: containerRef.current, threshold: [0.55, 0.7, 0.85] }
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [isOpen, tracks.length]);

  // View analytics (à l'écran)
  useEffect(() => {
    if (!isOpen) return;
    if (!activeTrackId) return;
    if (lastViewedRef.current === activeTrackId) return;
    lastViewedRef.current = activeTrackId;
    try {
      sendTrackEvents(activeTrackId, {
        event_type: 'view',
        source: 'tiktok-player',
        is_ai_track: String(activeTrackId).startsWith('ai-'),
      });
    } catch {}
  }, [isOpen, activeTrackId]);

  // Auto-play quand on change d’écran (TikTok-like)
  useEffect(() => {
    if (!isOpen) return;
    const t = tracks[activeIndex];
    if (!t?._id) return;
    const timer = window.setTimeout(() => {
      if (currentId !== t._id) {
        // Important: laisser le setTracks/setCurrentTrackIndex se stabiliser
        requestAnimationFrame(() => {
          playTrack(t as any).catch?.(() => {});
          try {
            sendTrackEvents(t._id, { event_type: 'play_start', source: 'tiktok-player' });
          } catch {}
        });
      }
    }, 140);
    return () => window.clearTimeout(timer);
  }, [isOpen, activeIndex, tracks, playTrack, currentId]);

  // Précharger les covers autour de la carte active (évite le clignote)
  useEffect(() => {
    if (!isOpen) return;
    if (tracks.length === 0) return;
    const center = activeIndex;
    const range = 4;
    const start = Math.max(0, center - range);
    const end = Math.min(tracks.length - 1, center + range);

    for (let i = start; i <= end; i++) {
      const t = tracks[i];
      const id = getTrackId(t);
      if (!id || coverLoadedById[id]) continue;
      const url = getCoverUrl(t);
      if (!url) continue;
      const img = new Image();
      img.onload = () => setCoverLoadedById((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
      img.src = url;
    }
  }, [activeIndex, coverLoadedById, isOpen, tracks]);

  // Wheel “1 écran par scroll” (desktop)
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (commentsOpen || showDownloadDialog || lyricsOpen) return;
      if (wheelLockRef.current) {
        e.preventDefault();
        return;
      }
      const dir = e.deltaY > 0 ? 1 : -1;
      const next = Math.min(tracks.length - 1, Math.max(0, activeIndex + dir));
      if (next === activeIndex) return;
      wheelLockRef.current = true;
      e.preventDefault();
      scrollToIndex(next, 'smooth');
      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 420);
    },
    [activeIndex, tracks.length, scrollToIndex, commentsOpen, showDownloadDialog, lyricsOpen]
  );

  // Keyboard (↑ ↓ + espace + escape)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (commentsOpen || showDownloadDialog || lyricsOpen) return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        scrollToIndex(Math.min(tracks.length - 1, activeIndex + 1));
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        scrollToIndex(Math.max(0, activeIndex - 1));
      }
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (audioState.isPlaying) pause();
        else play();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, activeIndex, tracks.length, scrollToIndex, audioState.isPlaying, pause, play, close, commentsOpen, showDownloadDialog, lyricsOpen]);

  const onDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (activeTrackId) {
        try {
          (navigator as any)?.vibrate?.(12);
        } catch {}
        toggleLike();
        setBurstKey((k) => k + 1);
      }
    }
    lastTap.current = now;
  }, [activeTrackId, toggleLike]);

  const onShare = useCallback(async (t: Track) => {
    const url = `${window.location.origin}/track/${t._id}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: t.title, text: 'Écoute sur Synaura', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Lien copié');
      }
      try {
        sendTrackEvents(t._id, { event_type: 'share', source: 'tiktok-player' });
      } catch {}
    } catch {}
  }, []);

  const handleDownload = useCallback(() => {
    if (!activeTrack) return;
    if (!canDownload) {
      toast.error(upgradeMessage || 'Fonction non disponible pour votre offre');
      return;
    }
    setShowDownloadDialog(true);
  }, [activeTrack, canDownload, upgradeMessage]);

  const confirmDownload = useCallback(async () => {
    if (!activeTrack) return;
    try {
      setIsDownloading(true);
      const filename = `${activeTrack?.artist?.name || activeTrack?.artist?.username || 'Artiste'}-${activeTrack?.title || 'Titre'}.wav`.replace(/\s+/g, '_');
      await downloadAudioFile(activeTrack?.audioUrl || '', filename, () => {});
      toast.success('Téléchargement terminé !');
    } catch {
      toast.error('Échec du téléchargement');
    } finally {
      setIsDownloading(false);
      setShowDownloadDialog(false);
    }
  }, [activeTrack]);

  const bgUrl = useMemo(() => getCoverUrl(activeTrack || tracks[0]), [activeTrack, tracks]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black text-white grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-white/80" />
          <p className="text-sm text-white/70">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="tiktok-root"
          className="fixed inset-0 z-[100] bg-black text-white overflow-hidden select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Background crossfade basé sur la piste active */}
          <div className="absolute inset-0 -z-10">
            <AnimatePresence mode="wait">
              <motion.img
                key={bgUrl}
                src={bgUrl}
                alt="bg"
                loading="eager"
                decoding="async"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.25 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.18 }}
                className="h-full w-full object-cover"
              />
            </AnimatePresence>
          </div>

          {/* Overlay statique */}
          <div
            className="absolute inset-0 -z-10"
            style={{
              backgroundImage:
                'radial-gradient(60% 60% at 20% 20%, rgba(124,58,237,.28), transparent 60%), radial-gradient(60% 60% at 80% 80%, rgba(34,211,238,.28), transparent 60%)',
            }}
          />

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-[120] flex items-center justify-between px-4 py-3">
            <button
              onClick={close}
              className="h-10 w-10 rounded-full bg-black/30 grid place-items-center border border-white/10"
              title="Fermer"
            >
              <X size={22} />
            </button>
            <div className="hidden sm:flex flex-col items-center text-white/60 text-xs">
              <ChevronUp className="w-4 h-4" />
              <span>Swipe ↑ / ↓</span>
              <ChevronDown className="w-4 h-4 mt-1" />
            </div>
          </div>

          <HeartBurst burstKey={burstKey} />

          {/* Scroll snap container */}
          <div
            ref={containerRef}
            onWheel={onWheel}
            className="h-full w-full overflow-y-auto snap-y snap-mandatory"
            style={{ scrollSnapType: 'y mandatory' }}
          >
            {tracks.map((t, i) => {
              const isThis = i === activeIndex;
              const isPlayingThis = isThis && currentId === t._id && audioState.isPlaying;
              const duration = isThis && currentId === t._id ? audioState.duration || t.duration || 0 : t.duration || 0;
              const currentTime = isThis && currentId === t._id ? audioState.currentTime || 0 : 0;
              const rawLikes = getLikesCount(t.likes);
              const rawComments = getCommentsCount(t.comments);

              return (
                <div
                  key={t._id || i}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  data-index={i}
                  className="relative h-[100svh] w-full snap-start"
                  style={{ scrollSnapAlign: 'start' }}
                  onClick={isThis ? onDoubleTap : undefined}
                >
                  {/* Center cover */}
                  <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentId !== t._id) playTrack(t as any);
                        else if (audioState.isPlaying) pause();
                        else play();
                      }}
                      className="relative w-[78vw] max-w-[520px] aspect-square rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/6 via-white/3 to-white/6" />
                      <img
                        src={getCoverUrl(t)}
                        alt={t.title}
                        loading={isThis ? 'eager' : 'lazy'}
                        decoding="async"
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                          coverLoadedById[t._id] || !t._id ? 'opacity-100' : 'opacity-0'
                        }`}
                        onLoad={() => {
                          if (!t._id) return;
                          setCoverLoadedById((prev) => (prev[t._id] ? prev : { ...prev, [t._id]: true }));
                        }}
                        onError={(e) => (((e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'))}
                      />
                      <div className="absolute inset-0 bg-black/10" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-black/40 border border-white/10 backdrop-blur-md flex items-center justify-center">
                          {isPlayingThis ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Right actions */}
                  <aside className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isThis) return;
                        toggleLike();
                      }}
                      className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition ${
                        isThis ? 'hover:bg-white/10' : 'opacity-70'
                      } ${isThis && isLiked ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'}`}
                      aria-label="Aimer"
                    >
                      <Heart className={`w-5 h-5 ${isThis && isLiked ? 'text-rose-300' : ''}`} fill={isThis && isLiked ? 'currentColor' : 'none'} />
                      <span className="text-[10px] leading-none text-white/70">{fmtCount(isThis ? likesCount : rawLikes)}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isThis) return;
                        setCommentsOpen(true);
                      }}
                      className="w-12 h-12 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition hover:bg-white/10 bg-white/5 border-white/10"
                      aria-label="Commentaires"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-[10px] leading-none text-white/70">{fmtCount(rawComments)}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare(t);
                      }}
                      className="w-12 h-12 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition hover:bg-white/10 bg-white/5 border-white/10"
                      aria-label="Partager"
                    >
                      <Share2 className="w-5 h-5" />
                      <span className="text-[10px] leading-none text-white/70">{fmtCount((t as any)?.shares || 0)}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isThis) return;
                        handleDownload();
                      }}
                      className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition ${
                        !canDownload ? 'opacity-60' : 'hover:bg-white/10'
                      } bg-white/5 border-white/10`}
                      aria-label={canDownload ? 'Télécharger' : 'Téléchargement indisponible'}
                    >
                      {canDownload ? <Download className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                      <span className="text-[10px] leading-none text-white/70"> </span>
                    </button>
                  </aside>

                  {/* Bottom panel */}
                  <footer className="absolute left-0 right-0 bottom-0 p-4 z-20">
                    <div className="mx-auto max-w-3xl bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-md">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white/70">♪ Single</p>
                          <h2 className="text-lg font-semibold truncate">{t?.title || 'Titre inconnu'}</h2>
                          <div className="mt-0.5 flex items-center gap-2 text-sm flex-wrap">
                            <span className="font-medium truncate">
                              {t?.artist?.name || t?.artist?.username || 'Artiste inconnu'}
                            </span>
                            {t?.artist?._id && t?.artist?.username && (
                              <span onClick={(e) => e.stopPropagation()}>
                                <FollowButton artistId={t.artist._id} artistUsername={t.artist.username} size="sm" />
                              </span>
                            )}
                            <span className="text-xs text-white/60">Qualité audio: 320k</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (currentId !== t._id) playTrack(t as any);
                              else if (audioState.isPlaying) pause();
                              else play();
                            }}
                            className="p-3 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition"
                            aria-label={isPlayingThis ? 'Pause' : 'Lecture'}
                          >
                            {isPlayingThis ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                          </button>
                          {t?.lyrics && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isThis) return;
                                setLyricsOpen((v) => !v);
                              }}
                              className={`px-3 py-2 rounded-xl border transition text-sm ${
                                isThis && lyricsOpen ? 'bg-white/15 border-white/20' : 'bg-white/10 border-white/10 hover:bg-white/15'
                              }`}
                            >
                              <span className="inline-flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Paroles
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        {isThis && currentId === t._id ? (
                          <SeekBar onSeek={seek} getAudioElement={getAudioElement} />
                        ) : (
                          <div className="w-full">
                            <div className="relative h-3 w-full rounded-full bg-white/12 overflow-hidden" />
                            <div className="mt-2 flex items-center justify-between text-[12px] text-white/60 tabular-nums">
                              <span>{fmtTime(0)}</span>
                              <span>{fmtTime(duration)}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {isThis && lyricsOpen && t?.lyrics && (
                        <div className="mt-3 max-h-40 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-white/85 border-t border-white/10 pt-2">
                          {t.lyrics}
                        </div>
                      )}
                    </div>
                  </footer>
                </div>
              );
            })}

            {!tracks.length && (
              <div className="h-[100svh] flex items-center justify-center text-white/70">
                Aucune musique à afficher.
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Commentaires (vrai système) */}
      {activeTrackId && (
        <CommentDialog
          trackId={activeTrackId}
          trackTitle={activeTrack?.title || 'Titre'}
          trackArtist={activeTrack?.artist?.name || activeTrack?.artist?.username || 'Artiste'}
          initialComments={[] as any}
          isOpen={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          className=""
        />
      )}

      {/* Download dialog (conditions + gating) */}
      <DownloadDialog
        isOpen={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        onConfirm={confirmDownload}
        trackTitle={activeTrack?.title || 'Titre inconnu'}
        artistName={activeTrack?.artist?.name || activeTrack?.artist?.username || 'Artiste inconnu'}
        isDownloading={isDownloading}
      />
    </>
  );
}

