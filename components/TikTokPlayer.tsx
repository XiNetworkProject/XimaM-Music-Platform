'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { useLikeSystem } from '@/hooks/useLikeSystem';
import { useDownloadPermission, downloadAudioFile } from '@/hooks/useDownloadPermission';
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
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

/**
 * SynauraTikTokPlayer v3 — Connexion avec useAudioPlayer + swipe parallax
 *
 * Features:
 *  - Swipe vertical avec framer-motion (drag + parallax)
 *  - Intégration complète avec useAudioPlayer context
 *  - Likes synchronisés via useLikeSystem
 *  - Analytics events tracking
 *  - Download avec permissions
 *  - Design actuel préservé
 */

interface TikTokPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Utils
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const fmtNum = new Intl.NumberFormat("fr-FR");

// Hook pour la hauteur du viewport
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

// Heart Burst (double-tap feedback)
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

export default function SynauraTikTokPlayer({ isOpen, onClose }: TikTokPlayerProps) {
  const { data: session } = useSession();
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

  // États locaux
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [lyricsFor, setLyricsFor] = useState<string | null>(null);

  const currentIndex = audioState.currentTrackIndex ?? 0;
  const currentTrack = audioState.tracks[currentIndex] || null;
  const prevTrack = currentIndex > 0 ? audioState.tracks[currentIndex - 1] : null;
  const nextTrack = currentIndex < audioState.tracks.length - 1 ? audioState.tracks[currentIndex + 1] : null;

  // Like system
  const { isLiked, likesCount, toggleLike, checkLikeStatus } = useLikeSystem({
    trackId: currentTrack?._id || '',
    initialLikesCount: typeof currentTrack?.likes === 'number' ? currentTrack.likes : (Array.isArray(currentTrack?.likes) ? currentTrack.likes.length : 0),
    initialIsLiked: currentTrack?.isLiked || false,
  });

  useEffect(() => {
    if (currentTrack?._id) checkLikeStatus();
  }, [currentTrack?._id, checkLikeStatus]);

  // Comments mock
  type Comment = { id: string; author: string; text: string; ts: number };
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});

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
    
    if (currentTrack?._id) {
      sendTrackEvents(currentTrack._id, { event_type: 'next', source: 'tiktok-player' });
    }
    
    if (nextTrack?._id) {
      await playTrack(nextTrack);
    } else {
      setCurrentTrackIndex(currentIndex + 1);
      await play();
    }
  }, [currentIndex, nextTrack, currentTrack, audioState.isLoading, playTrack, setCurrentTrackIndex, play]);

  const handlePreviousTrack = useCallback(async () => {
    if (!prevTrack || audioState.isLoading) return;
    
    if (currentTrack?._id) {
      sendTrackEvents(currentTrack._id, { event_type: 'prev', source: 'tiktok-player' });
    }
    
    if (prevTrack?._id) {
      await playTrack(prevTrack);
    } else {
      setCurrentTrackIndex(currentIndex - 1);
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

  // Swipe interactif avec framer-motion
  const dragY = useMotionValue(0);
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
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      
      if (e.code === 'ArrowUp' && prevTrack) {
        e.preventDefault();
        handlePreviousTrack();
      }
      if (e.code === 'ArrowDown' && nextTrack) {
        e.preventDefault();
        handleNextTrack();
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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, prevTrack, nextTrack, togglePlay, handlePreviousTrack, handlePreviousTrack, handleNextTrack, onClose, commentsOpen]);

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

  const getCoverUrl = (t: any) => {
    const raw = t?.coverUrl || '/default-cover.jpg';
    const url = getCdnUrl(raw) || raw;
    return url && typeof url === 'string' && url.includes('res.cloudinary.com')
      ? url.replace('/upload/', '/upload/f_auto,q_auto/')
      : url;
  };

  if (!isOpen || !currentTrack) {
    return null;
  }

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
              </div>
            </div>

            {/* Heart burst */}
            <HeartBurst burstKey={burstKey} />

            {/* Up/Down hint */}
            <div className="pointer-events-none absolute top-16 right-3 z-40 hidden sm:flex flex-col items-center text-white/60 text-xs">
              <ChevronUp className="w-4 h-4" />
              <span>Swipe ↑ / ↓</span>
              <ChevronDown className="w-4 h-4 mt-1" />
            </div>

            {/* Prev/Current/Next avec parallax */}
            {prevTrack && (
              <motion.div className="absolute inset-0" style={{ y: prevY, scale: prevScale, opacity: prevOpacity }}>
                <TrackCard
                  track={prevTrack}
                  playing={false}
                  time={0}
                  dur={0}
                  likes={typeof prevTrack?.likes === 'number' ? prevTrack.likes : 0}
                  isLiked={false}
                  onLike={() => {}}
                  openComments={() => setCommentsOpen(true)}
                  share={onShare}
                  doubleTap={handleDoubleTap}
                  onToggle={() => {}}
                  onSeek={() => {}}
                  onDownload={handleDownload}
                  canDownload={canDownload}
                  getCoverUrl={getCoverUrl}
                  lyricsVisible={false}
                  toggleLyrics={() => {}}
                />
              </motion.div>
            )}

            <motion.div
              className="absolute inset-0"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.45}
              style={{ y: dragY }}
              onDragEnd={onDragEnd}
            >
              <TrackCard
                track={currentTrack}
                playing={audioState.isPlaying}
                time={audioState.currentTime}
                dur={audioState.duration}
                likes={likesCount}
                isLiked={isLiked}
                onLike={toggleLike}
                openComments={() => setCommentsOpen(true)}
                share={onShare}
                doubleTap={handleDoubleTap}
                onToggle={togglePlay}
                onSeek={seek}
                onDownload={handleDownload}
                canDownload={canDownload}
                getCoverUrl={getCoverUrl}
                lyricsVisible={lyricsFor === currentTrack._id}
                toggleLyrics={() => setLyricsFor(id => id === currentTrack._id ? null : currentTrack._id)}
              />
            </motion.div>

            {nextTrack && (
              <motion.div className="absolute inset-0" style={{ y: nextY, scale: nextScale, opacity: nextOpacity }}>
                <TrackCard
                  track={nextTrack}
                  playing={false}
                  time={0}
                  dur={0}
                  likes={typeof nextTrack?.likes === 'number' ? nextTrack.likes : 0}
                  isLiked={false}
                  onLike={() => {}}
                  openComments={() => setCommentsOpen(true)}
                  share={onShare}
                  doubleTap={handleDoubleTap}
                  onToggle={() => {}}
                  onSeek={() => {}}
                  onDownload={handleDownload}
                  canDownload={canDownload}
                  getCoverUrl={getCoverUrl}
                  lyricsVisible={false}
                  toggleLyrics={() => {}}
                />
              </motion.div>
            )}

          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer commentaires */}
      <CommentsDrawer
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        track={currentTrack}
        comments={(currentTrack?._id && commentsMap[currentTrack._id]) || []}
        onAdd={(text) => {
          if (!text?.trim() || !currentTrack?._id) return;
          setCommentsMap((m) => ({
            ...m,
            [currentTrack._id]: [
              ...(m[currentTrack._id] || []),
              { id: Math.random().toString(36).slice(2), author: "Vous", text, ts: Date.now() },
            ],
          }));
        }}
      />

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

// TrackCard Component (le design actuel)
function TrackCard({ 
  track, 
  playing, 
  time, 
  dur, 
  likes, 
  isLiked,
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
}: { 
  track: any; 
  playing: boolean; 
  time: number; 
  dur: number; 
  likes: number;
  isLiked: boolean; 
  onLike: () => void; 
  openComments: () => void; 
  share: () => void; 
  doubleTap: () => void; 
  onToggle: () => void; 
  onSeek: (time: number) => void;
  onDownload: () => void;
  canDownload: boolean;
  getCoverUrl: (t: any) => string;
  lyricsVisible: boolean;
  toggleLyrics: () => void;
}) {
  return (
    <div className="h-full w-full relative px-5 flex items-center justify-center" onDoubleClick={doubleTap}>
      {/* Media center: cover */}
      <div className="relative flex items-center justify-center">
        <img
          src={getCoverUrl(track)}
          alt={track?.title}
          className="w-[72vw] max-w-[520px] aspect-square object-cover rounded-3xl border border-white/10 shadow-xl cursor-pointer"
          onClick={onToggle}
        />
        
        {/* Play/Pause overlay center */}
        <button
          onClick={onToggle}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm grid place-items-center hover:bg-white/30 transition">
            {playing ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
          </div>
        </button>
      </div>

      {/* Colonne d'actions droite */}
      <aside className="absolute right-3 bottom-28 flex flex-col items-center gap-3">
        <ActionBtn
          active={isLiked}
          count={fmtNum.format(likes)}
          onClick={onLike}
          icon={Heart}
          ariaLabel="Aimer"
        />
        <ActionBtn
          count={fmtNum.format(0)}
          onClick={openComments}
          icon={MessageCircle}
          ariaLabel="Commentaires"
        />
        <ActionBtn
          count={fmtNum.format(0)}
          onClick={share}
          icon={Share2}
          ariaLabel="Partager"
        />
        <ActionBtn 
          onClick={onDownload} 
          icon={canDownload ? Download : Lock} 
          ariaLabel="Télécharger"
          disabled={!canDownload}
        />
      </aside>

      {/* Bandeau bas info */}
      <footer className="absolute left-0 right-0 bottom-0 p-4">
        <div className="mx-auto max-w-3xl bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white/70 flex items-center gap-1">
                <Music2 className="w-4 h-4" /> {(track as any)?.album ? "Album" : "Single"}
                {(track as any)?.album && (
                  <span className="ml-1 text-white/60">• {(track as any).album}</span>
                )}
              </p>
              <h2 className="text-lg font-semibold truncate">{track?.title}</h2>
              <div className="mt-0.5 flex items-center gap-2 text-sm flex-wrap">
                <span className="font-medium truncate flex items-center gap-1">
                  {track?.artist?.name || track?.artist?.username || 'Artiste inconnu'}
                  {track?.artist?.isVerified && <Verified className="w-4 h-4 text-sky-300" />}
                </span>
                {track?.artist?._id && track?.artist?.username && (
                  <span onClick={(e) => e.stopPropagation()}>
                    <FollowButton
                      artistId={track.artist._id}
                      artistUsername={track.artist.username}
                      size="sm"
                    />
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-white/60 flex items-center gap-1">
                <Disc3 className="w-3.5 h-3.5" /> Qualité audio: <span className="ml-1 font-medium">320k</span>
              </p>
            </div>

            {/* Play/Pause + Lyrics button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onToggle}
                className="p-3 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition"
                aria-label={playing ? "Pause" : "Lecture"}
              >
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              {track?.lyrics && (
                <button
                  onClick={toggleLyrics}
                  className={`px-3 py-2 rounded-xl border transition text-sm ${
                    lyricsVisible 
                      ? 'bg-white/15 border-white/20' 
                      : 'bg-white/10 border-white/10 hover:bg-white/15'
                  }`}
                >
                  Paroles
                </button>
              )}
            </div>
          </div>

          {/* Paroles */}
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

type ActionBtnProps = {
  icon: React.ComponentType<{ className?: string; size?: number; fill?: string }>;
  count?: string | number;
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
      } ${
        active ? "bg-white/10 border-white/20" : "bg-white/5 border-white/10"
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? "text-rose-300" : ""}`} size={22} fill={active ? "currentColor" : "none"} />
      {typeof count !== "undefined" && (
        <span className="text-[10px] leading-none text-white/70">{count}</span>
      )}
    </button>
  );
}

// Drawer Commentaires
type CommentsDrawerProps = {
  open: boolean;
  onClose: () => void;
  track?: any;
  comments: { id: string; author: string; text: string; ts: number }[];
  onAdd: (text: string) => void;
};

function CommentsDrawer({ open, onClose, track, comments, onAdd }: CommentsDrawerProps) {
  const [text, setText] = useState<string>("");

  useEffect(() => {
    if (!open) setText("");
  }, [open]);

  return (
    <div className={`fixed inset-0 z-[110] ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition ${open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-[420px] bg-[#0c0c15] border-l border-white/10 transform transition ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-white/10">
          <p className="text-sm font-semibold">
            Commentaires — <span className="text-white/70">{track?.title || "—"}</span>
          </p>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-140px)]">
          {comments.length === 0 && (
            <p className="text-sm text-white/60">Soyez le premier à commenter.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">
                {(c.author[0] || "U").toUpperCase()}
              </div>
              <div>
                <p className="text-sm">
                  <span className="font-medium">{c.author}</span>{" "}
                  <span className="text-white/50 text-xs ml-1">
                    {new Date(c.ts).toLocaleString()}
                  </span>
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
              onAdd(text);
              setText("");
            }}
            className="flex gap-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ajouter un commentaire…"
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none"
            />
            <button className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 text-sm">
              Envoyer
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}

/** Dev tests */
function DevTests({ track }: { track: any }) {
  useEffect(() => {
    try {
      console.assert(!!track, "Track should exist");
      console.assert(typeof track.title === "string", "Track has title");
      console.log("[DevTests] TikTokPlayer v3 connected OK");
    } catch (e) {
      console.error("[DevTests] FAILED", e);
    }
  }, [track]);
  return null;
}
