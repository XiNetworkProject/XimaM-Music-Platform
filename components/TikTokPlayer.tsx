'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { useLikeSystem } from '@/hooks/useLikeSystem';
import { Heart, X, Volume2, VolumeX, MessageCircle, Share2, Download, Lock, Disc3, ListMusic, Loader2, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import toast from 'react-hot-toast';
import AudioQualityIndicator, { AudioQualityTooltip } from './AudioQualityIndicator';
import DownloadDialog from './DownloadDialog';
import { useDownloadPermission, downloadAudioFile } from '@/hooks/useDownloadPermission';
import FollowButton from './FollowButton';
import { sendTrackEvents } from '@/lib/analyticsClient';
import { getCdnUrl } from '@/lib/cdn';

interface TikTokPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Synaura TikTok Player — Version moderne
 * 
 * - Swipe vertical "live" avec parallax
 * - Double-tap pour like avec vibration
 * - Modal commentaires (bottom-sheet)
 * - Seekbar avec bulle de temps
 * - Vinyle centré avec rotation et anneau de progression
 * - Fond animé avec Ken Burns effect
 * - Support molette souris et flèches clavier
 */

// ---------------- Utils ----------------
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const fmt = (t = 0) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// ---------------- Icons personnalisés ----------------
const IconEQ = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" className={className}>
    <rect x="3" y="10" width="3" height="8" fill="currentColor" />
    <rect x="9" y="6" width="3" height="12" fill="currentColor" />
    <rect x="15" y="12" width="3" height="6" fill="currentColor" />
  </svg>
);

const IconSend = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" className={className}>
    <path d="M3 11l18-8-8 18-2-7-8-3z" fill="currentColor" />
  </svg>
);

// ---------------- UI Blocks ----------------
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center rounded-full bg-white/12 px-3 py-1 text-xs border border-white/12 backdrop-blur-sm">
      {children}
    </div>
  );
}

function SideRow({ icon, label, count, onClick, disabled }: { icon: React.ReactNode; label?: string; count?: number; onClick?: () => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.button
        whileTap={disabled ? {} : { scale: 0.9 }}
        onClick={onClick}
        disabled={disabled}
        className={`rounded-full bg-white/12 p-3 border border-white/10 backdrop-blur-md hover:bg-white/16 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-white/30 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {icon}
      </motion.button>
      {typeof count === 'number' && <div className="text-[11px] text-white/70 tabular-nums">{count}</div>}
      {label && <div className="text-[11px] text-white/80 mt-1">{label}</div>}
    </div>
  );
}

// ---------------- Vinyl Component ----------------
function Vinyl({ 
  cover, 
  playing, 
  progress, 
  onToggle, 
  isLoading 
}: { 
  cover: string; 
  playing: boolean; 
  progress: number; 
  onToggle: () => void; 
  isLoading?: boolean;
}) {
  return (
    <div className="relative">
      {/* Halo animé */}
      <motion.div
        className="absolute -inset-16 rounded-full blur-3xl opacity-50 hidden md:block"
        animate={{ x: [0, 10, -8, 0], y: [0, -8, 6, 0] }}
        transition={{ repeat: Infinity, duration: 14 }}
        style={{
          background: 'radial-gradient(60% 60% at 30% 30%, rgba(124,58,237,.35), transparent 70%),radial-gradient(60% 60% at 70% 70%, rgba(34,211,238,.35), transparent 70%)'
        }}
      />

      <div className="relative grid place-items-center">
        {/* Anneau de progression */}
        <div
          className="h-[300px] w-[300px] md:h-[340px] md:w-[340px] rounded-full"
          style={{
            background: `conic-gradient(#ffffff ${progress}%, transparent ${progress}%)`
          }}
        />
        
        {/* Vinyle rotatif */}
        <motion.button
          aria-label="play/pause"
          animate={{ rotate: playing ? 360 : 0 }}
          transition={{ repeat: playing ? Infinity : 0, ease: 'linear', duration: 16 }}
          className="absolute h-[280px] w-[280px] md:h-[320px] md:w-[320px] rounded-full overflow-hidden border border-white/12 shadow-2xl focus:outline-none"
          onClick={onToggle}
        >
          <img src={cover} alt="cover" className="h-full w-full object-cover" />
          
          {/* Centre du vinyle avec play/pause */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/90 text-slate-900 grid place-items-center">
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : playing ? (
              <Pause size={20} />
            ) : (
              <Play size={20} className="ml-1" />
            )}
          </div>
        </motion.button>
      </div>
    </div>
  );
}

// ---------------- SeekBar avec bulle de temps ----------------
function SeekBar({ 
  time, 
  dur, 
  onSeek 
}: { 
  time: number; 
  dur: number; 
  onSeek: (time: number) => void;
}) {
  const progress = dur ? (time / dur) * 100 : 0;
  const ref = useRef<HTMLDivElement>(null);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleLeft, setBubbleLeft] = useState(0);
  const [bubbleTime, setBubbleTime] = useState(0);

  const update = (clientX: number, commit = false) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = clamp(clientX - r.left, 0, r.width);
    const t = (x / r.width) * (dur || 0);
    setBubbleLeft(x);
    setBubbleTime(t);
    if (commit) onSeek(t);
  };

  return (
    <div className="w-full">
      <div
        ref={ref}
        className="relative h-3 w-full rounded-full bg-white/12 overflow-hidden cursor-pointer"
        onPointerDown={(e) => {
          setShowBubble(true);
          update(e.clientX, true);
        }}
        onPointerMove={(e) => e.buttons === 1 && update(e.clientX, true)}
        onPointerUp={() => setShowBubble(false)}
        onTouchStart={(e) => {
          setShowBubble(true);
          update(e.touches[0].clientX, true);
        }}
        onTouchMove={(e) => update(e.touches[0].clientX, true)}
        onTouchEnd={() => setShowBubble(false)}
      >
        {/* Barre de progression */}
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg,#ff4bd1,#7aa8ff)'
          }}
        />
        
        {/* Poignée */}
        <div
          className="absolute -top-1 h-5 w-5 rounded-full bg-white shadow"
          style={{ left: `calc(${progress}% - 10px)` }}
        />
        
        {/* Bulle de temps */}
        {showBubble && (
          <div
            className="absolute -top-8"
            style={{
              left: clamp(bubbleLeft - 20, 0, (ref.current?.getBoundingClientRect().width || 0) - 40)
            }}
          >
            <div className="rounded-md bg-black/70 px-2 py-1 text-[11px] tabular-nums border border-white/10">
              {fmt(bubbleTime)}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-2 flex items-center justify-between text-[12px] text-white/80 tabular-nums">
        <span>{fmt(time)}</span>
        <span>{fmt(dur || 0)}</span>
      </div>
    </div>
  );
}

// ---------------- Comment Modal ----------------
function CommentModal({ 
  open, 
  onClose, 
  track 
}: { 
  open: boolean; 
  onClose: () => void; 
  track: any;
}) {
  if (!open) return null;

  const mockComments = [
    { id: 1, user: track?.artist?.name || track?.artist?.username || 'Artiste', text: 'Merci pour votre écoute !' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-black/50"
        onClick={onClose}
      />
      <motion.div
        key="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'tween', duration: 0.22 }}
        className="fixed bottom-0 left-0 right-0 z-[91] bg-[#0b1224] border-t border-white/10 rounded-t-2xl p-4 max-h-[70vh] overflow-hidden"
      >
        <div className="mx-auto max-w-[720px]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-white/70">Commentaires</div>
            <button
              onClick={onClose}
              className="rounded-full bg-white/10 px-2 py-1 text-xs border border-white/10"
            >
              Fermer
            </button>
          </div>
          
          <div className="overflow-y-auto space-y-3 pr-1" style={{ maxHeight: '48vh' }}>
            {mockComments.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <img
                  src={track?.artist?.avatar || track?.coverUrl || '/default-avatar.jpg'}
                  alt="avatar"
                  className="h-8 w-8 rounded-full object-cover border border-white/10"
                />
                <div>
                  <div className="text-sm font-medium">{c.user}</div>
                  <div className="text-sm text-white/80">{c.text}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-3 flex items-center gap-2">
            <input
              placeholder="Ajouter un commentaire…"
              className="flex-1 rounded-full bg-white/10 border border-white/15 px-3 py-2 text-sm outline-none placeholder:text-white/50"
            />
            <button className="rounded-full bg-white/20 p-2 border border-white/10">
              <IconSend />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------- Heart Burst (double-tap feedback) ----------------
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

// ---------------- Hook pour la hauteur du viewport ----------------
function useViewportHeight() {
  const [vh, setVh] = useState(800);
  
  useEffect(() => {
    const upd = () => setVh(Math.max(400, window.innerHeight));
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, []);
  
  return vh;
}

// ---------------- Slide Page ----------------
function SlidePage({ 
  track, 
  playing, 
  time, 
  dur, 
  likes, 
  onLike, 
  openComments, 
  share, 
  doubleTap, 
  onToggle, 
  onSeek,
  onDownload,
  canDownload
}: { 
  track: any; 
  playing: boolean; 
  time: number; 
  dur: number; 
  likes: number; 
  onLike: () => void; 
  openComments: () => void; 
  share: () => void; 
  doubleTap: () => void; 
  onToggle: () => void; 
  onSeek: (time: number) => void;
  onDownload: () => void;
  canDownload: boolean;
}) {
  const getCoverUrl = (t: any) => {
    const raw = t?.coverUrl || '/default-cover.jpg';
    const url = getCdnUrl(raw) || raw;
    return url && typeof url === 'string' && url.includes('res.cloudinary.com')
      ? url.replace('/upload/', '/upload/f_auto,q_auto/')
      : url;
  };

  const progress = dur ? (time / dur) * 100 : 0;

  return (
    <div className="relative h-full w-full" onDoubleClick={doubleTap}>
      {/* Centre vinyle */}
      <div className="relative z-10 h-full w-full grid grid-rows-[1fr_auto] md:grid-rows-1">
        <div className="flex items-end justify-center pb-8 md:items-center md:pb-0">
          <Vinyl 
            cover={getCoverUrl(track)} 
            playing={playing} 
            onToggle={onToggle} 
            progress={progress}
            isLoading={false}
          />
        </div>

        {/* Bandeau bas (profil/titre/seek) */}
        <div className="relative px-4 pb-6 md:px-8">
          <div className="flex items-center gap-3 mb-2">
            <img 
              src={track?.artist?.avatar || '/default-avatar.jpg'} 
              alt="avatar" 
              className="h-8 w-8 rounded-full object-cover border border-white/10" 
            />
            <div className="truncate text-sm font-medium">
              {track?.artist?.name || track?.artist?.username || 'Artiste'}
            </div>
            <span onClick={(e) => e.stopPropagation()}>
              <FollowButton
                artistId={track?.artist?._id}
                artistUsername={track?.artist?.username}
                size="sm"
              />
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold tracking-tight">{track?.title || 'Titre'}</h3>
            {playing && (
              <span className="text-white/70">
                <IconEQ />
              </span>
            )}
          </div>
          
          <div className="mt-1 text-[12px] text-white/70 inline-flex items-center gap-2">
            {(track as any)?.album ? (
              <span className="rounded-full bg-white/10 px-2 py-[2px] border border-white/10 inline-flex items-center gap-1">
                <Disc3 size={10} /> Album
              </span>
            ) : (
              <span className="rounded-full bg-white/10 px-2 py-[2px] border border-white/10 inline-flex items-center gap-1">
                <ListMusic size={10} /> Single
              </span>
            )}
          </div>

          <div className="mt-4">
            <SeekBar time={time} dur={dur} onSeek={onSeek} />
          </div>
        </div>

        {/* Rail d'actions à droite */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-5">
          <SideRow 
            icon={<Heart size={22} fill={likes > 0 ? 'currentColor' : 'none'} />} 
            count={likes} 
            onClick={onLike} 
          />
          <SideRow 
            icon={<MessageCircle size={22} />} 
            count={track?.comments?.length || 0} 
            onClick={openComments} 
          />
          <SideRow 
            icon={<Share2 size={22} />} 
            label="Partager" 
            onClick={share} 
          />
          <SideRow 
            icon={canDownload ? <Download size={22} /> : <Lock size={22} />} 
            label="Télécharger" 
            onClick={onDownload}
            disabled={!canDownload}
          />
        </div>
      </div>

      {/* HUD mobile (badge + timer) */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 py-3 text-xs md:hidden">
        <Badge>HQ</Badge>
        {dur ? (
          <div className="text-white/80 tabular-nums">
            {fmt(time)} / {fmt(dur || 0)}
          </div>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

// ---------------- Composant principal ----------------
export default function TikTokPlayer({ isOpen, onClose }: TikTokPlayerProps) {
  const { data: session } = useSession();
  const {
    audioState,
    play,
    pause,
    seek,
    playTrack,
    setCurrentTrackIndex,
    setTracks,
    setQueueAndPlay,
  } = useAudioPlayer();
  
  // États locaux
  const [showComments, setShowComments] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [mutedUI, setMutedUI] = useState(false);
  
  const { canDownload, upgradeMessage } = useDownloadPermission();
  const vh = useViewportHeight();

  const currentIndex = audioState.currentTrackIndex ?? 0;
  const currentTrack = audioState.tracks[currentIndex] || null;
  const prevTrack = currentIndex > 0 ? audioState.tracks[currentIndex - 1] : null;
  const nextTrack = currentIndex < audioState.tracks.length - 1 ? audioState.tracks[currentIndex + 1] : null;

  // Like system
  const { isLiked, likesCount, toggleLike, checkLikeStatus } = useLikeSystem({
    trackId: currentTrack?._id || '',
    initialLikesCount: currentTrack?.likes?.length || 0,
    initialIsLiked: currentTrack?.isLiked || false,
  });

  useEffect(() => {
    if (currentTrack?._id) checkLikeStatus();
  }, [currentTrack?._id, checkLikeStatus]);

  // Toggle play/pause
  const togglePlay = useCallback(async () => {
    try {
      if (audioState.isLoading) return;
      if (audioState.isPlaying) {
        pause();
      } else {
        await play();
        if (currentTrack?._id) {
          sendTrackEvents(currentTrack._id, {
            event_type: 'play_start',
            source: 'tiktok-player',
          });
        }
      }
    } catch {}
  }, [audioState.isPlaying, audioState.isLoading, play, pause, currentTrack?._id]);

  // Navigation
  const handleNextTrack = useCallback(async () => {
    if (!nextTrack || audioState.isLoading) return;
    const newIndex = currentIndex + 1;
    
        if (currentTrack?._id) {
          sendTrackEvents(currentTrack._id, { event_type: 'next', source: 'tiktok-player' });
        }
    
    if (nextTrack?._id) {
      await playTrack(nextTrack._id);
      } else {
      setCurrentTrackIndex(newIndex);
        await play();
      }
  }, [currentIndex, nextTrack, currentTrack, audioState.isLoading, playTrack, setCurrentTrackIndex, play]);

  const handlePreviousTrack = useCallback(async () => {
    if (!prevTrack || audioState.isLoading) return;
    const newIndex = currentIndex - 1;
    
        if (currentTrack?._id) {
          sendTrackEvents(currentTrack._id, { event_type: 'prev', source: 'tiktok-player' });
        }
    
    if (prevTrack?._id) {
      await playTrack(prevTrack._id);
      } else {
      setCurrentTrackIndex(newIndex);
        await play();
      }
  }, [currentIndex, prevTrack, currentTrack, audioState.isLoading, playTrack, setCurrentTrackIndex, play]);

  // Double tap to like
  const lastTap = useRef(0);
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (currentTrack?._id) {
        try {
          (navigator as any)?.vibrate?.(12);
        } catch {}
        toggleLike();
        setBurstKey((k) => k + 1);
      }
    }
    lastTap.current = now;
  }, [currentTrack?._id, toggleLike]);

  // Share
  const onShare = useCallback(async () => {
    try {
      const id = currentTrack?._id || '';
      const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/track/${id}?autoplay=1` : '';
      const shareData = {
        title: currentTrack?.title || 'Musique',
        text: `Écoutez ${currentTrack?.title || 'ma musique'}`,
        url: shareUrl
      };
      
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
  }, [currentTrack]);

  // Download
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
      const filename = `${currentTrack?.artist?.name || currentTrack?.artist?.username || 'Artiste'}-${currentTrack?.title || 'Titre'}.wav`.replace(/\s+/g, '_');
      await downloadAudioFile(currentTrack?.audioUrl || '', filename, () => {});
      toast.success('Téléchargement terminé !');
    } catch {
      toast.error('Échec du téléchargement');
    } finally {
      setIsDownloading(false);
      setShowDownloadDialog(false);
    }
  }, [currentTrack]);

  // Swipe interactif
  const dragY = useMotionValue(0);
  const currY = dragY;
  const nextY = useTransform(dragY, (v: number) => v + vh);
  const prevY = useTransform(dragY, (v: number) => v - vh);
  const ratio = useTransform(dragY, (v: number) => clamp(Math.abs(v) / vh, 0, 1));
  const prevScale = useTransform(ratio, [0, 1], [1, 0.96]);
  const nextScale = useTransform(ratio, [0, 1], [1, 0.96]);
  const prevOpacity = useTransform(ratio, [0, 1], [1, 0.85]);
  const nextOpacity = useTransform(ratio, [0, 1], [1, 0.85]);

  const onDragEnd = useCallback((_: any, info: any) => {
    const dy = info.offset.y + info.velocity.y * 0.18;
    const threshold = 160;
    if (dy < -threshold && nextTrack) {
      handleNextTrack();
      dragY.set(0);
      return;
    }
    if (dy > threshold && prevTrack) {
      handlePreviousTrack();
      dragY.set(0);
      return;
    }
    dragY.stop();
    dragY.set(0);
  }, [nextTrack, prevTrack, handleNextTrack, handlePreviousTrack, dragY]);

  // Desktop wheel navigation
  useEffect(() => {
    if (!isOpen) return;
    let block = false;
    const handler = (e: WheelEvent) => {
      if (block) return;
      const y = e.deltaY;
      if (Math.abs(y) < 40) return;
      if (y > 0 && nextTrack) {
        handleNextTrack();
        block = true;
        setTimeout(() => (block = false), 350);
      } else if (y < 0 && prevTrack) {
        handlePreviousTrack();
        block = true;
        setTimeout(() => (block = false), 350);
      }
    };
    window.addEventListener('wheel', handler, { passive: true });
    return () => window.removeEventListener('wheel', handler);
  }, [isOpen, nextTrack, prevTrack, handleNextTrack, handlePreviousTrack]);

  // Arrow keys
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' && prevTrack) handlePreviousTrack();
      if (e.code === 'ArrowDown' && nextTrack) handleNextTrack();
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, prevTrack, nextTrack, togglePlay, handlePreviousTrack, handleNextTrack, onClose]);

  // Track view event
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

  if (!isOpen || !currentTrack) {
    return null;
  }

  const getCoverUrl = (t: any) => {
    const raw = t?.coverUrl || '/default-cover.jpg';
    const url = getCdnUrl(raw) || raw;
    return url && typeof url === 'string' && url.includes('res.cloudinary.com')
      ? url.replace('/upload/', '/upload/f_auto,q_auto/')
      : url;
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
            className="fixed inset-0 z-[100] bg-black text-white overflow-hidden select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
            {/* Fond animé (Ken Burns effect) */}
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
                src={getCoverUrl(currentTrack)}
                alt="bg"
                className="h-full w-full object-cover opacity-28"
              />
            </motion.div>
            
            {/* Gradient overlay */}
              <motion.div
              className="absolute inset-0 -z-10"
              animate={{
                backgroundPosition: ['0% 0%', '50% 50%', '0% 0%']
              }}
              transition={{ repeat: Infinity, duration: 16 }}
                style={{
                backgroundImage: 'radial-gradient(60% 60% at 20% 20%, rgba(124,58,237,.35), transparent 60%), radial-gradient(60% 60% at 80% 80%, rgba(34,211,238,.35), transparent 60%)',
                backgroundSize: '200% 200%'
              }}
            />

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="h-10 w-10 rounded-full bg-black/30 grid place-items-center border border-white/10"
                  title="Fermer"
                >
                  <X size={22} />
                </button>
                <AudioQualityTooltip>
                  <AudioQualityIndicator size="sm" showUpgrade={true} />
                </AudioQualityTooltip>
              </div>
                  <button
                className="h-10 w-10 rounded-full bg-black/30 grid place-items-center border border-white/10"
                title={audioState.isMuted ? 'Son coupé' : 'Son actif'}
                onClick={() => setMutedUI((m) => !m)}
                  >
                    {audioState.isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
              </div>

            {/* Heart burst */}
            <HeartBurst burstKey={burstKey} />

            {/* Prev/Current/Next avec parallax */}
                  {prevTrack && (
              <motion.div className="absolute inset-0" style={{ y: prevY, scale: prevScale, opacity: prevOpacity }}>
                <SlidePage
                  track={prevTrack}
                  playing={false}
                  time={0}
                  dur={0}
                  likes={prevTrack?.likes?.length || 0}
                  onLike={() => {}}
                  openComments={() => setShowComments(true)}
                  share={onShare}
                  doubleTap={handleDoubleTap}
                  onToggle={() => {}}
                  onSeek={() => {}}
                  onDownload={handleDownload}
                  canDownload={canDownload}
                />
              </motion.div>
            )}

                  <motion.div
              className="absolute inset-0"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.45}
              style={{ y: currY }}
              onDragEnd={onDragEnd}
            >
              <SlidePage
                track={currentTrack}
                playing={audioState.isPlaying}
                time={audioState.currentTime}
                dur={audioState.duration}
                likes={likesCount}
                onLike={toggleLike}
                openComments={() => setShowComments(true)}
                share={onShare}
                doubleTap={handleDoubleTap}
                onToggle={togglePlay}
                onSeek={seek}
                onDownload={handleDownload}
                canDownload={canDownload}
              />
                    </motion.div>

            {nextTrack && (
              <motion.div className="absolute inset-0" style={{ y: nextY, scale: nextScale, opacity: nextOpacity }}>
                <SlidePage
                  track={nextTrack}
                  playing={false}
                  time={0}
                  dur={0}
                  likes={nextTrack?.likes?.length || 0}
                  onLike={() => {}}
                  openComments={() => setShowComments(true)}
                  share={onShare}
                  doubleTap={handleDoubleTap}
                  onToggle={() => {}}
                  onSeek={() => {}}
                  onDownload={handleDownload}
                  canDownload={canDownload}
                />
                </motion.div>
            )}

                  </motion.div>
                )}
              </AnimatePresence>

      {/* Comment modal */}
      <CommentModal open={showComments} onClose={() => setShowComments(false)} track={currentTrack} />

      {/* Download Dialog */}
              <AnimatePresence>
                {showDownloadDialog && (
                  <DownloadDialog
                    isOpen={showDownloadDialog}
                    onClose={() => setShowDownloadDialog(false)}
            onConfirm={confirmDownload}
                    trackTitle={currentTrack?.title || 'Titre inconnu'}
                    artistName={currentTrack?.artist?.name || currentTrack?.artist?.username || 'Artiste inconnu'}
                  />
      )}
    </AnimatePresence>
    </>
  );
}
