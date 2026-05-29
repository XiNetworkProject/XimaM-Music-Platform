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
import { useSession } from 'next-auth/react';
import { notify } from '@/components/NotificationCenter';

import { useAudioPlayer } from '@/app/providers';
import { useLikeSystem } from '@/hooks/useLikeSystem';
import { useDownloadPermission, downloadAudioFile } from '@/hooks/useDownloadPermission';
import { sendTrackEvents } from '@/lib/analyticsClient';
import { getCdnUrl } from '@/lib/cdn';
import { applyCdnToTracks } from '@/lib/cdnHelpers';

import FollowButton from '@/components/FollowButton';
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
  createdAt?: string;
  tags?: string[];
}

interface PlayerCommentUser {
  id: string;
  username: string;
  name: string;
  avatar?: string;
}

interface PlayerComment {
  id: string;
  content: string;
  createdAt: string;
  user: PlayerCommentUser;
  replies: PlayerComment[];
}

interface TikTokPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrackId?: string;
}

type FeedMode = 'reco' | 'trending' | 'boost';

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const FEED_LIMIT = 120;
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

const FEED_MODE_META: Record<FeedMode, { label: string; accent: string; description: string }> = {
  reco: {
    label: 'Pour toi',
    accent: 'from-fuchsia-500/50 via-violet-500/35 to-sky-500/40',
    description: 'une suite personnalisee qui reste proche du son de depart',
  },
  trending: {
    label: 'Tendances',
    accent: 'from-amber-400/50 via-orange-500/35 to-rose-500/35',
    description: 'les morceaux qui prennent de la vitesse maintenant',
  },
  boost: {
    label: 'Boost',
    accent: 'from-cyan-400/40 via-violet-500/35 to-fuchsia-500/45',
    description: 'les titres pousses dans l’app, melanges au feed principal',
  },
};

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

function topGenre(track: Track | null): string | null {
  const genre = (track?.genre || [])
    .map((value) => String(value || '').trim())
    .find(Boolean);
  return genre || null;
}

function uniqueTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  const result: Track[] = [];
  for (const track of tracks) {
    const id = trackId(track);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(track);
  }
  return result;
}

function insertRadioTracks(tracks: Track[], mode: FeedMode): Track[] {
  if (!tracks.length) return RADIO_TRACKS;

  const result = [...tracks];
  const positions = mode === 'boost' ? [4, 11] : mode === 'trending' ? [6] : [8];

  RADIO_TRACKS.forEach((radioTrack, radioIndex) => {
    if (result.some((track) => trackId(track) === radioTrack._id)) return;
    const fallback = Math.min(result.length, 6 + radioIndex * 6);
    const insertAt = Math.min(result.length, positions[radioIndex] ?? fallback);
    result.splice(insertAt, 0, radioTrack);
  });

  return result;
}

async function fetchFeedChunk(mode: FeedMode, cursor: number, seedGenre: string | null) {
  const params = new URLSearchParams({
    limit: String(FEED_LIMIT),
    ai: '1',
    cursor: String(Math.max(0, cursor)),
  });

  if (mode === 'trending') {
    params.set('strategy', 'trending');
  } else {
    params.set('strategy', 'reco');
    if (seedGenre) params.set('genre', seedGenre);
  }

  const [feedRes, boostedTracks] = await Promise.all([
    fetch(`/api/ranking/feed?${params.toString()}`, { cache: 'no-store' }).then((response) => response.json()),
    fetchBoosted(),
  ]);

  const feedTracks = applyCdnToTracks(Array.isArray(feedRes?.tracks) ? feedRes.tracks : []) as Track[];

  let merged: Track[] = feedTracks;
  if (mode === 'boost') {
    merged = uniqueTracks([
      ...boostedTracks.slice(0, Math.min(boostedTracks.length, 6)),
      ...injectBoosted(feedTracks, boostedTracks, 2),
    ]);
  } else if (mode === 'trending') {
    merged = injectBoosted(feedTracks, boostedTracks, 6);
  } else {
    merged = injectBoosted(feedTracks, boostedTracks, BOOSTED_INTERVAL);
  }

  if (mode === 'reco' && seedGenre && merged.length < 16) {
    const fallbackParams = new URLSearchParams({
      limit: String(FEED_LIMIT),
      ai: '1',
      cursor: String(Math.max(0, cursor)),
      strategy: 'reco',
    });
    const fallbackRes = await fetch(`/api/ranking/feed?${fallbackParams.toString()}`, { cache: 'no-store' }).then((response) => response.json());
    const fallbackTracks = applyCdnToTracks(Array.isArray(fallbackRes?.tracks) ? fallbackRes.tracks : []) as Track[];
    merged = uniqueTracks([...merged, ...injectBoosted(fallbackTracks, boostedTracks, BOOSTED_INTERVAL)]);
  }

  return {
    tracks: uniqueTracks(merged),
    nextCursor: typeof feedRes?.nextCursor === 'number' ? feedRes.nextCursor : cursor + feedTracks.length,
    hasMore: Boolean(feedRes?.hasMore),
  };
}

function normalizePlayerComment(raw: any): PlayerComment {
  return {
    id: String(raw?.id || ''),
    content: String(raw?.content || ''),
    createdAt: String(raw?.createdAt || raw?.created_at || new Date().toISOString()),
    user: {
      id: String(raw?.user?.id || raw?.user_id || ''),
      username: String(raw?.user?.username || 'utilisateur'),
      name: String(raw?.user?.name || raw?.user?.username || 'Membre'),
      avatar: typeof raw?.user?.avatar === 'string' ? raw.user.avatar : '',
    },
    replies: Array.isArray(raw?.replies) ? raw.replies.map(normalizePlayerComment) : [],
  };
}

async function copyTextToClipboard(value: string, successMessage: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      notify.success('OK', successMessage);
      return true;
    }
  } catch {
    /* fallback below */
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.setAttribute('readonly', 'true');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (copied) {
      notify.success('OK', successMessage);
      return true;
    }
  } catch {}

  notify.error('Erreur', 'Impossible de copier');
  return false;
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
  previousTrack: Track | null;
  nextTrack: Track | null;
  duration: number;
  isRadio: boolean;
  displayTitle: string;
  displayArtist: string;
  likesCount: number;
  rawComments: number;
  shareCount: number;
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
  onJump: (index: number, source: string) => void;
  onPlayPause: (t: Track) => void;
  onClose: () => void;
  onSeek: (time: number) => void;
  getAudioElement: () => HTMLAudioElement | null;
  itemRef: (el: HTMLDivElement | null) => void;
}

const TrackSlide = memo(function TrackSlide(props: TrackSlideProps) {
  const {
    track: t, index, isActive, isPlaying, previousTrack, nextTrack, duration, isRadio,
    displayTitle, displayArtist, likesCount, rawComments, shareCount,
    isLiked, lyricsOpen, radioMeta, albumContext, canDownload,
    onCoverTap, onDoubleTapLike, onToggleLike, onComments,
    onShare, onDownload, onAddToQueue, onToggleLyrics,
    onJump, onPlayPause, onClose, onSeek, getAudioElement, itemRef,
  } = props;

  const cover = useMemo(() => coverUrl(t), [t]);
  const genres = useMemo(() => (t.genre || []).filter(g => g && g !== 'undefined').slice(0, 2), [t.genre]);

  return (
    <div
      ref={itemRef}
      data-index={index}
      className="relative h-[100dvh] w-full px-4 pb-[max(env(safe-area-inset-bottom,18px),18px)] pt-[146px] md:px-6 md:pt-[164px] lg:px-8"
      style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
    >
      <div className="mx-auto flex h-full max-w-6xl flex-col justify-center">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_340px] lg:items-stretch">
          <section className="overflow-hidden rounded-[2rem] border border-white/[0.1] bg-[#171313]/62 shadow-[0_26px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 md:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#fffaf2]/42">Lecture immersive</p>
                <p className="mt-1 text-sm font-black text-white">
                  {nextTrack ? 'Le flux continue naturellement vers le bas' : 'Fin de la selection actuelle'}
                </p>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-[11px] font-semibold text-white/58 sm:flex">
                <ChevronDown className="h-3.5 w-3.5 -rotate-180" />
                <span>{previousTrack ? previousTrack.title : 'Debut du fil'}</span>
                <span className="text-white/22">/</span>
                <span>{nextTrack ? nextTrack.title : 'Aucun suivant'}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="grid gap-6 p-4 md:p-5 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)] lg:p-6">
              <button
                onClick={e => { e.stopPropagation(); if (isActive) onCoverTap(t); }}
                onDoubleClick={e => { e.stopPropagation(); if (isActive && !isRadio) onDoubleTapLike(); }}
                className="group/cover relative mx-auto aspect-square w-full max-w-[280px] md:max-w-[340px] lg:max-w-[380px]"
              >
                <div
                  className="absolute -inset-5 rounded-[38px] opacity-55 blur-[55px] -z-10 transition-opacity duration-700"
                  style={cover
                    ? { backgroundImage: `url(${cover})`, backgroundSize: 'cover' }
                    : { background: 'linear-gradient(135deg, #ff8a66, #7c5cff)' }}
                />
                <div className={`relative h-full w-full overflow-hidden rounded-[2rem] ring-1 ring-white/[0.12] shadow-[0_22px_64px_rgba(0,0,0,0.44)] transition-transform duration-300 ${isPlaying ? 'scale-[1.015]' : 'scale-100'}`}>
                  {cover ? (
                    <img
                      src={cover}
                      alt={t.title}
                      loading="eager"
                      decoding="async"
                      className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[10000ms] ease-linear ${isPlaying ? 'scale-[1.08]' : 'scale-100'}`}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <TrackCover
                      src={null}
                      title={t.title}
                      className={`absolute inset-0 h-full w-full transition-transform duration-[10000ms] ease-linear ${isPlaying ? 'scale-[1.08]' : 'scale-100'}`}
                      rounded="rounded-none"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-black/8" />

                  {genres.length > 0 && !isRadio ? (
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      {genres.map((g) => (
                        <span key={g} className="rounded-full border border-white/[0.1] bg-black/38 px-2.5 py-1 text-[10px] font-bold text-white/90 backdrop-blur-xl">
                          {g}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {isRadio ? (
                    <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-xl border border-red-400/30 bg-red-500/80 px-2.5 py-1 shadow-lg">
                      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-white">Live</span>
                    </div>
                  ) : (
                    <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
                      {t.isBoosted ? (
                        <div className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 px-2.5 py-1 shadow-lg backdrop-blur-sm" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(245,158,11,0.3))' }}>
                          <Zap className="h-3 w-3 text-amber-400" style={{ fill: 'rgba(245,158,11,0.3)' }} />
                          <span className="text-[11px] font-black text-white/90">Boosted</span>
                        </div>
                      ) : null}
                      {(t.isAI || String(t._id).startsWith('ai-')) ? (
                        <div className="flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-600/60 px-2.5 py-1 shadow-lg backdrop-blur-sm">
                          <Sparkles className="h-3 w-3 text-violet-200" />
                          <span className="text-[11px] font-black text-white/90">IA</span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="rounded-[1.2rem] border border-white/[0.1] bg-black/34 p-3 backdrop-blur-xl">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/44">Gestes rapides</p>
                      <p className="mt-1 text-sm font-black text-white">
                        {isRadio ? 'Tape pour lire ou mettre en pause la radio.' : 'Tape pour lecture, double-tape pour liker.'}
                      </p>
                    </div>
                  </div>

                  <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover/cover:opacity-100' : 'opacity-100'}`}>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.15] bg-black/40 shadow-2xl backdrop-blur-xl">
                      {isPlaying ? <Pause className="h-6 w-6 text-white" /> : <Play className="ml-0.5 h-6 w-6 text-white" />}
                    </div>
                  </div>
                </div>
              </button>

              <div className="flex min-h-0 flex-col">
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[1rem] bg-white/[0.06] ring-1 ring-white/[0.08]">
                    {isRadio ? (
                      <img src={t.coverUrl || ''} alt="" className="h-7 w-10 object-contain" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    ) : t.artist?.avatar ? (
                      <img src={getCdnUrl(t.artist.avatar) || t.artist.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User size={18} className="text-white/34" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#fffaf2]/42">
                      {isRadio ? 'Radio en direct' : 'Son actif dans le fil'}
                    </p>
                    <h2 className="mt-1 text-2xl font-black leading-tight text-white md:text-[2rem]">{displayTitle}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/62">
                      <span className="font-semibold">{displayArtist}</span>
                      {t.artist?._id && t.artist?.username ? (
                        <span onClick={e => e.stopPropagation()}>
                          <FollowButton artistId={t.artist._id} artistUsername={t.artist.username} size="sm" />
                        </span>
                      ) : null}
                    </div>
                    {albumContext && isActive ? (
                      <a
                        href={`/album/${albumContext.id}`}
                        onClick={e => { e.stopPropagation(); onClose(); }}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#fffaf2]/62 transition hover:text-white"
                      >
                        <Disc3 className="h-3.5 w-3.5" />
                        {albumContext.name}
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 hidden grid-cols-3 gap-2 md:grid">
                  <div className="rounded-[1.1rem] border border-white/[0.08] bg-white/[0.04] px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/36">Likes</p>
                    <p className="mt-1 text-lg font-black text-white">{fmtCount(isActive ? likesCount : countOf(t.likes))}</p>
                  </div>
                  <div className="rounded-[1.1rem] border border-white/[0.08] bg-white/[0.04] px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/36">Commentaires</p>
                    <p className="mt-1 text-lg font-black text-white">{fmtCount(rawComments)}</p>
                  </div>
                  <div className="rounded-[1.1rem] border border-white/[0.08] bg-white/[0.04] px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/36">Partages</p>
                    <p className="mt-1 text-lg font-black text-white">{fmtCount(shareCount)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={e => { e.stopPropagation(); onPlayPause(t); }}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-[#fffaf2] px-5 text-sm font-black text-[#171313] transition hover:opacity-92 active:scale-[0.98]"
                    aria-label={isPlaying ? 'Pause' : 'Lecture'}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                    {isPlaying ? 'Pause' : 'Lire'}
                  </button>
                  <div className="flex flex-wrap items-center gap-3">
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
                      label={shareCount}
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
                  </div>
                </div>

                <div className="mt-5 rounded-[1.35rem] border border-white/[0.08] bg-white/[0.04] px-4 py-4">
                  {isRadio ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-red-300">En direct</span>
                      </div>
                      {isActive && radioMeta && radioMeta.listeners > 0 ? (
                        <span className="text-xs font-semibold text-white/48 tabular-nums">
                          {radioMeta.listeners >= 1000 ? `${(radioMeta.listeners / 1000).toFixed(1)}k` : radioMeta.listeners} auditeurs
                        </span>
                      ) : null}
                    </div>
                  ) : isActive ? (
                    <SeekBar onSeek={onSeek} getAudioElement={getAudioElement} />
                  ) : (
                    <div className="w-full">
                      <div className="relative h-[5px] w-full overflow-hidden rounded-full bg-white/[0.08]" />
                      <div className="mt-2 flex items-center justify-between text-[11px] font-medium tabular-nums text-white/40">
                        <span>{fmtTime(0)}</span>
                        <span>{fmtTime(duration)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-[1.25rem] border border-[#fffaf2]/12 bg-[#fffaf2]/8 px-4 py-4 md:hidden">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#fffaf2]/46">Suite du fil</p>
                  <p className="mt-1 text-sm font-black text-white">{nextTrack?.title || 'Le flux charge ici se termine'}</p>
                  <p className="truncate text-xs text-white/52">{nextTrack?.artist?.name || nextTrack?.artist?.username || 'Change de mode pour repartir'}</p>
                </div>

                <div className="mt-4 hidden gap-3 md:grid md:grid-cols-2">
                  <div className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">Avant</p>
                    <p className="mt-1 truncate text-sm font-black text-white">{previousTrack?.title || 'Tu es au debut du fil'}</p>
                    <p className="truncate text-xs text-white/48">{previousTrack?.artist?.name || previousTrack?.artist?.username || 'Aucun son precedent'}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-[#fffaf2]/12 bg-[#fffaf2]/8 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#fffaf2]/46">Après</p>
                    <p className="mt-1 truncate text-sm font-black text-white">{nextTrack?.title || 'Le flux charge ici se termine'}</p>
                    <p className="truncate text-xs text-white/52">{nextTrack?.artist?.name || nextTrack?.artist?.username || 'Change de mode pour repartir'}</p>
                  </div>
                </div>

                <AnimatePresence>
                  {isActive && lyricsOpen && t.lyrics ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 rounded-[1.35rem] border border-white/[0.08] bg-black/18 px-4 py-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">Paroles</p>
                          <button
                            onClick={e => { e.stopPropagation(); onToggleLyrics(); }}
                            className="inline-flex h-8 items-center rounded-full border border-white/[0.08] bg-white/[0.05] px-3 text-[11px] font-black text-white/62 transition hover:bg-white/[0.1] hover:text-white"
                          >
                            Refermer
                          </button>
                        </div>
                        <div className="max-h-36 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-white/64 scrollbar-thin scrollbar-thumb-white/10">
                          {t.lyrics}
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </section>

          <aside className="hidden flex-col gap-4 lg:flex">
            <div className="rounded-[1.8rem] border border-black/[0.08] bg-[#fffaf2]/95 p-5 text-[#171313] shadow-[0_22px_54px_rgba(30,25,20,0.18)] backdrop-blur-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/36">Direction du scroll</p>
              <div className="mt-3 flex items-center justify-center gap-2 text-black/48">
                <ChevronDown className="h-4 w-4 -rotate-180" />
                <ChevronDown className="h-5 w-5 animate-bounce" />
              </div>
              <p className="mt-3 text-base font-black">
                {nextTrack ? 'Le prochain son est en dessous.' : 'Ce mode a fini sa sélection visible.'}
              </p>
              <p className="mt-2 text-sm leading-6 text-black/58">
                Ici le scroll fait partie du player: tu lis la carte en cours, puis tu montes ou descends dans le fil sans changer d’écran.
              </p>
            </div>

            <div className="rounded-[1.8rem] border border-white/[0.08] bg-[#171313]/58 p-5 text-white shadow-[0_20px_54px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">Enchainement</p>
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  disabled={!previousTrack}
                  onClick={() => previousTrack && onJump(index - 1, 'tiktok-player-card-prev')}
                  className="flex w-full items-start justify-between gap-3 rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.08] disabled:opacity-45"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/34">Avant</p>
                    <p className="mt-1 truncate text-sm font-black text-white">{previousTrack?.title || 'Aucun son avant'}</p>
                    <p className="truncate text-xs text-white/46">{previousTrack?.artist?.name || previousTrack?.artist?.username || 'Debut du flux'}</p>
                  </div>
                  <ChevronDown className="mt-1 h-4 w-4 -rotate-180 text-white/38" />
                </button>

                <button
                  type="button"
                  disabled={!nextTrack}
                  onClick={() => nextTrack && onJump(index + 1, 'tiktok-player-card-next')}
                  className="flex w-full items-start justify-between gap-3 rounded-[1.25rem] border border-[#fffaf2]/12 bg-[#fffaf2]/8 px-4 py-3 text-left transition hover:bg-[#fffaf2]/12 disabled:opacity-45"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/34">Après</p>
                    <p className="mt-1 truncate text-sm font-black text-white">{nextTrack?.title || 'Aucun son apres celui-ci'}</p>
                    <p className="truncate text-xs text-white/46">{nextTrack?.artist?.name || nextTrack?.artist?.username || 'Fin du flux'}</p>
                  </div>
                  <ChevronDown className="mt-1 h-4 w-4 text-white/38" />
                </button>
              </div>

              {t.lyrics ? (
                <button
                  onClick={e => { e.stopPropagation(); if (isActive) onToggleLyrics(); }}
                  className={`mt-4 inline-flex h-10 items-center rounded-full border px-4 text-xs font-black transition ${
                    isActive && lyricsOpen
                      ? 'border-violet-400/30 bg-violet-500/20 text-violet-200'
                      : 'border-white/[0.08] bg-white/[0.05] text-white/62 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {lyricsOpen ? 'Masquer les paroles' : 'Voir les paroles'}
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
});

const MinimalTrackSlide = memo(function MinimalTrackSlide(props: TrackSlideProps) {
  const {
    track: t, index, isActive, isPlaying, duration, isRadio,
    displayTitle, displayArtist, likesCount, rawComments, shareCount,
    isLiked, lyricsOpen, radioMeta, albumContext, canDownload,
    onCoverTap, onDoubleTapLike, onToggleLike, onComments,
    onShare, onDownload, onAddToQueue, onToggleLyrics,
    onPlayPause, onClose, onSeek, getAudioElement, itemRef,
  } = props;

  const cover = useMemo(() => coverUrl(t), [t]);
  const genres = useMemo(() => (t.genre || []).filter(Boolean).slice(0, 2), [t.genre]);
  const isAi = Boolean(t.isAI || String(t._id).startsWith('ai-'));

  return (
    <div
      ref={itemRef}
      data-index={index}
      className="relative h-[100dvh] w-full overflow-hidden px-4 pb-[max(env(safe-area-inset-bottom,16px),16px)] pt-[112px] md:px-8"
      style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
    >
      <div className="absolute inset-0">
        {cover ? (
          <img src={cover} alt="" className="h-full w-full scale-125 object-cover opacity-55 blur-3xl saturate-150" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-[#120d11]/86 via-[#120d11]/26 to-[#120d11]/92" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,111,97,0.16),transparent_28%),radial-gradient(circle_at_88%_30%,rgba(124,92,255,0.13),transparent_32%)]" />
      </div>

      <div className="relative z-10 mx-auto flex h-full max-w-6xl items-center justify-center">
        <div className="grid w-full items-end gap-5 md:grid-cols-[minmax(0,1fr)_82px]">
          <div className="min-w-0">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); if (isActive) onCoverTap(t); }}
              onDoubleClick={e => { e.stopPropagation(); if (isActive && !isRadio) onDoubleTapLike(); }}
              className="group/cover relative mx-auto block aspect-square w-[min(78vw,520px)] overflow-hidden rounded-[2rem] border border-white/[0.12] bg-white/[0.06] shadow-[0_32px_110px_rgba(0,0,0,0.44)] md:w-[min(54vh,520px)]"
            >
              {cover ? (
                <img
                  src={cover}
                  alt={t.title}
                  className={`h-full w-full object-cover transition-transform duration-[12000ms] ease-linear ${isPlaying ? 'scale-[1.08]' : 'scale-100'}`}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <TrackCover src={null} title={t.title} className="h-full w-full" rounded="rounded-none" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/54 via-transparent to-black/12" />

              <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                {isRadio ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    Live
                  </span>
                ) : null}
                {t.isBoosted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fffaf2] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#171313]">
                    <Zap className="h-3 w-3" />
                    Boost
                  </span>
                ) : null}
                {isAi ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                    <Sparkles className="h-3 w-3" />
                    IA
                  </span>
                ) : null}
              </div>

              <div className={`absolute inset-0 grid place-items-center transition ${isPlaying ? 'opacity-0 group-hover/cover:opacity-100' : 'opacity-100'}`}>
                <span className="grid h-20 w-20 place-items-center rounded-full border border-white/18 bg-black/48 shadow-2xl backdrop-blur-xl">
                  {isPlaying ? <Pause className="h-8 w-8 text-white" /> : <Play className="ml-1 h-8 w-8 fill-current text-white" />}
                </span>
              </div>
            </button>

            <div className="mx-auto mt-4 w-full max-w-[760px] rounded-[1.6rem] border border-white/[0.1] bg-black/34 p-4 shadow-[0_22px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/12">
                  {isRadio && t.coverUrl ? (
                    <img src={t.coverUrl} alt="" className="h-7 w-8 object-contain" />
                  ) : t.artist?.avatar ? (
                    <img src={getCdnUrl(t.artist.avatar) || t.artist.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User size={18} className="text-white/42" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {genres.map((genre) => (
                      <span key={genre} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/58">
                        {genre}
                      </span>
                    ))}
                    {albumContext ? (
                      <a href={`/album/${albumContext.id}`} onClick={e => { e.stopPropagation(); onClose(); }} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/58 hover:text-white">
                        Album
                      </a>
                    ) : null}
                  </div>
                  <h2 className="mt-2 line-clamp-2 text-2xl font-black leading-tight text-white md:text-3xl">{displayTitle}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-white/66">{displayArtist}</p>
                    {t.artist?._id && t.artist?.username && !isRadio ? (
                      <span onClick={e => e.stopPropagation()}>
                        <FollowButton artistId={t.artist._id} artistUsername={t.artist.username} size="sm" />
                      </span>
                    ) : null}
                    {isActive && isRadio && radioMeta?.listeners ? (
                      <span className="rounded-full bg-red-500/18 px-2.5 py-1 text-xs font-black text-red-100">
                        {fmtCount(radioMeta.listeners)} en direct
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                {isActive && !isRadio ? (
                  <SeekBar onSeek={onSeek} getAudioElement={getAudioElement} />
                ) : (
                  <div className="flex items-center justify-between text-[11px] font-medium tabular-nums text-white/42">
                    <span>{fmtTime(0)}</span>
                    <span>{fmtTime(duration)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="mx-auto flex flex-row items-center justify-center gap-3 md:flex-col md:justify-end">
            <ActionBtn
              icon={Heart}
              label={likesCount}
              active={isActive && isLiked}
              activeColor="bg-rose-500/22 border-rose-400/30 text-rose-300"
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
              label={shareCount}
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
              label=""
              disabled={!isActive || isRadio}
              onClick={e => {
                e.stopPropagation();
                onAddToQueue(t);
              }}
            />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onPlayPause(t); }}
              className="grid h-12 w-12 place-items-center rounded-full bg-[#fffaf2] text-[#171313] shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition active:scale-95"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
            </button>
          </aside>
        </div>
      </div>

      {t.lyrics ? (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); if (isActive) onToggleLyrics(); }}
          className="absolute bottom-[max(env(safe-area-inset-bottom,16px),16px)] left-4 z-20 inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-black/36 px-4 text-xs font-black text-white/70 backdrop-blur-xl transition hover:bg-white/10 hover:text-white"
        >
          <FileText className="h-4 w-4" />
          {lyricsOpen ? 'Masquer paroles' : 'Paroles'}
        </button>
      ) : null}

      <AnimatePresence>
        {isActive && lyricsOpen ? (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="absolute inset-x-3 bottom-3 z-40 mx-auto max-w-2xl rounded-[1.8rem] border border-white/12 bg-[#09070d]/92 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.44)] backdrop-blur-2xl"
            onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-white">Paroles</p>
              <button type="button" onClick={onToggleLyrics} className="grid h-9 w-9 place-items-center rounded-full bg-white/8 text-white/62">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 max-h-[38vh] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-white/68">
              {t.lyrics?.trim() || 'Aucune parole disponible.'}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════
   COMPONENT: LoadingScreen
   ═══════════════════════════════════════════════════════════════ */

function formatCommentTime(value: string) {
  const date = new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return '';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) return 'a l’instant';
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `il y a ${diffHours}h`;
  return date.toLocaleDateString('fr-FR');
}

function CommentIdentity({ comment }: { comment: PlayerComment }) {
  const letter = (comment.user.name || comment.user.username || '?').slice(0, 1).toUpperCase();
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-white ring-1 ring-white/10">
      {letter}
    </div>
  );
}

function PlayerCommentsDrawer({
  isOpen,
  track,
  commentCount,
  onClose,
  onCountChange,
}: {
  isOpen: boolean;
  track: Track | null;
  commentCount: number;
  onClose: () => void;
  onCountChange: (trackIdValue: string, nextCount: number) => void;
}) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<PlayerComment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const trackIdValue = trackId(track);
  const disabled = !trackIdValue || isRadioId(trackIdValue) || trackIdValue.startsWith('ai-');

  const loadComments = useCallback(async (mode: 'initial' | 'more' = 'initial') => {
    if (!trackIdValue || disabled) {
      setComments([]);
      setHasMore(false);
      setOffset(0);
      return;
    }

    const nextOffset = mode === 'initial' ? 0 : offset;
    if (mode === 'initial') setLoading(true);

    try {
      const response = await fetch(`/api/tracks/${encodeURIComponent(trackIdValue)}/comments?limit=8&offset=${nextOffset}`, {
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => null);
      const nextComments = (Array.isArray(payload?.comments) ? payload.comments : []).map(normalizePlayerComment);

      setComments((current) => (mode === 'initial' ? nextComments : [...current, ...nextComments]));
      setHasMore(Boolean(payload?.hasMore));
      setOffset(typeof payload?.nextOffset === 'number' ? payload.nextOffset : nextOffset + nextComments.length);
    } catch {
      notify.error('Erreur', 'Impossible de charger les commentaires');
    } finally {
      if (mode === 'initial') setLoading(false);
    }
  }, [disabled, offset, trackIdValue]);

  useEffect(() => {
    if (!isOpen) return;
    setText('');
    void loadComments('initial');
  }, [isOpen, loadComments, trackIdValue]);

  const handleSubmit = useCallback(async () => {
    if (!trackIdValue || disabled || !text.trim()) return;
    if (!session?.user) {
      notify.error('Erreur', 'Connecte-toi pour commenter');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/tracks/${encodeURIComponent(trackIdValue)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim() }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Impossible d’envoyer le commentaire');
      }

      const nextComment = normalizePlayerComment(payload?.comment);
      setComments((current) => [nextComment, ...current]);
      onCountChange(trackIdValue, commentCount + 1);
      setText('');
    } catch (error: any) {
      notify.error('Erreur', error?.message || 'Impossible d’envoyer le commentaire');
    } finally {
      setSubmitting(false);
    }
  }, [commentCount, disabled, onCountChange, session?.user, text, trackIdValue]);

  const renderComment = (comment: PlayerComment, nested = false) => (
    <div key={`${nested ? 'reply' : 'comment'}-${comment.id}`} className={nested ? 'ml-11 mt-2' : ''}>
      <div className="flex gap-3">
        <CommentIdentity comment={comment} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-black text-white">{comment.user.name}</span>
            <span className="text-xs font-semibold text-white/38">@{comment.user.username}</span>
            <span className="text-xs font-semibold text-white/28">{formatCommentTime(comment.createdAt)}</span>
          </div>
          <p className="mt-1 text-sm leading-6 text-white/72">{comment.content}</p>
          {comment.replies.length ? <div className="mt-2 space-y-2">{comment.replies.map((reply) => renderComment(reply, true))}</div> : null}
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div key="comments-drawer" className="fixed inset-0 z-[135]">
        <motion.button
          type="button"
          aria-label="Fermer les commentaires"
          className="absolute inset-0 bg-black/62 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <div className="absolute inset-x-0 bottom-0 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom,12px),12px)] pt-24">
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#09070d]/94 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
            onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
          >
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/40">Commentaires ancrés au player</p>
                  <h3 className="mt-1 text-lg font-black text-white">{track?.title || 'Commentaires'}</h3>
                  <p className="mt-1 text-sm text-white/48">
                    {commentCount ? `${fmtCount(commentCount)} reactions dans le fil` : 'Aucune reaction pour le moment'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/8 text-white/68 transition hover:bg-white/12 hover:text-white"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              {disabled ? (
                <p className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/52">
                  Les commentaires ne sont pas disponibles sur cette source.
                </p>
              ) : loading ? (
                <div className="flex items-center gap-2 text-sm text-white/48">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
                </div>
              ) : comments.length ? (
                <div className="space-y-4">{comments.map((comment) => renderComment(comment))}</div>
              ) : (
                <p className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/52">
                  Aucun commentaire pour le moment. Lance la conversation sans quitter le feed.
                </p>
              )}

              {hasMore && !disabled ? (
                <button
                  type="button"
                  onClick={() => void loadComments('more')}
                  className="mt-4 inline-flex h-10 items-center rounded-full border border-white/10 bg-white/8 px-4 text-xs font-black uppercase tracking-[0.18em] text-white/62 transition hover:bg-white/12 hover:text-white"
                >
                  Charger plus
                </button>
              ) : null}
            </div>

            {!disabled ? (
              <div className="border-t border-white/10 px-5 py-4">
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  className="min-h-[88px] w-full rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/26 focus:border-white/22"
                  placeholder="Ecris une reponse sans sortir du player..."
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-white/34">Tout reste dans cette couche du player.</p>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || !text.trim()}
                    className="inline-flex h-11 items-center rounded-full bg-[#fffaf2] px-5 text-sm font-black text-[#171313] transition hover:opacity-92 disabled:opacity-50"
                  >
                    {submitting ? 'Envoi...' : 'Publier'}
                  </button>
                </div>
              </div>
            ) : null}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function PlayerShareDrawer({
  isOpen,
  track,
  albumContext,
  onClose,
  onShared,
}: {
  isOpen: boolean;
  track: Track | null;
  albumContext: { id: string; name: string } | null;
  onClose: () => void;
  onShared: (trackIdValue: string, source?: string) => void;
}) {
  const { data: session } = useSession();
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);
  const trackIdValue = trackId(track);
  const canInternalShare = Boolean(trackIdValue && !isRadioId(trackIdValue) && !trackIdValue.startsWith('ai-'));
  const quickCaptions = ['Coup de coeur', 'A mettre en boucle', 'Besoin d avis'];

  const shareUrl = useMemo(() => {
    if (!trackIdValue) return '';
    if (albumContext) return `${window.location.origin}/album/${albumContext.id}`;
    return `${window.location.origin}/track/${trackIdValue}`;
  }, [albumContext, trackIdValue]);

  const shareText = useMemo(() => {
    if (!track) return '';
    const label = albumContext ? albumContext.name : track.title;
    const artist = track.artist?.name || track.artist?.username || 'Synaura';
    return `Ecoute ${label} de ${artist} sur Synaura\n${shareUrl}`;
  }, [albumContext, shareUrl, track]);

  const handleCopy = useCallback(async (value: string, successMessage: string) => {
    if (!trackIdValue || !value) return;
    const copied = await copyTextToClipboard(value, successMessage);
    if (!copied) return;
    onShared(trackIdValue, successMessage === 'Lien copie' ? 'tiktok-copy-link' : 'tiktok-copy-text');
    onClose();
  }, [onClose, onShared, trackIdValue]);

  const handleInternalShare = useCallback(async () => {
    if (!track || !trackIdValue || !canInternalShare) {
      notify.error('Erreur', 'Ce son ne peut pas etre republie');
      return;
    }
    if (!session?.user) {
      notify.error('Erreur', 'Connecte-toi pour publier dans le feed');
      return;
    }
    if (publishing) return;

    setPublishing(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'track_share',
          track_id: trackIdValue,
          content: caption.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Partage impossible');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('synaura:post-created', { detail: payload }));
      }
      onShared(trackIdValue, 'tiktok-internal-post');
      notify.success('OK', 'Son publie dans le feed');
      setCaption('');
      onClose();
    } catch (error: any) {
      notify.error('Erreur', error?.message || 'Impossible de publier ce son');
    } finally {
      setPublishing(false);
    }
  }, [canInternalShare, caption, onClose, onShared, publishing, session?.user, track, trackIdValue]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div key="share-drawer" className="fixed inset-0 z-[134]">
        <motion.button
          type="button"
          aria-label="Fermer le partage"
          className="absolute inset-0 bg-black/58 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <div className="absolute inset-x-0 bottom-0 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom,12px),12px)] pt-24">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#09070d]/94 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
            onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/40">Partager sans quitter le player</p>
            <h3 className="mt-2 text-lg font-black text-white">{track?.title || 'Partager'}</h3>
            <p className="mt-1 text-sm text-white/52">
              On garde le partage dans le feed: rien ne renvoie vers une autre couche.
            </p>

            <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-white/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">Publier ce son dans le feed</p>
                  <p className="mt-1 text-xs leading-5 text-white/42">
                    Cree un vrai post partageable, visible comme les anciens partages Synaura.
                  </p>
                </div>
                <Music2 className="h-5 w-5 shrink-0 text-white/35" />
              </div>

              {canInternalShare ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={caption}
                    onChange={(event) => setCaption(event.target.value.slice(0, 220))}
                    placeholder="Ajoute une phrase avant de republier..."
                    className="min-h-[76px] w-full resize-none rounded-[1rem] border border-white/10 bg-black/22 px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/22"
                  />
                  <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                    {quickCaptions.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setCaption((current) => (current.trim() ? `${current.trim()} ${chip}` : chip))}
                        className="h-8 shrink-0 rounded-full bg-white/10 px-3 text-xs font-black text-white/58 transition hover:bg-white/14 hover:text-white"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-white/36">
                      {session?.user ? `${caption.length}/220 caracteres` : 'Connexion requise pour publier.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleInternalShare()}
                      disabled={publishing || !session?.user}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#fffaf2] px-4 text-sm font-black text-[#171313] transition hover:opacity-92 disabled:opacity-50 sm:w-auto"
                    >
                      {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                      {publishing ? 'Publication...' : 'Publier dans le feed'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 rounded-[1rem] bg-black/25 p-3 text-sm leading-6 text-white/45">
                  Les radios, lives ou sons temporaires se partagent par lien uniquement.
                </p>
              )}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void handleCopy(shareUrl, 'Lien copie')}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#fffaf2] px-4 text-sm font-black text-[#171313] transition hover:opacity-92"
              >
                Copier le lien
              </button>
              <button
                type="button"
                onClick={() => void handleCopy(shareText, 'Texte copie')}
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/8 px-4 text-sm font-black text-white/78 transition hover:bg-white/12 hover:text-white"
              >
                Copier le texte
              </button>
            </div>

            <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/5 p-4 text-sm text-white/58">
              <p className="font-semibold text-white/78">{track?.artist?.name || track?.artist?.username || 'Synaura'}</p>
              <p className="mt-1 break-all text-xs leading-6 text-white/42">{shareUrl}</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function FeedNavigator({
  tracks,
  activeIndex,
  onJump,
  disabled,
}: {
  tracks: Track[];
  activeIndex: number;
  onJump: (index: number, source: string) => void;
  disabled?: boolean;
}) {
  const prevTrack = activeIndex > 0 ? tracks[activeIndex - 1] : null;
  const nextTrack = activeIndex < tracks.length - 1 ? tracks[activeIndex + 1] : null;
  const dotStart = Math.max(0, activeIndex - 2);
  const dotEnd = Math.min(tracks.length, activeIndex + 3);
  const railTracks = tracks.slice(dotStart, dotEnd);

  return (
    <>
      <div className="pointer-events-none absolute bottom-[112px] left-1/2 z-[122] hidden w-full max-w-[1040px] -translate-x-1/2 px-4 lg:block">
        <div className="ml-auto flex w-[240px] flex-col gap-3">
          <button
            type="button"
            disabled={!prevTrack || disabled}
            onClick={() => prevTrack && onJump(activeIndex - 1, 'tiktok-player-nav-prev')}
            className="pointer-events-auto rounded-[1.45rem] border border-black/[0.08] bg-[#fffaf2]/92 p-3 text-left text-[#171313] shadow-[0_18px_44px_rgba(30,25,20,0.16)] transition hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-40"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/36">Precedent</p>
            <p className="mt-1 truncate text-sm font-black">{prevTrack?.title || 'Debut du feed'}</p>
            <p className="truncate text-xs text-black/46">{prevTrack?.artist?.name || prevTrack?.artist?.username || 'Aucun son avant'}</p>
          </button>

          <div className="rounded-[1.6rem] border border-black/[0.08] bg-[#fffaf2]/94 px-4 py-3 text-[#171313] shadow-[0_20px_48px_rgba(30,25,20,0.18)]">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/36">Scroller est ici</p>
            <p className="mt-1 text-sm font-black">Passe d’un son a l’autre avec la molette, le trackpad ou les boutons.</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex flex-1 items-center justify-center gap-2">
                {railTracks.map((track, index) => {
                  const realIndex = dotStart + index;
                  const active = realIndex === activeIndex;
                  return (
                    <button
                      key={`${track._id}-${realIndex}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => onJump(realIndex, 'tiktok-player-nav-dot')}
                      className={`pointer-events-auto h-2.5 rounded-full transition ${active ? 'w-10 bg-[#171313]' : 'w-2.5 bg-black/18 hover:bg-black/28'}`}
                    />
                  );
                })}
              </div>
              <span className="text-xs font-black text-black/42">{activeIndex + 1}/{tracks.length}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={!nextTrack || disabled}
            onClick={() => nextTrack && onJump(activeIndex + 1, 'tiktok-player-nav-next')}
            className="pointer-events-auto rounded-[1.45rem] border border-black/[0.08] bg-[#171313] p-3 text-left text-[#fffaf2] shadow-[0_24px_48px_rgba(23,19,19,0.28)] transition hover:translate-y-0.5 disabled:cursor-default disabled:opacity-40"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">Suivant</p>
            <p className="mt-1 truncate text-sm font-black">{nextTrack?.title || 'Fin de la selection actuelle'}</p>
            <p className="truncate text-xs text-white/52">{nextTrack?.artist?.name || nextTrack?.artist?.username || 'Plus de morceau apres celui-ci'}</p>
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-[102px] left-1/2 z-[122] w-full max-w-[560px] -translate-x-1/2 px-4 lg:hidden">
        <div className="pointer-events-auto rounded-[1.6rem] border border-black/[0.08] bg-[#fffaf2]/94 p-3 text-[#171313] shadow-[0_20px_48px_rgba(30,25,20,0.18)]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/36">Glisse ou scrolle</p>
          <p className="mt-1 text-sm font-black">Le prochain son est juste en dessous.</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={!prevTrack || disabled}
              onClick={() => prevTrack && onJump(activeIndex - 1, 'tiktok-player-nav-prev-mobile')}
              className="inline-flex h-10 items-center rounded-full border border-black/[0.08] bg-black/[0.05] px-4 text-xs font-black text-black/62 disabled:opacity-40"
            >
              Precedent
            </button>
            <div className="min-w-0 flex-1 rounded-[1.1rem] bg-black/[0.04] px-3 py-2">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-black/34">Suivant</p>
              <p className="truncate text-sm font-black">{nextTrack?.title || 'Tu as atteint la fin du flux charge'}</p>
            </div>
            <button
              type="button"
              disabled={!nextTrack || disabled}
              onClick={() => nextTrack && onJump(activeIndex + 1, 'tiktok-player-nav-next-mobile')}
              className="inline-flex h-10 items-center rounded-full bg-[#171313] px-4 text-xs font-black text-[#fffaf2] disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function FeedScrollGuide({
  tracks,
  activeIndex,
  onJump,
  disabled,
}: {
  tracks: Track[];
  activeIndex: number;
  onJump: (index: number, source: string) => void;
  disabled?: boolean;
}) {
  const currentTrack = tracks[activeIndex] ?? null;
  const prevTrack = activeIndex > 0 ? tracks[activeIndex - 1] : null;
  const nextTrack = activeIndex < tracks.length - 1 ? tracks[activeIndex + 1] : null;
  const dotStart = Math.max(0, activeIndex - 2);
  const dotEnd = Math.min(tracks.length, activeIndex + 3);
  const railTracks = tracks.slice(dotStart, dotEnd);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[123] flex justify-center px-4 pb-[132px] md:pb-[118px]">
      <div className="pointer-events-auto w-full max-w-3xl overflow-hidden rounded-[1.8rem] border border-black/[0.08] bg-[#fffaf2]/95 text-[#171313] shadow-[0_24px_64px_rgba(30,25,20,0.2)] backdrop-blur-2xl">
        <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1.2fr)_minmax(0,1fr)] lg:items-center lg:p-4">
          <button
            type="button"
            disabled={!prevTrack || disabled}
            onClick={() => prevTrack && onJump(activeIndex - 1, 'tiktok-player-guide-prev')}
            className="min-w-0 rounded-[1.3rem] border border-black/[0.08] bg-black/[0.04] px-4 py-3 text-left transition hover:-translate-y-0.5 hover:bg-black/[0.06] disabled:cursor-default disabled:opacity-40"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#171313] text-[#fffaf2]">
                <ChevronDown className="h-4 w-4 -rotate-180" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/38">Revenir au-dessus</p>
                <p className="mt-1 truncate text-sm font-black">{prevTrack?.title || 'Début du flux'}</p>
                <p className="truncate text-xs text-black/48">{prevTrack?.artist?.name || prevTrack?.artist?.username || 'Aucun morceau précédent'}</p>
              </div>
            </div>
          </button>

          <div className="rounded-[1.35rem] bg-[#171313] px-4 py-3 text-[#fffaf2] shadow-[0_16px_34px_rgba(23,19,19,0.18)]">
            <div className="flex items-center justify-center gap-2 text-[#fffaf2]/58">
              <ChevronDown className="h-4 w-4 -rotate-180" />
              <ChevronDown className="h-4 w-4 animate-bounce" />
            </div>
            <p className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.24em] text-[#fffaf2]/54">Fil sonore Synaura</p>
            <p className="mt-1 text-center text-sm font-black">
              {nextTrack ? 'Glisse vers le haut ou utilise Suivant' : 'Tu as atteint la fin du flux chargé'}
            </p>
            <p className="mt-1 truncate text-center text-xs text-[#fffaf2]/60">
              {nextTrack ? `${nextTrack.title} arrive juste après ${currentTrack?.title || 'ce son'}` : 'Change de mode pour charger un autre angle du feed'}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex flex-1 items-center justify-center gap-2">
                {railTracks.map((track, index) => {
                  const realIndex = dotStart + index;
                  const active = realIndex === activeIndex;
                  return (
                    <button
                      key={`${track._id}-${realIndex}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => onJump(realIndex, 'tiktok-player-guide-dot')}
                      className={`h-2.5 rounded-full transition ${active ? 'w-12 bg-[#fffaf2]' : 'w-2.5 bg-[#fffaf2]/24 hover:bg-[#fffaf2]/42'}`}
                    />
                  );
                })}
              </div>
              <span className="text-xs font-black text-[#fffaf2]/58">{activeIndex + 1}/{tracks.length}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={!nextTrack || disabled}
            onClick={() => nextTrack && onJump(activeIndex + 1, 'tiktok-player-guide-next')}
            className="min-w-0 rounded-[1.3rem] border border-black/[0.08] bg-[#171313] px-4 py-3 text-left text-[#fffaf2] transition hover:translate-y-0.5 disabled:cursor-default disabled:opacity-40"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fffaf2] text-[#171313]">
                <ChevronDown className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#fffaf2]/42">Continuer en dessous</p>
                <p className="mt-1 truncate text-sm font-black">{nextTrack?.title || 'Fin de la sélection actuelle'}</p>
                <p className="truncate text-xs text-[#fffaf2]/54">{nextTrack?.artist?.name || nextTrack?.artist?.username || 'Plus aucun morceau après celui-ci'}</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [feedMode, setFeedMode] = useState<FeedMode>('reco');
  const [seedGenre, setSeedGenre] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [burstVisible, setBurstVisible] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [commentCountOverrides, setCommentCountOverrides] = useState<Record<string, number>>({});
  const [shareCountOverrides, setShareCountOverrides] = useState<Record<string, number>>({});

  /* ── Refs ── */
  const didBootRef = useRef(false);
  const suppressAutoplayRef = useRef(false);
  const lastGesturePlayAtRef = useRef(0);
  const prevQueueRef = useRef<{ tracks: any[]; currentTrackIndex: number } | null>(null);
  const openedTrackIdRef = useRef<string | null>(null);
  const changedTrackRef = useRef(false);
  const feedLoadedRef = useRef('');
  const openSeedIdRef = useRef<string | null>(null);
  const lastViewedRef = useRef<string | null>(null);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const loadRequestRef = useRef(0);

  /* ── Derived ── */
  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  const currentId = currentTrack?._id;
  const activeTrack = tracks[activeIndex] ?? null;
  const activeTrackId = trackId(activeTrack);
  const activeIsRadio = isRadioId(activeTrackId);
  const currentSeedGenre = seedGenre || topGenre(currentTrack as Track | null) || topGenre(activeTrack);
  const modeMeta = FEED_MODE_META[feedMode];
  const resolveCommentCount = (id: string, rawValue: unknown) =>
    id ? commentCountOverrides[id] ?? commentCounts[id] ?? countOf(rawValue) : 0;
  const modalsOpen = commentsOpen || shareOpen || showQueue || showDownloadDialog || lyricsOpen;

  /* ── Hooks ── */
  const radioMeta = useRadioNowPlaying(activeTrackId, isOpen);
  const commentCounts = useCommentCounts(tracks, isOpen);
  const activeCommentCount = resolveCommentCount(activeTrackId, activeTrack?.comments);
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
      feedLoadedRef.current = '';
      openSeedIdRef.current = null;
      lastViewedRef.current = null;
      loadRequestRef.current += 1;
      setCommentsOpen(false);
      setShareOpen(false);
      setShowQueue(false);
      setLyricsOpen(false);
      setSeedGenre(null);
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
    feedLoadedRef.current = '';
    openSeedIdRef.current = null;
    lastViewedRef.current = null;
    loadRequestRef.current += 1;
    setCommentsOpen(false);
    setLyricsOpen(false);
    setShareOpen(false);
    setShowQueue(false);
    setLyricsOpen(false);
    setSeedGenre(null);
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
    if (!seedGenre) {
      const seedTrack =
        (audioState.tracks?.find((track) => trackId(track as any) === openSeedIdRef.current) as Track | undefined) ||
        (audioState.tracks?.[audioState.currentTrackIndex] as Track | undefined) ||
        undefined;
      setSeedGenre(topGenre(seedTrack || null));
    }
    changedTrackRef.current = false;
  }, [audioState.currentTrackIndex, audioState.tracks, isOpen, initialTrackId, seedGenre]);

  /* ── Load feed ── */
  useEffect(() => {
    const seedId = openSeedIdRef.current || openedTrackIdRef.current || initialTrackId || '';
    const loadKey = `${feedMode}:${currentSeedGenre || 'all'}:${seedId}`;
    if (!isOpen || feedLoadedRef.current === loadKey) return;
    feedLoadedRef.current = loadKey;
    let mounted = true;
    const requestId = ++loadRequestRef.current;
    didBootRef.current = false;
    setCommentsOpen(false);
    setShareOpen(false);
    setShowQueue(false);
    setLyricsOpen(false);
    suppressAutoplayRef.current = true;
    dispatch({ type: 'LOAD_START' });

    (async () => {
      try {
        const chunk = await fetchFeedChunk(feedMode, 0, currentSeedGenre);
        if (!mounted || requestId !== loadRequestRef.current) return;

        const merged: Track[] = insertRadioTracks(chunk.tracks, feedMode);

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
          cursor: chunk.nextCursor,
          hasMore: chunk.hasMore,
        });

        requestAnimationFrame(() => {
          scrollSnap.scrollTo(startIndex, 'auto');
          suppressAutoplayRef.current = false;
        });
      } catch {
        if (mounted && requestId === loadRequestRef.current) {
          dispatch({ type: 'LOAD_FAIL' });
          suppressAutoplayRef.current = false;
        }
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, feedMode, currentSeedGenre, initialTrackId]);

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
    if (!isOpen || feed.loadingMore || !feed.hasMore || !tracks.length) return;
    if (activeIndex < tracks.length - INFINITE_SCROLL_THRESHOLD) return;
    dispatch({ type: 'SET_LOADING_MORE', value: true });

    (async () => {
      try {
        const chunk = await fetchFeedChunk(feedMode, feed.cursor, currentSeedGenre);
        const withBoosted = chunk.tracks;

        dispatch({
          type: 'APPEND',
          tracks: withBoosted,
          cursor: chunk.nextCursor,
          hasMore: chunk.hasMore,
        });
        // Sync global player queue
        setTracks(uniqueTracks([...tracks, ...withBoosted]) as any);
      } catch {
        dispatch({ type: 'SET_LOADING_MORE', value: false });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, isOpen, feed.cursor, feed.hasMore, feed.loadingMore, feedMode, currentSeedGenre, tracks]);

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
  const onShare = useCallback((t: Track) => {
    if (!t?._id) return;
    setCommentsOpen(false);
    setLyricsOpen(false);
    setShareOpen(true);
  }, []);

  const handleFeedModeChange = useCallback((mode: FeedMode) => {
    if (mode === feedMode) return;
    feedLoadedRef.current = '';
    setCommentsOpen(false);
    setShareOpen(false);
    setLyricsOpen(false);
    setFeedMode(mode);
  }, [feedMode]);

  const handleCommentCountChange = useCallback((trackIdValue: string, nextCount: number) => {
    if (!trackIdValue) return;
    setCommentCountOverrides((current) => ({
      ...current,
      [trackIdValue]: Math.max(0, nextCount),
    }));
  }, []);

  const handleShared = useCallback((trackIdValue: string, source = 'tiktok-player') => {
    if (!trackIdValue) return;
    const sourceTrack = tracks.find((track) => track._id === trackIdValue);
    setShareCountOverrides((current) => ({
      ...current,
      [trackIdValue]: (current[trackIdValue] ?? countOf(sourceTrack?.shares)) + 1,
    }));
    try { sendTrackEvents(trackIdValue, { event_type: 'share', source, is_ai_track: Boolean(sourceTrack?.isAI) }); } catch { /* noop */ }
  }, [tracks]);

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
          className="fixed inset-0 z-[100] overflow-hidden bg-[#130d11] text-white select-none"
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
            <div className="absolute inset-0 bg-gradient-to-b from-[#120d11]/82 via-[#120d11]/42 to-[#120d11]/88" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(250,204,21,0.12),transparent_62%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(244,114,182,0.14),transparent_28%)]" />
          </div>

          {/* Header */}
          <header className="absolute left-0 right-0 top-0 z-[120] px-4 pt-[max(env(safe-area-inset-top,12px),12px)]">
            <div className="mx-auto grid max-w-4xl grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
              <button
                onClick={closeHandler}
                className="grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-black/32 backdrop-blur-xl transition-all hover:bg-black/48 active:scale-90"
                title="Fermer"
              >
                <ChevronDown size={22} className="text-white/90" />
              </button>
              <div className="mx-auto flex w-full max-w-[360px] justify-center rounded-full border border-white/12 bg-black/28 p-1 backdrop-blur-2xl">
                {(Object.keys(FEED_MODE_META) as FeedMode[]).map((mode) => {
                  const meta = FEED_MODE_META[mode];
                  const active = mode === feedMode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleFeedModeChange(mode)}
                      className={`h-9 flex-1 rounded-full px-2 text-xs font-black transition ${
                        active
                          ? 'bg-white text-[#171313] shadow-[0_10px_30px_rgba(0,0,0,0.2)]'
                          : 'text-white/62 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              <QueueBubble variant="icon" onClick={() => setShowQueue(true)} />
            </div>
            {tracks.length > 1 ? (
              <p className="mx-auto mt-2 w-fit rounded-full bg-black/22 px-3 py-1 text-[11px] font-bold tabular-nums text-white/58 backdrop-blur-xl">
                {activeIndex + 1}<span className="mx-1 text-white/26">/</span>{tracks.length}
                {currentSeedGenre ? <span className="ml-2 text-white/38">{currentSeedGenre}</span> : null}
              </p>
            ) : null}
          </header>

          <QueueDialog isOpen={showQueue} onClose={() => setShowQueue(false)} />
          <AnimatePresence>{burstVisible && <HeartBurst burstKey={burstKey} />}</AnimatePresence>

          {/* Scroll container — virtualized */}
          <div
            ref={scrollSnap.containerRef}
            onTouchStart={scrollSnap.onTouchStart}
            onTouchEnd={scrollSnap.onTouchEnd}
            onScroll={scrollSnap.onScroll}
            className="h-full w-full overflow-y-auto overscroll-none md:cursor-grab active:cursor-grabbing"
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
                <MinimalTrackSlide
                  key={t._id || i}
                  track={t}
                  index={i}
                  isActive={isThis}
                  isPlaying={isPlayingThis}
                  previousTrack={i > 0 ? tracks[i - 1] : null}
                  nextTrack={i < tracks.length - 1 ? tracks[i + 1] : null}
                  duration={duration}
                  isRadio={isRadio}
                  displayTitle={displayTitle}
                  displayArtist={displayArtist}
                  likesCount={isThis ? likesCount : countOf(t.likes)}
                  rawComments={resolveCommentCount(t._id, t.comments)}
                  shareCount={shareCountOverrides[t._id] ?? countOf(t.shares)}
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
                  onComments={() => {
                    setShareOpen(false);
                    setCommentsOpen(true);
                  }}
                  onShare={onShare}
                  onDownload={handleDownload}
                  onAddToQueue={t => {
                    addToUpNext(t as any, 'end');
                    notify.success('OK', `${t.title || 'Titre'} ajouté à la file`);
                  }}
                  onToggleLyrics={() => setLyricsOpen(v => !v)}
                  onJump={playIndexFromGesture}
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
      <PlayerCommentsDrawer
        isOpen={commentsOpen}
        track={activeTrack}
        commentCount={activeCommentCount}
        onClose={() => setCommentsOpen(false)}
        onCountChange={handleCommentCountChange}
      />
      <PlayerShareDrawer
        isOpen={shareOpen}
        track={activeTrack}
        albumContext={albumContext as any}
        onClose={() => setShareOpen(false)}
        onShared={handleShared}
      />
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
