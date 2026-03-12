'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Heart,
  MessageCircle,
  Share2,
  Download,
  Play,
  Pause,
  FileText,
  Lock,
  Loader2,
  ListPlus,
  ChevronUp,
  ChevronDown,
  Music2,
  User,
  Bookmark,
  Zap,
  Sparkles,
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
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8, y: -40 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="relative"
          >
            <Heart size={72} fill="#ff4b7a" className="text-rose-400 drop-shadow-[0_0_30px_rgba(255,75,122,0.6)]" />
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
  const glowRef = useRef<HTMLDivElement>(null);
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
        if (glowRef.current) glowRef.current.style.width = `${pct}%`;
        if (knobRef.current) knobRef.current.style.left = `${pct}%`;
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
    >
      <div
        ref={ref}
        className="group relative h-[6px] hover:h-[10px] w-full rounded-full bg-white/[0.08] overflow-visible cursor-pointer transition-all duration-150"
        onPointerDown={(e) => commit(e.clientX)}
        onPointerMove={(e) => e.buttons === 1 && commit(e.clientX)}
        onPointerUp={hide}
        onPointerLeave={hide}
        onTouchStart={(e) => commit(e.touches[0].clientX)}
        onTouchMove={(e) => commit(e.touches[0].clientX)}
        onTouchEnd={hide}
      >
        {/* Glow track */}
        <div
          ref={glowRef}
          className="absolute inset-y-0 left-0 rounded-full blur-[6px] opacity-50"
          style={{ width: '0%', background: 'linear-gradient(90deg,#a855f7,#6366f1)' }}
        />
        {/* Fill track */}
        <div
          ref={fillRef}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: '0%', background: 'linear-gradient(90deg,#a855f7,#6366f1)' }}
        />
        {/* Knob */}
        <div
          ref={knobRef}
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(168,85,247,0.5)] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: '0%' }}
        />
        {bubble.shown && (
          <div
            className="absolute -top-9"
            style={{ left: clamp(bubble.left - 22, 0, (ref.current?.getBoundingClientRect().width || 0) - 44) }}
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
}

function getCoverUrl(track: any): string | null {
  const raw = track?.coverUrl;
  if (!raw) return null;
  const url = getCdnUrl(raw) || raw;
  return url && typeof url === 'string' && url.includes('res.cloudinary.com')
    ? url.replace('/upload/', '/upload/f_auto,q_auto/')
    : url;
}

/* ─────────── Action button for the right sidebar ─────────── */
function ActionBtn({
  icon: Icon,
  label,
  active,
  activeColor,
  disabled,
  onClick,
}: {
  icon: React.ElementType;
  label: string | number;
  active?: boolean;
  activeColor?: string;
  disabled?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
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
          className={`transition-all duration-200 drop-shadow-lg ${active ? (activeColor ? '' : 'text-rose-400') : 'text-white group-hover/btn:text-white'}`}
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
}

export default function TikTokPlayer({ isOpen, onClose, initialTrackId }: TikTokPlayerProps) {
  const reduceMotion = useReducedMotion();

  const {
    audioState,
    setTracks,
    setCurrentTrackIndex,
    setQueueAndPlay,
    setQueueOnly,
    playTrack,
    play,
    pause,
    seek,
    getAudioElement,
    addToUpNext,
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
  const [showQueue, setShowQueue] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [burstVisible, setBurstVisible] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [coverLoadedById, setCoverLoadedById] = useState<Record<string, boolean>>({});
  const [radioMeta, setRadioMeta] = useState<{ station: 'mixx_party' | 'ximam'; title: string; artist: string; listeners: number } | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

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
  const lastUserScrollAtRef = useRef<number>(0);

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

  const getItemTop = useCallback((idx: number) => {
    const it = itemRefs.current[idx];
    if (it) return it.offsetTop;
    const el = containerRef.current;
    const h = Math.max(1, el?.clientHeight || window.innerHeight || 1);
    return idx * h;
  }, []);

  const programmaticScrollRef = useRef(false);

  const scrollToIndex = useCallback(
    (i: number, behavior: ScrollBehavior = 'smooth') => {
      const el = containerRef.current;
      if (!el) return;
      const idx = clamp(i, 0, Math.max(0, tracks.length - 1));
      const top = getItemTop(idx);
      if (Math.abs(el.scrollTop - top) < 2) return;
      programmaticScrollRef.current = true;
      el.scrollTo({ top, behavior });
      window.setTimeout(() => { programmaticScrollRef.current = false; }, behavior === 'smooth' ? 500 : 100);
    },
    [getItemTop, tracks.length],
  );

  const computeVisibleIndex = useCallback(() => {
    const el = containerRef.current;
    if (!el) return activeIndex;
    const h = el.clientHeight;
    if (h <= 0) return activeIndex;
    const st = el.scrollTop;
    const idx = Math.round(st / h);
    return clamp(idx, 0, Math.max(0, tracks.length - 1));
  }, [activeIndex, tracks.length]);

  const playIndexFromGesture = useCallback(
    async (i: number, source: string) => {
      const t = tracks[i];
      if (!t?._id) return;
      lastGesturePlayAtRef.current = Date.now();
      suppressAutoplayRef.current = true;
      setActiveIndex(i);
      setCurrentTrackIndex(i);
      try {
        await playTrack(t as any);
        if (openedTrackIdRef.current && t._id !== openedTrackIdRef.current) changedTrackRef.current = true;
        try { sendTrackEvents(t._id, { event_type: 'play_start', source }); } catch {}
      } finally {
        requestAnimationFrame(() => { suppressAutoplayRef.current = false; });
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

  // Radio now-playing
  useEffect(() => {
    if (!isOpen) return;
    if (!activeRadioStation) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const url = activeRadioStation === 'ximam' ? '/api/radio/status?station=ximam' : '/api/radio/status?station=mixx_party';
        const res = await fetch(url, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        const title = String(json?.data?.currentTrack?.title || '').trim();
        const artist = String(json?.data?.currentTrack?.artist || '').trim();
        const listeners = parseInt(json?.data?.stats?.listeners ?? 0) || 0;
        if (cancelled) return;
        if (title) {
          setRadioMeta((prev) => {
            if (prev && prev.station === activeRadioStation && prev.title === title && prev.artist === artist && prev.listeners === listeners) return prev;
            return { station: activeRadioStation, title, artist, listeners };
          });
        }
      } catch {}
    };
    tick();
    const id = window.setInterval(tick, 8000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [activeRadioStation, isOpen]);

  const close = useCallback(() => {
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

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Save queue on open
  useEffect(() => {
    if (!isOpen) return;
    if (!prevQueueRef.current) {
      prevQueueRef.current = { tracks: audioState.tracks || [], currentTrackIndex: audioState.currentTrackIndex || 0 };
    }
    if (!openedTrackIdRef.current) {
      openedTrackIdRef.current = getTrackId(audioState.tracks?.[audioState.currentTrackIndex]) || null;
    }
    if (!openSeedIdRef.current) {
      openSeedIdRef.current = initialTrackId || openedTrackIdRef.current || null;
    }
    changedTrackRef.current = false;
  }, [audioState.currentTrackIndex, audioState.tracks, isOpen]);

  // Load feed on open
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
        const res = await fetch('/api/ranking/feed?limit=50&ai=1&strategy=reco&cursor=0', { cache: 'no-store' });
        const json = await res.json();
        const list: Track[] = Array.isArray(json?.tracks) ? json.tracks : [];
        const cdnTracks = applyCdnToTracks(list as any) as any;
        if (!mounted) return;

        // Radios injectées en tête du feed
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

        // Fetch boosted tracks to inject every 5 positions
        let boostedList: Track[] = [];
        try {
          const bRes = await fetch('/api/tracks/boosted?limit=10', { cache: 'no-store' });
          const bJson = await bRes.json();
          boostedList = applyCdnToTracks(Array.isArray(bJson?.tracks) ? bJson.tracks : []) as any;
          boostedList = boostedList.map((t: any) => ({ ...t, isBoosted: true }));
        } catch {}

        const prev = prevQueueRef.current;
        const prevCurrent = prev?.tracks?.[prev.currentTrackIndex] || null;
        const prevId = getTrackId(prevCurrent);
        const regularTracks = Array.isArray(cdnTracks) ? cdnTracks : [];

        // Inject boosted tracks every 5 positions
        const withBoosted: any[] = [];
        const usedBoostedIds = new Set<string>();
        const regularIds = new Set(regularTracks.map((t: any) => getTrackId(t)));
        const availableBoosted = boostedList.filter((bt: any) => !regularIds.has(getTrackId(bt)));
        let boostedIdx = 0;
        for (let i = 0; i < regularTracks.length; i++) {
          withBoosted.push(regularTracks[i]);
          if ((i + 1) % 5 === 0 && boostedIdx < availableBoosted.length) {
            const bt = availableBoosted[boostedIdx];
            const btId = getTrackId(bt);
            if (btId && !usedBoostedIds.has(btId)) {
              usedBoostedIds.add(btId);
              withBoosted.push(bt);
              boostedIdx++;
            }
          }
        }

        const merged: any[] = [...RADIO_TRACKS, ...withBoosted];
        if (prevCurrent && prevId && !merged.some((t) => getTrackId(t) === prevId)) {
          merged.unshift(prevCurrent);
        }

        setLocalTracks(merged);
        setTracks(merged as any);

        const seedId = openSeedIdRef.current || openedTrackIdRef.current || prevId || getTrackId(merged[0]);
        const idx = seedId ? merged.findIndex((t) => getTrackId(t) === seedId) : 0;
        const startIndex = idx >= 0 ? idx : 0;

        setActiveIndex(startIndex);
        setCurrentTrackIndex(startIndex);
        try {
          const curr = audioState.tracks?.[audioState.currentTrackIndex];
          const isAlreadyPlayingSeed = Boolean(audioState.isPlaying && curr?._id && curr._id === getTrackId(merged[startIndex]));
          if (isAlreadyPlayingSeed) {
            setQueueOnly(merged as any, startIndex);
          } else {
            setQueueAndPlay(merged as any, startIndex);
          }
        } catch {}
        requestAnimationFrame(() => {
          scrollToIndex(startIndex, 'auto');
          suppressAutoplayRef.current = false;
        });

        setNextCursor(typeof json?.nextCursor === 'number' ? json.nextCursor : merged.length);
        setHasMore(Boolean(json?.hasMore));
      } catch {} finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [isOpen, setTracks, setCurrentTrackIndex, scrollToIndex]);

  // Boot sync — instant scroll on first load
  useEffect(() => {
    if (!isOpen || !tracks.length || didBootRef.current) return;
    const seed = openSeedIdRef.current;
    if (!seed) return;
    const idx = tracks.findIndex((t) => t?._id === seed);
    if (idx >= 0) {
      didBootRef.current = true;
      setActiveIndex(idx);
      const el = containerRef.current;
      if (el) {
        programmaticScrollRef.current = true;
        el.scrollTo({ top: getItemTop(idx), behavior: 'auto' });
        window.setTimeout(() => { programmaticScrollRef.current = false; }, 100);
      }
    }
  }, [isOpen, tracks, getItemTop]);

  // View analytics
  useEffect(() => {
    if (!isOpen || !activeTrackId) return;
    if (lastViewedRef.current === activeTrackId) return;
    lastViewedRef.current = activeTrackId;
    try { sendTrackEvents(activeTrackId, { event_type: 'view', source: 'tiktok-player', is_ai_track: String(activeTrackId).startsWith('ai-') }); } catch {}
  }, [isOpen, activeTrackId]);

  // Fetch comment counts for visible tracks
  const commentCountsFetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isOpen || !tracks.length) return;
    const ids = tracks
      .map((t) => t._id)
      .filter((id) => id && !id.startsWith('radio-') && !id.startsWith('ai-') && !commentCountsFetchedRef.current.has(id));
    if (!ids.length) return;
    ids.forEach((id) => commentCountsFetchedRef.current.add(id));
    fetch('/api/tracks/comments-count', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackIds: ids }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.counts && typeof data.counts === 'object') {
          setCommentCounts((prev) => ({ ...prev, ...data.counts }));
        }
      })
      .catch(() => {});
  }, [isOpen, tracks]);

  // Auto-play on index change
  useEffect(() => {
    if (!isOpen || suppressAutoplayRef.current) return;
    if (Date.now() - (lastGesturePlayAtRef.current || 0) < 500) return;
    const t = tracks[activeIndex];
    if (!t?._id) return;
    const timer = window.setTimeout(() => {
      if (currentId !== t._id) {
        requestAnimationFrame(() => {
          playTrack(t as any).catch?.(() => {});
          if (openedTrackIdRef.current && t._id !== openedTrackIdRef.current) changedTrackRef.current = true;
          try { sendTrackEvents(t._id, { event_type: 'play_start', source: 'tiktok-player' }); } catch {}
        });
      }
    }, 60);
    return () => window.clearTimeout(timer);
  }, [isOpen, activeIndex, tracks, playTrack, currentId]);

  // Infinite loading — loops back to cursor 0 when API is exhausted
  useEffect(() => {
    if (!isOpen || loadingMore || tracks.length === 0) return;
    if (activeIndex < tracks.length - 6) return;
    setLoadingMore(true);
    (async () => {
      try {
        const cursor = hasMore ? nextCursor : 0;
        const res = await fetch(`/api/ranking/feed?limit=50&ai=1&strategy=reco&cursor=${cursor}`, { cache: 'no-store' });
        const json = await res.json();
        const list: Track[] = Array.isArray(json?.tracks) ? json.tracks : [];
        const cdnTracks = applyCdnToTracks(list as any) as any;

        let freshBoosted: any[] = [];
        try {
          const bRes = await fetch('/api/tracks/boosted?limit=10', { cache: 'no-store' });
          const bJson = await bRes.json();
          freshBoosted = applyCdnToTracks(Array.isArray(bJson?.tracks) ? bJson.tracks : []) as any;
          freshBoosted = freshBoosted.map((t: any) => ({ ...t, isBoosted: true }));
        } catch {}

        setLocalTracks((prev) => {
          const seen = new Set(prev.map((t) => getTrackId(t)).filter(Boolean));
          const append = (cdnTracks || []).filter((t: any) => {
            const id = getTrackId(t);
            return id && !seen.has(id);
          });

          const boostedToInject = freshBoosted.filter((bt: any) => {
            const id = getTrackId(bt);
            return id && !seen.has(id) && !append.some((a: any) => getTrackId(a) === id);
          });

          const withBoosted: any[] = [];
          let bIdx = 0;
          for (let i = 0; i < append.length; i++) {
            withBoosted.push(append[i]);
            if ((i + 1) % 4 === 0 && bIdx < boostedToInject.length) {
              withBoosted.push(boostedToInject[bIdx++]);
            }
          }

          const merged = [...prev, ...withBoosted];
          setTracks(merged as any);
          return merged as any;
        });
        const nc = typeof json?.nextCursor === 'number' ? json.nextCursor : cursor + list.length;
        setNextCursor(nc);
        setHasMore(Boolean(json?.hasMore));
      } catch {} finally { setLoadingMore(false); }
    })();
  }, [activeIndex, hasMore, isOpen, loadingMore, nextCursor, tracks.length, setTracks]);

  // Cover preload
  useEffect(() => {
    if (!isOpen || tracks.length === 0) return;
    const range = 3;
    const start = Math.max(0, activeIndex - range);
    const end = Math.min(tracks.length - 1, activeIndex + range);
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

  // Audio preload (next tracks)
  useEffect(() => {
    if (!isOpen || !tracks.length) return;
    for (const link of audioPreloadLinksRef.current) { try { link.parentNode?.removeChild(link); } catch {} }
    audioPreloadLinksRef.current = [];
    const nextTracks = tracks.slice(activeIndex + 1, activeIndex + 3);
    const urls = nextTracks
      .map((t) => t?.audioUrl)
      .filter((u): u is string => typeof u === 'string' && u.length > 0)
      .filter((u) => !u.toLowerCase().endsWith('.m3u8') && !/\/listen\//i.test(u));
    for (const href of urls) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'audio';
      link.href = href;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      audioPreloadLinksRef.current.push(link);
    }
    return () => {
      for (const link of audioPreloadLinksRef.current) { try { link.parentNode?.removeChild(link); } catch {} }
      audioPreloadLinksRef.current = [];
    };
  }, [activeIndex, isOpen, tracks]);

  // Sync playing track → scroll (only when track changes externally, not during gestures)
  useEffect(() => {
    if (!isOpen || !tracks.length) return;
    if (commentsOpen || showDownloadDialog || lyricsOpen) return;
    if (isTouchingRef.current) return;
    if (Date.now() - (lastUserScrollAtRef.current || 0) < 800) return;
    const idx = audioState.currentTrackIndex;
    if (!Number.isFinite(idx) || idx < 0 || idx === activeIndex) return;
    setActiveIndex(idx);
    requestAnimationFrame(() => scrollToIndex(idx, 'smooth'));
  }, [activeIndex, audioState.currentTrackIndex, commentsOpen, isOpen, lyricsOpen, scrollToIndex, showDownloadDialog, tracks.length]);

  // Non-passive wheel handler (desktop) — one track per wheel gesture
  useEffect(() => {
    if (!isOpen) return;
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (commentsOpen || showDownloadDialog || lyricsOpen) return;
      e.preventDefault();
      if (wheelLockRef.current) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const next = clamp(activeIndex + dir, 0, tracks.length - 1);
      if (next === activeIndex) return;
      wheelLockRef.current = true;
      scrollToIndex(next, 'smooth');
      playIndexFromGesture(next, 'tiktok-player-wheel');
      window.setTimeout(() => { wheelLockRef.current = false; }, 600);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [isOpen, activeIndex, tracks.length, scrollToIndex, commentsOpen, showDownloadDialog, lyricsOpen, playIndexFromGesture]);

  // Keyboard
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (commentsOpen || showDownloadDialog || lyricsOpen) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        const next = Math.min(tracks.length - 1, activeIndex + 1);
        scrollToIndex(next, 'smooth');
        playIndexFromGesture(next, 'tiktok-player-key');
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        const next = Math.max(0, activeIndex - 1);
        scrollToIndex(next, 'smooth');
        playIndexFromGesture(next, 'tiktok-player-key');
      }
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (audioState.isPlaying) pause(); else play();
      }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, activeIndex, tracks.length, scrollToIndex, audioState.isPlaying, pause, play, close, commentsOpen, showDownloadDialog, lyricsOpen, playIndexFromGesture]);

  // Touch end → let CSS snap handle it, then detect final position
  const onTouchEnd = useCallback(() => {
    if (commentsOpen || showDownloadDialog || lyricsOpen) return;
    isTouchingRef.current = false;
    // CSS scroll-snap will animate to the correct position.
    // We detect the final index after the snap settles.
    if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = window.setTimeout(() => {
      const idx = computeVisibleIndex();
      if (idx !== activeIndex) {
        playIndexFromGesture(idx, 'tiktok-player-touch');
      } else if (tracks[idx]?._id && currentId !== tracks[idx]._id) {
        playIndexFromGesture(idx, 'tiktok-player-touch');
      }
    }, 300) as unknown as number;
  }, [activeIndex, commentsOpen, computeVisibleIndex, currentId, lyricsOpen, playIndexFromGesture, showDownloadDialog, tracks]);

  // onScroll → debounced index detection (CSS snap handles the actual snapping)
  const onScroll = useCallback(() => {
    lastUserScrollAtRef.current = Date.now();
    if (programmaticScrollRef.current) return;
    if (isTouchingRef.current) return;
    if (wheelLockRef.current) return;
    if (commentsOpen || showDownloadDialog || lyricsOpen) return;
    if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = window.setTimeout(() => {
      const idx = computeVisibleIndex();
      if (idx !== activeIndex) {
        setActiveIndex(idx);
      }
    }, 200) as unknown as number;
  }, [commentsOpen, lyricsOpen, showDownloadDialog, computeVisibleIndex, activeIndex]);

  useEffect(() => {
    return () => {
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
    };
  }, []);

  const triggerLikeBurst = useCallback(() => {
    if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
    setBurstVisible(true);
    setBurstKey((k) => k + 1);
    burstTimerRef.current = window.setTimeout(() => setBurstVisible(false), 500) as unknown as number;
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
      if (now - lastTap.current < 250) {
        if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
        lastTap.current = 0;
        if (!isRadio && activeTrackId) {
          try { (navigator as any)?.vibrate?.(12); } catch {}
          const willLike = !isLiked;
          toggleLike();
          if (willLike) triggerLikeBurst();
        }
        return;
      }
      lastTap.current = now;
      if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
      tapTimerRef.current = window.setTimeout(() => {
        tapTimerRef.current = null;
        if (currentId !== id) playTrack(t as any);
        else if (audioState.isPlaying) pause();
        else play();
      }, 250) as unknown as number;
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
        notify.success('OK', 'Lien copié !');
      }
      try { sendTrackEvents(t._id, { event_type: 'share', source: 'tiktok-player' }); } catch {}
    } catch {}
  }, []);

  const handleDownload = useCallback(() => {
    if (!activeTrack) return;
    if (!canDownload) { notify.error('Erreur', upgradeMessage || 'Fonction non disponible'); return; }
    setShowDownloadDialog(true);
  }, [activeTrack, canDownload, upgradeMessage]);

  const confirmDownload = useCallback(async () => {
    if (!activeTrack) return;
    try {
      setIsDownloading(true);
      const filename = `${activeTrack?.artist?.name || 'Artiste'}-${activeTrack?.title || 'Titre'}.wav`.replace(/\s+/g, '_');
      await downloadAudioFile(activeTrack?.audioUrl || '', filename, () => {});
      notify.success('OK', 'Téléchargement terminé !');
    } catch { notify.error('Erreur', 'Échec du téléchargement'); }
    finally { setIsDownloading(false); setShowDownloadDialog(false); }
  }, [activeTrack]);

  const bgUrl = useMemo(() => getCoverUrl(activeTrack || tracks[0]), [activeTrack, tracks]);

  /* ─── Render ─── */

  if (!isOpen) return null;

  if (loading) {
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
          {/* Background blur cover */}
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
                <img
                  src={bgUrl}
                  alt=""
                  loading="eager"
                  decoding="async"
                  className="h-full w-full object-cover blur-[60px] scale-150 saturate-150 opacity-30"
                />
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(99,102,241,0.12),transparent_60%)]" />
          </div>

          {/* Top bar */}
          <header className="absolute top-0 left-0 right-0 z-[120] px-4 pt-[max(env(safe-area-inset-top,12px),12px)] pb-3">
            <div className="flex items-center justify-between">
              <button
                onClick={close}
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

          {/* Scroll snap container */}
          <div
            ref={containerRef}
            onTouchStart={() => {
              isTouchingRef.current = true;
              if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
            }}
            onTouchEnd={onTouchEnd}
            onScroll={onScroll}
            className="h-full w-full overflow-y-auto overscroll-none"
            style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
          >
            {tracks.map((t, i) => {
              const isThis = i === activeIndex;
              const isPlayingThis = isThis && currentId === t._id && audioState.isPlaying;
              const duration = isThis && currentId === t._id ? audioState.duration || t.duration || 0 : t.duration || 0;
              const rawLikes = getLikesCount(t.likes);
              const rawComments = commentCounts[t._id] ?? getCommentsCount(t.comments);
              const isRadio = String(t?._id || '').startsWith('radio-');
              const displayTitle = isThis && isRadio && radioMeta ? radioMeta.title : (t?.title || 'Titre inconnu');
              const displayArtist = isThis && isRadio && radioMeta
                ? radioMeta.artist
                : (t?.artist?.name || t?.artist?.username || 'Artiste inconnu');
              const coverUrl = getCoverUrl(t);
              const genres = (t?.genre || []).filter((g) => g && g !== 'undefined').slice(0, 2);

              return (
                <div
                  key={t._id || i}
                  ref={(el) => { itemRefs.current[i] = el; }}
                  data-index={i}
                  className="relative h-[100dvh] w-full flex flex-col"
                  style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
                >
                  {/* ─── Cover area ─── */}
                  <div className="flex-1 flex items-center justify-center px-8 pt-20 pb-6">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isThis) return;
                        handleCoverTap(t as any);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (!isThis || isRadio) return;
                        const willLike = !isLiked;
                        toggleLike();
                        if (willLike) triggerLikeBurst();
                      }}
                      className="relative w-[70vw] max-w-[380px] aspect-square group/cover"
                    >
                      {/* Shadow glow behind cover */}
                      <div
                        className="absolute -inset-4 rounded-[36px] opacity-50 blur-[50px] -z-10 transition-opacity duration-700"
                        style={coverUrl
                          ? { backgroundImage: `url(${coverUrl})`, backgroundSize: 'cover' }
                          : { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }
                        }
                      />
                      {/* Cover image */}
                      <div className={`relative w-full h-full rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.12] transition-transform duration-300 ${isPlayingThis ? 'scale-[1.02]' : 'scale-100'}`}>
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={t.title}
                            loading={Math.abs(i - activeIndex) <= 2 ? 'eager' : 'lazy'}
                            decoding="async"
                            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[10000ms] ease-linear ${isPlayingThis ? 'scale-[1.08]' : 'scale-100'}`}
                            onLoad={() => {
                              if (!t._id) return;
                              setCoverLoadedById((prev) => (prev[t._id] ? prev : { ...prev, [t._id]: true }));
                            }}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <TrackCover
                            src={null}
                            title={t.title}
                            className={`absolute inset-0 w-full h-full transition-transform duration-[10000ms] ease-linear ${isPlayingThis ? 'scale-[1.08]' : 'scale-100'}`}
                            rounded="rounded-none"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                        {/* Play/Pause indicator */}
                        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isPlayingThis ? 'opacity-0 group-hover/cover:opacity-100' : 'opacity-100'}`}>
                          <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl border border-white/[0.15] flex items-center justify-center shadow-2xl">
                            {isPlayingThis
                              ? <Pause className="w-6 h-6 text-white" />
                              : <Play className="w-6 h-6 text-white ml-0.5" />}
                          </div>
                        </div>
                        {/* Genre tags (masqués pour radio) */}
                        {genres.length > 0 && !isRadio && (
                          <div className="absolute top-3 left-3 flex gap-1.5">
                            {genres.map((g) => (
                              <span key={g} className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-xl text-[10px] font-bold text-white/90 border border-white/[0.1]">
                                {g}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* LIVE badge pour radio */}
                        {isRadio && (
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-500/80 backdrop-blur-sm border border-red-400/30 shadow-lg">
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            <span className="text-[11px] font-black text-white uppercase tracking-widest">Live</span>
                          </div>
                        )}
                        {/* Badges */}
                        {!isRadio && (
                          <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                            {(t as any)?.isBoosted && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl backdrop-blur-sm border border-violet-500/30 shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(245,158,11,0.3))' }}>
                                <Zap className="w-3 h-3 text-amber-400" style={{ fill: 'rgba(245,158,11,0.3)' }} />
                                <span className="text-[11px] font-black text-white/90">Boosted</span>
                              </div>
                            )}
                            {((t as any).isAI || String(t._id || '').startsWith('ai-')) && (
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

                  {/* ─── Right sidebar actions ─── */}
                  <aside className="absolute right-3 z-20 flex flex-col items-center gap-3 top-1/2 -translate-y-1/2 md:top-auto md:bottom-[220px] md:translate-y-0">
                    <ActionBtn
                      icon={Heart}
                      label={isThis ? likesCount : rawLikes}
                      active={isThis && isLiked}
                      activeColor="bg-rose-500/20 border-rose-400/25 text-rose-400"
                      disabled={!isThis || isRadio}
                      onClick={(e) => { e.stopPropagation(); toggleLike(); }}
                    />
                    <ActionBtn
                      icon={MessageCircle}
                      label={rawComments}
                      disabled={!isThis || isRadio}
                      onClick={(e) => { e.stopPropagation(); setCommentsOpen(true); }}
                    />
                    <ActionBtn
                      icon={Share2}
                      label={(t as any)?.shares || 0}
                      onClick={(e) => { e.stopPropagation(); onShare(t); }}
                    />
                    <ActionBtn
                      icon={canDownload ? Download : Lock}
                      label=""
                      disabled={!isThis || isRadio || !canDownload}
                      onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                    />
                    <ActionBtn
                      icon={ListPlus}
                      label="File"
                      disabled={!isThis || isRadio}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToUpNext(t as any, 'end');
                        notify.success('OK', `${t.title || 'Titre'} ajouté à la file`);
                      }}
                    />
                  </aside>

                  {/* ─── Bottom panel ─── */}
                  <footer className="relative z-20 px-4 pb-[max(env(safe-area-inset-bottom,16px),16px)]">
                    <div className="mx-auto max-w-lg overflow-hidden rounded-[24px] border border-white/[0.1] bg-black/40 backdrop-blur-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.4)]">
                      <div className="p-4 pb-3">
                        {/* Track info row */}
                        <div className="flex items-center gap-3">
                          {/* Artist avatar / Radio logo */}
                          <div className="shrink-0 w-11 h-11 rounded-full overflow-hidden ring-2 ring-white/[0.1] bg-white/[0.05]">
                            {isRadio ? (
                              <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-violet-700 grid place-items-center">
                                <img src={t.coverUrl || ''} alt="" className="w-8 h-6 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                              </div>
                            ) : t?.artist?.avatar ? (
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
                              {t?.artist?._id && t?.artist?.username && (
                                <span onClick={(e) => e.stopPropagation()}>
                                  <FollowButton artistId={t.artist._id} artistUsername={t.artist.username} size="sm" />
                                </span>
                              )}
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
                              className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg shadow-white/10 hover:scale-105 transition-all active:scale-95"
                              aria-label={isPlayingThis ? 'Pause' : 'Lecture'}
                            >
                              {isPlayingThis ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                            </button>
                            {t?.lyrics && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isThis) return;
                                  setLyricsOpen((v) => !v);
                                }}
                                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-90 ${
                                  isThis && lyricsOpen
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
                              {isThis && radioMeta && radioMeta.listeners > 0 && (
                                <span className="text-[11px] text-white/35 tabular-nums">
                                  {radioMeta.listeners >= 1000
                                    ? `${(radioMeta.listeners / 1000).toFixed(1)}k`
                                    : radioMeta.listeners} auditeurs
                                </span>
                              )}
                            </div>
                          ) : isThis && currentId === t._id ? (
                            <SeekBar onSeek={seek} getAudioElement={getAudioElement} />
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

                        {/* Lyrics (collapsible) */}
                        <AnimatePresence>
                          {isThis && lyricsOpen && t?.lyrics && (
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

      {/* Comments */}
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

      {/* Download dialog */}
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
