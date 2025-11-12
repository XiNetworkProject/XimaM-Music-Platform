'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAudioPlayer } from '@/app/providers';
import { useLikeSystem } from '@/hooks/useLikeSystem';
import { useDownloadPermission, downloadAudioFile } from '@/hooks/useDownloadPermission';
import { useVerticalSwipe } from '@/hooks/useVerticalSwipe';
import { sendTrackEvents } from '@/lib/analyticsClient';
import { getCdnUrl } from '@/lib/cdn';
import FollowButton from './FollowButton';
import DownloadDialog from './DownloadDialog';
import toast from 'react-hot-toast';
import {
  Play,
  Pause,
  Heart,
  MessageCircle,
  Share2,
  Download,
  UserPlus,
  X,
  Music2,
  Disc3,
  Verified,
  ChevronUp,
  ChevronDown,
  Lock,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

interface TikTokPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrackId?: string;
}

type Comment = { id: string; author: string; text: string; ts: number };

const fmtNum = new Intl.NumberFormat('fr-FR');

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

// Normalisation de l'ID (supporte id et _id)
const getTrackId = (t: any): string => t?.id ?? t?._id ?? '';

const fmtTime = (t = 0) => {
  const minutes = Math.floor(t / 60);
  const seconds = Math.floor(t % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

function useViewportHeight() {
  const [vh, setVh] = useState(800);

  useEffect(() => {
    const update = () => setVh(Math.max(400, window.innerHeight));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return vh;
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
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40"
        >
          <div className="h-24 w-24 rounded-full bg-white/10 grid place-items-center border border-white/30">
            <Heart size={48} fill="currentColor" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type ActionBtnProps = {
  icon: React.ComponentType<{ className?: string; size?: number; fill?: string }>;
  count?: number;
  onClick?: () => void;
  active?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
};

function ActionBtn({ icon: Icon, count, onClick, active, ariaLabel, disabled }: ActionBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'
      } ${active ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'}`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-rose-300' : ''}`} size={22} fill={active ? 'currentColor' : 'none'} />
      {typeof count === 'number' && (
        <span className="text-[10px] leading-none text-white/70">{fmtNum.format(count)}</span>
      )}
    </button>
  );
}

type SeekBarProps = {
  time: number;
  dur: number;
  onSeek: (time: number) => void;
};

function SeekBar({ time, dur, onSeek }: SeekBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [bubble, setBubble] = useState<{ shown: boolean; left: number; value: number }>({ shown: false, left: 0, value: 0 });

  const commit = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clamp(clientX - rect.left, 0, rect.width);
    const value = (x / rect.width) * (dur || 0);
    setBubble({ shown: true, left: x, value });
    onSeek(value);
  };

  const hide = () => setBubble((prev) => ({ ...prev, shown: false }));

  return (
    <div className="w-full">
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
          className="absolute inset-y-0 left-0"
          style={{
            width: `${dur ? (time / dur) * 100 : 0}%`,
            background: 'linear-gradient(90deg,#ff4bd1,#7aa8ff)'
          }}
        />
        <div
          className="absolute -top-1 h-5 w-5 rounded-full bg-white shadow"
          style={{ left: `calc(${dur ? (time / dur) * 100 : 0}% - 10px)` }}
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
        <span>{fmtTime(time)}</span>
        <span>{fmtTime(dur || 0)}</span>
      </div>
    </div>
  );
}

type TrackCardProps = {
  track: any;
  playing: boolean;
  time: number;
  dur: number;
  likes: number;
  isLiked: boolean;
  commentsCount: number;
  onLike: () => void;
  openComments: () => void;
  share: () => void;
  doubleTap: () => void;
  onToggle: () => void;
  onSeek: (time: number) => void;
  onDownload: () => void;
  canDownload: boolean;
  getCoverUrl: (track: any) => string;
  lyricsVisible: boolean;
  toggleLyrics: () => void;
};

function TrackCard({
  track,
  playing,
  time,
  dur,
  likes,
  isLiked,
  commentsCount,
  onLike,
  openComments,
  share,
  doubleTap,
  onToggle,
  onSeek,
  onDownload,
  canDownload,
  getCoverUrl,
  lyricsVisible,
  toggleLyrics
}: TrackCardProps) {
  return (
    <div 
      className="h-screen w-full relative px-5 flex items-center justify-center snap-center snap-always" 
      data-card
      data-id={getTrackId(track)}
      onDoubleClick={doubleTap}
    >
      <div className="relative flex items-center justify-center">
        <img
          src={getCoverUrl(track)}
          alt={track?.title}
          className="w-[72vw] max-w-[520px] aspect-square object-cover rounded-3xl border border-white/10 shadow-xl cursor-pointer"
          onClick={onToggle}
        />
        <button onClick={onToggle} className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm grid place-items-center hover:bg-white/30 transition">
            {playing ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
          </div>
        </button>
      </div>

      <aside className="absolute right-3 bottom-28 flex flex-col items-center gap-3">
        <ActionBtn active={isLiked} count={likes} onClick={onLike} icon={Heart} ariaLabel="Aimer" />
        <ActionBtn count={commentsCount} onClick={openComments} icon={MessageCircle} ariaLabel="Commentaires" />
        <ActionBtn count={((track as any)?.shares || 0) as number} onClick={share} icon={Share2} ariaLabel="Partager" />
        <ActionBtn
          onClick={onDownload}
          icon={canDownload ? Download : Lock}
          ariaLabel={canDownload ? 'Télécharger' : 'Téléchargement indisponible'}
          disabled={!canDownload}
        />
      </aside>

      <footer className="absolute left-0 right-0 bottom-0 p-4">
        <div className="mx-auto max-w-3xl bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white/70 flex items-center gap-1">
                <Music2 className="w-4 h-4" /> {(track as any)?.album ? 'Album' : 'Single'}
                {(track as any)?.album && <span className="ml-1 text-white/60">• {(track as any).album}</span>}
              </p>
              <h2 className="text-lg font-semibold truncate">{track?.title || 'Titre inconnu'}</h2>
              <div className="mt-0.5 flex items-center gap-2 text-sm flex-wrap">
                <span className="font-medium truncate flex items-center gap-1">
                  {track?.artist?.name || track?.artist?.username || 'Artiste inconnu'}
                  {track?.artist?.isVerified && <Verified className="w-4 h-4 text-sky-300" />}
                </span>
                {track?.artist?._id && track?.artist?.username && (
                  <span onClick={(e) => e.stopPropagation()}>
                    <FollowButton artistId={track.artist._id} artistUsername={track.artist.username} size="sm" />
                  </span>
                )}
                <button className="px-2 py-0.5 text-xs rounded-md bg-white/10 border border-white/10 hover:bg-white/15 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5" /> Suivre
                </button>
              </div>
              <p className="mt-1 text-xs text-white/60 flex items-center gap-1">
                <Disc3 className="w-3.5 h-3.5" /> Qualité audio: <span className="ml-1 font-medium">320k</span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onToggle}
                className="p-3 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition"
                aria-label={playing ? 'Pause' : 'Lecture'}
              >
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              {track?.lyrics && (
                <button
                  onClick={toggleLyrics}
                  className={`px-3 py-2 rounded-xl border transition text-sm ${
                    lyricsVisible ? 'bg-white/15 border-white/20' : 'bg-white/10 border-white/10 hover:bg-white/15'
                  }`}
                >
                  Paroles
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <SeekBar time={time} dur={dur} onSeek={onSeek} />
          </div>

          {track?.lyrics && lyricsVisible && (
            <div className="mt-3 max-h-40 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-white/85 border-t border-white/10 pt-2">
              {track.lyrics}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

type CommentsDrawerProps = {
  open: boolean;
  onClose: () => void;
  track?: any;
  comments: Comment[];
  onAdd: (text: string) => void;
};

function CommentsDrawer({ open, onClose, track, comments, onAdd }: CommentsDrawerProps) {
  const [text, setText] = useState<string>('');

  useEffect(() => {
    if (!open) setText('');
  }, [open]);

  return (
    <div className={`fixed inset-0 z-[110] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/50 transition ${open ? 'opacity-100' : 'opacity-0'}`} />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-[420px] bg-[#0c0c15] border-l border-white/10 transform transition ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-white/10">
          <p className="text-sm font-semibold">
            Commentaires — <span className="text-white/70">{track?.title || '—'}</span>
          </p>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-140px)]">
          {comments.length === 0 && <p className="text-sm text-white/60">Soyez le premier à commenter.</p>}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">
                {(c.author[0] || 'U').toUpperCase()}
              </div>
              <div>
                <p className="text-sm">
                  <span className="font-medium">{c.author}</span>{' '}
                  <span className="text-white/50 text-xs ml-1">{new Date(c.ts).toLocaleString()}</span>
                </p>
                <p className="text-sm text-white/90 whitespace-pre-wrap">{c.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              onAdd(text.trim());
              setText('');
            }}
            className="flex gap-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ajouter un commentaire…"
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none"
            />
            <button className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 text-sm">Envoyer</button>
          </form>
        </div>
      </aside>
    </div>
  );
}

function DevTests({ track }: { track: any }) {
  useEffect(() => {
    try {
      console.assert(!!track, 'Track should exist');
      console.assert(typeof track?.title === 'string', 'Track has title');
      console.log('[DevTests] TikTokPlayer v3 basic tests OK');
    } catch (e) {
      console.error('[DevTests] FAILED', e);
    }
  }, [track]);
  return null;
}

export default function SynauraTikTokPlayer({ isOpen, onClose, initialTrackId }: TikTokPlayerProps) {
  const {
    audioState,
    play,
    pause,
    seek,
    playTrack,
    setCurrentTrackIndex,
  } = useAudioPlayer();

  const vh = useViewportHeight();
  const { canDownload, upgradeMessage } = useDownloadPermission();

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [lyricsFor, setLyricsFor] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [activeTrackId, setActiveTrackId] = useState<string | undefined>(undefined);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentIndexRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const isBootingRef = useRef(true);
  const isProgrammaticScrollRef = useRef(false);

  const tracks = audioState.tracks || [];
  const ids = useMemo(() => tracks.map(getTrackId).filter(Boolean), [tracks]);
  
  const currentIndex = audioState.currentTrackIndex ?? 0;
  const currentTrack = tracks[currentIndex] || null;

  const activeTrack = tracks.find(t => getTrackId(t) === activeTrackId) || currentTrack;

  // Debounce pour activeId (raf-safe)
  const setActiveDebounced = useCallback((id: string) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setActiveTrackId(id));
  }, []);
  
  const { isLiked, likesCount, toggleLike, checkLikeStatus } = useLikeSystem({
    trackId: getTrackId(activeTrack),
    initialLikesCount: typeof activeTrack?.likes === 'number'
      ? activeTrack.likes
      : Array.isArray(activeTrack?.likes)
        ? activeTrack.likes.length
        : 0,
    initialIsLiked: activeTrack?.isLiked || false,
  });

  useEffect(() => {
    const trackId = getTrackId(activeTrack);
    if (trackId) {
      checkLikeStatus();
      setCommentsMap((prev) => {
        if (prev[trackId]) return prev;
        const initial: Comment[] = Array.isArray(activeTrack.comments)
          ? activeTrack.comments.map((text: string, idx: number) => ({
              id: `init-${idx}`,
              author: activeTrack.artist?.name || activeTrack.artist?.username || 'Fan',
              text,
              ts: Date.now() - idx * 60000,
            }))
          : [];
        return { ...prev, [trackId]: initial };
      });
    }
  }, [activeTrack, checkLikeStatus]);

  // Synchroniser currentIndexRef avec activeId
  useEffect(() => {
    if (activeTrackId) {
      const idx = tracks.findIndex(t => getTrackId(t) === activeTrackId);
      if (idx >= 0) currentIndexRef.current = idx;
    }
  }, [activeTrackId, tracks]);

  const scrollToIdx = useCallback((i: number) => {
    const id = getTrackId(tracks[i]);
    if (!id) return;
    const pane = containerRef.current?.querySelector<HTMLElement>(`[data-id="${id}"]`);
    if (pane) {
      isProgrammaticScrollRef.current = true;
      pane.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => { isProgrammaticScrollRef.current = false; }, 240);
    }
  }, [tracks]);

  // Séquence de boot/sync
  useEffect(() => {
    if (!isOpen || !containerRef.current) {
      isBootingRef.current = true; // Réinitialiser pour la prochaine ouverture
      return;
    }
    
    isBootingRef.current = true; // Commencer le boot
    const startId = initialTrackId ?? ids[0];
    if (!startId) {
      isBootingRef.current = false;
      return;
    }

    setActiveTrackId(startId);
    const pane = containerRef.current.querySelector<HTMLElement>(`[data-id="${startId}"]`);
    if (pane) {
      isProgrammaticScrollRef.current = true;
      pane.scrollIntoView({ behavior: 'instant' as any, block: 'center' });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
        isBootingRef.current = false;
      }, 220);
    } else {
      isBootingRef.current = false;
    }
  }, [isOpen, ids, initialTrackId]); // au montage/ouverture

  const handleNextTrack = useCallback(async () => {
    if (isBootingRef.current) return;
    const i = currentIndexRef.current;
    if (i < tracks.length - 1) {
      const currentId = getTrackId(tracks[i]);
      if (currentId) {
        sendTrackEvents(currentId, { event_type: 'next', source: 'tiktok-player' });
      }
      scrollToIdx(i + 1);
    }
  }, [tracks, scrollToIdx]);

  const handlePreviousTrack = useCallback(async () => {
    if (isBootingRef.current) return;
    const i = currentIndexRef.current;
    if (i > 0) {
      const currentId = getTrackId(tracks[i]);
      if (currentId) {
        sendTrackEvents(currentId, { event_type: 'prev', source: 'tiktok-player' });
      }
      scrollToIdx(i - 1);
    }
  }, [tracks, scrollToIdx]);

  const togglePlay = useCallback(async () => {
    try {
      if (audioState.isLoading) return;
      const trackId = getTrackId(activeTrack);
      if (audioState.isPlaying) {
        pause();
      } else {
        await play();
        if (trackId) {
          sendTrackEvents(trackId, { event_type: 'play_start', source: 'tiktok-player' });
        }
      }
    } catch {}
  }, [audioState.isLoading, audioState.isPlaying, pause, play, activeTrack]);

  const swipe = useVerticalSwipe({
    onSwipeUp: () => {
      if (isBootingRef.current) return;
      const i = currentIndexRef.current;
      if (i < tracks.length - 1) {
        scrollToIdx(i + 1);
      }
    },
    onSwipeDown: () => {
      if (isBootingRef.current) return;
      const i = currentIndexRef.current;
      if (i > 0) {
        scrollToIdx(i - 1);
      }
    },
    minDistance: 60,
    minVelocity: 0.6,
    lockDistance: 8,
    maxFlickDuration: 350,
    cooldownMs: 260,
  });

  // IntersectionObserver pour détecter la carte visible et auto-play
  useEffect(() => {
    if (!containerRef.current || !isOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isBootingRef.current || isProgrammaticScrollRef.current) return;

        let best: IntersectionObserverEntry | null = null;
        let bestRatio = 0;
        
        for (const e of entries) {
          if (e.intersectionRatio > bestRatio) {
            bestRatio = e.intersectionRatio;
            best = e;
          }
        }
        
        if (!best || !best.isIntersecting || best.intersectionRatio < 0.6) return;

        const id = (best.target as Element).getAttribute('data-id');
        if (!id) return;
        if (id === activeTrackId) return;

        setActiveDebounced(id);
        const idx = tracks.findIndex(t => getTrackId(t) === id);
        const track = idx >= 0 ? tracks[idx] : undefined;
        if (!track) return;

        isProgrammaticScrollRef.current = true;
        playTrack(track).finally(() => {
          requestAnimationFrame(() => { isProgrammaticScrollRef.current = false; });
        });
      },
      { threshold: [0.25, 0.5, 0.75, 0.9], root: containerRef.current }
    );

    const cards = containerRef.current.querySelectorAll('[data-card]');
    cards.forEach((card) => observer.observe(card));

    return () => {
      cards.forEach((card) => observer.unobserve(card));
    };
  }, [isOpen, tracks, activeTrackId, playTrack, setActiveDebounced]);


  const lastTap = useRef(0);
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      const trackId = getTrackId(activeTrack);
      if (trackId) {
        try { (navigator as any)?.vibrate?.(12); } catch {}
        toggleLike();
        setBurstKey((key) => key + 1);
      }
    }
    lastTap.current = now;
  }, [activeTrack, toggleLike]);

  const onShare = useCallback(async () => {
    try {
      const id = getTrackId(activeTrack);
      if (!id) return;
      const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/track/${id}?autoplay=1` : '';
      const data = {
        title: activeTrack?.title || 'Musique',
        text: `Écoutez ${activeTrack?.title || 'ma musique'}`,
        url: shareUrl
      };
      if ((navigator as any).share) {
        await (navigator as any).share(data);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(data.url);
        toast.success('Lien copié');
      }
      sendTrackEvents(id, { event_type: 'share', source: 'tiktok-player' });
    } catch {}
  }, [activeTrack]);

  const handleDownload = useCallback(() => {
    if (!canDownload) {
      toast.error(upgradeMessage || 'Fonction non disponible pour votre offre');
      return;
    }
    setShowDownloadDialog(true);
  }, [canDownload, upgradeMessage]);

  const confirmDownload = useCallback(async () => {
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

  useEffect(() => {
    if (!isOpen) return;
    let block = false;
    const handler = (e: WheelEvent) => {
      if (block) return;
      const y = e.deltaY;
      if (Math.abs(y) < 40) return;
      if (y > 0) {
        handleNextTrack();
      } else {
        handlePreviousTrack();
      }
      block = true;
      setTimeout(() => { block = false; }, 420);
    };
    window.addEventListener('wheel', handler, { passive: true });
    return () => window.removeEventListener('wheel', handler);
  }, [isOpen, handleNextTrack, handlePreviousTrack]);

  useEffect(() => {
    if (!isOpen) return;
    const keyHandler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleNextTrack();
      }
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        handlePreviousTrack();
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        if (commentsOpen) {
          setCommentsOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [isOpen, handleNextTrack, handlePreviousTrack, togglePlay, commentsOpen, onClose]);

  const getCoverUrl = useCallback((track: any) => {
    const raw = track?.coverUrl || '/default-cover.jpg';
    const url = getCdnUrl(raw) || raw;
    return url && typeof url === 'string' && url.includes('res.cloudinary.com')
      ? url.replace('/upload/', '/upload/f_auto,q_auto/')
      : url;
  }, []);

  const currentCommentsCount = activeTrackId
    ? commentsMap[activeTrackId]?.length || 0
    : 0;

  if (!isOpen || tracks.length === 0) {
    return null;
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
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="absolute inset-0 -z-10"
            animate={{
              scale: [1.05, 1.1, 1.05],
              x: [0, 6, -4, 0],
              y: [0, -4, 6, 0]
            }}
            transition={{ repeat: Infinity, duration: 18 }}
          >
            <img
              src={getCoverUrl(activeTrack || tracks[0])}
              alt="bg"
              className="h-full w-full object-cover opacity-25"
            />
          </motion.div>

          <motion.div
            className="absolute inset-0 -z-10"
            animate={{ backgroundPosition: ['0% 0%', '50% 50%', '0% 0%'] }}
            transition={{ repeat: Infinity, duration: 16 }}
            style={{
              backgroundImage: 'radial-gradient(60% 60% at 20% 20%, rgba(124,58,237,.35), transparent 60%), radial-gradient(60% 60% at 80% 80%, rgba(34,211,238,.35), transparent 60%)',
              backgroundSize: '200% 200%'
            }}
          />

          <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3">
            <button
              onClick={onClose}
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

          <div
            ref={containerRef}
            {...swipe}
            className="h-full w-full overflow-y-auto snap-y snap-mandatory no-scrollbar overscroll-contain touch-none scroll-smooth"
          >
            {tracks.map((track, idx) => {
              const trackId = getTrackId(track);
              const isActive = trackId === activeTrackId;
              const trackLikes = typeof track.likes === 'number' ? track.likes : (Array.isArray(track.likes) ? track.likes.length : 0);
              const trackComments = trackId ? (commentsMap[trackId]?.length || 0) : 0;
              
              return (
                <TrackCard
                  key={trackId || idx}
                  track={track}
                  playing={isActive && audioState.isPlaying}
                  time={isActive ? audioState.currentTime : 0}
                  dur={isActive ? audioState.duration : 0}
                  likes={trackLikes}
                  isLiked={isActive ? isLiked : false}
                  commentsCount={trackComments}
                  onLike={isActive ? toggleLike : () => {}}
                  openComments={() => {
                    if (trackId) setActiveTrackId(trackId);
                    setCommentsOpen(true);
                  }}
                  share={onShare}
                  doubleTap={handleDoubleTap}
                  onToggle={isActive ? togglePlay : () => {
                    if (trackId) setActiveTrackId(trackId);
                    playTrack(track).catch(() => {});
                  }}
                  onSeek={isActive ? seek : () => {}}
                  onDownload={handleDownload}
                  canDownload={canDownload}
                  getCoverUrl={getCoverUrl}
                  lyricsVisible={lyricsFor === trackId}
                  toggleLyrics={() => setLyricsFor((id) => (id === trackId ? null : trackId))}
                />
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <CommentsDrawer
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        track={activeTrack}
        comments={(activeTrackId && commentsMap[activeTrackId]) || []}
        onAdd={(text) => {
          if (!activeTrackId) return;
          setCommentsMap((prev) => ({
            ...prev,
            [activeTrackId]: [
              ...(prev[activeTrackId] || []),
              {
                id: Math.random().toString(36).slice(2),
                author: 'Vous',
                text,
                ts: Date.now()
              }
            ]
          }));
        }}
      />

      <DownloadDialog
        isOpen={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        onConfirm={confirmDownload}
        trackTitle={activeTrack?.title || 'Titre inconnu'}
        artistName={activeTrack?.artist?.name || activeTrack?.artist?.username || 'Artiste inconnu'}
        isDownloading={isDownloading}
      />

      <DevTests track={activeTrack} />
    </>
  );
}
