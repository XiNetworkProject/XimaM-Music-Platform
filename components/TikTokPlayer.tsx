'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAudioPlayer } from '@/app/providers';
import FollowButton from '@/components/FollowButton';
import { applyCdnToTracks } from '@/lib/cdnHelpers';

type Track = {
  _id: string;
  title: string;
  artist: { _id: string; name: string; username: string; avatar?: string };
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  likes: any;
  comments: any;
  plays: number;
  isLiked?: boolean;
  genre?: string[];
  lyrics?: string;
};

interface TikTokPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrackId?: string;
}

const fmtTime = (s: number) => {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
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

export default function TikTokPlayer({ isOpen, onClose, initialTrackId }: TikTokPlayerProps) {
  const router = useRouter();
  const { audioState, setTracks, playTrack, play, pause, seek, handleLike } = useAudioPlayer();

  const [loading, setLoading] = useState(false);
  const [tracks, setLocalTracks] = useState<Track[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lyricsOpen, setLyricsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wheelLockRef = useRef(false);
  const didBootRef = useRef(false);

  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  const currentId = currentTrack?._id;

  const close = useCallback(() => {
    try {
      onClose();
    } catch {
      // fallback
      router.push('/');
    }
  }, [onClose, router]);

  // Plein écran: bloque le scroll du body uniquement quand ouvert
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Charge le feed à l'ouverture (même endpoint que l'accueil)
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    didBootRef.current = false;

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
      } catch {
        // silencieux
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, setTracks]);

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
      // laisser React/DOM monter les refs, puis scroll
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

  // Auto-play quand on change d’écran (TikTok-like)
  useEffect(() => {
    if (!isOpen) return;
    const t = tracks[activeIndex];
    if (!t?._id) return;

    const timer = window.setTimeout(() => {
      if (currentId !== t._id) playTrack(t as any);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [isOpen, activeIndex, tracks, playTrack, currentId]);

  // Wheel “1 écran par scroll” (desktop)
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (lyricsOpen) return;
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
    [activeIndex, tracks.length, scrollToIndex, lyricsOpen]
  );

  // Keyboard (↑ ↓ + espace + escape)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (lyricsOpen) return;

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
  }, [isOpen, activeIndex, tracks.length, scrollToIndex, audioState.isPlaying, pause, play, close, lyricsOpen]);

  const onShare = useCallback(async (t: Track) => {
    const url = `${window.location.origin}/track/${t._id}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: t.title, text: 'Écoute sur Synaura', url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // ignore
    }
  }, []);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center text-white bg-black">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] text-white bg-black">
      <div
        ref={containerRef}
        onWheel={onWheel}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory swipe-container"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {tracks.map((t, i) => {
          const isThis = i === activeIndex;
          const isPlayingThis = isThis && currentId === t._id && audioState.isPlaying;

          const duration =
            isThis && currentId === t._id
              ? audioState.duration || t.duration || 0
              : t.duration || 0;
          const currentTime = isThis && currentId === t._id ? audioState.currentTime || 0 : 0;

          const likesCount = getLikesCount(t.likes);
          const commentsCount = getCommentsCount(t.comments);

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
              <div className="absolute inset-0">
                <img
                  src={t.coverUrl || '/default-cover.jpg'}
                  alt=""
                  className="w-full h-full object-cover scale-110 blur-3xl opacity-40"
                  onError={(e) => (((e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'))}
                />
                <div className="absolute inset-0 bg-black/55" />
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-transparent to-cyan-900/20" />
              </div>

              <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between safe-area-top">
                <button
                  onClick={close}
                  className="w-11 h-11 rounded-full bg-black/35 hover:bg-black/55 border border-white/10 backdrop-blur-md flex items-center justify-center"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="text-xs text-white/70 flex items-center gap-2">
                  <span>Swipe ↑ / ↓</span>
                  <div className="flex flex-col -space-y-1">
                    <ChevronUp className="w-4 h-4 opacity-70" />
                    <ChevronDown className="w-4 h-4 opacity-70" />
                  </div>
                </div>
              </div>

              <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
                <button
                  onClick={() => handleLike(t._id)}
                  className="w-12 h-12 rounded-2xl bg-black/30 hover:bg-black/45 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center"
                >
                  <Heart className={`w-5 h-5 ${t.isLiked ? 'text-pink-400' : 'text-white'}`} />
                  <span className="text-[11px] mt-0.5 text-white/80">{fmtCount(likesCount)}</span>
                </button>

                <button
                  onClick={() => router.push(`/track/${t._id}`, { scroll: false })}
                  className="w-12 h-12 rounded-2xl bg-black/30 hover:bg-black/45 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-[11px] mt-0.5 text-white/80">{fmtCount(commentsCount)}</span>
                </button>

                <button
                  onClick={() => onShare(t)}
                  className="w-12 h-12 rounded-2xl bg-black/30 hover:bg-black/45 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="text-[11px] mt-0.5 text-white/80"> </span>
                </button>

                <a
                  href={t.audioUrl}
                  download
                  className="w-12 h-12 rounded-2xl bg-black/30 hover:bg-black/45 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center"
                >
                  <Download className="w-5 h-5" />
                  <span className="text-[11px] mt-0.5 text-white/80"> </span>
                </a>
              </div>

              <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
                <button
                  onClick={() => {
                    if (currentId !== t._id) playTrack(t as any);
                    else if (audioState.isPlaying) pause();
                    else play();
                  }}
                  className="relative w-[78vw] max-w-[520px] aspect-square rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
                >
                  <img
                    src={t.coverUrl || '/default-cover.jpg'}
                    alt={t.title}
                    className="w-full h-full object-cover"
                    onError={(e) => (((e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'))}
                  />
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-black/40 border border-white/10 backdrop-blur-md flex items-center justify-center">
                      {isPlayingThis ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7" />}
                    </div>
                  </div>
                </button>
              </div>

              <div className="absolute left-1/2 -translate-x-1/2 bottom-5 z-20 w-[94vw] max-w-[1000px] safe-area-bottom">
                <div className="rounded-2xl bg-black/30 border border-white/10 backdrop-blur-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-white/70">♪ Single</p>
                      <p className="text-lg font-bold leading-tight line-clamp-1">{t.title}</p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-white/80">{t.artist?.name || t.artist?.username}</p>
                        {t.artist?._id && (
                          <FollowButton
                            artistId={t.artist._id}
                            artistUsername={t.artist.username}
                            size="sm"
                            className="text-xs py-1 px-2 rounded-full"
                          />
                        )}
                        <span className="text-xs text-white/60">Qualité audio: 320k</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          if (currentId !== t._id) playTrack(t as any);
                          else if (audioState.isPlaying) pause();
                          else play();
                        }}
                        className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center"
                      >
                        {isPlayingThis ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>

                      <button
                        onClick={() => setLyricsOpen(true)}
                        className="px-4 h-12 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span className="text-sm font-semibold">Paroles</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-white/70 mb-2">
                      <span>{fmtTime(currentTime)}</span>
                      <span>{fmtTime(duration)}</span>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={Math.max(1, duration)}
                      value={Math.min(currentTime, Math.max(1, duration))}
                      onChange={(e) => {
                        if (currentId === t._id) seek(Number(e.target.value));
                        else {
                          playTrack(t as any).then(() => {
                            setTimeout(() => seek(Number(e.target.value)), 120);
                          });
                        }
                      }}
                      className="w-full slider"
                    />
                  </div>
                </div>
              </div>

              {lyricsOpen && isThis && (
                <div className="absolute inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end">
                  <div className="w-full max-w-[1000px] mx-auto rounded-t-3xl border border-white/10 bg-black/55 backdrop-blur-xl p-5 pb-8 safe-area-bottom">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-lg">Paroles</p>
                      <button
                        onClick={() => setLyricsOpen(false)}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="mt-4 max-h-[55vh] overflow-y-auto pr-1">
                      <pre className="whitespace-pre-wrap text-sm text-white/85 leading-relaxed">
                        {t.lyrics?.trim()
                          ? t.lyrics
                          : 'Aucune parole disponible pour ce titre (pour le moment).'}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              <div className="absolute right-4 bottom-28 z-30 hidden md:flex flex-col gap-2">
                <button
                  onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
                  className="w-10 h-10 rounded-full bg-black/30 hover:bg-black/45 border border-white/10 backdrop-blur-md flex items-center justify-center"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollToIndex(Math.min(tracks.length - 1, activeIndex + 1))}
                  className="w-10 h-10 rounded-full bg-black/30 hover:bg-black/45 border border-white/10 backdrop-blur-md flex items-center justify-center"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}

        {!tracks.length && (
          <div className="h-[100svh] flex items-center justify-center text-white/70">
            Aucune musique à afficher.
          </div>
        )}
      </div>
    </div>
  );
}

