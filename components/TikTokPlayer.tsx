'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  memo,
  type ElementType,
  type MouseEvent,
  type TouchEvent as ReactTouchEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  X, Heart, MessageCircle, Share2, Download, Play, Pause,
  FileText, Lock, Loader2, ListPlus, ChevronDown, Music2,
  User, Bookmark, Zap, Sparkles, Disc3,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { notify } from '@/components/NotificationCenter';

import { useAudioPlayer } from '@/app/providers';
import { useLikeSystem } from '@/hooks/useLikeSystem';
import { useDownloadPermission, downloadAudioFile } from '@/hooks/useDownloadPermission';
import { sendTrackEvents } from '@/lib/analyticsClient';
import { getCdnUrl } from '@/lib/cdn';
import { applyCdnToTracks } from '@/lib/cdnHelpers';

import FollowButton from '@/components/FollowButton';
import CommentDialog from '@/components/CommentDialog';
import DownloadDialog from '@/components/DownloadDialog';
import QueueBubble from '@/components/QueueBubble';
import QueueDialog from '@/components/QueueDialog';
import TrackCover from '@/components/TrackCover';

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface Artist {
  _id: string;
  name: string;
  username: string;
  avatar?: string;
  isVerified?: boolean;
}

interface Track {
  _id: string;
  title: string;
  artist: Artist;
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  likes: number | string[];
  comments: number | string[];
  plays: number;
  isLiked?: boolean;
  genre?: string[];
  lyrics?: string;
  shares?: number;
  isBoosted?: boolean;
  isAI?: boolean;
}

interface TikTokPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrackId?: string;
}

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const FEED_LIMIT = 50;
const BOOSTED_LIMIT = 10;
const BOOSTED_INTERVAL = 5;
const PRELOAD_RANGE = 3;
const AUDIO_PRELOAD_COUNT = 2;
const INFINITE_SCROLL_THRESHOLD = 6;
const WHEEL_LOCK_MS = 600;
const SNAP_SETTLE_MS = 300;
const SCROLL_GUARD_MS = 800;
const DOUBLE_TAP_MS = 250;
const AUTOPLAY_DEBOUNCE_MS = 60;
const GESTURE_COOLDOWN_MS = 500;
const RADIO_POLL_MS = 8_000;

/** Virtual window — only render activeIndex ± RENDER_BUFFER */
const RENDER_BUFFER = 1;

const RADIO_TRACKS: Track[] = [
  {
    _id: 'radio-mixx-party',
    title: 'Mixx Party Radio',
    artist: { _id: 'radio-artist-mixx', name: 'Mixx Party', username: 'mixxparty', avatar: '' },
    audioUrl: 'https://manager11.streamradio.fr:2425/stream',
    coverUrl: '/mixxpartywhitelog.png',
    duration: -1,
    likes: [],
    comments: [],
    plays: 0,
    isLiked: false,
    genre: ['Electronic', 'Dance'],
  },
  {
    _id: 'radio-ximam',
    title: 'XimaM Music Radio',
    artist: { _id: 'radio-artist-ximam', name: 'XimaM', username: 'ximam', avatar: '' },
    audioUrl: 'https://manager11.streamradio.fr:2745/stream',
    coverUrl: '/ximam-radio-x.svg',
    duration: -1,
    likes: [],
    comments: [],
    plays: 0,
    isLiked: false,
    genre: ['Electronic'],
  },
];

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════ */

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const trackId = (t: { _id?: string; id?: string } | null | undefined): string =>
  t?._id ?? (t as any)?.id ?? '';

const isRadioId = (id: string) => id.startsWith('radio-');

const fmtTime = (s = 0) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const fmtCount = (n: number) => {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
};

const countOf = (v: unknown): number =>
  Array.isArray(v) ? v.length : typeof v === 'number' ? v : 0;

function coverUrl(track: Track | null): string | null {
  const raw = track?.coverUrl;
  if (!raw) return null;
  const url = getCdnUrl(raw) || raw;
  return typeof url === 'string' && url.includes('res.cloudinary.com')
    ? url.replace('/upload/', '/upload/f_auto,q_auto/')
    : url;
}

/* ═══════════════════════════════════════════════════════════════
   FEED STATE — useReducer replaces 6 useState + scattered logic
   ═══════════════════════════════════════════════════════════════ */

interface FeedState {
  loading: boolean;
  tracks: Track[];
  activeIndex: number;
  cursor: number;
  hasMore: boolean;
  loadingMore: boolean;
}

type FeedAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; tracks: Track[]; startIndex: number; cursor: number; hasMore: boolean }
  | { type: 'LOAD_FAIL' }
  | { type: 'APPEND'; tracks: Track[]; cursor: number; hasMore: boolean }
  | { type: 'SET_INDEX'; index: number }
  | { type: 'SET_LOADING_MORE'; value: boolean }
  | { type: 'RESET' };

const feedInitial: FeedState = {
  loading: false,
  tracks: [],
  activeIndex: 0,
  cursor: 0,
  hasMore: true,
  loadingMore: false,
};

function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true };
    case 'LOAD_SUCCESS':
      return {
        ...state,
        loading: false,
        tracks: action.tracks,
        activeIndex: action.startIndex,
        cursor: action.cursor,
        hasMore: action.hasMore,
        loadingMore: false,
      };
    case 'LOAD_FAIL':
      return { ...state, loading: false };
    case 'APPEND': {
      const seen = new Set(state.tracks.map(trackId));
      const fresh = action.tracks.filter(t => !seen.has(trackId(t)));
      return {
        ...state,
        tracks: [...state.tracks, ...fresh],
        cursor: action.cursor,
        hasMore: action.hasMore,
        loadingMore: false,
      };
    }
    case 'SET_INDEX':
      return state.activeIndex === action.index ? state : { ...state, activeIndex: action.index };
    case 'SET_LOADING_MORE':
      return { ...state, loadingMore: action.value };
    case 'RESET':
      return feedInitial;
    default:
      return state;
  }
}

/* ═══════════════════════════════════════════════════════════════
   SHARED FEED LOGIC — boosted injection helper (DRY)
   ═══════════════════════════════════════════════════════════════ */

function injectBoosted(
  regular: Track[],
  boosted: Track[],
  interval = BOOSTED_INTERVAL,
): Track[] {
  const regularIds = new Set(regular.map(trackId));
  const available = boosted.filter(b => !regularIds.has(trackId(b)));
  if (!available.length) return regular;

  const result: Track[] = [];
  let bIdx = 0;
  for (let i = 0; i < regular.length; i++) {
    result.push(regular[i]);
    if ((i + 1) % interval === 0 && bIdx < available.length) {
      result.push(available[bIdx++]);
    }
  }
  return result;
}

async function fetchBoosted(): Promise<Track[]> {
  try {
    const res = await fetch(`/api/tracks/boosted?limit=${BOOSTED_LIMIT}`, { cache: 'no-store' });
    const json = await res.json();
    const list = applyCdnToTracks(Array.isArray(json?.tracks) ? json.tracks : []) as Track[];
    return list.map(t => ({ ...t, isBoosted: true }));
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════
   HOOK: useRadioNowPlaying
   ═══════════════════════════════════════════════════════════════ */

interface RadioMeta {
  station: 'mixx_party' | 'ximam';
  title: string;
  artist: string;
  listeners: number;
}

function useRadioNowPlaying(activeId: string, isOpen: boolean): RadioMeta | null {
  const [meta, setMeta] = useState<RadioMeta | null>(null);

  const station = useMemo<'mixx_party' | 'ximam' | null>(() => {
    if (activeId === 'radio-ximam') return 'ximam';
    if (activeId === 'radio-mixx-party') return 'mixx_party';
    return null;
  }, [activeId]);

  useEffect(() => {
    if (!isOpen || !station) return;
    let cancelled = false;
    const url = station === 'ximam'
      ? '/api/radio/status?station=ximam'
      : '/api/radio/status?station=mixx_party';

    const tick = async () => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        const title = String(json?.data?.currentTrack?.title || '').trim();
        const artist = String(json?.data?.currentTrack?.artist || '').trim();
        const listeners = parseInt(json?.data?.stats?.listeners ?? 0, 10) || 0;
        if (title) {
          setMeta(prev =>
            prev?.station === station && prev.title === title && prev.artist === artist && prev.listeners === listeners
              ? prev
              : { station, title, artist, listeners },
          );
        }
      } catch { /* ignore */ }
    };

    tick();
    const id = setInterval(tick, RADIO_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [station, isOpen]);

  return meta;
}

/* ═══════════════════════════════════════════════════════════════
   HOOK: usePreloader — image + audio prefetch
   ═══════════════════════════════════════════════════════════════ */

function usePreloader(
  tracks: Track[],
  activeIndex: number,
  isOpen: boolean,
) {
  // Cover image preloading
  const loadedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!isOpen || !tracks.length) return;
    const lo = Math.max(0, activeIndex - PRELOAD_RANGE);
    const hi = Math.min(tracks.length - 1, activeIndex + PRELOAD_RANGE);
    for (let i = lo; i <= hi; i++) {
      const id = trackId(tracks[i]);
      if (!id || loadedRef.current.has(id)) continue;
      const url = coverUrl(tracks[i]);
      if (!url) continue;
      const img = new Image();
      img.onload = () => loadedRef.current.add(id);
      img.src = url;
    }
  }, [activeIndex, isOpen, tracks]);

  // Audio <link rel="preload"> for next tracks
  useEffect(() => {
    if (!isOpen || !tracks.length) return;
    const links: HTMLLinkElement[] = [];
    const next = tracks.slice(activeIndex + 1, activeIndex + 1 + AUDIO_PRELOAD_COUNT);
    for (const t of next) {
      const u = t.audioUrl;
      if (!u || u.toLowerCase().endsWith('.m3u8') || /\/listen\//i.test(u)) continue;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'audio';
      link.href = u;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      links.push(link);
    }
    return () => links.forEach(l => l.parentNode?.removeChild(l));
  }, [activeIndex, isOpen, tracks]);
}

/* ═══════════════════════════════════════════════════════════════
   HOOK: useCommentCounts — batch fetch
   ═══════════════════════════════════════════════════════════════ */

function useCommentCounts(tracks: Track[], isOpen: boolean) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const fetched = useRef(new Set<string>());

  useEffect(() => {
    if (!isOpen || !tracks.length) return;
    const ids = tracks
      .map(t => t._id)
      .filter(id => id && !isRadioId(id) && !id.startsWith('ai-') && !fetched.current.has(id));
    if (!ids.length) return;
    ids.forEach(id => fetched.current.add(id));

    fetch('/api/tracks/comments-count', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackIds: ids }),
    })
      .then(r => r.json())
      .then(data => {
        if (data?.counts && typeof data.counts === 'object') {
          setCounts(prev => ({ ...prev, ...data.counts }));
        }
      })
      .catch(() => {});
  }, [isOpen, tracks]);

  return counts;
}

/* ═══════════════════════════════════════════════════════════════
   HOOK: useScrollSnap — wheel, keyboard, touch, scroll detection
   ═══════════════════════════════════════════════════════════════ */

interface ScrollSnapOpts {
  isOpen: boolean;
  trackCount: number;
  activeIndex: number;
  locked: boolean; // when modals are open
  onNavigate: (index: number, source: string) => void;
  onTogglePlay: () => void;
  onClose: () => void;
}

function useScrollSnap(opts: ScrollSnapOpts) {
  const { isOpen, trackCount, activeIndex, locked, onNavigate, onTogglePlay, onClose } = opts;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wheelLockRef = useRef(false);
  const isTouchingRef = useRef(false);
  const programmaticRef = useRef(false);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastScrollAt = useRef(0);

  const getItemTop = useCallback((idx: number) => {
    const el = itemRefs.current[idx];
    if (el) return el.offsetTop;
    const c = containerRef.current;
    return idx * Math.max(1, c?.clientHeight || window.innerHeight);
  }, []);

  const scrollTo = useCallback((idx: number, behavior: ScrollBehavior = 'smooth') => {
    const el = containerRef.current;
    if (!el) return;
    const i = clamp(idx, 0, Math.max(0, trackCount - 1));
    const top = getItemTop(i);
    if (Math.abs(el.scrollTop - top) < 2) return;
    programmaticRef.current = true;
    el.scrollTo({ top, behavior });
    setTimeout(() => { programmaticRef.current = false; }, behavior === 'smooth' ? 500 : 100);
  }, [getItemTop, trackCount]);

  const visibleIndex = useCallback(() => {
    const el = containerRef.current;
    if (!el || el.clientHeight <= 0) return activeIndex;
    return clamp(Math.round(el.scrollTop / el.clientHeight), 0, Math.max(0, trackCount - 1));
  }, [activeIndex, trackCount]);

  // Wheel (desktop) — one track per gesture
  useEffect(() => {
    if (!isOpen) return;
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (locked) return;
      e.preventDefault();
      if (wheelLockRef.current) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const next = clamp(activeIndex + dir, 0, trackCount - 1);
      if (next === activeIndex) return;
      wheelLockRef.current = true;
      scrollTo(next, 'smooth');
      onNavigate(next, 'tiktok-player-wheel');
      setTimeout(() => { wheelLockRef.current = false; }, WHEEL_LOCK_MS);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [isOpen, activeIndex, trackCount, locked, scrollTo, onNavigate]);

  // Keyboard
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (locked) return;
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown': {
          e.preventDefault();
          const next = Math.min(trackCount - 1, activeIndex + 1);
          scrollTo(next, 'smooth');
          onNavigate(next, 'tiktok-player-key');
          break;
        }
        case 'ArrowUp':
        case 'PageUp': {
          e.preventDefault();
          const prev = Math.max(0, activeIndex - 1);
          scrollTo(prev, 'smooth');
          onNavigate(prev, 'tiktok-player-key');
          break;
        }
        case ' ':
        case 'Spacebar':
          e.preventDefault();
          onTogglePlay();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, activeIndex, trackCount, locked, scrollTo, onNavigate, onTogglePlay, onClose]);

  // Touch end → wait for snap, then detect index
  const onTouchEnd = useCallback(() => {
    if (locked) return;
    isTouchingRef.current = false;
    clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => {
      const idx = visibleIndex();
      if (idx !== activeIndex) onNavigate(idx, 'tiktok-player-touch');
    }, SNAP_SETTLE_MS);
  }, [locked, visibleIndex, activeIndex, onNavigate]);

  // Scroll (CSS snap backup for non-touch desktop)
  const onScroll = useCallback(() => {
    lastScrollAt.current = Date.now();
    if (programmaticRef.current || isTouchingRef.current || wheelLockRef.current || locked) return;
    clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => {
      const idx = visibleIndex();
      if (idx !== activeIndex) onNavigate(idx, 'tiktok-player-scroll');
    }, 200);
  }, [locked, visibleIndex, activeIndex, onNavigate]);

  const onTouchStart = useCallback(() => {
    isTouchingRef.current = true;
    clearTimeout(snapTimerRef.current);
  }, []);

  // Cleanup
  useEffect(() => () => clearTimeout(snapTimerRef.current), []);

  return {
    containerRef,
    itemRefs,
    scrollTo,
    onTouchStart,
    onTouchEnd,
    onScroll,
    lastScrollAt,
    isTouchingRef,
    programmaticRef,
  };
}

/* ═══════════════════════════════════════════════════════════════
   HOOK: useDoubleTapLike
   ═══════════════════════════════════════════════════════════════ */

function useDoubleTapLike(
  isLiked: boolean,
  toggleLike: () => void,
  triggerBurst: () => void,
  currentId: string | undefined,
  playTrack: (t: any) => Promise<void>,
  audioIsPlaying: boolean,
  pause: () => void,
  play: () => void,
) {
  const lastTapRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return useCallback((t: Track) => {
    const id = trackId(t);
    if (!id) return;
    const isRadio = isRadioId(id);
    const now = Date.now();

    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      // Double tap → like
      clearTimeout(timerRef.current);
      lastTapRef.current = 0;
      if (!isRadio) {
        try { (navigator as any)?.vibrate?.(12); } catch { /* noop */ }
        const willLike = !isLiked;
        toggleLike();
        if (willLike) triggerBurst();
      }
      return;
    }

    // Single tap — wait to confirm not double
    lastTapRef.current = now;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (currentId !== id) playTrack(t as any);
      else if (audioIsPlaying) pause();
      else play();
    }, DOUBLE_TAP_MS);
  }, [isLiked, toggleLike, triggerBurst, currentId, playTrack, audioIsPlaying, pause, play]);
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT: SeekBar — rAF-driven, zero re-renders
   ═══════════════════════════════════════════════════════════════ */

interface SeekBarProps {
  onSeek: (time: number) => void;
  getAudioElement: () => HTMLAudioElement | null;
}

const SeekBar = memo(function SeekBar({ onSeek, getAudioElement }: SeekBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const durRef = useRef<HTMLSpanElement>(null);
  const [bubble, setBubble] = useState<{ shown: boolean; left: number; value: number }>({
    shown: false, left: 0, value: 0,
  });

  const commit = useCallback((clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return;
    const a = getAudioElement();
    const dur = a && Number.isFinite(a.duration) ? a.duration : 0;
    const x = clamp(clientX - rect.left, 0, rect.width);
    const value = (x / rect.width) * dur;
    setBubble({ shown: true, left: x, value });
    onSeek(value);
  }, [getAudioElement, onSeek]);

  const hide = useCallback(() => setBubble(p => ({ ...p, shown: false })), []);

  // rAF loop — direct DOM mutations, no React re-renders
  useEffect(() => {
    let raf = 0;
    let lt = -1;
    let ld = -1;
    const tick = () => {
      const a = getAudioElement();
      const time = a && Number.isFinite(a.currentTime) ? a.currentTime : 0;
      const dur = a && Number.isFinite(a.duration) ? a.duration : 0;
      if (dur !== ld || time !== lt) {
        const pct = dur > 0 ? clamp((time / dur) * 100, 0, 100) : 0;
        const w = `${pct}%`;
        if (fillRef.current) fillRef.current.style.width = w;
        if (glowRef.current) glowRef.current.style.width = w;
        if (knobRef.current) knobRef.current.style.left = w;
        if (timeRef.current) timeRef.current.textContent = fmtTime(time);
        if (durRef.current) durRef.current.textContent = fmtTime(dur);
        lt = time;
        ld = dur;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getAudioElement]);

  const stopPropagation = useCallback((e: ReactTouchEvent) => e.stopPropagation(), []);

  return (
    <div className="w-full" onTouchStart={stopPropagation} onTouchMove={stopPropagation} onTouchEnd={stopPropagation}>
      <div
        ref={barRef}
        className="group relative h-[6px] hover:h-[10px] w-full rounded-full bg-white/[0.08] overflow-visible cursor-pointer transition-all duration-150"
        onPointerDown={(e: ReactPointerEvent) => commit(e.clientX)}
        onPointerMove={(e: ReactPointerEvent) => e.buttons === 1 && commit(e.clientX)}
        onPointerUp={hide}
        onPointerLeave={hide}
        onTouchStart={(e: ReactTouchEvent) => commit(e.touches[0].clientX)}
        onTouchMove={(e: ReactTouchEvent) => commit(e.touches[0].clientX)}
        onTouchEnd={hide}
      >
        <div
          ref={glowRef}
          className="absolute inset-y-0 left-0 rounded-full blur-[6px] opacity-50"
          style={{ width: '0%', background: 'linear-gradient(90deg,#a855f7,#6366f1)' }}
        />
        <div
          ref={fillRef}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: '0%', background: 'linear-gradient(90deg,#a855f7,#6366f1)' }}
        />
        <div
          ref={knobRef}
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(168,85,247,0.5)] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: '0%' }}
        />
        {bubble.shown && (
          <div
            className="absolute -top-9"
            style={{ left: clamp(bubble.left - 22, 0, (barRef.current?.getBoundingClientRect().width || 0) - 44) }}
          >
            <div className="rounded-lg bg-black/80 backdrop-blur-sm px-2.5 py-1 text-[11px] font-mono tabular-nums text-white border border-white/10 shadow-lg">
              {fmtTime(bubble.value)}
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-white/50 tabular-nums font-medium">
        <span ref={timeRef}>{fmtTime(0)}</span>
        <span ref={durRef}>{fmtTime(0)}</span>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════
   COMPONENT: HeartBurst
   ═══════════════════════════════════════════════════════════════ */

const HeartBurst = memo(function HeartBurst({ burstKey }: { burstKey: number }) {
  if (burstKey <= 0) return null;
  return (
    <motion.div
      key={burstKey}
      className="pointer-events-none fixed inset-0 z-[140] grid place-items-center"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1.1, opacity: 1 }}
        exit={{ opacity: 0, scale: 0.8, y: -40 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        <Heart size={72} fill="#ff4b7a" className="text-rose-400 drop-shadow-[0_0_30px_rgba(255,75,122,0.6)]" />
      </motion.div>
    </motion.div>
  );
});

/* ═══════════════════════════════════════════════════════════════
   COMPONENT: ActionBtn
   ═══════════════════════════════════════════════════════════════ */

interface ActionBtnProps {
  icon: ElementType;
  label: string | number;
  active?: boolean;
  activeColor?: string;
  disabled?: boolean;
  onClick: (e: MouseEvent) => void;
}

const ActionBtn = memo(function ActionBtn({
  icon: Icon, label, active, activeColor, disabled, onClick,
}: ActionBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group/btn relative flex flex-col items-center gap-1.5 transition-all duration-200 active:scale-90 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}
    >
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200
          ${active
            ? `${activeColor || 'bg-rose-500/25 border-rose-400/40 shadow-[0_0_20px_rgba(244,63,94,0.25)]'} border`
            : 'bg-black/30 border border-white/[0.12] backdrop-blur-xl group-hover/btn:bg-white/[0.12]'
          }`}
      >
        <Icon
          size={22}
          className={`transition-all duration-200 drop-shadow-lg ${active ? (activeColor ? '' : 'text-rose-400') : 'text-white'}`}
          fill={active ? 'currentColor' : 'none'}
        />
      </div>
      {(typeof label === 'number' ? label > 0 : label) && (
        <span className="text-[11px] font-semibold text-white/80 leading-none drop-shadow-md tabular-nums">
          {typeof label === 'number' ? fmtCount(label) : label}
        </span>
      )}
    </button>
  );
});

/* ═══════════════════════════════════════════════════════════════
   COMPONENT: TrackSlide — a single full-screen slide
   ═══════════════════════════════════════════════════════════════ */

interface TrackSlideProps {
  track: Track;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  duration: number;
  isRadio: boolean;
  displayTitle: string;
  displayArtist: string;
  likesCount: number;
  rawComments: number;
  isLiked: boolean;
  lyricsOpen: boolean;
  radioMeta: RadioMeta | null;
  albumContext: { id: string; name: string } | null;
  canDownload: boolean;
  // handlers
  onCoverTap: (t: Track) => void;
  onDoubleTapLike: () => void;
  onToggleLike: () => void;
  onComments: () => void;
  onShare: (t: Track) => void;
  onDownload: () => void;
  onAddToQueue: (t: Track) => void;
  onToggleLyrics: () => void;
  onPlayPause: (t: Track) => void;
  onClose: () => void;
  onSeek: (time: number) => void;
  getAudioElement: () => HTMLAudioElement | null;
  itemRef: (el: HTMLDivElement | null) => void;
}

const TrackSlide = memo(function TrackSlide(props: TrackSlideProps) {
  const {
    track: t, index, isActive, isPlaying, duration, isRadio,
    displayTitle, displayArtist, likesCount, rawComments,
    isLiked, lyricsOpen, radioMeta, albumContext, canDownload,
    onCoverTap, onDoubleTapLike, onToggleLike, onComments,
    onShare, onDownload, onAddToQueue, onToggleLyrics,
    onPlayPause, onClose, onSeek, getAudioElement, itemRef,
  } = props;

  const cover = useMemo(() => coverUrl(t), [t]);
  const genres = useMemo(() => (t.genre || []).filter(g => g && g !== 'undefined').slice(0, 2), [t.genre]);

  return (
    <div
      ref={itemRef}
      data-index={index}
      className="relative h-[100dvh] w-full flex flex-col"
      style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
    >
      {/* Cover area */}
      <div className="flex-1 flex items-center justify-center px-8 pt-20 pb-6">
        <button
          onClick={e => { e.stopPropagation(); if (isActive) onCoverTap(t); }}
          onDoubleClick={e => { e.stopPropagation(); if (isActive && !isRadio) onDoubleTapLike(); }}
          className="relative w-[70vw] max-w-[380px] aspect-square group/cover"
        >
          {/* Shadow glow */}
          <div
            className="absolute -inset-4 rounded-[36px] opacity-50 blur-[50px] -z-10 transition-opacity duration-700"
            style={cover
              ? { backgroundImage: `url(${cover})`, backgroundSize: 'cover' }
              : { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          />
          {/* Cover image */}
          <div className={`relative w-full h-full rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.12] transition-transform duration-300 ${isPlaying ? 'scale-[1.02]' : 'scale-100'}`}>
            {cover ? (
              <img
                src={cover}
                alt={t.title}
                loading="eager"
                decoding="async"
                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[10000ms] ease-linear ${isPlaying ? 'scale-[1.08]' : 'scale-100'}`}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <TrackCover
                src={null}
                title={t.title}
                className={`absolute inset-0 w-full h-full transition-transform duration-[10000ms] ease-linear ${isPlaying ? 'scale-[1.08]' : 'scale-100'}`}
                rounded="rounded-none"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

            {/* Play/Pause overlay */}
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover/cover:opacity-100' : 'opacity-100'}`}>
              <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl border border-white/[0.15] flex items-center justify-center shadow-2xl">
                {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
              </div>
            </div>

            {/* Genre tags */}
            {genres.length > 0 && !isRadio && (
              <div className="absolute top-3 left-3 flex gap-1.5">
                {genres.map(g => (
                  <span key={g} className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-xl text-[10px] font-bold text-white/90 border border-white/[0.1]">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* LIVE badge */}
            {isRadio && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-500/80 backdrop-blur-sm border border-red-400/30 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[11px] font-black text-white uppercase tracking-widest">Live</span>
              </div>
            )}

            {/* Badges */}
            {!isRadio && (
              <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                {t.isBoosted && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl backdrop-blur-sm border border-violet-500/30 shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(245,158,11,0.3))' }}>
                    <Zap className="w-3 h-3 text-amber-400" style={{ fill: 'rgba(245,158,11,0.3)' }} />
                    <span className="text-[11px] font-black text-white/90">Boosted</span>
                  </div>
                )}
                {(t.isAI || String(t._id).startsWith('ai-')) && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-600/60 backdrop-blur-sm border border-violet-400/30 shadow-lg">
                    <Sparkles className="w-3 h-3 text-violet-200" />
                    <span className="text-[11px] font-black text-white/90">IA</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Right sidebar */}
      <aside className="absolute right-3 z-20 flex flex-col items-center gap-3 top-1/2 -translate-y-1/2 md:top-auto md:bottom-[220px] md:translate-y-0">
        <ActionBtn
          icon={Heart}
          label={isActive ? likesCount : countOf(t.likes)}
          active={isActive && isLiked}
          activeColor="bg-rose-500/20 border-rose-400/25 text-rose-400"
          disabled={!isActive || isRadio}
          onClick={e => { e.stopPropagation(); onToggleLike(); }}
        />
        <ActionBtn
          icon={MessageCircle}
          label={rawComments}
          disabled={!isActive || isRadio}
          onClick={e => { e.stopPropagation(); onComments(); }}
        />
        <ActionBtn
          icon={Share2}
          label={t.shares || 0}
          onClick={e => { e.stopPropagation(); onShare(t); }}
        />
        <ActionBtn
          icon={canDownload ? Download : Lock}
          label=""
          disabled={!isActive || isRadio || !canDownload}
          onClick={e => { e.stopPropagation(); onDownload(); }}
        />
        <ActionBtn
          icon={ListPlus}
          label="File"
          disabled={!isActive || isRadio}
          onClick={e => {
            e.stopPropagation();
            onAddToQueue(t);
          }}
        />
      </aside>

      {/* Bottom panel */}
      <footer className="relative z-20 px-4 pb-[max(env(safe-area-inset-bottom,16px),16px)]">
        <div className="mx-auto max-w-lg overflow-hidden rounded-[24px] border border-white/[0.1] bg-black/40 backdrop-blur-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.4)]">
          <div className="p-4 pb-3">
            {/* Track info */}
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-11 h-11 rounded-full overflow-hidden ring-2 ring-white/[0.1] bg-white/[0.05]">
                {isRadio ? (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-violet-700 grid place-items-center">
                    <img src={t.coverUrl || ''} alt="" className="w-8 h-6 object-contain" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                ) : t.artist?.avatar ? (
                  <img src={getCdnUrl(t.artist.avatar) || t.artist.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center">
                    <User size={18} className="text-white/30" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-bold truncate leading-tight text-white">{displayTitle}</h2>
                <div className="mt-0.5 flex items-center gap-2 text-[13px] flex-wrap">
                  <span className="font-medium text-white/60 truncate">{displayArtist}</span>
                  {t.artist?._id && t.artist?.username && (
                    <span onClick={e => e.stopPropagation()}>
                      <FollowButton artistId={t.artist._id} artistUsername={t.artist.username} size="sm" />
                    </span>
                  )}
                </div>
                {albumContext && isActive && (
                  <a
                    href={`/album/${albumContext.id}`}
                    onClick={e => { e.stopPropagation(); onClose(); }}
                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-violet-300/70 hover:text-violet-300 transition truncate"
                  >
                    <Disc3 className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{albumContext.name}</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); onPlayPause(t); }}
                  className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg shadow-white/10 hover:scale-105 transition-all active:scale-95"
                  aria-label={isPlaying ? 'Pause' : 'Lecture'}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                {t.lyrics && (
                  <button
                    onClick={e => { e.stopPropagation(); if (isActive) onToggleLyrics(); }}
                    className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-90 ${
                      isActive && lyricsOpen
                        ? 'bg-purple-500/20 border-purple-400/30 text-purple-300'
                        : 'bg-white/[0.06] border-white/[0.1] hover:bg-white/[0.12] text-white/60'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Seek bar / Live indicator */}
            <div className="mt-4">
              {isRadio ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest">En direct</span>
                  </div>
                  {isActive && radioMeta && radioMeta.listeners > 0 && (
                    <span className="text-[11px] text-white/35 tabular-nums">
                      {radioMeta.listeners >= 1000 ? `${(radioMeta.listeners / 1000).toFixed(1)}k` : radioMeta.listeners} auditeurs
                    </span>
                  )}
                </div>
              ) : isActive ? (
                <SeekBar onSeek={onSeek} getAudioElement={getAudioElement} />
              ) : (
                <div className="w-full">
                  <div className="relative h-[5px] w-full rounded-full bg-white/[0.08] overflow-hidden" />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-white/40 tabular-nums font-medium">
                    <span>{fmtTime(0)}</span>
                    <span>{fmtTime(duration)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Lyrics */}
            <AnimatePresence>
              {isActive && lyricsOpen && t.lyrics && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 max-h-36 overflow-y-auto text-[13px] leading-relaxed whitespace-pre-wrap text-white/60 border-t border-white/[0.08] pt-3 scrollbar-thin scrollbar-thumb-white/10">
                    {t.lyrics}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </footer>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════
   COMPONENT: LoadingScreen
   ═══════════════════════════════════════════════════════════════ */

const LoadingScreen = memo(function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] bg-black text-white grid place-items-center">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-t-purple-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <Music2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-white/60" />
        </div>
        <p className="text-sm text-white/50 font-medium">Chargement du feed…</p>
      </motion.div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function TikTokPlayer({ isOpen, onClose, initialTrackId }: TikTokPlayerProps) {
  const reduceMotion = useReducedMotion();

  const {
    audioState, albumContext, setTracks, setCurrentTrackIndex,
    setQueueAndPlay, setQueueOnly, playTrack, play, pause,
    seek, getAudioElement, addToUpNext,
  } = useAudioPlayer();

  const { canDownload, upgradeMessage } = useDownloadPermission();

  /* ── Feed state ── */
  const [feed, dispatch] = useReducer(feedReducer, feedInitial);
  const { loading, tracks, activeIndex } = feed;

  /* ── UI state ── */
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [burstVisible, setBurstVisible] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);

  /* ── Refs ── */
  const didBootRef = useRef(false);
  const suppressAutoplayRef = useRef(false);
  const lastGesturePlayAtRef = useRef(0);
  const prevQueueRef = useRef<{ tracks: any[]; currentTrackIndex: number } | null>(null);
  const openedTrackIdRef = useRef<string | null>(null);
  const changedTrackRef = useRef(false);
  const feedLoadedRef = useRef(false);
  const openSeedIdRef = useRef<string | null>(null);
  const lastViewedRef = useRef<string | null>(null);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout>>();

  /* ── Derived ── */
  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  const currentId = currentTrack?._id;
  const activeTrack = tracks[activeIndex] ?? null;
  const activeTrackId = trackId(activeTrack);
  const activeIsRadio = isRadioId(activeTrackId);
  const modalsOpen = commentsOpen || showDownloadDialog || lyricsOpen;

  /* ── Hooks ── */
  const radioMeta = useRadioNowPlaying(activeTrackId, isOpen);
  const commentCounts = useCommentCounts(tracks, isOpen);
  usePreloader(tracks, activeIndex, isOpen);

  const { isLiked, likesCount, toggleLike, checkLikeStatus } = useLikeSystem({
    trackId: activeTrackId,
    initialLikesCount: countOf(activeTrack?.likes),
    initialIsLiked: !!activeTrack?.isLiked,
  });

  useEffect(() => { if (activeTrackId) checkLikeStatus(); }, [activeTrackId, checkLikeStatus]);

  /* ── Navigation handler ── */
  const playIndexFromGesture = useCallback(async (i: number, source: string) => {
    const t = tracks[i];
    if (!t?._id) return;
    lastGesturePlayAtRef.current = Date.now();
    suppressAutoplayRef.current = true;
    dispatch({ type: 'SET_INDEX', index: i });
    setCurrentTrackIndex(i);
    try {
      await playTrack(t as any);
      if (openedTrackIdRef.current && t._id !== openedTrackIdRef.current) changedTrackRef.current = true;
      try { sendTrackEvents(t._id, { event_type: 'play_start', source }); } catch { /* noop */ }
    } finally {
      requestAnimationFrame(() => { suppressAutoplayRef.current = false; });
    }
  }, [playTrack, setCurrentTrackIndex, tracks]);

  /* ── Scroll snap ── */
  const scrollSnap = useScrollSnap({
    isOpen,
    trackCount: tracks.length,
    activeIndex,
    locked: modalsOpen,
    onNavigate: playIndexFromGesture,
    onTogglePlay: useCallback(() => { audioState.isPlaying ? pause() : play(); }, [audioState.isPlaying, pause, play]),
    onClose: useCallback(() => {
      if (prevQueueRef.current && !changedTrackRef.current) {
        try {
          setTracks(prevQueueRef.current.tracks as any);
          setCurrentTrackIndex(prevQueueRef.current.currentTrackIndex);
        } catch { /* noop */ }
        prevQueueRef.current = null;
      }
      openedTrackIdRef.current = null;
      changedTrackRef.current = false;
      feedLoadedRef.current = false;
      openSeedIdRef.current = null;
      onClose();
    }, [onClose, setCurrentTrackIndex, setTracks]),
  });

  const closeHandler = useCallback(() => {
    if (prevQueueRef.current && !changedTrackRef.current) {
      try {
        setTracks(prevQueueRef.current.tracks as any);
        setCurrentTrackIndex(prevQueueRef.current.currentTrackIndex);
      } catch { /* noop */ }
      prevQueueRef.current = null;
    }
    openedTrackIdRef.current = null;
    changedTrackRef.current = false;
    feedLoadedRef.current = false;
    openSeedIdRef.current = null;
    onClose();
  }, [onClose, setCurrentTrackIndex, setTracks]);

  /* ── Like burst ── */
  const triggerBurst = useCallback(() => {
    clearTimeout(burstTimerRef.current);
    setBurstVisible(true);
    setBurstKey(k => k + 1);
    burstTimerRef.current = setTimeout(() => setBurstVisible(false), 500);
  }, []);

  useEffect(() => () => clearTimeout(burstTimerRef.current), []);

  /* ── Double-tap ── */
  const handleCoverTap = useDoubleTapLike(
    isLiked, toggleLike, triggerBurst, currentId,
    playTrack, audioState.isPlaying, pause, play,
  );

  /* ── Lock body scroll ── */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  /* ── Save queue on open ── */
  useEffect(() => {
    if (!isOpen) return;
    if (!prevQueueRef.current) {
      prevQueueRef.current = { tracks: audioState.tracks || [], currentTrackIndex: audioState.currentTrackIndex || 0 };
    }
    if (!openedTrackIdRef.current) {
      openedTrackIdRef.current = trackId(audioState.tracks?.[audioState.currentTrackIndex]) || null;
    }
    if (!openSeedIdRef.current) {
      openSeedIdRef.current = initialTrackId || openedTrackIdRef.current || null;
    }
    changedTrackRef.current = false;
  }, [audioState.currentTrackIndex, audioState.tracks, isOpen, initialTrackId]);

  /* ── Load feed ── */
  useEffect(() => {
    if (!isOpen || feedLoadedRef.current) return;
    feedLoadedRef.current = true;
    let mounted = true;
    didBootRef.current = false;
    setCommentsOpen(false);
    setLyricsOpen(false);
    suppressAutoplayRef.current = true;
    dispatch({ type: 'LOAD_START' });

    (async () => {
      try {
        const [feedRes, boosted] = await Promise.all([
          fetch(`/api/ranking/feed?limit=${FEED_LIMIT}&ai=1&strategy=reco&cursor=0`, { cache: 'no-store' }).then(r => r.json()),
          fetchBoosted(),
        ]);
        if (!mounted) return;

        const regular = applyCdnToTracks(Array.isArray(feedRes?.tracks) ? feedRes.tracks : []) as Track[];
        const withBoosted = injectBoosted(regular, boosted);
        const merged: Track[] = [...RADIO_TRACKS, ...withBoosted];

        const prev = prevQueueRef.current;
        const prevCurrent = prev?.tracks?.[prev.currentTrackIndex] ?? null;
        const prevId = trackId(prevCurrent);
        if (prevCurrent && prevId && !merged.some(t => trackId(t) === prevId)) {
          merged.unshift(prevCurrent as Track);
        }

        const seedId = openSeedIdRef.current || openedTrackIdRef.current || prevId || trackId(merged[0]);
        const idx = seedId ? merged.findIndex(t => trackId(t) === seedId) : 0;
        const startIndex = Math.max(0, idx);

        setTracks(merged as any);
        setCurrentTrackIndex(startIndex);

        const curr = audioState.tracks?.[audioState.currentTrackIndex];
        const alreadyPlaying = Boolean(audioState.isPlaying && curr?._id === trackId(merged[startIndex]));
        if (alreadyPlaying) setQueueOnly(merged as any, startIndex);
        else setQueueAndPlay(merged as any, startIndex);

        dispatch({
          type: 'LOAD_SUCCESS',
          tracks: merged,
          startIndex,
          cursor: typeof feedRes?.nextCursor === 'number' ? feedRes.nextCursor : merged.length,
          hasMore: Boolean(feedRes?.hasMore),
        });

        requestAnimationFrame(() => {
          scrollSnap.scrollTo(startIndex, 'auto');
          suppressAutoplayRef.current = false;
        });
      } catch {
        if (mounted) dispatch({ type: 'LOAD_FAIL' });
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /* ── Boot sync — instant scroll ── */
  useEffect(() => {
    if (!isOpen || !tracks.length || didBootRef.current) return;
    const seed = openSeedIdRef.current;
    if (!seed) return;
    const idx = tracks.findIndex(t => t._id === seed);
    if (idx >= 0) {
      didBootRef.current = true;
      dispatch({ type: 'SET_INDEX', index: idx });
      scrollSnap.scrollTo(idx, 'auto');
    }
  }, [isOpen, tracks, scrollSnap]);

  /* ── View analytics ── */
  useEffect(() => {
    if (!isOpen || !activeTrackId || lastViewedRef.current === activeTrackId) return;
    lastViewedRef.current = activeTrackId;
    try { sendTrackEvents(activeTrackId, { event_type: 'view', source: 'tiktok-player', is_ai_track: String(activeTrackId).startsWith('ai-') }); } catch { /* noop */ }
  }, [isOpen, activeTrackId]);

  /* ── Auto-play on index change ── */
  useEffect(() => {
    if (!isOpen || suppressAutoplayRef.current) return;
    if (Date.now() - lastGesturePlayAtRef.current < GESTURE_COOLDOWN_MS) return;
    const t = tracks[activeIndex];
    if (!t?._id || currentId === t._id) return;
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        playTrack(t as any).catch?.(() => {});
        if (openedTrackIdRef.current && t._id !== openedTrackIdRef.current) changedTrackRef.current = true;
        try { sendTrackEvents(t._id, { event_type: 'play_start', source: 'tiktok-player' }); } catch { /* noop */ }
      });
    }, AUTOPLAY_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [isOpen, activeIndex, tracks, playTrack, currentId]);

  /* ── Infinite scroll ── */
  useEffect(() => {
    if (!isOpen || feed.loadingMore || !tracks.length) return;
    if (activeIndex < tracks.length - INFINITE_SCROLL_THRESHOLD) return;
    dispatch({ type: 'SET_LOADING_MORE', value: true });

    (async () => {
      try {
        const cursor = feed.hasMore ? feed.cursor : 0;
        const [feedRes, boosted] = await Promise.all([
          fetch(`/api/ranking/feed?limit=${FEED_LIMIT}&ai=1&strategy=reco&cursor=${cursor}`, { cache: 'no-store' }).then(r => r.json()),
          fetchBoosted(),
        ]);
        const regular = applyCdnToTracks(Array.isArray(feedRes?.tracks) ? feedRes.tracks : []) as Track[];
        const withBoosted = injectBoosted(regular, boosted, 4);

        dispatch({
          type: 'APPEND',
          tracks: withBoosted,
          cursor: typeof feedRes?.nextCursor === 'number' ? feedRes.nextCursor : cursor + regular.length,
          hasMore: Boolean(feedRes?.hasMore),
        });
        // Sync global player queue
        setTracks([...tracks, ...withBoosted] as any);
      } catch {
        dispatch({ type: 'SET_LOADING_MORE', value: false });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, isOpen]);

  /* ── Sync external track change → scroll ── */
  useEffect(() => {
    if (!isOpen || !tracks.length || modalsOpen) return;
    if (scrollSnap.isTouchingRef.current) return;
    if (Date.now() - scrollSnap.lastScrollAt.current < SCROLL_GUARD_MS) return;
    const idx = audioState.currentTrackIndex;
    if (!Number.isFinite(idx) || idx < 0 || idx === activeIndex) return;
    dispatch({ type: 'SET_INDEX', index: idx });
    requestAnimationFrame(() => scrollSnap.scrollTo(idx, 'smooth'));
  }, [audioState.currentTrackIndex, isOpen, tracks.length, modalsOpen, activeIndex, scrollSnap]);

  /* ── Handlers ── */
  const onShare = useCallback(async (t: Track) => {
    const url = albumContext
      ? `${window.location.origin}/album/${albumContext.id}`
      : `${window.location.origin}/track/${t._id}`;
    const title = albumContext ? albumContext.name : t.title;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title, text: `Ecoute ${title} sur Synaura`, url });
      } else {
        await navigator.clipboard.writeText(url);
        notify.success('OK', 'Lien copié !');
      }
      try { sendTrackEvents(t._id, { event_type: 'share', source: 'tiktok-player' }); } catch { /* noop */ }
    } catch { /* noop */ }
  }, [albumContext]);

  const handleDownload = useCallback(() => {
    if (!activeTrack) return;
    if (!canDownload) { notify.error('Erreur', upgradeMessage || 'Fonction non disponible'); return; }
    setShowDownloadDialog(true);
  }, [activeTrack, canDownload, upgradeMessage]);

  const confirmDownload = useCallback(async () => {
    if (!activeTrack) return;
    try {
      setIsDownloading(true);
      const filename = `${activeTrack.artist?.name || 'Artiste'}-${activeTrack.title || 'Titre'}.wav`.replace(/\s+/g, '_');
      await downloadAudioFile(activeTrack.audioUrl || '', filename, () => {});
      notify.success('OK', 'Téléchargement terminé !');
    } catch { notify.error('Erreur', 'Échec du téléchargement'); }
    finally { setIsDownloading(false); setShowDownloadDialog(false); }
  }, [activeTrack]);

  const onPlayPause = useCallback((t: Track) => {
    if (currentId !== t._id) playTrack(t as any);
    else if (audioState.isPlaying) pause();
    else play();
  }, [currentId, playTrack, audioState.isPlaying, pause, play]);

  const bgUrl = useMemo(() => coverUrl(activeTrack || tracks[0] || null), [activeTrack, tracks]);

  /* ═══ RENDER ═══ */

  if (!isOpen) return null;
  if (loading) return <LoadingScreen />;

  /**
   * VIRTUAL RENDERING — only mount activeIndex ± RENDER_BUFFER
   * Placeholder divs maintain correct scroll height for off-screen items.
   */
  const renderRange = {
    lo: Math.max(0, activeIndex - RENDER_BUFFER),
    hi: Math.min(tracks.length - 1, activeIndex + RENDER_BUFFER),
  };

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
          {/* Background blur */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={bgUrl}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.5 }}
                className="absolute inset-0"
              >
                {bgUrl && (
                  <img
                    src={bgUrl}
                    alt=""
                    loading="eager"
                    decoding="async"
                    className="h-full w-full object-cover blur-[60px] scale-150 saturate-150 opacity-30"
                  />
                )}
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(99,102,241,0.12),transparent_60%)]" />
          </div>

          {/* Header */}
          <header className="absolute top-0 left-0 right-0 z-[120] px-4 pt-[max(env(safe-area-inset-top,12px),12px)] pb-3">
            <div className="flex items-center justify-between">
              <button
                onClick={closeHandler}
                className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-xl grid place-items-center border border-white/[0.1] hover:bg-white/10 transition-all active:scale-90"
                title="Fermer"
              >
                <ChevronDown size={22} className="text-white/90" />
              </button>
              <div className="flex items-center gap-2">
                {tracks.length > 1 && (
                  <div className="px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-xl border border-white/[0.1] text-[11px] font-bold text-white/70 tabular-nums">
                    {activeIndex + 1}<span className="text-white/30 mx-0.5">/</span>{tracks.length}
                  </div>
                )}
                <QueueBubble variant="pill" onClick={() => setShowQueue(true)} />
              </div>
              <div className="w-10" />
            </div>
          </header>

          <QueueDialog isOpen={showQueue} onClose={() => setShowQueue(false)} />
          <AnimatePresence>{burstVisible && <HeartBurst burstKey={burstKey} />}</AnimatePresence>

          {/* Scroll container — virtualized */}
          <div
            ref={scrollSnap.containerRef}
            onTouchStart={scrollSnap.onTouchStart}
            onTouchEnd={scrollSnap.onTouchEnd}
            onScroll={scrollSnap.onScroll}
            className="h-full w-full overflow-y-auto overscroll-none"
            style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
          >
            {tracks.map((t, i) => {
              // Virtual rendering: off-screen items become empty placeholders
              if (i < renderRange.lo || i > renderRange.hi) {
                return (
                  <div
                    key={t._id || i}
                    ref={el => { scrollSnap.itemRefs.current[i] = el; }}
                    className="h-[100dvh] w-full"
                    style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
                  />
                );
              }

              const isThis = i === activeIndex;
              const isPlayingThis = isThis && currentId === t._id && audioState.isPlaying;
              const duration = isThis && currentId === t._id ? audioState.duration || t.duration || 0 : t.duration || 0;
              const isRadio = isRadioId(t._id);
              const displayTitle = isThis && isRadio && radioMeta ? radioMeta.title : (t.title || 'Titre inconnu');
              const displayArtist = isThis && isRadio && radioMeta
                ? radioMeta.artist
                : (t.artist?.name || t.artist?.username || 'Artiste inconnu');

              return (
                <TrackSlide
                  key={t._id || i}
                  track={t}
                  index={i}
                  isActive={isThis}
                  isPlaying={isPlayingThis}
                  duration={duration}
                  isRadio={isRadio}
                  displayTitle={displayTitle}
                  displayArtist={displayArtist}
                  likesCount={isThis ? likesCount : countOf(t.likes)}
                  rawComments={commentCounts[t._id] ?? countOf(t.comments)}
                  isLiked={isThis ? isLiked : false}
                  lyricsOpen={isThis ? lyricsOpen : false}
                  radioMeta={radioMeta}
                  albumContext={albumContext as any}
                  canDownload={canDownload}
                  onCoverTap={handleCoverTap}
                  onDoubleTapLike={() => {
                    const willLike = !isLiked;
                    toggleLike();
                    if (willLike) triggerBurst();
                  }}
                  onToggleLike={toggleLike}
                  onComments={() => setCommentsOpen(true)}
                  onShare={onShare}
                  onDownload={handleDownload}
                  onAddToQueue={t => {
                    addToUpNext(t as any, 'end');
                    notify.success('OK', `${t.title || 'Titre'} ajouté à la file`);
                  }}
                  onToggleLyrics={() => setLyricsOpen(v => !v)}
                  onPlayPause={onPlayPause}
                  onClose={closeHandler}
                  onSeek={seek}
                  getAudioElement={getAudioElement}
                  itemRef={el => { scrollSnap.itemRefs.current[i] = el; }}
                />
              );
            })}

            {!tracks.length && (
              <div className="h-[100dvh] flex flex-col items-center justify-center gap-3 text-white/50">
                <Music2 className="w-12 h-12 text-white/20" />
                <p className="text-sm font-medium">Aucune musique à afficher</p>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      {activeTrackId && !activeIsRadio && (
        <CommentDialog
          trackId={activeTrackId}
          trackTitle={activeTrack?.title || 'Titre'}
          trackArtist={activeTrack?.artist?.name || activeTrack?.artist?.username || 'Artiste'}
          initialComments={[]}
          isOpen={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          className=""
        />
      )}
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
