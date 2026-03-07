"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Heart,
  Radio,
  Sparkles,
  Music2,
  Users,
  ChevronLeft,
  ChevronRight,
  Disc3,
  Clock,
  TrendingUp,
  Crown,
  Repeat,
  Flame,
  RotateCcw,
  UserPlus,
  Zap,
} from "lucide-react";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAudioPlayer } from './providers';
import { applyCdnToTracks } from '@/lib/cdnHelpers';
import Avatar from '@/components/Avatar';
import FollowButton from '@/components/FollowButton';
import TrackContextMenu from '@/components/TrackContextMenu';
import LikeButton from '@/components/LikeButton';
import AdSlot from '@/components/AdSlot';
import OnboardingChecklist from '@/components/OnboardingChecklist';

interface Track {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  likes: string[];
  comments: string[];
  plays: number;
  isLiked?: boolean;
  genre?: string[];
  lyrics?: string;
  album?: string | null;
  createdAt?: string;
}

interface PreferenceProfile {
  artistScores: Record<string, number>;
  genreScores: Record<string, number>;
  recencyPreference: number;
  trackCount: number;
}

interface PublicPlaylist {
  _id: string;
  name: string;
  description?: string;
  coverUrl?: string | null;
  trackCount?: number;
  user?: { username?: string; name?: string; avatar?: string };
}

const normalizeScoresMap = (map: Map<string, number>) => {
  const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1;
  const record: Record<string, number> = {};
  entries.forEach(([key, value]) => {
    record[key] = value / total;
  });
  return record;
};

const buildPreferenceProfile = (tracks: Track[]): PreferenceProfile | null => {
  if (!tracks || tracks.length === 0) return null;

  const artistWeights = new Map<string, number>();
  const genreWeights = new Map<string, number>();
  const now = Date.now();
  let recencyAccumulator = 0;

  tracks.forEach((track, index) => {
    const weight = 1 + (tracks.length - index) / tracks.length;
    if (track.artist?._id) {
      artistWeights.set(
        track.artist._id,
        (artistWeights.get(track.artist._id) || 0) + weight,
      );
    }
    const genres = Array.isArray(track.genre)
      ? track.genre
      : track.genre
      ? [track.genre]
      : [];
    genres.forEach((genre) => {
      const key = genre?.trim()?.toLowerCase();
      if (!key) return;
      genreWeights.set(key, (genreWeights.get(key) || 0) + weight);
    });
    if (track.createdAt) {
      const release = new Date(track.createdAt).getTime();
      const recency = Math.max(
        0,
        1 - (now - release) / (1000 * 60 * 60 * 24 * 365),
      );
      recencyAccumulator += recency;
    }
  });

  return {
    artistScores: normalizeScoresMap(artistWeights),
    genreScores: normalizeScoresMap(genreWeights),
    recencyPreference: recencyAccumulator / tracks.length,
    trackCount: tracks.length,
  };
};

const scoreTrackForProfile = (
  track: Track,
  profile?: PreferenceProfile | null,
) => {
  // Popularité normalisée (log-scale, plafonnée) : contribue ~30% au score total
  const rawPop = Math.log10((track.plays || 0) + 1) * 0.4 + ((track.likes?.length || 0) * 0.001);
  const basePopularity = Math.min(rawPop, 3.0); // Plafond pour que la popularité ne domine pas
  if (!profile) return basePopularity;

  let personalization = 0;

  // Artiste préféré : poids très fort — un artiste écouté/liké doit remonter significativement
  if (track.artist?._id && profile.artistScores[track.artist._id]) {
    personalization += 8.0 * profile.artistScores[track.artist._id];
  }

  // Genre préféré : poids fort — les goûts musicaux doivent compter
  const genres = Array.isArray(track.genre)
    ? track.genre
    : track.genre
    ? [track.genre]
    : [];
  genres.forEach((genre) => {
    const key = genre?.trim()?.toLowerCase();
    if (key && profile.genreScores[key]) {
      personalization += 5.0 * profile.genreScores[key];
    }
  });

  if (track.createdAt) {
    const now = Date.now();
    const days = (now - new Date(track.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, 1 - days / 180);
    personalization += recencyBoost * profile.recencyPreference * 2.0;
  }

  // La personnalisation pèse ~70% du score total quand l'utilisateur a de l'historique
  return basePopularity + personalization;
};

const scoreCreatorForProfile = (
  creator: any,
  profile?: PreferenceProfile | null,
) => {
  if (!profile) {
    return (creator.totalPlays || 0) * 0.001 + (creator.followerCount || 0) * 0.01;
  }
  const trackScores = (creator.tracks || []).map((t: Track) =>
    scoreTrackForProfile(t, profile),
  );
  const avgScore =
    trackScores.reduce((sum: number, value: number) => sum + value, 0) /
      (trackScores.length || 1) || 0;
  return (
    avgScore +
    (creator.totalPlays || 0) * 0.001 +
    (creator.followerCount || 0) * 0.01
  );
};

const diversifyClientList = (tracks: Track[], maxConsecutive = 2): Track[] => {
  if (tracks.length <= maxConsecutive) return tracks;
  const result: Track[] = [];
  const deferred: Track[] = [];
  for (const track of tracks) {
    const artistId = track.artist?._id;
    if (!artistId) { result.push(track); continue; }
    let consecutive = 0;
    for (let i = result.length - 1; i >= 0 && i >= result.length - maxConsecutive; i--) {
      if (result[i].artist?._id === artistId) consecutive++;
      else break;
    }
    if (consecutive >= maxConsecutive) deferred.push(track);
    else result.push(track);
  }
  for (const track of deferred) {
    let inserted = false;
    for (let i = maxConsecutive; i < result.length; i++) {
      let safe = true;
      for (let j = Math.max(0, i - maxConsecutive + 1); j < i; j++) {
        if (result[j].artist?._id === track.artist?._id) { safe = false; break; }
      }
      if (safe) { result.splice(i, 0, track); inserted = true; break; }
    }
    if (!inserted) result.push(track);
  }
  return result;
};

const shuffleLight = <T,>(arr: T[], intensity = 0.3): T[] => {
  const copy = [...arr];
  const swaps = Math.floor(copy.length * intensity);
  for (let s = 0; s < swaps; s++) {
    const i = Math.floor(Math.random() * copy.length);
    const range = Math.min(5, copy.length - 1);
    const j = Math.min(copy.length - 1, i + Math.floor(Math.random() * range));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Mélange déterministe de Fisher-Yates seedé par un entier.
 * Même seed → même ordre ; seeds différents → ordres différents.
 */
const seededShuffle = <T,>(arr: T[], seed: number): T[] => {
  const copy = [...arr];
  let s = (seed >>> 0) || 1;
  for (let i = copy.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    s = (s ^ (s >>> 14)) >>> 0;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const dailySeedHash = (userId: string): number => {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${userId}-${today}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const pickDailyTracks = (
  allTracks: Track[],
  userId: string,
  profile: PreferenceProfile | null,
  count = 3,
): Track[] => {
  if (allTracks.length <= count) return allTracks;
  const seed = dailySeedHash(userId);

  const scored = allTracks.map((t) => {
    const pScore = profile ? scoreTrackForProfile(t, profile) : 0;
    const tId = t._id || '';
    let idHash = 0;
    for (let i = 0; i < tId.length; i++) {
      idHash = ((idHash << 5) - idHash + tId.charCodeAt(i)) | 0;
    }
    const dayVariance = ((Math.abs(idHash) ^ seed) % 1000) / 1000;
    return { track: t, score: pScore * 0.6 + dayVariance * 0.4 };
  });

  scored.sort((a, b) => b.score - a.score);

  const picks: Track[] = [];
  const usedArtists = new Set<string>();
  for (const { track } of scored) {
    if (picks.length >= count) break;
    const aId = track.artist?._id;
    if (aId && usedArtists.has(aId)) continue;
    picks.push(track);
    if (aId) usedArtists.add(aId);
  }
  return picks;
};

// Cache pour les données
const dataCache = new Map<string, { tracks: Track[]; timestamp: number }>();
const CACHE_DURATION = 15 * 1000;
const AUTO_REFRESH_INTERVAL = 2 * 60 * 1000;

const SectionTitle = ({
  icon: _Icon,
  title,
  actionLabel,
  onAction,
}: {
  icon?: any;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-base font-black text-white">{title}</h2>
    {actionLabel && (
      <button
        onClick={onAction}
        className="text-xs font-semibold text-white/40 hover:text-white transition"
      >
        {actionLabel} &rsaquo;
      </button>
    )}
  </div>
);

const HorizontalScroller = ({ children }: { children: React.ReactNode }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (element) {
      handleScroll();
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [children]);

  return (
    <div className="relative group">
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 border border-white/10 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm shadow-lg"
          aria-label="Défiler vers la gauche"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      )}

      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto no-scrollbar pb-2 pr-1 -mx-1" 
        style={{ scrollSnapType: "x mandatory" }}
        onScroll={handleScroll}
      >
        {children}
      </div>

      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 border border-white/10 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm shadow-lg"
          aria-label="Défiler vers la droite"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      )}
    </div>
  );
};

const formatK = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};

const TrackCard = ({ track, onPlay }: { track: any; onPlay?: (track: any) => void }) => {
  const handlePlay = () => {
    if (onPlay && track._original) {
      onPlay(track._original);
    }
  };

  const orig = track._original;
  const plays = orig?.plays || 0;
  const likesCount = Array.isArray(orig?.likes) ? orig.likes.length : 0;
  const dur = track.duration || 0;
  const durStr = `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`;
  const genre = Array.isArray(orig?.genre) ? orig.genre[0] : orig?.genre;

  return (
    <div
      className="min-w-[160px] md:min-w-[200px] max-w-[160px] md:max-w-[200px] rounded-xl p-2 hover:bg-white/[0.06] transition-all duration-200 group/card"
      style={{ scrollSnapAlign: 'start' }}
    >
      <div className="relative group/cover">
        <img
          src={track.cover}
          alt={track.title}
          className="w-full aspect-square object-cover rounded-lg"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'; }}
        />
        {dur > 0 && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-semibold text-white tabular-nums backdrop-blur-sm">
            {durStr}
          </span>
        )}
        {orig?.isBoosted && (
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-violet-500/30" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(245,158,11,0.3))', backdropFilter: 'blur(8px)' }}>
            <Zap className="w-2.5 h-2.5 text-amber-400" style={{ fill: 'rgba(245,158,11,0.3)' }} />
            <span className="text-[8px] font-bold text-white/90">Boosted</span>
          </div>
        )}
        <div className="absolute top-2 right-2 opacity-0 group-hover/cover:opacity-100 transition-opacity">
          <TrackContextMenu track={orig} />
        </div>
        <button
          onClick={handlePlay}
          className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-all shadow-lg shadow-indigo-500/30 hover:scale-110"
        >
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </button>
      </div>

      <div className="mt-2">
        <p className="text-[13px] font-semibold line-clamp-1 text-white">{track.title}</p>
        {genre && (
          <p className="text-[10px] text-white/30 truncate mt-0.5">{genre}</p>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-2.5 text-[10px] text-white/35">
        <span className="flex items-center gap-0.5">&#9654; {formatK(plays)}</span>
        {likesCount > 0 && (
          <span className="flex items-center gap-0.5">
            <Heart className="w-2.5 h-2.5" /> {formatK(likesCount)}
          </span>
        )}
      </div>

      {orig?.artist && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <img
            src={orig.artist.avatar || '/default-avatar.png'}
            className="w-4 h-4 rounded-full object-cover shrink-0"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.png'; }}
            alt=""
          />
          <span className="text-[11px] text-white/40 truncate">{orig.artist.name || orig.artist.username}</span>
        </div>
      )}
    </div>
  );
};


const EqBars = () => (
  <div className="flex items-end gap-[2px] h-4">
    {[40, 80, 55, 100, 65, 85, 45, 70, 50].map((h, i) => (
      <div
        key={i}
        className="w-[3px] rounded-full bg-indigo-400/70 animate-bounce"
        style={{
          height: `${h}%`,
          animationDelay: `${i * 0.07}s`,
          animationDuration: `${0.45 + (i % 3) * 0.15}s`,
        }}
      />
    ))}
  </div>
);

const LiveRadioCard = ({
  title,
  logoSrc,
  isPlaying,
  currentTrack,
  currentArtist = '',
  listeners = 0,
  onToggle,
  onOpenPlayer,
}: {
  title: string;
  logoSrc?: string;
  isPlaying: boolean;
  currentTrack: string;
  currentArtist?: string;
  listeners?: number;
  onToggle: () => void;
  onOpenPlayer?: () => void;
}) => {
  const fmtListeners = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-300 group
        ${isPlaying
          ? 'bg-gradient-to-br from-indigo-500/[0.12] to-violet-500/[0.06] border-indigo-500/25'
          : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12]'
        }`}
      onClick={onOpenPlayer}
    >
      {/* Subtle animated glow when playing */}
      {isPlaying && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.08),transparent_60%)] pointer-events-none" />
      )}

      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start gap-3 mb-3">
          {/* Logo */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 transition-all
            ${isPlaying ? 'ring-2 ring-indigo-400/30 shadow-lg shadow-indigo-500/15' : 'bg-white/[0.06] border border-white/[0.08]'}`}
          >
            {logoSrc ? (
              <img src={logoSrc} alt={title} className="w-10 h-7 object-contain" />
            ) : (
              <Radio className="w-5 h-5 text-white/50" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-sm font-bold text-white leading-tight">{title}</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded bg-red-500/15 border border-red-400/20 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[9px] font-black text-red-300 uppercase tracking-wider">Live</span>
              </span>
            </div>
            {listeners > 0 && (
              <p className="text-[11px] text-white/35">{fmtListeners(listeners)} auditeurs</p>
            )}
          </div>

          {/* Play/Pause */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="h-9 w-9 rounded-full bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20 shrink-0"
            aria-label={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isPlaying
              ? <Pause className="w-4 h-4 text-white" />
              : <Play className="w-4 h-4 text-white fill-white ml-0.5" />}
          </button>
        </div>

        {/* Current track info */}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white/75 truncate">{currentTrack || title}</p>
          {currentArtist && (
            <p className="text-[11px] text-white/40 truncate mt-0.5">{currentArtist}</p>
          )}
        </div>

        {/* Equalizer when playing */}
        {isPlaying && (
          <div className="mt-2.5">
            <EqBars />
          </div>
        )}
      </div>
    </div>
  );
};

const HeroCarousel = ({
  slides,
  onAction,
}: {
  slides: any[];
  onAction?: (action: string, data?: any) => void;
}) => {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isAuto, setIsAuto] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const startX = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);
  const DURATION = 5000;

  const next = () => {
    if (!slides?.length) return;
    setIndex((i) => (i + 1) % slides.length);
    setProgress(0);
    lastTs.current = null;
  };
  const prev = () => {
    if (!slides?.length) return;
    setIndex((i) => (i - 1 + slides.length) % slides.length);
    setProgress(0);
    lastTs.current = null;
  };

  useEffect(() => {
    if (!slides?.length) return;
    const tick = (ts: number) => {
      if (!isAuto || isHovered) {
        lastTs.current = ts;
        rafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      if (lastTs.current == null) lastTs.current = ts;
      const delta = ts - lastTs.current;
      lastTs.current = ts;

      setProgress((p) => {
        const nextP = p + delta / DURATION;
        if (nextP >= 1) {
          setIndex((i) => (i + 1) % slides.length);
          return 0;
        }
        return nextP;
      });

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTs.current = null;
    };
  }, [isAuto, isHovered, slides.length]);

  useEffect(() => {
    setProgress(0);
    lastTs.current = null;
  }, [index]);

  if (!slides?.length) return null;

  return (
    <div
      className="relative w-full h-[280px] md:h-[360px] rounded-2xl overflow-hidden bg-[#181818] shadow-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={(e) => (startX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        if (startX.current == null) return;
        const end = e.changedTouches[0]?.clientX ?? startX.current;
        const dx = end - startX.current;
        startX.current = null;
        if (Math.abs(dx) < 50) return;
        if (dx > 0) prev();
        else next();
      }}
    >
      {/* Progress bars type "stories" */}
      <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-10">
        {slides.map((_: any, i: number) => (
          <div
            key={i}
            className="h-0.5 flex-1 rounded-full bg-white/25 overflow-hidden"
          >
            <div
              className="h-full bg-white/95 transition-all duration-150"
              style={{
                width:
                  i < index
                    ? "100%"
                    : i > index
                    ? "0%"
                    : `${Math.round(progress * 100)}%`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Toggle auto/pause */}
      <button
        onClick={() => setIsAuto((v) => !v)}
        className="absolute top-3 right-3 z-10 px-3 py-2 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 text-xs flex items-center gap-2 backdrop-blur-sm text-white/80"
      >
        <Repeat className="w-3.5 h-3.5" />
        {isAuto ? "Auto" : "Pause"}
      </button>

      {slides.map((s: any, i: number) => (
        <div key={s.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <img src={s.image} alt={s.title} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-6">
            <div className="flex items-center gap-2 text-xs mb-2">
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/20 backdrop-blur-sm text-indigo-200 font-medium">
                {s.tag}
              </span>
              {s.genre && (
                <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm text-white/80">
                  {s.genre}
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-bold mt-2">{s.title}</h2>
            <p className="text-sm text-white/80">{s.subtitle}</p>
            {s.actionLabel && onAction && (
              <button 
                onClick={() => onAction(s.actionType, s.actionData ?? s.track)} 
                className="mt-3 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 rounded-full transition-all flex items-center gap-2 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
              >
                {s.actionIcon && <s.actionIcon className="w-4 h-4" />}
                <span className="text-sm">{s.actionLabel}</span>
              </button>
            )}
          </div>
        </div>
      ))}
      <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-2">
        {slides.map((_: any, i: number) => (
          <button
            key={i}
            onClick={() => {
              setIndex(i);
              setProgress(0);
              lastTs.current = null;
            }}
            className={`w-2 h-2 rounded-full ${
              i === index ? "bg-white" : "bg-white/40"
            }`}
          />
        ))}
      </div>
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 backdrop-blur-sm transition"
      >
        <ChevronLeft className="w-4 h-4 text-white" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 backdrop-blur-sm transition"
      >
        <ChevronRight className="w-4 h-4 text-white" />
      </button>
    </div>
  );
};

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-2xl bg-white/[0.06] border border-white/[0.08] ${className}`} />
);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 6) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
};

const WelcomeHeader = ({
  session,
  onGo,
  onListenNow,
}: {
  session: any;
  onGo: (path: string) => void;
  onListenNow: () => void;
}) => {
  const name =
    session?.user?.name ||
    session?.user?.username ||
    session?.user?.email?.split?.("@")?.[0] ||
    "";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
          {session ? `${getGreeting()}, ${name}` : 'Bienvenue sur Synaura'}
        </h1>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onListenNow}
          className="h-10 px-5 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white hover:scale-[1.03] active:scale-[0.97] transition-all text-sm font-bold inline-flex items-center gap-2 shadow-lg shadow-indigo-500/25"
        >
          <Play className="w-4 h-4 fill-current" />
          Écouter
        </button>
        {!session ? (
          <button
            onClick={() => onGo("/auth/signup")}
            className="h-10 px-5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 transition text-sm font-semibold text-white"
          >
            Créer un compte
          </button>
        ) : (
          <button
            onClick={() => onGo("/ai-generator")}
            className="h-10 px-5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 transition text-sm font-semibold text-white inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Studio IA
          </button>
        )}
      </div>
    </div>
  );
};


export default function SynauraHome() {
  const { data: session } = useSession();
  const { audioState, playTrack, play, pause, setTracks, seek, upNextEnabled, upNextTracks, toggleUpNextEnabled } = useAudioPlayer();
  const [loading, setLoading] = useState(true);
  const [showHomeMore, setShowHomeMore] = useState(true); // conservé pour compat, toujours true
  const [featuredTracks, setFeaturedTracks] = useState<Track[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [forYouTracks, setForYouTracks] = useState<Track[]>([]);
  const [guestPlaylists, setGuestPlaylists] = useState<PublicPlaylist[]>([]);
  const [guestPlaylistsLoading, setGuestPlaylistsLoading] = useState(false);
  const [popularUsers, setPopularUsers] = useState<any[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<any[]>([]);
  const [preferenceProfile, setPreferenceProfile] = useState<PreferenceProfile | null>(null);
  
  // États pour la bibliothèque
  const [libraryStats, setLibraryStats] = useState({
    playlists: 0,
    favorites: 0,
    recent: 0,
    aiGenerations: 0,
    totalTracks: 0
  });
  
  // États pour le carousel avancé
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [autoProgress, setAutoProgress] = useState(0);
  const [isCarouselInView, setIsCarouselInView] = useState(true);
  const rafRef = useRef<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  
  // États pour les nouvelles sections
  const [risingTracks, setRisingTracks] = useState<Track[]>([]);
  const [similarTracks, setSimilarTracks] = useState<Track[]>([]);
  const [similarSourceTitle, setSimilarSourceTitle] = useState('');
  const [rediscoverTracks, setRediscoverTracks] = useState<Track[]>([]);
  const [newArtists, setNewArtists] = useState<any[]>([]);
  const [socialDiscovery, setSocialDiscovery] = useState<any[]>([]);
  const [boostedTracks, setBoostedTracks] = useState<any[]>([]);

  // États pour la radio
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [radioInfo, setRadioInfo] = useState({
    name: 'Mixx Party Radio',
    description: 'Radio tous styles musicaux en continu 24h/24',
    currentTrack: 'Mixx Party Radio',
    currentArtist: '',
    listeners: 0,
    bitrate: 128,
    quality: 'Standard',
    isLive: true,
    lastUpdate: new Date().toISOString(),
    available: true
  });

  // États pour la nouvelle radio XimaM
  const [isXimamRadioPlaying, setIsXimamRadioPlaying] = useState(false);
  const [ximamRadioInfo, setXimamRadioInfo] = useState({
    name: 'XimaM Radio',
    description: 'Radio XimaM en continu 24h/24',
    currentTrack: 'XimaM Radio',
    currentArtist: '',
    listeners: 0,
    bitrate: 128,
    quality: 'Standard',
    isLive: true,
    lastUpdate: new Date().toISOString(),
    available: true
  });

  // Fonction pour charger les données
  const fetchCategoryData = useCallback(async (key: string, url: string) => {
    // La clé de cache inclut l'userId pour éviter que deux comptes différents partagent le même cache
    const uid = session?.user?.id || 'guest';
    const cacheKey = `${uid}:${key}`;
    const cached = dataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.tracks;
    }

    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data.tracks && Array.isArray(data.tracks)) {
          const cdnTracks = applyCdnToTracks(data.tracks);
          dataCache.set(cacheKey, { tracks: cdnTracks, timestamp: Date.now() });
          return cdnTracks;
        }
      }
    } catch (error) {
      console.error(`Erreur chargement ${key}:`, error);
    }
    return [];
  }, [session?.user?.id]);

  // Fonction pour charger les statistiques de la bibliothèque
  const fetchLibraryStats = useCallback(async () => {
    if (!session?.user?.id) {
      setLibraryStats({ playlists: 0, favorites: 0, recent: 0, aiGenerations: 0, totalTracks: 0 });
          return;
        }
        
    try {
      const [playlistsRes, favoritesRes, aiRes] = await Promise.all([
        fetch(`/api/playlists?user=${session.user.id}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/tracks?liked=true&limit=1`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/ai/library?limit=1').then(r => r.ok ? r.json() : null).catch(() => null)
      ]);
      
      setLibraryStats({
        playlists: playlistsRes?.playlists?.length || 0,
        favorites: favoritesRes?.total || 0,
        recent: 0, // Pas d'API pour récents, on met 0
        aiGenerations: aiRes?.total || aiRes?.generations?.length || 0,
        totalTracks: (playlistsRes?.playlists?.length || 0) + (favoritesRes?.total || 0)
      });
    } catch (error) {
      console.error('Erreur stats bibliothèque:', error);
    }
  }, [session?.user?.id]);

  // Fonction pour charger les créateurs suggérés avec leurs tracks
  const fetchSuggestedCreators = useCallback(async () => {
    try {
      // Récupérer les tracks récentes avec leurs créateurs
      const response = await fetch('/api/tracks?limit=100');
      if (response.ok) {
        const data = await response.json();
        const tracks = data.tracks || [];
        
        // Grouper les tracks par créateur
        const creatorsMap = new Map();
        tracks.forEach((track: Track) => {
          const creatorId = track.artist._id;
          if (!creatorsMap.has(creatorId)) {
            creatorsMap.set(creatorId, {
              _id: creatorId,
              name: track.artist.name || track.artist.username,
              username: track.artist.username,
              avatar: track.artist.avatar,
              tracks: []
            });
          }
          creatorsMap.get(creatorId).tracks.push(track);
        });
        
        // Filtrer pour garder uniquement ceux avec au moins 3 musiques
        const creatorsWithEnoughTracks = Array.from(creatorsMap.values())
          .filter(creator => creator.tracks.length >= 3)
          .sort((a, b) => {
            // Trier par nombre total d'écoutes
            const totalPlaysA = a.tracks.reduce((sum: number, t: Track) => sum + (t.plays || 0), 0);
            const totalPlaysB = b.tracks.reduce((sum: number, t: Track) => sum + (t.plays || 0), 0);
            return totalPlaysB - totalPlaysA;
          })
          .slice(0, 8); // Garder les 8 meilleurs
        
        // Calculer le followerCount basé sur les stats
        const creatorsWithStats = creatorsWithEnoughTracks.map(creator => ({
          ...creator,
          followerCount: creator.tracks.reduce((sum: number, t: Track) => sum + (Array.isArray(t.likes) ? t.likes.length : 0), 0),
          totalPlays: creator.tracks.reduce((sum: number, t: Track) => sum + (t.plays || 0), 0)
        }));
        
        setSuggestedCreators(creatorsWithStats);
      }
    } catch (error) {
      console.error('Erreur chargement créateurs:', error);
    }
  }, []);

  const fetchUserPreferenceProfile = useCallback(async () => {
    if (!session?.user?.id) {
      if (forYouTracks.length || recentTracks.length) {
        const guestPool = [...forYouTracks.slice(0, 40), ...recentTracks.slice(0, 40)];
        setPreferenceProfile(buildPreferenceProfile(guestPool));
      } else {
        setPreferenceProfile(null);
      }
      return;
    }
        
    try {
      const [likedRes, recentListenRes] = await Promise.all([
        fetch('/api/tracks?liked=true&limit=150', { cache: 'no-store' }),
        fetch('/api/tracks?recent=true&limit=80', { cache: 'no-store' }).catch(() => null),
      ]);
      let likedTracks: Track[] = [];
      if (likedRes.ok) {
        const likedJson = await likedRes.json();
        likedTracks = likedJson?.tracks || [];
      }
      let recentListened: Track[] = [];
      if (recentListenRes?.ok) {
        const recentJson = await recentListenRes.json();
        recentListened = recentJson?.tracks || [];
      }

      let seedPool: Track[];
      if (likedTracks.length >= 5) {
        seedPool = [...likedTracks, ...recentListened.slice(0, 30)];
      } else if (recentListened.length >= 5) {
        seedPool = [...recentListened, ...likedTracks];
      } else {
        seedPool = [...likedTracks, ...recentListened, ...forYouTracks.slice(0, 60), ...recentTracks.slice(0, 60)];
      }

      const profile = buildPreferenceProfile(seedPool);
      setPreferenceProfile(profile);
    } catch (error) {
      console.error('Erreur profil préférences:', error);
    }
  }, [session?.user?.id, forYouTracks, recentTracks]);

  const loadExtraSections = useCallback(async () => {
    const uid = (session?.user as any)?.id;
    const fetches: Promise<void>[] = [];

    fetches.push(
      fetch('/api/tracks/rising?limit=10', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : { tracks: [] })
        .then(d => setRisingTracks(applyCdnToTracks(d.tracks || [])))
        .catch(() => {})
    );

    fetches.push(
      fetch('/api/tracks/boosted?limit=12', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : { tracks: [] })
        .then(d => setBoostedTracks(applyCdnToTracks(d.tracks || [])))
        .catch(() => {})
    );

    if (uid) {
      fetches.push(
        fetch('/api/tracks/rediscover?limit=8', { cache: 'no-store' })
          .then(r => r.ok ? r.json() : { tracks: [] })
          .then(d => setRediscoverTracks(applyCdnToTracks(d.tracks || [])))
          .catch(() => {})
      );

      fetches.push(
        fetch('/api/tracks?liked=true&limit=1&sort=recent', { cache: 'no-store' })
          .then(r => r.ok ? r.json() : { tracks: [] })
          .then(async (d) => {
            const lastLiked = d.tracks?.[0];
            if (lastLiked?._id) {
              const simRes = await fetch(`/api/tracks/similar?trackId=${lastLiked._id}&limit=8`, { cache: 'no-store' });
              if (simRes.ok) {
                const simData = await simRes.json();
                setSimilarTracks(applyCdnToTracks(simData.tracks || []));
                setSimilarSourceTitle(simData.sourceTitle || lastLiked.title || '');
              }
            }
          })
          .catch(() => {})
      );

      // Social discovery: what followed artists are listening to
      fetches.push(
        (async () => {
          try {
            const followRes = await fetch('/api/users/following?limit=20', { cache: 'no-store' });
            if (!followRes.ok) return;
            const followData = await followRes.json();
            const followedIds: string[] = (followData.following || followData.users || []).map((u: any) => u._id || u.id).filter(Boolean);
            if (!followedIds.length) return;

            const evRes = await fetch(`/api/tracks/trending?limit=20`, { cache: 'no-store' });
            if (!evRes.ok) return;
            const evData = await evRes.json();
            const trendingAll: any[] = evData.tracks || [];

            const socialItems = trendingAll
              .filter((t: any) => followedIds.includes(t.artist?._id))
              .slice(0, 6)
              .map((t: any) => ({ ...t, socialArtist: t.artist }));
            setSocialDiscovery(applyCdnToTracks(socialItems));
          } catch {}
        })()
      );

      // New artists (recent profiles with quality tracks)
      fetches.push(
        fetch('/api/users?limit=30&sort=recent', { cache: 'no-store' })
          .then(r => r.ok ? r.json() : { users: [] })
          .then(d => {
            const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
            const fresh = (d.users || []).filter((u: any) => {
              const created = u.created_at || u.createdAt;
              return created && new Date(created).getTime() > thirtyDaysAgo && (u.totalPlays > 0 || u.trackCount > 0);
            }).slice(0, 6);
            setNewArtists(fresh);
          })
          .catch(() => {})
      );
    }

    await Promise.allSettled(fetches);
  }, [session?.user]);

  const loadData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    dataCache.clear();
    const uid = session?.user?.id;
    // Pour les endpoints personnalisés, on passe userId dans l'URL afin que
    // l'API puisse l'utiliser et que le cache côté serveur soit différencié par user
    const forYouUrl = uid
      ? `/api/ranking/feed?limit=50&ai=1&userId=${uid}`
      : '/api/ranking/feed?limit=50&ai=1';
    const [featured, trending, recent, forYou, users] = await Promise.all([
      fetchCategoryData('featured', '/api/tracks/featured?limit=10'),
      fetchCategoryData('trending', '/api/tracks/trending?limit=30'),
      fetchCategoryData('recent', '/api/tracks/recent?limit=30'),
      fetchCategoryData('forYou', forYouUrl),
      fetch('/api/users?limit=12', { cache: 'no-store' }).then(r => r.ok ? r.json().then(d => d.users || []) : []).catch(() => [])
    ]);
    
    setFeaturedTracks(featured);
    setTrendingTracks(trending);
    setRecentTracks(recent);
    setForYouTracks(forYou);
    setPopularUsers(users);
    if (showLoader) setLoading(false);
    
    fetchLibraryStats();
    fetchSuggestedCreators();
    loadExtraSections();
  }, [fetchCategoryData, fetchLibraryStats, fetchSuggestedCreators, loadExtraSections, session?.user?.id]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Rechargement forcé quand le compte utilisateur change (connexion / déconnexion / changement de compte)
  const prevUserIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const uid = session?.user?.id;
    if (uid !== prevUserIdRef.current) {
      prevUserIdRef.current = uid;
      // Vider le cache global pour s'assurer qu'aucune donnée d'un autre compte ne subsiste
      dataCache.clear();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const interval = setInterval(() => loadData(false), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [loadData]);

  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        setGuestPlaylistsLoading(true);
        const res = await fetch('/api/playlists/popular?limit=10', { cache: 'no-store' });
        const json = await res.json();
        const list = Array.isArray(json?.playlists) ? (json.playlists as PublicPlaylist[]) : [];
        setGuestPlaylists(list.slice(0, 10));
      } catch {
        setGuestPlaylists([]);
      } finally {
        setGuestPlaylistsLoading(false);
      }
    };
    loadPlaylists();
  }, []);

  useEffect(() => {
    fetchUserPreferenceProfile();
  }, [fetchUserPreferenceProfile]);

  // Listes For You et Trending uniques (sans doublons)
  const forYouList = useMemo(() => {
    if (forYouTracks.length > 0) return forYouTracks;
    return featuredTracks;
  }, [forYouTracks, featuredTracks]);

  const trendingUnique = useMemo(() => {
    const forYouIds = new Set(forYouList.map(t => t._id));
    const filtered = trendingTracks.filter(t => !forYouIds.has(t._id));
    
    if (filtered.length < 6 && trendingTracks.length >= 6) {
      return trendingTracks.slice(0, 16);
    }
    
    return filtered.length > 0 ? filtered : trendingTracks;
  }, [trendingTracks, forYouList]);
  
  const personalizedForYouList = useMemo(() => {
    let sorted: Track[];
    if (preferenceProfile) {
      // Tri par score de préférences (historique existant)
      sorted = [...forYouList].sort(
        (a, b) => scoreTrackForProfile(b, preferenceProfile) - scoreTrackForProfile(a, preferenceProfile),
      );
    } else if (session?.user?.id) {
      // Pas encore d'historique : shuffle déterministe par userId → chaque compte voit un ordre différent
      const seed = dailySeedHash(session.user.id);
      sorted = seededShuffle(forYouList, seed);
    } else {
      sorted = forYouList;
    }
    return diversifyClientList(sorted, 2);
  }, [forYouList, preferenceProfile, session?.user?.id]);

  const trendingList = useMemo(() => {
    let sorted: Track[];
    if (preferenceProfile) {
      sorted = [...trendingUnique].sort(
        (a, b) => scoreTrackForProfile(b, preferenceProfile) - scoreTrackForProfile(a, preferenceProfile),
      );
    } else if (session?.user?.id) {
      // Seed décalé (+1) pour que trending et forYou ne soient pas dans le même ordre
      const seed = dailySeedHash(session.user.id) + 1;
      sorted = seededShuffle(trendingUnique, seed);
    } else {
      sorted = trendingUnique;
    }
    return diversifyClientList(sorted, 2);
  }, [trendingUnique, preferenceProfile, session?.user?.id]);
  
  // Sélection du jour : 3 tracks personnalisées, stables pour la journée
  const dailyPicks = useMemo(() => {
    const pool = [...trendingList, ...personalizedForYouList, ...recentTracks];
    const unique = Array.from(new Map(pool.map(t => [t._id, t])).values());
    const uid = session?.user?.id || 'guest';
    const picks = pickDailyTracks(unique, uid, preferenceProfile, 3);
    return picks.map(t => ({
      id: t._id,
      title: t.title,
      artist: t.artist?.name || t.artist?.username || 'Artiste inconnu',
      cover: t.coverUrl || '/default-cover.jpg',
      duration: t.duration || 0,
      liked: false,
      _original: t,
    }));
  }, [trendingList, personalizedForYouList, recentTracks, session?.user?.id, preferenceProfile]);

  // Convertir les vraies données en format attendu par les composants
  const mockTracks = useMemo(() => trendingList.map(t => ({
    id: t._id,
    title: t.title,
    artist: t.artist?.name || t.artist?.username || 'Artiste inconnu',
    cover: t.coverUrl || '/default-cover.jpg',
    duration: t.duration || 0,
    liked: false,
    _original: t
  })), [trendingList]);
  
  const forYouCards = useMemo(() => personalizedForYouList.slice(0, 12).map(t => ({
    id: t._id,
    title: t.title,
    artist: t.artist?.name || t.artist?.username || 'Artiste inconnu',
    cover: t.coverUrl || '/default-cover.jpg',
    duration: t.duration || 0,
    liked: false,
    _original: { ...t, isBoosted: (t as any).isBoosted, boostMultiplier: (t as any).boostMultiplier }
  })), [personalizedForYouList]);

  const personalizedCreators = useMemo(() => {
    if (!preferenceProfile) return suggestedCreators;
    return [...suggestedCreators].sort(
      (a, b) =>
        scoreCreatorForProfile(b, preferenceProfile) -
        scoreCreatorForProfile(a, preferenceProfile),
    );
  }, [suggestedCreators, preferenceProfile]);
  
  const recentCards = useMemo(() => recentTracks.map(t => ({
    id: t._id,
    title: t.title,
    artist: t.artist?.name || t.artist?.username || 'Artiste inconnu',
    cover: t.coverUrl || '/default-cover.jpg',
    duration: t.duration || 0,
    liked: false,
    _original: t
  })), [recentTracks]);
  
  
  // Heroslides basées sur les vraies données + trending + pour toi
  const heroSlides = useMemo(() => {
    const slides: any[] = [];
    
    slides.push({
      id: 'subscriptions',
      title: 'Débloquez tout Synaura',
      subtitle: 'Accédez à toutes les fonctionnalités premium',
      image: '/fe904850-2547-4e2e-8cc3-085a7704488b.webp',
      tag: 'Offre Premium',
      actionLabel: 'Voir les abonnements',
      actionType: 'navigate',
      actionIcon: Crown,
      actionData: '/subscriptions'
    });
    
    slides.push({
      id: 'ai',
      title: 'Générateur de Musique IA',
      subtitle: 'Créez de la musique unique avec l\'intelligence artificielle',
      image: '/DALL·E 2025-09-26 23.14.53 - A minimalist, abstract landscape-format illustration symbolizing AI-generated music. The image features a stylized humanoid head made of flowing digit.webp',
      tag: 'IA Musicale',
      actionLabel: 'Générer de la musique',
      actionType: 'navigate',
      actionIcon: Sparkles,
      actionData: '/ai-generator'
    });

    const usedIds = new Set<string>();
    const addTrackSlide = (track: Track, tag: string) => {
      if (usedIds.has(track._id)) return;
      usedIds.add(track._id);
      slides.push({
        id: track._id,
        title: track.title,
        subtitle: `${track.artist?.name || track.artist?.username}`,
        image: track.coverUrl || '/default-cover.jpg',
        tag,
        genre: track.genre?.[0],
        actionLabel: 'Écouter',
        actionType: 'play',
        actionIcon: Play,
        track,
      });
    };

    // Pour toi en priorité (personnalisé) — occupe la majorité du carousel
    personalizedForYouList.slice(0, 5).forEach(t => addTrackSlide(t, 'Pour toi'));

    featuredTracks.slice(0, 2).forEach(t => addTrackSlide(t, 'En vedette'));

    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const weekHit = trendingTracks.find(t =>
      !usedIds.has(t._id) && t.createdAt && new Date(t.createdAt).getTime() > weekAgo
    );
    if (weekHit) addTrackSlide(weekHit, 'Nouveauté de la semaine');

    trendingTracks.slice(0, 2).forEach(t => addTrackSlide(t, 'Tendance'));

    const promo = slides.slice(0, 2);
    const trackSlides = session?.user?.id
      ? seededShuffle(slides.slice(2), dailySeedHash(session.user.id) + 42)
      : shuffleLight(slides.slice(2), 0.3);
    return [...promo, ...trackSlides];
  }, [featuredTracks, trendingTracks, personalizedForYouList, session?.user?.id]);

  const router = useRouter();
  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  
  // Fonction pour formater les nombres
  const formatNumber = useCallback((num: number) => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }, []);

  const MIXX_PARTY_STREAM_URL = 'https://manager11.streamradio.fr:2425/stream';
  const XIMAM_STREAM_URL = 'https://manager11.streamradio.fr:2745/stream';

  // Fonction pour récupérer les métadonnées du flux radio
  const fetchRadioMetadata = useCallback(async () => {
    try {
      const response = await fetch('/api/radio/status', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          const radioData = result.data;
          
          setRadioInfo(prev => ({
            ...prev,
            name: radioData.name,
            description: radioData.description,
            currentTrack: radioData.currentTrack.title,
            currentArtist: radioData.currentTrack.artist || '',
            listeners: radioData.stats.listeners,
            bitrate: radioData.stats.bitrate,
            quality: radioData.stats.quality,
            isLive: radioData.isOnline,
            lastUpdate: radioData.lastUpdate,
            available: result.available !== false
          }));
          
          // Mettre à jour le titre dans le player si la radio joue
          if (currentTrack?._id === 'radio-mixx-party' && audioState.isPlaying) {
            const updatedTracks = audioState.tracks.map(track => 
              track._id === 'radio-mixx-party' 
                ? { 
                    ...track, 
                    title: radioData.currentTrack.title,
                    artist: {
                      ...track.artist,
                      name: radioData.currentTrack.artist
                    }
                  }
                : track
            );
            setTracks(updatedTracks);
          }
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      setRadioInfo(prev => ({
        ...prev,
        currentTrack: 'Mixx Party Radio',
        listeners: 1247,
        bitrate: 128,
        quality: 'Standard',
        isLive: true,
        lastUpdate: new Date().toISOString(),
        available: false
      }));
    }
  }, [currentTrack, audioState.isPlaying, audioState.tracks, setTracks]);

  // Fonction pour récupérer les métadonnées du flux radio (XimaM)
  const fetchXimamRadioMetadata = useCallback(async () => {
    try {
      const response = await fetch('/api/radio/status?station=ximam', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const result = await response.json();

        if (result.success && result.data) {
          const radioData = result.data;

          setXimamRadioInfo(prev => ({
            ...prev,
            name: radioData.name,
            description: radioData.description,
            currentTrack: radioData.currentTrack.title,
            currentArtist: radioData.currentTrack.artist || '',
            listeners: radioData.stats.listeners,
            bitrate: radioData.stats.bitrate,
            quality: radioData.stats.quality,
            isLive: radioData.isOnline,
            lastUpdate: radioData.lastUpdate,
            available: result.available !== false
          }));

          // Mettre à jour le titre dans le player si la radio joue
          if (currentTrack?._id === 'radio-ximam' && audioState.isPlaying) {
            const updatedTracks = audioState.tracks.map(track =>
              track._id === 'radio-ximam'
                ? {
                    ...track,
                    title: radioData.currentTrack.title,
                    artist: {
                      ...track.artist,
                      name: radioData.currentTrack.artist
                    }
                  }
                : track
            );
            setTracks(updatedTracks);
          }
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      setXimamRadioInfo(prev => ({
        ...prev,
        currentTrack: 'XimaM Radio',
        listeners: 0,
        bitrate: 128,
        quality: 'Standard',
        isLive: true,
        lastUpdate: new Date().toISOString(),
        available: false
      }));
    }
  }, [currentTrack, audioState.isPlaying, audioState.tracks, setTracks]);

  // Fonction pour gérer la lecture/arrêt de la radio
  const handleRadioToggle = useCallback(async () => {
    if (isRadioPlaying) {
      if (audioState.isPlaying && currentTrack?._id === 'radio-mixx-party') {
        pause();
      }
      setIsRadioPlaying(false);
    } else {
      try {
        const streamUrl = MIXX_PARTY_STREAM_URL;
        
        const radioTrack = {
          _id: 'radio-mixx-party',
          title: radioInfo.currentTrack,
          artist: {
            _id: 'radio',
            name: 'Mixx Party',
            username: 'mixxparty',
            avatar: '/default-avatar.png'
          },
          audioUrl: streamUrl,
          coverUrl: '/mixxparty1.png',
          duration: -1,
          likes: [],
          comments: [],
          plays: 0,
          isLiked: false,
          genre: ['Electronic', 'Dance']
        };
        
        playTrack(radioTrack);
        setIsRadioPlaying(true);
          } catch (error) {
      // Erreur silencieuse
    }
    }
  }, [isRadioPlaying, audioState.isPlaying, currentTrack, radioInfo.currentTrack, pause, playTrack]);

  // Fonction pour gérer la lecture/arrêt de la radio XimaM
  const handleXimamRadioToggle = useCallback(async () => {
    if (isXimamRadioPlaying) {
      if (audioState.isPlaying && currentTrack?._id === 'radio-ximam') {
        pause();
      }
      setIsXimamRadioPlaying(false);
    } else {
      try {
        const streamUrl = XIMAM_STREAM_URL;

        const radioTrack = {
          _id: 'radio-ximam',
          title: ximamRadioInfo.currentTrack,
          artist: {
            _id: 'radio',
            name: 'XimaM',
            username: 'ximam',
            avatar: '/default-avatar.png'
          },
          audioUrl: streamUrl,
          coverUrl: '/ximam-radio-x.svg',
          duration: -1,
          likes: [],
          comments: [],
          plays: 0,
          isLiked: false,
          genre: ['Radio']
        };

        playTrack(radioTrack);
        setIsXimamRadioPlaying(true);
      } catch (error) {
        // Erreur silencieuse
      }
    }
  }, [isXimamRadioPlaying, audioState.isPlaying, currentTrack, ximamRadioInfo.currentTrack, pause, playTrack]);
  
  // Gérer les actions du carrousel
  const handleCarouselAction = useCallback((action: string, data?: any) => {
    if (action === 'navigate' && typeof data === 'string') {
      router.push(data, { scroll: false });
    } else if (action === 'play' && data) {
      playTrack(data);
    }
  }, [router, playTrack]);

  // Charger les métadonnées radio au démarrage
  useEffect(() => {
    fetchRadioMetadata();
  }, [fetchRadioMetadata]);

  // Mettre à jour les métadonnées radio périodiquement
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRadioMetadata();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchRadioMetadata]);

  // Charger les métadonnées radio XimaM au démarrage
  useEffect(() => {
    fetchXimamRadioMetadata();
  }, [fetchXimamRadioMetadata]);

  // Mettre à jour les métadonnées radio XimaM périodiquement
  useEffect(() => {
    const interval = setInterval(() => {
      fetchXimamRadioMetadata();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchXimamRadioMetadata]);

  // Synchroniser l'état de la radio avec le player principal
  useEffect(() => {
    if (currentTrack?._id === 'radio-mixx-party') {
      setIsRadioPlaying(audioState.isPlaying);
    } else if (isRadioPlaying) {
      setIsRadioPlaying(false);
    }
  }, [audioState.isPlaying, currentTrack?._id, isRadioPlaying]);

  // Synchroniser l'état de la radio XimaM avec le player principal
  useEffect(() => {
    if (currentTrack?._id === 'radio-ximam') {
      setIsXimamRadioPlaying(audioState.isPlaying);
    } else if (isXimamRadioPlaying) {
      setIsXimamRadioPlaying(false);
    }
  }, [audioState.isPlaying, currentTrack?._id, isXimamRadioPlaying]);

  // Inject small style for hiding scrollbars, safely on client only
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`;
    document.head.appendChild(style);
    return () => { try { document.head.removeChild(style); } catch (e) {} };
  }, []);

  const onGo = (path: string) => router.push(path, { scroll: false });

  // File instantanée pour "Écouter maintenant" — reprend la dernière piste si disponible
  const listenBase =
    (session && personalizedForYouList?.length ? personalizedForYouList : null) ||
    (trendingList?.length ? trendingList : null) ||
    (recentTracks?.length ? recentTracks : null) ||
    (featuredTracks?.length ? featuredTracks : null) ||
    [];
  const listenList = listenBase.slice(0, 30);
  const onListenNow = async () => {
    // 1) Try to resume the last played track (saved in localStorage by providers)
    try {
      const raw = localStorage.getItem('synaura.lastTrack');
      if (raw) {
        const { track, position } = JSON.parse(raw) as { track: any; position?: number; timestamp?: number };
        if (track?._id) {
          await playTrack(track);
          if (position && position > 0) {
            setTimeout(() => seek(position), 300);
          }
          return;
        }
      }
    } catch {}
    // 2) Fallback: play from recommended list
    if (!listenList.length) return;
    setTracks(listenList as any);
    playTrack(listenList[0] as any);
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white bg-[#0a0a0e]">
        <main className="mx-auto w-full max-w-none px-3 sm:px-4 lg:px-8 2xl:px-10 py-6 md:py-8 space-y-4 md:space-y-6">
          <WelcomeHeader
            session={session}
            onGo={onGo}
            onListenNow={() => {}}
          />

          <Skeleton className="h-[240px] md:h-[300px] w-full" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[200px]" />
          </div>

          <Skeleton className="h-[160px]" />
          <Skeleton className="h-[160px]" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden bg-[#0a0a0e]">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full opacity-[0.15] blur-[130px] animate-[synaura-blob1_20s_ease-in-out_infinite]" style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        <div className="absolute top-[30%] right-[-10%] w-[45vw] h-[45vw] rounded-full opacity-[0.12] blur-[130px] animate-[synaura-blob2_25s_ease-in-out_infinite]" style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-5%] left-[20%] w-[40vw] h-[40vw] rounded-full opacity-[0.13] blur-[130px] animate-[synaura-blob3_22s_ease-in-out_infinite]" style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)' }} />
      </div>

      <main className="mx-auto w-full max-w-none px-4 sm:px-6 lg:px-10 2xl:px-12 py-6 md:py-10 space-y-6 md:space-y-8">
        <WelcomeHeader
          session={session}
          onGo={onGo}
          onListenNow={onListenNow}
        />

        {session && <OnboardingChecklist />}

        {/* Carousel en avant — visible immédiatement */}
        <section className="w-full" aria-label="À la une">
          <HeroCarousel slides={heroSlides} onAction={handleCarouselAction} />
        </section>

        {/* 3 colonnes style Suno : Tendances / Nouveautés / Créateurs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Tendances */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-black text-white">Tendances</h2>
              <button onClick={() => onGo('/trending')} className="text-xs font-semibold text-white/40 hover:text-white transition">Voir tout &rsaquo;</button>
            </div>
            <div className="space-y-0.5">
              {trendingList.slice(0, 5).map((t) => (
                <div
                  key={t._id}
                  className="flex items-center gap-2.5 rounded-lg hover:bg-white/[0.06] transition p-2 group"
                >
                  <button
                    onClick={() => { setTracks(trendingList.slice(0, 30) as any); playTrack(t as any); }}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                  >
                    <img src={t.coverUrl || '/default-cover.jpg'} className="w-11 h-11 rounded-md object-cover shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'; }} alt="" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-white truncate">{t.title}</div>
                      <div className="text-[11px] text-white/30 truncate">{Array.isArray(t.genre) ? t.genre[0] : t.genre || ''}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/25">
                        <span>&#9654; {formatK(t.plays || 0)}</span>
                        <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" /> {formatK(Array.isArray(t.likes) ? t.likes.length : 0)}</span>
                      </div>
                    </div>
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <TrackContextMenu track={t} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nouveautés */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-black text-white">Nouveautés</h2>
              <button onClick={() => onGo('/discover')} className="text-xs font-semibold text-white/40 hover:text-white transition">Voir tout &rsaquo;</button>
            </div>
            <div className="space-y-0.5">
              {recentTracks.slice(0, 5).map((t) => (
                <div
                  key={t._id}
                  className="flex items-center gap-2.5 rounded-lg hover:bg-white/[0.06] transition p-2 group"
                >
                  <button
                    onClick={() => { setTracks(recentTracks.slice(0, 30) as any); playTrack(t as any); }}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                  >
                    <img src={t.coverUrl || '/default-cover.jpg'} className="w-11 h-11 rounded-md object-cover shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'; }} alt="" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-white truncate">{t.title}</div>
                      <div className="text-[11px] text-white/30 truncate">{Array.isArray(t.genre) ? t.genre[0] : t.genre || ''}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <img src={t.artist?.avatar || '/default-avatar.png'} className="w-3.5 h-3.5 rounded-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.png'; }} alt="" />
                        <span className="text-[10px] text-white/25 truncate">{t.artist?.name || t.artist?.username}</span>
                      </div>
                    </div>
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <TrackContextMenu track={t} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Créateurs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-black text-white">Créateurs</h2>
              <button onClick={() => onGo('/community')} className="text-xs font-semibold text-white/40 hover:text-white transition">Explorer &rsaquo;</button>
            </div>
            <div className="space-y-0.5">
              {personalizedCreators.slice(0, 5).map((creator: any) => (
                <div key={creator._id || creator.id} className="flex items-center gap-2.5 rounded-lg hover:bg-white/[0.06] transition p-2">
                  <button type="button" onClick={() => onGo(`/profile/${encodeURIComponent(creator.username)}`)} className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                    <img src={creator.avatar || '/default-avatar.png'} className="w-11 h-11 rounded-full object-cover shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.png'; }} alt="" />
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-white truncate">{creator.name || creator.username}</div>
                      <div className="text-[11px] text-white/30 truncate">
                        {creator.followerCount ? `${formatK(creator.followerCount)} abonnés` : `@${creator.username}`}
                      </div>
                    </div>
                  </button>
                  <div onClick={(e) => e.stopPropagation()}>
                    <FollowButton artistId={creator._id} artistUsername={creator.username} size="sm" className="text-xs py-1.5 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sélection du jour */}
        {!loading && dailyPicks.length > 0 && (
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-white leading-tight">Sélection du jour</h2>
                <p className="text-[11px] text-white/30">3 titres choisis pour toi &middot; change chaque jour</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {dailyPicks.map((pick, idx) => {
                const orig = pick._original;
                const dur = pick.duration || 0;
                const durStr = `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`;
                const genre = Array.isArray(orig?.genre) ? orig.genre[0] : orig?.genre;
                const plays = orig?.plays || 0;
                const gradients = [
                  'from-indigo-600/20 to-violet-600/10',
                  'from-violet-600/20 to-fuchsia-600/10',
                  'from-fuchsia-600/20 to-indigo-600/10',
                ];
                return (
                  <div
                    key={pick.id}
                    className={`relative group rounded-xl overflow-hidden bg-gradient-to-br ${gradients[idx]} border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 hover:scale-[1.02]`}
                  >
                    <div className="flex gap-3 p-3">
                      <div className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden">
                        <img src={pick.cover} alt={pick.title} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'; }} />
                        <button
                          onClick={() => { setTracks([orig] as any); playTrack(orig as any); }}
                          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                          </div>
                        </button>
                        {dur > 0 && (
                          <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[9px] font-semibold text-white bg-black/60 backdrop-blur-sm tabular-nums">{durStr}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <p className="text-[13px] font-bold text-white line-clamp-1">{pick.title}</p>
                          {genre && <p className="text-[10px] text-white/30 mt-0.5 truncate">{genre}</p>}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <img src={orig?.artist?.avatar || '/default-avatar.png'} className="w-4 h-4 rounded-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.png'; }} alt="" />
                            <span className="text-[11px] text-white/40 truncate">{orig?.artist?.name || orig?.artist?.username}</span>
                          </div>
                          <span className="text-[10px] text-white/25 tabular-nums flex items-center gap-0.5">&#9654; {formatK(plays)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TrackContextMenu track={orig} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Pistes propulsees (boostees) */}
        {boostedTracks.length > 0 && (
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-9 w-9 rounded-xl grid place-items-center" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(245,158,11,0.25))' }}>
                <Zap className="h-4.5 w-4.5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-black text-white leading-tight">Pistes propulsees</h2>
                <p className="text-[11px] text-white/30">En ce moment sur Synaura</p>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
              {boostedTracks.slice(0, 10).map((t: any) => {
                const dur = t.duration || 0;
                const durStr = `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`;
                return (
                  <div key={t._id || t.id} className="group shrink-0 w-[160px]">
                    <div className="relative rounded-xl overflow-hidden mb-2">
                      {/* Boost halo */}
                      <div className="absolute -inset-0.5 rounded-xl z-0 opacity-60" style={{
                        background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(245,158,11,0.3), rgba(236,72,153,0.3))',
                        filter: 'blur(6px)',
                      }} />
                      <div className="relative z-[1]">
                        <img src={t.coverUrl || '/default-cover.jpg'} alt={t.title} className="w-full aspect-square object-cover rounded-xl" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'; }} />
                        <button onClick={() => { setTracks(boostedTracks as any); playTrack(t as any); }} className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                          <Play className="w-8 h-8 text-white fill-white ml-0.5" />
                        </button>
                        {/* Boost badge */}
                        <div className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-violet-500/30" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(245,158,11,0.3))', backdropFilter: 'blur(8px)' }}>
                          <Zap className="w-2.5 h-2.5 text-amber-400" style={{ fill: 'rgba(245,158,11,0.3)' }} />
                          <span className="text-[8px] font-bold text-white/90">Boosted</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-white truncate">{t.title}</div>
                    <div className="text-[10px] text-white/40 truncate">{t.artist?.name || t.artist?.username || 'Artiste'} · {durStr}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Montée en puissance */}
        {risingTracks.length > 0 && (
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-white leading-tight">Montée en puissance</h2>
                <p className="text-[11px] text-white/30">Les titres qui explosent en ce moment</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {risingTracks.slice(0, 6).map((t: any, idx: number) => {
                const dur = t.duration || 0;
                const durStr = `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`;
                const growth = t.growthPercent || 0;
                return (
                  <div key={t._id} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-white/[0.06] transition group">
                    <span className="text-lg font-black text-white/15 w-6 text-center tabular-nums">{idx + 1}</span>
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                      <img src={t.coverUrl || '/default-cover.jpg'} alt={t.title} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'; }} />
                      <button onClick={() => { setTracks(risingTracks as any); playTrack(t as any); }} className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{t.title}</p>
                      <p className="text-[11px] text-white/30 truncate">{t.artist?.name || t.artist?.username}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {growth > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
                          <TrendingUp className="w-3 h-3" />+{growth}%
                        </span>
                      )}
                      {dur > 0 && <span className="text-[10px] text-white/20 tabular-nums">{durStr}</span>}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <TrackContextMenu track={t} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Rejoins Synaura (guest) */}
        {!session && (
          <section className="rounded-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/15 via-violet-600/8 to-transparent -z-[1]" />
            <div className="border border-indigo-500/15 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="text-lg font-black text-white">Rejoins Synaura</div>
                <p className="text-sm text-white/40 mt-0.5">Crée ton compte gratuitement et accède au Studio IA, likes, playlists et plus.</p>
              </div>
              <button onClick={() => onGo('/auth/signup')} className="h-11 px-6 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/25 shrink-0 whitespace-nowrap">
                Créer un compte
              </button>
            </div>
          </section>
        )}

        {/* Bibliothèque — style "Jump Back In" */}
        {session && (
          <section>
            <h2 className="text-base font-black text-white mb-3">Reprends là où tu en étais</h2>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              <button onClick={() => router.push('/library?tab=favorites', { scroll: false })} className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-indigo-600/25 to-indigo-600/10 hover:from-indigo-600/35 hover:to-indigo-600/15 transition min-w-[200px] p-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-white fill-white" />
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-sm font-bold text-white">Favoris</div>
                  <div className="text-[11px] text-white/40">{libraryStats.favorites} titres</div>
                </div>
              </button>
              <button onClick={() => router.push('/library?tab=playlists', { scroll: false })} className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-violet-600/25 to-violet-600/10 hover:from-violet-600/35 hover:to-violet-600/15 transition min-w-[200px] p-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500 flex items-center justify-center shrink-0">
                  <Disc3 className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-sm font-bold text-white">Playlists</div>
                  <div className="text-[11px] text-white/40">{libraryStats.playlists} dossiers</div>
                </div>
              </button>
              <button onClick={() => router.push('/library?tab=recent', { scroll: false })} className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-emerald-600/25 to-emerald-600/10 hover:from-emerald-600/35 hover:to-emerald-600/15 transition min-w-[200px] p-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-sm font-bold text-white">Historique</div>
                  <div className="text-[11px] text-white/40">Récemment jouées</div>
                </div>
              </button>
            </div>
          </section>
        )}

        {/* Genres */}
        <section>
          <SectionTitle title="Genres" actionLabel="Tout voir" onAction={() => router.push('/discover', { scroll: false })} />
          <HorizontalScroller>
            {[
              { name: 'Pop', img: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop', color: 'from-pink-600/40' },
              { name: 'Hip-Hop', img: 'https://images.unsplash.com/photo-1546427660-eb346c344ba5?w=300&h=300&fit=crop', color: 'from-amber-600/40' },
              { name: 'Rock', img: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&h=300&fit=crop', color: 'from-red-600/40' },
              { name: 'Electronic', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop', color: 'from-cyan-600/40' },
              { name: 'R&B', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop', color: 'from-purple-600/40' },
              { name: 'Jazz', img: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=300&h=300&fit=crop', color: 'from-amber-700/40' },
              { name: 'Lo-Fi', img: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=300&h=300&fit=crop', color: 'from-indigo-600/40' },
              { name: 'Classical', img: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=300&h=300&fit=crop', color: 'from-emerald-600/40' },
            ].map((g) => (
              <button
                key={g.name}
                onClick={() => router.push(`/discover?genre=${encodeURIComponent(g.name)}`, { scroll: false })}
                className="relative min-w-[130px] md:min-w-[160px] aspect-square rounded-xl overflow-hidden group shrink-0"
                style={{ scrollSnapAlign: 'start' }}
              >
                <img src={g.img} alt={g.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                <div className={`absolute inset-0 bg-gradient-to-t ${g.color} to-black/60`} />
                <span className="absolute bottom-3 left-3 text-sm font-bold text-white">{g.name}</span>
              </button>
            ))}
          </HorizontalScroller>
        </section>

        {/* Redécouvre */}
        {session && rediscoverTracks.length > 0 && (
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <RotateCcw className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-white leading-tight">Redécouvre</h2>
                <p className="text-[11px] text-white/30">Des titres que tu aimais &middot; ça fait longtemps</p>
              </div>
            </div>
            <HorizontalScroller>
              {rediscoverTracks.map((t: any) => {
                const dur = t.duration || 0;
                const durStr = `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`;
                const genre = Array.isArray(t.genre) ? t.genre[0] : t.genre;
                return (
                  <div key={t._id} className="min-w-[160px] md:min-w-[200px] max-w-[160px] md:max-w-[200px] rounded-xl p-2 hover:bg-white/[0.06] transition-all duration-200 group/card" style={{ scrollSnapAlign: 'start' }}>
                    <div className="relative group/cover">
                      <img src={t.coverUrl || '/default-cover.jpg'} alt={t.title} className="w-full aspect-square object-cover rounded-lg sepia-[.15] group-hover/card:sepia-0 transition-all duration-300" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'; }} />
                      {dur > 0 && <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-semibold text-white tabular-nums backdrop-blur-sm">{durStr}</span>}
                      <div className="absolute top-2 right-2 opacity-0 group-hover/cover:opacity-100 transition-opacity"><TrackContextMenu track={t} /></div>
                      <button onClick={() => { setTracks(rediscoverTracks as any); playTrack(t as any); }} className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-all shadow-lg shadow-amber-500/30 hover:scale-110">
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <p className="text-[13px] font-semibold line-clamp-1 text-white">{t.title}</p>
                      {genre && <p className="text-[10px] text-white/30 truncate mt-0.5">{genre}</p>}
                    </div>
                    {t.completions && <p className="text-[10px] text-amber-400/60 mt-1">Écouté {t.completions} fois</p>}
                    {t.artist && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <img src={t.artist.avatar || '/default-avatar.png'} className="w-4 h-4 rounded-full object-cover shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.png'; }} alt="" />
                        <span className="text-[11px] text-white/40 truncate">{t.artist.name || t.artist.username}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </HorizontalScroller>
          </section>
        )}

        {/* Pour toi */}
        {!loading && forYouCards.length > 0 && (
          <section>
            <SectionTitle title="Pour toi" actionLabel="Tout voir" onAction={() => router.push('/for-you', { scroll: false })} />
            <HorizontalScroller>
              {forYouCards.map(t => <TrackCard key={t.id} track={t} onPlay={playTrack} />)}
            </HorizontalScroller>
          </section>
        )}

        {/* Parce que tu as aimé */}
        {session && similarTracks.length > 0 && similarSourceTitle && (
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-white leading-tight">
                  Parce que tu as aimé <span className="text-indigo-400">{similarSourceTitle}</span>
                </h2>
              </div>
            </div>
            <HorizontalScroller>
              {similarTracks.map((t: any) => (
                <TrackCard
                  key={t._id}
                  track={{
                    id: t._id,
                    title: t.title,
                    artist: t.artist?.name || t.artist?.username || '',
                    cover: t.coverUrl || '/default-cover.jpg',
                    duration: t.duration || 0,
                    liked: false,
                    _original: t,
                  }}
                  onPlay={playTrack}
                />
              ))}
            </HorizontalScroller>
          </section>
        )}

        {/* Nouvelles musiques */}
        {!loading && recentCards.length > 0 && (
          <section>
            <SectionTitle title="Nouvelles musiques" actionLabel="Tout voir" />
            <HorizontalScroller>
              {recentCards.slice(0, 12).map(t => <TrackCard key={t.id} track={t} onPlay={playTrack} />)}
            </HorizontalScroller>
          </section>
        )}

        {/* Les artistes que tu suis écoutent */}
        {session && socialDiscovery.length > 0 && (
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-white leading-tight">Tes artistes écoutent aussi</h2>
                <p className="text-[11px] text-white/30">Tendances parmi les artistes que tu suis</p>
              </div>
            </div>
            <HorizontalScroller>
              {socialDiscovery.map((t: any) => (
                <TrackCard
                  key={t._id}
                  track={{
                    id: t._id,
                    title: t.title,
                    artist: t.artist?.name || t.artist?.username || '',
                    cover: t.coverUrl || '/default-cover.jpg',
                    duration: t.duration || 0,
                    liked: false,
                    _original: t,
                  }}
                  onPlay={playTrack}
                />
              ))}
            </HorizontalScroller>
          </section>
        )}

        {/* Playlists populaires */}
        {guestPlaylists.length > 0 && (
          <section>
            <SectionTitle title="Playlists populaires" actionLabel="Explorer" onAction={() => router.push('/discover?tab=playlists', { scroll: false })} />
            <HorizontalScroller>
              {guestPlaylists.map((pl) => (
                <button
                  key={pl._id}
                  onClick={() => router.push(`/playlist/${pl._id}`, { scroll: false })}
                  className="min-w-[160px] md:min-w-[200px] max-w-[160px] md:max-w-[200px] rounded-xl p-2 hover:bg-white/[0.06] transition-all group/pl text-left"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-white/[0.06]">
                    <img
                      src={pl.coverUrl || '/default-cover.jpg'}
                      alt={pl.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'; }}
                    />
                    <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center opacity-0 group-hover/pl:opacity-100 transition-all shadow-lg shadow-indigo-500/30">
                      <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-sm font-semibold text-white truncate">{pl.name}</div>
                    <div className="text-[11px] text-white/40 truncate">
                      {pl.trackCount ? `${pl.trackCount} titres` : ''}
                      {pl.user?.username ? ` · ${pl.user.name || pl.user.username}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </HorizontalScroller>
          </section>
        )}

        {/* Nouveaux artistes à découvrir */}
        {newArtists.length > 0 && (
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-white leading-tight">Nouveaux artistes</h2>
                <p className="text-[11px] text-white/30">Fraîchement arrivés sur Synaura</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {newArtists.map((artist: any) => (
                <button
                  key={artist._id || artist.id}
                  onClick={() => router.push(`/profile/${encodeURIComponent(artist.username)}`, { scroll: false })}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/[0.06] transition group text-center"
                >
                  <div className="relative">
                    <img
                      src={artist.avatar || '/default-avatar.png'}
                      alt={artist.name || artist.username}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-500/30 group-hover:ring-emerald-500/60 transition"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.png'; }}
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-[#0a0a0f]">
                      <Sparkles className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-[13px] font-semibold text-white truncate">{artist.name || artist.username}</p>
                    <p className="text-[10px] text-white/30 truncate">
                      {artist.trackCount ? `${artist.trackCount} titres` : artist.totalPlays ? `${formatK(artist.totalPlays)} écoutes` : 'Nouveau'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* En direct */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-black text-white">En direct</h2>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <LiveRadioCard title="Mixx Party" logoSrc="/mixxpartywhitelog.png" isPlaying={isRadioPlaying} currentTrack={radioInfo.currentTrack} currentArtist={radioInfo.currentArtist} listeners={radioInfo.listeners} onToggle={handleRadioToggle} onOpenPlayer={() => { if (!isRadioPlaying) handleRadioToggle(); }} />
            <LiveRadioCard title="XimaM Radio" logoSrc="/ximam-radio-x.svg" isPlaying={isXimamRadioPlaying} currentTrack={ximamRadioInfo.currentTrack} currentArtist={ximamRadioInfo.currentArtist} listeners={ximamRadioInfo.listeners} onToggle={handleXimamRadioToggle} onOpenPlayer={() => { if (!isXimamRadioPlaying) handleXimamRadioToggle(); }} />
          </div>
        </section>

        <AdSlot placement="home_card" />

        {/* Tests (dev only) */}
        {process.env.NODE_ENV !== "production" && <DevTests />}

        <footer className="pt-8 pb-10 text-xs text-white/40">
          <div className="flex flex-wrap items-center gap-3 justify-center">
            <a href="/support" className="hover:text-white transition">Support / Contact</a>
            <span className="opacity-40">&middot;</span>
            <a href="/legal/mentions-legales" className="hover:text-white transition">Mentions légales</a>
            <span className="opacity-40">&middot;</span>
            <a href="/legal/confidentialite" className="hover:text-white transition">Confidentialité</a>
            <span className="opacity-40">&middot;</span>
            <a href="/legal/cgu" className="hover:text-white transition">CGU</a>
            <span className="opacity-40">&middot;</span>
            <a href="/legal/cgv" className="hover:text-white transition">CGV</a>
            <span className="opacity-40">&middot;</span>
            <a href="/legal/cookies" className="hover:text-white transition">Cookies</a>
            <span className="opacity-40">&middot;</span>
            <a href="/legal/rgpd" className="hover:text-white transition">RGPD</a>
            <span className="opacity-40">&middot;</span>
            <span>&copy; {new Date().getFullYear()} Synaura. Tous droits réservés.</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

function DevTests() {
  return null;
}
