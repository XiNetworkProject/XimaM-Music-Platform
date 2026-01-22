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
        <motion.div key={burstKey} className="pointer-events-none fixed inset-0 z-[140] grid place-items-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.95 }}
            exit={{ opacity: 0, scale: 0.92, y: -30 }}
            transition={{ type: 'spring', stiffness: 340, damping: 18 }}
            className="h-24 w-24 rounded-full bg-white/10 grid place-items-center border border-white/30"
          >
            <Heart size={48} fill="currentColor" />
          </motion.div>
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
    setQueueAndPlay,
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
  const [nextCursor, setNextCursor] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [burstVisible, setBurstVisible] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [coverLoadedById, setCoverLoadedById] = useState<Record<string, boolean>>({});
  const [radioMeta, setRadioMeta] = useState<{ station: 'mixx_party' | 'ximam'; title: string; artist: string } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wheelLockRef = useRef(false);
  const didBootRef = useRef(false);
  const suppressAutoplayRef = useRef(false);
  const lastGesturePlayAtRef = useRef<number>(0);
  const lastTap = useRef(0);
  const tapTimerRef = useRef<number | null>(null);
  const burstTimerRef = useRef<number | null>(null);
  const lastViewedRef = useRef<string | null>(null);
  const prevQueueRef = useRef<{ tracks: any[]; currentTrackIndex: number } | null>(null);
  const openedTrackIdRef = useRef<string | null>(null);
  const changedTrackRef = useRef(false);
  const audioPreloadLinksRef = useRef<HTMLLinkElement[]>([]);
  const feedLoadedRef = useRef(false);
  const openSeedIdRef = useRef<string | null>(null);
  const snapTimerRef = useRef<number | null>(null);
  const isTouchingRef = useRef(false);
  const isCoarseRef = useRef(false);

  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  const currentId = currentTrack?._id;

  const activeTrack = tracks[activeIndex] || null;
  const activeTrackId = getTrackId(activeTrack);
  const activeIsRadio = useMemo(() => String(activeTrackId || '').startsWith('radio-'), [activeTrackId]);
  const activeRadioStation = useMemo<'mixx_party' | 'ximam' | null>(() => {
    if (activeTrackId === 'radio-ximam') return 'ximam';
    if (activeTrackId === 'radio-mixx-party') return 'mixx_party';
    return null;
  }, [activeTrackId]);

  // Détecter mobile/coarse pointer (pour éviter de casser le scroll inertiel)
  useEffect(() => {
    const compute = () => {
      try {
        const mq = window.matchMedia?.('(pointer: coarse)');
        isCoarseRef.current = Boolean(mq?.matches) || 'ontouchstart' in window;
      } catch {
        isCoarseRef.current = 'ontouchstart' in window;
      }
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  const getPageHeight = useCallback(() => {
    const el = containerRef.current;
    return Math.max(1, el?.clientHeight || window.innerHeight || 1);
  }, []);

  const scrollToIndex = useCallback(
    (i: number, behavior: ScrollBehavior = 'auto') => {
      const idx = clamp(i, 0, Math.max(0, tracks.length - 1));
      // Mobile: laisser le scroll-snap natif, utiliser scrollIntoView (moins "jitter")
      if (isCoarseRef.current) {
        const item = itemRefs.current[idx];
        item?.scrollIntoView({ behavior, block: 'start' });
        return;
      }
      // Desktop: scroll déterministe par pages
      const el = containerRef.current;
      if (!el) return;
      const h = getPageHeight();
      el.scrollTo({ top: idx * h, behavior });
    },
    [getPageHeight, tracks.length],
  );

  const snapToNearest = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      const el = containerRef.current;
      if (!el) return;
      const maxIdx = Math.max(0, tracks.length - 1);
      // Mobile: ne PAS forcer scrollTo (ça casse l'inertie). On calcule juste l'index.
      if (isCoarseRef.current) {
        // Chercher l'item le plus proche du scrollTop via offsetTop (stable)
        const st = el.scrollTop;
        const center = clamp(activeIndex, 0, maxIdx);
        const start = Math.max(0, center - 4);
        const end = Math.min(maxIdx, center + 4);
        let best = center;
        let bestDist = Number.POSITIVE_INFINITY;
        for (let i = start; i <= end; i++) {
          const it = itemRefs.current[i];
          if (!it) continue;
          const d = Math.abs(it.offsetTop - st);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
        return best;
      }
      const h = getPageHeight();
      const idx = clamp(Math.round(el.scrollTop / h), 0, maxIdx);
      el.scrollTo({ top: idx * h, behavior });
      return idx;
    },
    [activeIndex, getPageHeight, tracks.length],
  );

  const playIndexFromGesture = useCallback(
    async (i: number, source: string) => {
      const t = tracks[i];
      if (!t?._id) return;
      lastGesturePlayAtRef.current = Date.now();
      suppressAutoplayRef.current = true; // éviter double-trigger par l'effet
      setActiveIndex(i);
      setCurrentTrackIndex(i);
      try {
        await playTrack(t as any);
        if (openedTrackIdRef.current && t._id !== openedTrackIdRef.current) changedTrackRef.current = true;
        try {
          sendTrackEvents(t._id, { event_type: 'play_start', source });
        } catch {}
      } finally {
        // relâcher juste après (même si play échoue)
        requestAnimationFrame(() => {
          suppressAutoplayRef.current = false;
        });
      }
    },
    [playTrack, setCurrentTrackIndex, tracks]
  );

  const { isLiked, likesCount, toggleLike, checkLikeStatus } = useLikeSystem({
    trackId: activeTrackId,
    initialLikesCount: getLikesCount(activeTrack?.likes),
    initialIsLiked: !!activeTrack?.isLiked,
  });

  useEffect(() => {
    if (activeTrackId) checkLikeStatus();
  }, [activeTrackId, checkLikeStatus]);

  // Radio: récupérer now-playing quand la carte active est une radio (évite titres/artist incohérents et flapping)
  useEffect(() => {
    if (!isOpen) return;
    if (!activeRadioStation) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const url =
          activeRadioStation === 'ximam'
            ? '/api/radio/status?station=ximam'
            : '/api/radio/status?station=mixx_party';
        const res = await fetch(url, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        const title = String(json?.data?.currentTrack?.title || '').trim();
        const artist = String(json?.data?.currentTrack?.artist || '').trim();
        if (cancelled) return;
        // Ne pas écraser par des placeholders vides
        if (title && artist) {
          setRadioMeta((prev) => {
            // garder stable si pas de changement réel
            if (prev && prev.station === activeRadioStation && prev.title === title && prev.artist === artist) return prev;
            return { station: activeRadioStation, title, artist };
          });
        }
      } catch {}
    };

    tick();
    const id = window.setInterval(tick, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [activeRadioStation, isOpen]);

  const close = useCallback(() => {
    // Restaurer l'ancienne queue uniquement si l'utilisateur n'a pas changé de piste dans le TikTokPlayer
    if (prevQueueRef.current && !changedTrackRef.current) {
      try {
        setTracks(prevQueueRef.current.tracks as any);
        setCurrentTrackIndex(prevQueueRef.current.currentTrackIndex);
      } catch {}
      prevQueueRef.current = null;
    }
    openedTrackIdRef.current = null;
    changedTrackRef.current = false;
    feedLoadedRef.current = false;
    openSeedIdRef.current = null;
    onClose();
  }, [onClose, setCurrentTrackIndex, setTracks]);

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
    // Piste au moment de l'ouverture: sert de "seed" pour démarrer au bon endroit
    if (!openedTrackIdRef.current) {
      openedTrackIdRef.current = getTrackId(audioState.tracks?.[audioState.currentTrackIndex]) || null;
    }
    // Seed figée pour cette ouverture (ne doit pas suivre les changements de piste pendant le player)
    if (!openSeedIdRef.current) {
      openSeedIdRef.current = initialTrackId || openedTrackIdRef.current || null;
    }
    changedTrackRef.current = false;
  }, [audioState.currentTrackIndex, audioState.tracks, isOpen]);

  // Charge le feed à l'ouverture (même endpoint que l'accueil)
  useEffect(() => {
    if (!isOpen) return;
    if (feedLoadedRef.current) return;
    feedLoadedRef.current = true;
    let mounted = true;
    didBootRef.current = false;
    setCommentsOpen(false);
    setLyricsOpen(false);
    suppressAutoplayRef.current = true;
    setNextCursor(0);
    setHasMore(true);
    setLoadingMore(false);

    (async () => {
      try {
        setLoading(true);
        // Feed personnalisé par défaut. On exclut l'IA ici (demande "pas de générations IA").
        const res = await fetch('/api/ranking/feed?limit=50&ai=0&strategy=reco&cursor=0', { cache: 'no-store' });
        const json = await res.json();
        const list: Track[] = Array.isArray(json?.tracks) ? json.tracks : [];
        const cdnTracks = applyCdnToTracks(list as any) as any;
        if (!mounted) return;

        // Injecter la piste actuellement en cours si elle n'est pas dans le feed (ex: radio/playlist)
        const prev = prevQueueRef.current;
        const prevCurrent = prev?.tracks?.[prev.currentTrackIndex] || null;
        const prevId = getTrackId(prevCurrent);
        const merged: any[] = Array.isArray(cdnTracks) ? [...cdnTracks] : [];
        if (prevCurrent && prevId && !prevId.startsWith('ai-') && !merged.some((t) => getTrackId(t) === prevId)) {
          merged.unshift(prevCurrent);
        }

        setLocalTracks(merged);
        setTracks(merged as any);

        const seedId = openSeedIdRef.current || openedTrackIdRef.current || prevId || getTrackId(merged[0]);
        const idx = seedId ? merged.findIndex((t) => getTrackId(t) === seedId) : 0;
        const startIndex = idx >= 0 ? idx : 0;

        setActiveIndex(startIndex);
        setCurrentTrackIndex(startIndex);
        // IMPORTANT: définir une vraie queue côté service audio pour éviter l'auto-play "random"
        // (sinon, à la fin de piste, useAudioService peut piocher dans allTracks).
        try {
          setQueueAndPlay(merged as any, startIndex);
        } catch {}
        requestAnimationFrame(() => {
          scrollToIndex(startIndex, 'auto');
          suppressAutoplayRef.current = false;
        });

        setNextCursor(typeof json?.nextCursor === 'number' ? json.nextCursor : merged.length);
        setHasMore(Boolean(json?.hasMore));
      } catch {
        // silencieux
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, setTracks, setCurrentTrackIndex, scrollToIndex]);

  // Sync initialTrackId -> activeIndex + scroll (une fois quand la liste est prête)
  useEffect(() => {
    if (!isOpen) return;
    if (!tracks.length) return;
    if (didBootRef.current) return;

    const seed = openSeedIdRef.current;
    if (!seed) return;
    const idx = tracks.findIndex((t) => t?._id === seed);
    if (idx >= 0) {
      didBootRef.current = true;
      setActiveIndex(idx);
      requestAnimationFrame(() => scrollToIndex(idx, 'auto'));
    }
  }, [isOpen, tracks, scrollToIndex]);

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
    if (suppressAutoplayRef.current) return;
    // Si on vient d'un geste (wheel/key/touchend), ne pas doubler
    if (Date.now() - (lastGesturePlayAtRef.current || 0) < 500) return;
    const t = tracks[activeIndex];
    if (!t?._id) return;
    const timer = window.setTimeout(() => {
      if (currentId !== t._id) {
        // Important: laisser le setTracks/setCurrentTrackIndex se stabiliser
        requestAnimationFrame(() => {
          playTrack(t as any).catch?.(() => {});
          if (openedTrackIdRef.current && t._id !== openedTrackIdRef.current) {
            changedTrackRef.current = true;
          }
          try {
            sendTrackEvents(t._id, { event_type: 'play_start', source: 'tiktok-player' });
          } catch {}
        });
      }
    }, 60);
    return () => window.clearTimeout(timer);
  }, [isOpen, activeIndex, tracks, playTrack, currentId]);

  // Infinite loading: quand on approche de la fin, charger la page suivante
  useEffect(() => {
    if (!isOpen) return;
    if (!hasMore) return;
    if (loadingMore) return;
    if (tracks.length === 0) return;
    if (activeIndex < tracks.length - 6) return;

    setLoadingMore(true);
    (async () => {
      try {
        const res = await fetch(`/api/ranking/feed?limit=50&ai=0&strategy=reco&cursor=${nextCursor}`, { cache: 'no-store' });
        const json = await res.json();
        const list: Track[] = Array.isArray(json?.tracks) ? json.tracks : [];
        const cdnTracks = applyCdnToTracks(list as any) as any;

        setLocalTracks((prev) => {
          const seen = new Set(prev.map((t) => getTrackId(t)).filter(Boolean));
          const append = (cdnTracks || []).filter((t: any) => {
            const id = getTrackId(t);
            if (!id) return false;
            if (id.startsWith('ai-')) return false;
            if (seen.has(id)) return false;
            return true;
          });
          const merged = [...prev, ...append];
          setTracks(merged as any);
          return merged as any;
        });

        setNextCursor(typeof json?.nextCursor === 'number' ? json.nextCursor : nextCursor + list.length);
        setHasMore(Boolean(json?.hasMore));
      } catch {
        setHasMore(false);
      } finally {
        setLoadingMore(false);
      }
    })();
  }, [activeIndex, hasMore, isOpen, loadingMore, nextCursor, tracks.length, setTracks]);

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
      // Scroll “instant” + play dans le geste (évite autoplay bloqué)
      scrollToIndex(next, 'auto');
      playIndexFromGesture(next, 'tiktok-player-wheel');
      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 220);
    },
    [activeIndex, tracks.length, scrollToIndex, commentsOpen, showDownloadDialog, lyricsOpen, playIndexFromGesture]
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
        const next = Math.min(tracks.length - 1, activeIndex + 1);
        scrollToIndex(next, 'auto');
        playIndexFromGesture(next, 'tiktok-player-key');
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        const next = Math.max(0, activeIndex - 1);
        scrollToIndex(next, 'auto');
        playIndexFromGesture(next, 'tiktok-player-key');
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
  }, [isOpen, activeIndex, tracks.length, scrollToIndex, audioState.isPlaying, pause, play, close, commentsOpen, showDownloadDialog, lyricsOpen, playIndexFromGesture]);

  // Mobile: au relâchement du swipe scroll, jouer l'item le plus proche (geste utilisateur => autoplay OK)
  const onTouchEnd = useCallback(() => {
    if (commentsOpen || showDownloadDialog || lyricsOpen) return;
    // Sur mobile, on laisse le snap natif finir puis on lit l'index proche
    isTouchingRef.current = false;
    const idx = snapToNearest('auto');
    if (idx === undefined) return;
    if (!Number.isFinite(idx)) return;
    if (idx === activeIndex) {
      // même écran: si pas la bonne piste, on force dans le gesteAF (geste utilisateur)
      if (tracks[idx]?._id && currentId !== tracks[idx]._id) {
        playIndexFromGesture(idx, 'tiktok-player-touchend');
      }
      return;
    }
    playIndexFromGesture(idx, 'tiktok-player-touchend');
  }, [activeIndex, commentsOpen, currentId, lyricsOpen, playIndexFromGesture, showDownloadDialog, tracks, snapToNearest]);

  // Auto-snap au "scroll end" (corrige les arrêts entre deux pages)
  const onScroll = useCallback(() => {
    // Mobile: ne pas auto-snap (ça provoque du scintillement avec le momentum)
    if (isCoarseRef.current) return;
    if (wheelLockRef.current) return;
    if (commentsOpen || showDownloadDialog || lyricsOpen) return;
    if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = window.setTimeout(() => {
      snapToNearest('auto');
    }, 180) as unknown as number;
  }, [commentsOpen, lyricsOpen, showDownloadDialog, snapToNearest]);

  useEffect(() => {
    return () => {
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
    };
  }, []);

  const triggerLikeBurst = useCallback(() => {
    if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
    setBurstVisible(true);
    setBurstKey((k) => k + 1);
    burstTimerRef.current = window.setTimeout(() => {
      setBurstVisible(false);
    }, 450) as unknown as number;
  }, []);

  useEffect(() => {
    return () => {
      if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
      if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    };
  }, []);

  const handleCoverTap = useCallback(
    (t: Track) => {
      const id = getTrackId(t);
      if (!id) return;
      const isRadio = String(id).startsWith('radio-');
      const now = Date.now();

      // double tap => like (hors radio)
      if (now - lastTap.current < 260) {
        if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
        lastTap.current = 0;
        if (!isRadio && activeTrackId) {
          try {
            (navigator as any)?.vibrate?.(12);
          } catch {}
          const willLike = !isLiked;
          toggleLike();
          if (willLike) triggerLikeBurst();
        }
        return;
      }

      lastTap.current = now;
      // single tap (différé) => play/pause (ne pas déclencher si un second tap arrive)
      if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
      tapTimerRef.current = window.setTimeout(() => {
        tapTimerRef.current = null;
        if (currentId !== id) playTrack(t as any);
        else if (audioState.isPlaying) pause();
        else play();
      }, 260) as unknown as number;
    },
    [activeTrackId, audioState.isPlaying, currentId, isLiked, pause, play, playTrack, toggleLike, triggerLikeBurst]
  );

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

  // Précharger audio des prochaines pistes (réduit le buffering perçu entre musiques)
  useEffect(() => {
    if (!isOpen) return;
    if (!tracks.length) return;

    // cleanup anciennes balises
    for (const link of audioPreloadLinksRef.current) {
      try {
        link.parentNode?.removeChild(link);
      } catch {}
    }
    audioPreloadLinksRef.current = [];

    const nextTracks = tracks.slice(activeIndex + 1, activeIndex + 3);
    const urls = nextTracks
      .map((t) => t?.audioUrl)
      .filter((u): u is string => typeof u === 'string' && u.length > 0)
      // éviter de précharger des streams live (radio/hls)
      .filter((u) => !u.toLowerCase().endsWith('.m3u8') && !/\/listen\//i.test(u));

    for (const href of urls) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'audio';
      link.href = href;
      // crossOrigin best-effort (ne casse pas si non supporté)
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      audioPreloadLinksRef.current.push(link);
    }

    return () => {
      for (const link of audioPreloadLinksRef.current) {
        try {
          link.parentNode?.removeChild(link);
        } catch {}
      }
      audioPreloadLinksRef.current = [];
    };
  }, [activeIndex, isOpen, tracks]);

  // Suivre la piste réellement jouée (service audio) et synchroniser le scroll.
  // Ça permet aussi l'auto-next (géré par useAudioService) sans piste "random" et sans double-handlers.
  useEffect(() => {
    if (!isOpen) return;
    if (!tracks.length) return;
    if (commentsOpen || showDownloadDialog || lyricsOpen) return;
    const idx = audioState.currentTrackIndex;
    if (!Number.isFinite(idx) || idx < 0) return;
    if (idx === activeIndex) return;
    setActiveIndex(idx);
    requestAnimationFrame(() => scrollToIndex(idx, 'auto'));
  }, [activeIndex, audioState.currentTrackIndex, commentsOpen, isOpen, lyricsOpen, scrollToIndex, showDownloadDialog, tracks.length]);

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

          <AnimatePresence>
            {burstVisible && <HeartBurst burstKey={burstKey} />}
          </AnimatePresence>

          {/* Scroll snap container */}
          <div
            ref={containerRef}
            onWheel={onWheel}
            onTouchStart={() => {
              isTouchingRef.current = true;
              // éviter un snap programmatique en plein geste
              if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
            }}
            onTouchEnd={onTouchEnd}
            onScroll={onScroll}
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
              const isRadio = String(t?._id || '').startsWith('radio-');
              const displayTitle = isThis && isRadio && radioMeta ? radioMeta.title : (t?.title || 'Titre inconnu');
              const displayArtist = isThis && isRadio && radioMeta
                ? radioMeta.artist
                : (t?.artist?.name || t?.artist?.username || 'Artiste inconnu');

              return (
                <div
                  key={t._id || i}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  data-index={i}
                  className="relative h-[100svh] w-full snap-start"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  {/* Center cover */}
                  <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isThis) return;
                        handleCoverTap(t as any);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (!isThis) return;
                        // desktop double click => like (hors radio)
                        if (isRadio) return;
                        const willLike = !isLiked;
                        toggleLike();
                        if (willLike) triggerLikeBurst();
                      }}
                      className="relative w-[78vw] max-w-[520px] aspect-square rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/6 via-white/3 to-white/6" />
                      <img
                        src={getCoverUrl(t)}
                        alt={t.title}
                        loading={isThis ? 'eager' : 'lazy'}
                        decoding="async"
                        // Toujours visible: éviter l'impression "page de chargement" entre les tracks.
                        // Le préchargement autour de l'item actif réduit déjà le pop-in.
                        className="absolute inset-0 w-full h-full object-cover"
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
                        if (isRadio) return;
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
                        if (isRadio) return;
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
                        if (isRadio) return;
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
                          <h2 className="text-lg font-semibold truncate">{displayTitle}</h2>
                          <div className="mt-0.5 flex items-center gap-2 text-sm flex-wrap">
                            <span className="font-medium truncate">
                              {displayArtist}
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
      {activeTrackId && !activeIsRadio && (
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

