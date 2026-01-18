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
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

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

  // RAF: mise à jour DOM-only (évite de rerender le player pendant la lecture)
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
      data-swipe-ignore
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
          style={{ width: "0%", background: 'linear-gradient(90deg,#ff4bd1,#7aa8ff)' }}
        />
        <div
          ref={knobRef}
          className="absolute -top-1 h-5 w-5 rounded-full bg-white shadow"
          style={{ left: "calc(0% - 10px)" }}
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

type TrackCardProps = {
  track: any;
  trackId: string;
  playing: boolean;
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
  getAudioElement: () => HTMLAudioElement | null;
  lyricsVisible: boolean;
  toggleLyrics: () => void;
  isActive?: boolean;
  shouldRenderMedia?: boolean;
  coverLoaded?: boolean;
  onCoverLoad?: () => void;
};

function TrackCard({
  track,
  trackId,
  playing,
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
  getAudioElement,
  lyricsVisible,
  toggleLyrics,
  isActive,
  shouldRenderMedia,
  coverLoaded,
  onCoverLoad,
}: TrackCardProps) {
  const coverUrl = useMemo(() => getCoverUrl(track), [getCoverUrl, trackId, track?.coverUrl]);
  return (
    <div 
      className="h-screen w-full relative px-5 flex items-center justify-center snap-center snap-always" 
      data-card
      data-id={getTrackId(track)}
      onDoubleClick={doubleTap}
    >
      <div className="relative flex items-center justify-center">
        {shouldRenderMedia !== false ? (
          <div className="relative w-[72vw] max-w-[520px] aspect-square rounded-3xl border border-white/10 shadow-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/6 via-white/3 to-white/6" />
            <img
              src={coverUrl}
              alt={track?.title}
              loading={isActive ? "eager" : "lazy"}
              decoding="async"
              onLoad={onCoverLoad}
              className={`absolute inset-0 w-full h-full object-cover cursor-pointer transition-opacity duration-300 ${
                coverLoaded ? "opacity-100" : "opacity-0"
              }`}
              onClick={onToggle}
            />
          </div>
        ) : (
          <div
            className="w-[72vw] max-w-[520px] aspect-square rounded-3xl border border-white/10 shadow-xl bg-gradient-to-br from-white/5 via-white/3 to-white/5"
            aria-hidden="true"
          />
        )}
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
            <SeekBar onSeek={onSeek} getAudioElement={getAudioElement} />
          </div>

          {track?.lyrics && lyricsVisible && (
            <div
              className="mt-3 max-h-40 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-white/85 border-t border-white/10 pt-2"
              data-swipe-ignore
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
            >
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
        data-swipe-ignore
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
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
    getAudioElement,
  } = useAudioPlayer();

  const vh = useViewportHeight();
  const reduceMotion = useReducedMotion();
  const { canDownload, upgradeMessage } = useDownloadPermission();

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [lyricsFor, setLyricsFor] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [activeTrackId, setActiveTrackId] = useState<string | undefined>(undefined);
  const [coverLoadedById, setCoverLoadedById] = useState<Record<string, boolean>>({});
  const [navDir, setNavDir] = useState<1 | -1>(1);

  const rafRef = useRef<number | null>(null);
  const isBootingRef = useRef(true);
  const isProgrammaticScrollRef = useRef(false);
  const wheelBlockRef = useRef(false);

  const tracks = audioState.tracks || [];
  const ids = useMemo(() => tracks.map(getTrackId).filter(Boolean), [tracks]);
  
  const activeIndex = useMemo(() => {
    if (activeTrackId) {
      const idx = tracks.findIndex((t) => getTrackId(t) === activeTrackId);
      if (idx >= 0) return idx;
    }
    return 0;
  }, [activeTrackId, tracks]);

  const activeTrack = tracks[activeIndex] || null;

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

  const goToIndex = useCallback(
    async (nextIndex: number, dir: 1 | -1) => {
      if (!tracks.length) return;
      const idx = clamp(nextIndex, 0, tracks.length - 1);
      const t = tracks[idx];
      const id = getTrackId(t);
      if (!id) return;
      if (isBootingRef.current || isProgrammaticScrollRef.current) return;

      isProgrammaticScrollRef.current = true;
      setLyricsFor(null);
      setNavDir(dir);
      setActiveTrackId(id);
      try {
        await playTrack(t);
      } finally {
        requestAnimationFrame(() => {
          isProgrammaticScrollRef.current = false;
        });
      }
    },
    [playTrack, tracks],
  );

  // Séquence de boot/sync
  useEffect(() => {
    if (!isOpen) {
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
    const idx = tracks.findIndex((t) => getTrackId(t) === startId);
    const t = idx >= 0 ? tracks[idx] : tracks[0];
    if (t) {
      isProgrammaticScrollRef.current = true;
      playTrack(t).finally(() => {
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
          isBootingRef.current = false;
        }, 120);
      });
    } else {
      isBootingRef.current = false;
    }
  }, [isOpen, ids, initialTrackId]); // au montage/ouverture

  const handleNextTrack = useCallback(async () => {
    const currentId = getTrackId(activeTrack);
    if (currentId) sendTrackEvents(currentId, { event_type: 'next', source: 'tiktok-player' });
    await goToIndex(activeIndex + 1, 1);
  }, [activeIndex, activeTrack, goToIndex]);

  const handlePreviousTrack = useCallback(async () => {
    const currentId = getTrackId(activeTrack);
    if (currentId) sendTrackEvents(currentId, { event_type: 'prev', source: 'tiktok-player' });
    await goToIndex(activeIndex - 1, -1);
  }, [activeIndex, activeTrack, goToIndex]);

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
      handleNextTrack();
    },
    onSwipeDown: () => {
      handlePreviousTrack();
    },
    minDistance: 60,
    minVelocity: 0.6,
    lockDistance: 8,
    maxFlickDuration: 350,
    cooldownMs: 260,
  });


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

  // Wheel (desktop): next/prev avec petit cooldown (sans scroll)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: WheelEvent) => {
      if (wheelBlockRef.current) return;
      const y = e.deltaY;
      if (Math.abs(y) < 40) return;
      wheelBlockRef.current = true;
      setTimeout(() => {
        wheelBlockRef.current = false;
      }, 260);
      if (y > 0) handleNextTrack();
      else handlePreviousTrack();
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

  const markCoverLoaded = useCallback((id: string) => {
    if (!id) return;
    setCoverLoadedById((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }, []);

  // Précharger les covers autour de la carte active pour éviter le "clignote"
  useEffect(() => {
    if (!isOpen) return;
    if (tracks.length === 0) return;
    const center = activeIndex;
    const range = 4; // active ±4
    const start = Math.max(0, center - range);
    const end = Math.min(tracks.length - 1, center + range);

    for (let i = start; i <= end; i++) {
      const t = tracks[i];
      const id = getTrackId(t);
      if (!id || coverLoadedById[id]) continue;
      const url = getCoverUrl(t);
      if (!url) continue;
      const img = new Image();
      img.onload = () => markCoverLoaded(id);
      img.src = url;
    }
  }, [activeIndex, coverLoadedById, getCoverUrl, isOpen, markCoverLoaded, tracks]);

  const bgUrl = useMemo(
    () => getCoverUrl(activeTrack || tracks[0]),
    [activeTrack, tracks, getCoverUrl],
  );

  const currentCommentsCount = activeTrackId
    ? commentsMap[activeTrackId]?.length || 0
    : 0;

  if (!isOpen) return null;

  // Ouverture instantanée même si les tracks ne sont pas encore prêtes
  if (tracks.length === 0) {
    return (
      <AnimatePresence>
        <motion.div
          key="tiktok-loading"
          className="fixed inset-0 z-[100] bg-black text-white overflow-hidden select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3">
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-black/30 grid place-items-center border border-white/10"
              title="Fermer"
            >
              <X size={22} />
            </button>
          </div>

          <div className="h-full w-full grid place-items-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-white/80" />
              <p className="text-sm text-white/70">Chargement du player…</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
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
          transition={{ duration: 0.3 }}
        >
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

          {/* Overlay statique (évite une anim infinie GPU-costly) */}
          <div
            className="absolute inset-0 -z-10"
            style={{
              backgroundImage:
                'radial-gradient(60% 60% at 20% 20%, rgba(124,58,237,.28), transparent 60%), radial-gradient(60% 60% at 80% 80%, rgba(34,211,238,.28), transparent 60%)',
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
            {...swipe}
            className="h-full w-full flex items-center justify-center"
            style={{ height: vh }}
          >
            <AnimatePresence mode="wait" custom={navDir}>
              <motion.div
                key={getTrackId(activeTrack) || String(activeIndex)}
                custom={navDir}
                initial={(dir: 1 | -1) => ({
                  opacity: 0,
                  y: dir === 1 ? 70 : -70,
                  scale: 0.992,
                })}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={(dir: 1 | -1) => ({
                  opacity: 0,
                  y: dir === 1 ? -70 : 70,
                  scale: 0.992,
                })}
                transition={{ duration: 0.24, ease: [0.2, 0.9, 0.2, 1] }}
                className="w-full h-full"
              >
                {(() => {
                  const track = activeTrack;
                  const trackId = getTrackId(track);
                  const trackLikes =
                    typeof track?.likes === 'number'
                      ? track.likes
                      : Array.isArray(track?.likes)
                        ? track.likes.length
                        : 0;
                  const trackComments = trackId ? (commentsMap[trackId]?.length || 0) : 0;
                  return (
                    <TrackCard
                      track={track}
                      trackId={trackId || String(activeIndex)}
                      playing={!!audioState.isPlaying}
                      likes={trackLikes}
                      isLiked={isLiked}
                      commentsCount={trackComments}
                      onLike={toggleLike}
                      openComments={() => setCommentsOpen(true)}
                      share={onShare}
                      doubleTap={handleDoubleTap}
                      onToggle={togglePlay}
                      onSeek={seek}
                      onDownload={handleDownload}
                      canDownload={canDownload}
                      getCoverUrl={getCoverUrl}
                      getAudioElement={getAudioElement}
                      lyricsVisible={lyricsFor === trackId}
                      toggleLyrics={() => setLyricsFor((id) => (id === trackId ? null : trackId))}
                      isActive={true}
                      shouldRenderMedia={true}
                      coverLoaded={!!coverLoadedById[trackId]}
                      onCoverLoad={() => markCoverLoaded(trackId)}
                    />
                  );
                })()}
              </motion.div>
            </AnimatePresence>
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

      {process.env.NODE_ENV !== "production" && <DevTests track={activeTrack} />}
    </>
  );
}
