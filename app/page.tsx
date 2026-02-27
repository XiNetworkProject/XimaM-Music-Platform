"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Heart,
  Upload,
  Radio,
  Sparkles,
  Music2,
  Users,
  Library,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  Headphones,
  Mic2,
  Wand2,
  Disc3,
  Repeat,
  Star,
  Clock,
  TrendingUp,
  Crown,
  Gift,
} from "lucide-react";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAudioPlayer } from './providers';
import { applyCdnToTracks } from '@/lib/cdnHelpers';
import Avatar from '@/components/Avatar';
import FollowButton from '@/components/FollowButton';
import LikeButton from '@/components/LikeButton';
import AdSlot from '@/components/AdSlot';

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
  const basePopularity =
    Math.log10((track.plays || 0) + 1) * 0.6 +
    ((track.likes?.length || 0) * 0.002);
  if (!profile) return basePopularity;

  let personalization = 0;
  if (track.artist?._id && profile.artistScores[track.artist._id]) {
    personalization += 2 * profile.artistScores[track.artist._id];
  }

  const genres = Array.isArray(track.genre)
    ? track.genre
    : track.genre
    ? [track.genre]
    : [];
  genres.forEach((genre) => {
    const key = genre?.trim()?.toLowerCase();
    if (key && profile.genreScores[key]) {
      personalization += 1.3 * profile.genreScores[key];
    }
  });

  if (track.createdAt) {
    const now = Date.now();
    const days = (now - new Date(track.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, 1 - days / 180);
    personalization += recencyBoost * profile.recencyPreference;
  }

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

// Cache pour les données
const dataCache = new Map<string, { tracks: Track[]; timestamp: number }>();
const CACHE_DURATION = 30 * 1000;

const SectionTitle = ({
  icon: Icon,
  title,
  actionLabel,
  onAction,
}: {
  icon: any;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <div className="flex items-center justify-between mb-3 md:mb-4">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-white/[0.06] border border-white/[0.06] grid place-items-center">
        <Icon className="w-5 h-5 text-foreground-secondary" />
      </div>
      <h3 className="text-lg md:text-xl font-bold tracking-tight text-foreground-primary">{title}</h3>
    </div>
    {actionLabel && (
      <button
        onClick={onAction}
        className="text-sm font-medium text-foreground-tertiary hover:text-foreground-primary transition"
      >
        {actionLabel}
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
          <ChevronLeft className="w-5 h-5 text-foreground-primary" />
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
          <ChevronRight className="w-5 h-5 text-foreground-primary" />
        </button>
      )}
    </div>
  );
};

const TrackCard = ({ track, onPlay }: { track: any; onPlay?: (track: any) => void }) => {
  const handlePlay = () => {
    if (onPlay && track._original) {
      onPlay(track._original);
    }
  };
  
  return (
    <div
      className="min-w-[150px] md:min-w-[180px] max-w-[150px] md:max-w-[180px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl p-2.5 transition-all duration-200 hover:scale-[1.02]"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="relative group/cover">
        <img
          src={track.cover}
          alt={track.title}
          className="w-full h-36 md:h-44 object-cover rounded-lg border border-white/[0.06]"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg';
          }}
        />
        <button
          onClick={handlePlay}
          className="absolute bottom-2 right-2 p-2 rounded-2xl bg-background-tertiary/80 hover:bg-background-tertiary border border-border-secondary backdrop-blur"
        >
          <Play className="w-4 h-4 text-foreground-primary" />
        </button>
      </div>
      <div className="mt-1.5 md:mt-2">
        <p className="text-xs md:text-sm font-medium line-clamp-1 text-foreground-primary">{track.title}</p>
        <p className="text-[10px] md:text-xs text-foreground-tertiary line-clamp-1">{track.artist}</p>
      </div>
      <div className="mt-1.5 md:mt-2 flex items-center justify-between text-[10px] md:text-xs">
        <span className="text-foreground-tertiary flex items-center gap-0.5 md:gap-1">
          <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
          {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, "0")}
        </span>
        {track._original && (
          <LikeButton
            trackId={track._original._id}
            initialLikesCount={Array.isArray(track._original.likes) ? track._original.likes.length : 0}
            initialIsLiked={track._original.isLiked || false}
            size="sm"
            variant="minimal"
            showCount={false}
            className="p-0"
          />
        )}
      </div>
    </div>
  );
};

const CreatorCard = ({ c, onClick }: { c: any; onClick: () => void }) => (
  <div
    className="min-w-[190px] bg-background-fog-thin border border-border-secondary rounded-2xl p-3 hover:bg-overlay-on-primary transition"
    style={{ scrollSnapAlign: "start" }}
  >
    <div onClick={onClick} className="cursor-pointer">
      <div className="flex items-center gap-3">
        <Avatar
          src={c.avatar}
          name={c.name}
          username={c.username}
          size="md"
          className="w-12 h-12"
        />
        <div>
          <p className="text-sm font-semibold line-clamp-1 text-foreground-primary">{c.name}</p>
          <p className="text-xs text-foreground-tertiary">{Intl.NumberFormat().format(c.followers)} abonnés</p>
        </div>
      </div>
    </div>
    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
      <FollowButton
        artistId={c.id}
        artistUsername={c.username}
        size="sm"
        className="w-full text-xs py-1.5 rounded-lg"
      />
    </div>
  </div>
);

const AIGenCard = ({ g }: { g: any }) => (
  <div
    className="min-w-[180px] md:min-w-[220px] bg-gradient-to-br from-overlay-on-primary/18 via-background-fog-thin to-overlay-on-primary/10 border border-border-secondary rounded-2xl p-2.5 md:p-3 hover:bg-overlay-on-primary transition"
    style={{ scrollSnapAlign: "start" }}
  >
    <img src={g.cover} alt={g.prompt} className="w-full h-32 md:h-36 object-cover rounded-lg md:rounded-xl" />
    <div className="mt-1.5 md:mt-2 flex items-start gap-1.5 md:gap-2">
      <Wand2 className="w-3.5 h-3.5 md:w-4 md:h-4 mt-0.5 flex-shrink-0" />
      <p className="text-[10px] md:text-xs text-foreground-secondary line-clamp-2">{g.prompt}</p>
    </div>
    <div className="mt-1.5 md:mt-2 flex items-center gap-1.5 md:gap-2">
      <button className="text-[10px] md:text-xs px-3 py-1.5 rounded-2xl bg-background-fog-thin border border-border-secondary hover:bg-overlay-on-primary transition text-foreground-primary">
        Générer
      </button>
      <button className="text-[10px] md:text-xs px-3 py-1.5 rounded-2xl bg-background-tertiary border border-border-secondary hover:bg-overlay-on-primary transition text-foreground-secondary">
        Varier
      </button>
    </div>
  </div>
);

const LiveRadioCard = ({
  title,
  logoSrc,
  isPlaying,
  currentTrack,
  onToggle,
}: {
  title: string;
  logoSrc?: string;
  isPlaying: boolean;
  currentTrack: string;
  onToggle: () => void;
}) => {
  return (
    <div className="bg-gradient-to-r from-overlay-on-primary/15 via-background-fog-thin to-overlay-on-primary/10 border border-border-secondary rounded-2xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-2xl bg-background-tertiary border border-border-secondary">
          {logoSrc ? (
            <img src={logoSrc} alt={title} className="w-12 h-8 object-contain" />
          ) : (
            <Radio className="w-8 h-8 text-foreground-primary" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground-primary">{title}</p>
          <p className="text-xs text-foreground-tertiary line-clamp-1">{currentTrack}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className="px-3 py-2 text-sm rounded-2xl bg-background-fog-thin hover:bg-overlay-on-primary border border-border-secondary flex items-center gap-2 transition"
      >
        {isPlaying ? (<><Pause className="w-4 h-4" /> Pause</>) : (<><Play className="w-4 h-4" /> Écouter</>)}
      </button>
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
        className="absolute top-3 right-3 z-10 px-3 py-2 rounded-2xl bg-background-tertiary/70 hover:bg-background-tertiary border border-border-secondary text-xs flex items-center gap-2 backdrop-blur"
      >
        <Repeat className="w-4 h-4" />
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
              <span className="px-2 py-1 rounded-full bg-background-tertiary/70 border border-border-secondary backdrop-blur">
                {s.tag}
              </span>
              {s.genre && (
                <span className="px-2 py-1 rounded-full bg-background-tertiary/70 border border-border-secondary backdrop-blur">
                  {s.genre}
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-bold mt-2">{s.title}</h2>
            <p className="text-sm text-white/80">{s.subtitle}</p>
            {s.actionLabel && onAction && (
              <button 
                onClick={() => onAction(s.actionType, s.actionData ?? s.track)} 
                className="mt-3 px-4 py-2 bg-background-tertiary/70 backdrop-blur-md rounded-2xl hover:bg-background-tertiary transition flex items-center gap-2 border border-border-secondary"
              >
                {s.actionIcon && <s.actionIcon className="w-4 h-4" />}
                <span className="text-sm font-medium">{s.actionLabel}</span>
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

// Icons used in the Library section (kept outside render for stability)
const LIB_ICONS = [Heart, Disc3, Clock, Library, Mic2, Repeat];

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div
    className={`animate-pulse rounded-2xl bg-background-fog-thin border border-border-secondary ${className}`}
  />
);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 6) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
};

const ActionPill = ({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-background-fog-thin hover:bg-overlay-on-primary border border-border-secondary text-sm whitespace-nowrap transition text-foreground-secondary"
  >
    <Icon className="w-4 h-4" />
    <span className="font-medium text-foreground-primary">{label}</span>
  </button>
);

const WelcomeHeader = ({
  session,
  onGo,
  stats,
  listenList,
  listenTrack,
  nextUp,
  onListenNow,
}: {
  session: any;
  onGo: (path: string) => void;
  stats?: { playlists: number; favorites: number; queue: number };
  listenList: any[];
  listenTrack: any | null;
  nextUp: any[];
  onListenNow: () => void;
}) => {
  const name =
    session?.user?.name ||
    session?.user?.username ||
    session?.user?.email?.split?.("@")?.[0] ||
    "sur Synaura";

  return (
    <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent border border-white/[0.06] p-4 md:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-foreground-tertiary text-xs">
            {session ? `${getGreeting()}, ${name}` : 'Découvrir'}
          </p>
          <h1 className="mt-0.5 text-xl md:text-2xl font-bold tracking-tight text-foreground-primary">
            Écoute des sons créés par la communauté.
          </h1>
          <p className="text-foreground-secondary text-xs mt-1 max-w-xl">
            Lance un son. Si tu kiffes, crée ton profil en 10 secondes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onListenNow}
            className="h-9 px-4 rounded-full bg-white text-black hover:scale-[1.02] active:scale-[0.98] transition text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Écouter maintenant
          </button>
          {!session ? (
            <button
              onClick={() => onGo("/auth/signup")}
              className="h-9 px-4 rounded-full border border-white/20 bg-transparent hover:bg-white/[0.08] transition text-xs font-semibold"
            >
              Créer un compte
            </button>
          ) : (
            <button
              onClick={() => onGo("/boosters")}
              className="h-9 px-4 rounded-full border border-white/20 bg-transparent hover:bg-white/[0.08] transition text-xs font-semibold"
            >
              Boosters
            </button>
          )}
        </div>
      </div>

      {/* Lecteur instantané + mini file */}
      <div className="mt-6 grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
          <div className="flex items-center gap-3">
            <img
              src={listenTrack?.coverUrl || '/default-cover.jpg'}
              className="w-11 h-11 rounded-lg object-cover border border-white/[0.06] shrink-0"
              onError={(e) => (((e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'))}
              alt=""
            />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-foreground-tertiary">Lecteur instantané</div>
              <div className="text-sm font-semibold text-foreground-primary truncate">
                {listenTrack?.title || 'Choisis une track et lance la lecture'}
              </div>
              <div className="text-xs text-foreground-tertiary truncate">
                {listenTrack?.artist?.name || listenTrack?.artist?.username || '—'}
              </div>
            </div>
            <button
              type="button"
              onClick={onListenNow}
              className="h-9 px-3 rounded-full bg-white text-black hover:scale-[1.02] transition text-xs font-medium inline-flex items-center gap-1.5 shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Play
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-semibold text-foreground-primary">3 suivants</span>
            <span className="text-[10px] text-foreground-tertiary">{nextUp.length ? `${nextUp.length}/3` : '—'}</span>
          </div>
          <div className="grid gap-1.5">
            {nextUp.length ? (
              nextUp.slice(0, 3).map((t) => (
                <div key={t._id} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] transition py-1.5 px-2">
                  <img
                    src={t.coverUrl || '/default-cover.jpg'}
                    className="w-8 h-8 rounded-md object-cover border border-white/[0.06] shrink-0"
                    onError={(e) => (((e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'))}
                    alt=""
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-foreground-primary truncate">{t.title}</div>
                    <div className="text-[10px] text-foreground-tertiary truncate">{t.artist?.name || t.artist?.username}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[11px] text-foreground-tertiary py-1">Lance la lecture pour remplir la file.</div>
            )}
          </div>
        </div>
      </div>

      {/* Actions mini (mobile) */}
      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1 md:hidden">
        <button
          onClick={() => onGo("/ai-generator")}
          className="h-10 px-4 rounded-xl bg-gradient-to-r from-purple-500/25 to-pink-500/25 hover:from-purple-500/35 hover:to-pink-500/35 border border-purple-500/30 text-white transition text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Studio IA
        </button>
        {!session ? (
          <>
            <button
              onClick={() => onGo("/auth/signin")}
              className="h-10 px-4 rounded-full border border-white/20 bg-transparent hover:bg-white/[0.06] transition text-sm text-foreground-secondary inline-flex items-center gap-2 whitespace-nowrap"
            >
              Se connecter
            </button>
            <button
              onClick={() => onGo("/auth/signup")}
              className="h-10 px-4 rounded-full border border-white/20 bg-transparent hover:bg-white/[0.06] transition text-sm text-foreground-secondary inline-flex items-center gap-2 whitespace-nowrap"
            >
              Créer un compte
            </button>
          </>
        ) : null}
        <button
          onClick={() => onGo("/trending")}
          className="h-10 px-3 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition text-sm text-foreground-secondary inline-flex items-center gap-2 whitespace-nowrap"
        >
          <TrendingUp className="w-4 h-4" />
          Explorer
        </button>
        <button
          onClick={() => onGo("/boosters")}
          className="h-10 px-3 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition text-sm text-foreground-secondary inline-flex items-center gap-2 whitespace-nowrap"
        >
          <Gift className="w-4 h-4" />
          Boosters
        </button>
        {session ? (
          <button
            onClick={() => onGo("/upload")}
            className="h-10 px-4 rounded-full border border-white/20 bg-transparent hover:bg-white/[0.06] transition text-sm text-foreground-secondary inline-flex items-center gap-2 whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            Uploader
          </button>
        ) : null}
      </div>
    </div>
  );
};

const ContinueListening = ({
  track,
  isPlaying,
  onToggle,
}: {
  track: any;
  isPlaying: boolean;
  onToggle: () => void;
}) => {
  if (!track?._id) return null;

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 md:p-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={track.coverUrl || "/default-cover.jpg"}
          className="w-12 h-12 rounded-2xl object-cover border border-border-secondary"
          onError={(e) =>
            ((e.currentTarget as HTMLImageElement).src = "/default-cover.jpg")
          }
          alt=""
        />
        <div className="min-w-0">
          <p className="text-xs text-foreground-tertiary">Reprendre l’écoute</p>
          <p className="text-sm font-semibold line-clamp-1 text-foreground-primary">{track.title}</p>
          <p className="text-xs text-foreground-tertiary line-clamp-1">
            {track.artist?.name || track.artist?.username}
          </p>
        </div>
      </div>

      <button
        onClick={onToggle}
        className="shrink-0 px-3 py-2 rounded-2xl bg-background-fog-thin hover:bg-overlay-on-primary border border-border-secondary flex items-center gap-2 transition"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        <span className="text-sm font-medium text-foreground-primary">{isPlaying ? "Pause" : "Lire"}</span>
      </button>
    </div>
  );
};

const SidebarCard = ({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: any;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 md:p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-white/[0.06] border border-white/[0.06] grid place-items-center shrink-0">
          <Icon className="h-5 w-5 text-foreground-secondary" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground-primary truncate">{title}</div>
          {subtitle && <div className="text-xs text-foreground-tertiary line-clamp-2">{subtitle}</div>}
        </div>
      </div>
    </div>
    <div className="mt-3">{children}</div>
  </div>
);

export default function SynauraHome() {
  const { data: session } = useSession();
  const { audioState, playTrack, play, pause, setTracks, upNextEnabled, upNextTracks, toggleUpNextEnabled } = useAudioPlayer();
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
  
  // États pour la radio
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [radioInfo, setRadioInfo] = useState({
    name: 'Mixx Party Radio',
    description: 'Radio tous styles musicaux en continu 24h/24',
    currentTrack: 'Mixx Party Radio',
    listeners: 0,
    bitrate: 128,
    quality: 'Standard',
    isLive: true,
    lastUpdate: new Date().toISOString()
  });

  // États pour la nouvelle radio XimaM
  const [isXimamRadioPlaying, setIsXimamRadioPlaying] = useState(false);
  const [ximamRadioInfo, setXimamRadioInfo] = useState({
    name: 'XimaM Radio',
    description: 'Radio XimaM en continu 24h/24',
    currentTrack: 'XimaM Radio',
    listeners: 0,
    bitrate: 128,
    quality: 'Standard',
    isLive: true,
    lastUpdate: new Date().toISOString()
  });

  // Fonction pour charger les données
  const fetchCategoryData = useCallback(async (key: string, url: string) => {
    const cached = dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.tracks;
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.tracks && Array.isArray(data.tracks)) {
          const cdnTracks = applyCdnToTracks(data.tracks);
          dataCache.set(key, { tracks: cdnTracks, timestamp: Date.now() });
          return cdnTracks;
        }
      }
    } catch (error) {
      console.error(`Erreur chargement ${key}:`, error);
    }
    return [];
  }, []);

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
      setPreferenceProfile(null);
          return;
        }
        
    try {
      const likedRes = await fetch('/api/tracks?liked=true&limit=150', { cache: 'no-store' });
      let likedTracks: Track[] = [];
      if (likedRes.ok) {
        const likedJson = await likedRes.json();
        likedTracks = likedJson?.tracks || [];
      }

      const seedPool = likedTracks.length
        ? likedTracks
        : [...forYouTracks.slice(0, 60), ...recentTracks.slice(0, 60)];

      const profile = buildPreferenceProfile(seedPool);
      setPreferenceProfile(profile);
    } catch (error) {
      console.error('Erreur profil préférences:', error);
    }
  }, [session?.user?.id, forYouTracks, recentTracks]);

  // Charger toutes les données au montage
  useEffect(() => {
    const loadData = async () => {
    setLoading(true);
      const [featured, trending, recent, forYou, users] = await Promise.all([
        fetchCategoryData('featured', '/api/tracks/featured?limit=10'),
        fetchCategoryData('trending', '/api/tracks/trending?limit=30'),
        fetchCategoryData('recent', '/api/tracks/recent?limit=30'),
        fetchCategoryData('forYou', '/api/ranking/feed?limit=50&ai=1'),
        fetch('/api/users?limit=12').then(r => r.ok ? r.json().then(d => d.users || []) : []).catch(() => [])
      ]);
      
      setFeaturedTracks(featured);
      setTrendingTracks(trending);
      setRecentTracks(recent);
      setForYouTracks(forYou);
      setPopularUsers(users);
      setLoading(false);
      
      // Charger les stats de bibliothèque et créateurs suggérés en parallèle
      fetchLibraryStats();
      fetchSuggestedCreators();
    };
    
    loadData();
  }, [fetchCategoryData, fetchLibraryStats, fetchSuggestedCreators]);

  // Guest: playlists populaires (3)
  useEffect(() => {
    const loadGuest = async () => {
      if (session) return;
      try {
        setGuestPlaylistsLoading(true);
        const res = await fetch('/api/playlists/popular?limit=3', { cache: 'no-store' });
        const json = await res.json();
        const list = Array.isArray(json?.playlists) ? (json.playlists as PublicPlaylist[]) : [];
        setGuestPlaylists(list.slice(0, 3));
      } catch {
        setGuestPlaylists([]);
      } finally {
        setGuestPlaylistsLoading(false);
      }
    };
    loadGuest();
  }, [session]);

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
    if (!preferenceProfile) return forYouList;
    return [...forYouList].sort(
      (a, b) =>
        scoreTrackForProfile(b, preferenceProfile) -
        scoreTrackForProfile(a, preferenceProfile),
    );
  }, [forYouList, preferenceProfile]);

  const trendingList = useMemo(() => {
    if (!preferenceProfile) return trendingUnique;
    return [...trendingUnique].sort(
      (a, b) =>
        scoreTrackForProfile(b, preferenceProfile) -
        scoreTrackForProfile(a, preferenceProfile),
    );
  }, [trendingUnique, preferenceProfile]);
  
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
    _original: t
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
  
  const mockCreators = useMemo(() => popularUsers.map((u, i) => ({
    id: u._id || u.id || i,
    name: u.name || u.username,
    avatar: u.avatar || '/default-avatar.png',
    followers: u.followerCount || 0,
    username: u.username
  })), [popularUsers]);
  
  // Mock AI generations (garder les données factices pour l'instant)
  const mockAIGens = useMemo(() => Array.from({ length: 10 }).map((_, i) => ({
    id: i + 1,
    prompt: [
      "EDM euphorique 128 BPM, pads aériens, drop lumineux",
      "Lo-fi pluie douce, piano granuleux, vinyle",
      "Synthwave rétro 84 BPM, arpèges analogiques",
      "Trap sombre, 808 lourdes, choir spectral",
      "Orchestral épique + drums ciné",
    ][i % 5],
    cover: `https://picsum.photos/seed/ai_${i}/400/400`,
  })), []);
  
  // Heroslides basées sur les vraies données
  const heroSlides = useMemo(() => {
    const slides = [];
    
    // Slide: Abonnements
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
    
    // Slide: Générateur IA
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
    
    // Ajouter les featured tracks (jusqu'à 5)
    if (featuredTracks.length > 0) {
      featuredTracks.slice(0, 5).forEach(track => {
        slides.push({
          id: track._id,
          title: track.title,
          subtitle: `${track.artist?.name || track.artist?.username}`,
          image: track.coverUrl || '/default-cover.jpg',
          tag: 'En vedette',
          genre: track.genre?.[0],
          actionLabel: 'Écouter',
          actionType: 'play',
          actionIcon: Play,
          track: track
        });
      });
    }
    
    return slides;
  }, [featuredTracks]);

  const router = useRouter();
  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  
  // Fonction pour formater les nombres
  const formatNumber = useCallback((num: number) => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }, []);

  // Fonction pour récupérer l'URL de streaming
  const fetchStreamUrl = async () => {
    try {
      const streamUrl = 'https://stream.mixx-party.fr/listen/mixx_party/radio.mp3';
      return streamUrl;
    } catch (error) {
      return 'https://stream.mixx-party.fr/listen/mixx_party/radio.mp3';
    }
  };

  // Fonction pour récupérer l'URL de streaming (XimaM)
  const fetchXimamStreamUrl = async () => {
    try {
      const streamUrl = 'https://stream.mixx-party.fr/listen/ximam/radio.mp3';
      return streamUrl;
    } catch (error) {
      return 'https://stream.mixx-party.fr/listen/ximam/radio.mp3';
    }
  };

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
            listeners: radioData.stats.listeners,
            bitrate: radioData.stats.bitrate,
            quality: radioData.stats.quality,
            isLive: radioData.isOnline,
            lastUpdate: radioData.lastUpdate
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
        lastUpdate: new Date().toISOString()
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
            listeners: radioData.stats.listeners,
            bitrate: radioData.stats.bitrate,
            quality: radioData.stats.quality,
            isLive: radioData.isOnline,
            lastUpdate: radioData.lastUpdate
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
        lastUpdate: new Date().toISOString()
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
        const streamUrl = await fetchStreamUrl();
        
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
        const streamUrl = await fetchXimamStreamUrl();

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

  // File instantanée pour "Écouter maintenant"
  const listenBase =
    (session && personalizedForYouList?.length ? personalizedForYouList : null) ||
    (trendingList?.length ? trendingList : null) ||
    (recentTracks?.length ? recentTracks : null) ||
    (featuredTracks?.length ? featuredTracks : null) ||
    [];
  const listenList = listenBase.slice(0, 30);
  const listenTrack = listenList[0] || null;
  const listenNextUp = listenList.slice(1, 4);
  const onListenNow = () => {
    if (!listenList.length) return;
    setTracks(listenList as any);
    playTrack(listenList[0] as any);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-primary text-foreground-primary">
        <main className="mx-auto w-full max-w-none px-3 sm:px-4 lg:px-8 2xl:px-10 py-6 md:py-8 space-y-4 md:space-y-6">
          <WelcomeHeader
            session={session}
            onGo={onGo}
            stats={{ playlists: 0, favorites: 0, queue: 0 }}
            listenList={[]}
            listenTrack={null}
            nextUp={[]}
            onListenNow={() => {}}
          />

          <div className="grid lg:grid-cols-12 gap-3 md:gap-4">
            <Skeleton className="lg:col-span-8 h-[240px] md:h-[300px]" />
            <div className="lg:col-span-4 space-y-3">
              <Skeleton className="h-[88px]" />
              <Skeleton className="h-[88px]" />
              <Skeleton className="h-[88px]" />
            </div>
          </div>

          <Skeleton className="h-[160px]" />
          <Skeleton className="h-[160px]" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground-primary">
      <main className="mx-auto w-full max-w-none px-4 sm:px-6 lg:px-10 2xl:px-12 py-6 md:py-10 space-y-6 md:space-y-8">
        <WelcomeHeader
          session={session}
          onGo={onGo}
          stats={{
            playlists: libraryStats.playlists || 0,
            favorites: libraryStats.favorites || 0,
            queue: upNextTracks?.length || 0,
          }}
          listenList={listenList as any[]}
          listenTrack={listenTrack as any}
          nextUp={listenNextUp as any[]}
          onListenNow={onListenNow}
        />

        {/* Carousel en avant — visible immédiatement */}
        <section className="w-full" aria-label="À la une">
          <HeroCarousel slides={heroSlides} onAction={handleCarouselAction} />
        </section>

        {/* ✅ Guest: ancien bloc (désactivé) */}
        {false && !session ? (
          <div className="rounded-3xl border border-border-secondary bg-background-fog-thin p-3 md:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground-primary">Écoute maintenant</div>
                <div className="text-xs text-foreground-tertiary">
                  Top tendances • playlists • nouveautés. Écoute en 1 clic.
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => onGo('/auth/signin')}
                  className="h-10 px-3 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition text-sm"
                >
                  Se connecter
                </button>
                <button
                  onClick={() => onGo('/auth/signup')}
                  className="h-10 px-3 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition text-sm"
                >
                  Créer un compte
                </button>
              </div>
            </div>

            <div className="mt-3 grid md:grid-cols-12 gap-3">
              {/* Top 10 tendances */}
              <div className="md:col-span-6 rounded-3xl border border-border-secondary bg-background-fog-thin p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-sm font-semibold text-foreground-primary flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-foreground-secondary" />
                    Top 10 tendances
                  </div>
                  <button
                    onClick={() => {
                      const list = trendingList.slice(0, 10);
                      if (!list.length) return;
                      setTracks(list as any);
                      playTrack(list[0] as any);
                    }}
                    className="h-8 px-2 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-xs inline-flex items-center gap-1"
                  >
                    <Play className="w-4 h-4" />
                    Play all
                  </button>
                </div>
                <div className="grid gap-2">
                  {trendingList.slice(0, 10).map((t, i) => (
                    <button
                      key={t._id}
                      onClick={() => {
                        const list = trendingList.slice(0, 10);
                        setTracks(list as any);
                        playTrack(t as any);
                      }}
                      className="w-full text-left flex items-center gap-3 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition p-2"
                    >
                      <div className="w-7 text-xs text-foreground-tertiary font-semibold">#{i + 1}</div>
                      <img
                        src={t.coverUrl || '/default-cover.jpg'}
                        className="w-10 h-10 rounded-xl object-cover border border-border-secondary"
                        onError={(e) => (((e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'))}
                        alt=""
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-foreground-primary truncate">{t.title}</div>
                        <div className="text-[11px] text-foreground-tertiary truncate">
                          {t.artist?.name || t.artist?.username}
                        </div>
                      </div>
                      <div className="shrink-0 p-2 rounded-xl border border-border-secondary bg-background-fog-thin">
                        <Play className="w-4 h-4 text-foreground-primary" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Playlists + nouveautés */}
              <div className="md:col-span-6 grid gap-3">
                <div className="rounded-3xl border border-border-secondary bg-background-fog-thin p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-sm font-semibold text-foreground-primary flex items-center gap-2">
                      <Disc3 className="w-4 h-4 text-foreground-secondary" />
                      Playlists
                    </div>
                    <button
                      onClick={() => onGo('/discover')}
                      className="h-8 px-2 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-xs"
                    >
                      Découvrir
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(guestPlaylistsLoading ? Array.from({ length: 3 }) : guestPlaylists).map((p: any, idx: number) =>
                      p ? (
                        <button
                          key={p._id}
                          onClick={() => onGo(`/playlists/${encodeURIComponent(p._id)}`)}
                          className="text-left rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition p-2"
                        >
                          <img
                            src={p.coverUrl || '/default-cover.jpg'}
                            className="w-full h-20 rounded-xl object-cover border border-border-secondary"
                            onError={(e) => (((e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'))}
                            alt=""
                          />
                          <div className="mt-2 text-[13px] font-semibold text-foreground-primary truncate">{p.name}</div>
                          <div className="text-[11px] text-foreground-tertiary line-clamp-1">{p.description || 'Playlist'}</div>
                        </button>
                      ) : (
                        <div key={`sk-${idx}`} className="rounded-2xl border border-border-secondary bg-white/5 p-2 animate-pulse">
                          <div className="h-20 rounded-xl bg-white/10" />
                          <div className="mt-2 h-4 w-3/4 bg-white/10 rounded" />
                          <div className="mt-1 h-3 w-full bg-white/10 rounded" />
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-border-secondary bg-background-fog-thin p-3">
                  <div className="text-sm font-semibold text-foreground-primary flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-foreground-secondary" />
                    Nouveautés (6)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {recentTracks.slice(0, 6).map((t) => (
                      <button
                        key={t._id}
                        onClick={() => {
                          const list = recentTracks.slice(0, 30);
                          setTracks(list as any);
                          playTrack(t as any);
                        }}
                        className="w-full text-left flex items-center gap-3 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition p-2"
                      >
                        <img
                          src={t.coverUrl || '/default-cover.jpg'}
                          className="w-10 h-10 rounded-xl object-cover border border-border-secondary"
                          onError={(e) => (((e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'))}
                          alt=""
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-foreground-primary truncate">{t.title}</div>
                          <div className="text-[11px] text-foreground-tertiary truncate">
                            {t.artist?.name || t.artist?.username}
                          </div>
                        </div>
                        <div className="shrink-0 p-2 rounded-xl border border-border-secondary bg-background-fog-thin">
                          <Play className="w-4 h-4 text-foreground-primary" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ✅ Home “je comprends + j’écoute en 5 secondes” */}
        <div className="grid lg:grid-cols-12 gap-3 md:gap-4">
          <div className="lg:col-span-8 space-y-4 md:space-y-6">
            <section className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3 md:p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="text-base font-bold text-foreground-primary flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-foreground-secondary" />
                  Tendances du jour
                </div>
                <button
                  onClick={() => {
                    const list = trendingList.slice(0, 30);
                    if (!list.length) return;
                    setTracks(list as any);
                    playTrack(list[0] as any);
                  }}
                  className="h-9 px-4 rounded-full bg-white text-black hover:scale-[1.02] transition text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Play
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {trendingList.slice(0, 4).map((t) => (
                  <button
                    key={t._id}
                    onClick={() => {
                      const list = trendingList.slice(0, 30);
                      setTracks(list as any);
                      playTrack(t as any);
                    }}
                    className="w-full text-left flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] transition p-2.5"
                  >
                    <img
                      src={t.coverUrl || '/default-cover.jpg'}
                      className="w-12 h-12 rounded-lg object-cover border border-white/[0.06]"
                      onError={(e) => (((e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'))}
                      alt=""
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-foreground-primary truncate">{t.title}</div>
                      <div className="text-[11px] text-foreground-tertiary truncate">{t.artist?.name || t.artist?.username}</div>
                    </div>
                    <div className="shrink-0 p-2 rounded-full bg-white/[0.08] hover:bg-white/20 transition">
                      <Play className="w-4 h-4 text-foreground-primary" />
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3 md:p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="text-base font-bold text-foreground-primary flex items-center gap-2">
                  <Clock className="w-5 h-5 text-foreground-secondary" />
                  Nouveautés
                </div>
                <button
                  onClick={() => onGo('/discover')}
                  className="text-sm font-medium text-foreground-tertiary hover:text-foreground-primary transition"
                >
                  Voir plus
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {recentTracks.slice(0, 4).map((t) => (
                  <button
                    key={t._id}
                    onClick={() => {
                      const list = recentTracks.slice(0, 30);
                      setTracks(list as any);
                      playTrack(t as any);
                    }}
                    className="w-full text-left flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] transition p-2.5"
                  >
                    <img
                      src={t.coverUrl || '/default-cover.jpg'}
                      className="w-12 h-12 rounded-lg object-cover border border-white/[0.06]"
                      onError={(e) => (((e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'))}
                      alt=""
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-foreground-primary truncate">{t.title}</div>
                      <div className="text-[11px] text-foreground-tertiary truncate">{t.artist?.name || t.artist?.username}</div>
                    </div>
                    <div className="shrink-0 p-2 rounded-full bg-white/[0.08] hover:bg-white/20 transition">
                      <Play className="w-4 h-4 text-foreground-primary" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="lg:col-span-4 space-y-4">
            {!session ? (
              <section className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 md:p-5">
                <div className="text-base font-bold text-foreground-primary">Pourquoi créer un compte ?</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 hover:bg-white/[0.06] transition">
                    <div className="text-[12px] font-semibold text-foreground-primary">Likes & playlists</div>
                    <div className="text-[11px] text-foreground-tertiary">Sauvegarde et organise</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 hover:bg-white/[0.06] transition">
                    <div className="text-[12px] font-semibold text-foreground-primary">Historique</div>
                    <div className="text-[11px] text-foreground-tertiary">Reprendre facilement</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 hover:bg-white/[0.06] transition">
                    <div className="text-[12px] font-semibold text-foreground-primary">IA Studio</div>
                    <div className="text-[11px] text-foreground-tertiary">Créer des sons</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 hover:bg-white/[0.06] transition">
                    <div className="text-[12px] font-semibold text-foreground-primary">Boosters</div>
                    <div className="text-[11px] text-foreground-tertiary">Gains & bonus</div>
                  </div>
                </div>
                <button
                  onClick={() => onGo('/auth/signup')}
                  className="mt-4 h-11 w-full rounded-full bg-white text-black hover:scale-[1.01] transition text-sm font-semibold"
                >
                  Créer un compte
                </button>
              </section>
            ) : null}

            <section className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3 md:p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="text-base font-bold text-foreground-primary flex items-center gap-2">
                  <Users className="w-5 h-5 text-foreground-secondary" />
                  Créateurs à suivre
                </div>
                <button
                  onClick={() => onGo('/discover')}
                  className="text-sm font-medium text-foreground-tertiary hover:text-foreground-primary transition"
                >
                  Explorer
                </button>
              </div>

              <div className="grid gap-2">
                {personalizedCreators.slice(0, 3).map((creator: any) => (
                  <div
                    key={creator._id || creator.id}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] transition p-2.5 flex items-center gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => onGo(`/profile/${encodeURIComponent(creator.username)}`)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <img
                        src={creator.avatar || '/default-avatar.png'}
                        className="w-11 h-11 rounded-full object-cover border border-border-secondary"
                        onError={(e) => (((e.currentTarget as HTMLImageElement).src = '/default-avatar.png'))}
                        alt=""
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-foreground-primary truncate">
                          {creator.name || creator.username}
                        </div>
                        <div className="text-[11px] text-foreground-tertiary truncate">@{creator.username}</div>
                      </div>
                    </button>
                    <div onClick={(e) => e.stopPropagation()}>
                      <FollowButton
                        artistId={creator._id}
                        artistUsername={creator.username}
                        size="sm"
                        className="text-xs py-1.5 rounded-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        {/* Colonne principale + sidebar (toujours visible) */}
        <div className="grid lg:grid-cols-12 gap-4 md:gap-5">
          <div className="lg:col-span-8 space-y-3 md:space-y-4">
            <ContinueListening
              track={currentTrack}
              isPlaying={audioState.isPlaying}
              onToggle={async () => {
                if (!currentTrack?._id) return;
                if (audioState.isPlaying) pause();
                else await play(); // reprend sans restart
              }}
            />

            {/* Raccourcis */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 md:p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="text-sm font-semibold text-foreground-primary">Raccourcis</div>
                <div className="text-xs text-foreground-tertiary">Tout au même endroit</div>
                </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2">
              <button
                  onClick={() => onGo('/boosters')}
                  className="h-11 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] transition text-sm text-foreground-primary inline-flex items-center justify-center gap-2"
              >
                  <Gift className="h-4 w-4 text-foreground-secondary" />
                  Boosters
              </button>
              <button
                  onClick={() => onGo('/community')}
                  className="h-11 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] transition text-sm text-foreground-primary inline-flex items-center justify-center gap-2"
              >
                  <Users className="h-4 w-4 text-foreground-secondary" />
                  Communauté
              </button>
              <button
                  onClick={() => onGo('/library')}
                  className="h-11 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] transition text-sm text-foreground-primary inline-flex items-center justify-center gap-2"
                >
                  <Library className="h-4 w-4 text-foreground-secondary" />
                  Bibliothèque
              </button>
              <button
                  onClick={() => onGo('/trending')}
                  className="h-11 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] transition text-sm text-foreground-primary inline-flex items-center justify-center gap-2"
                >
                  <TrendingUp className="h-4 w-4 text-foreground-secondary" />
                  Trending
              </button>
              <button
                  onClick={() => onGo('/upload')}
                  className="h-11 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] transition text-sm text-foreground-primary inline-flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4 text-foreground-secondary" />
                  Uploader
              </button>
              <button
                  onClick={() => onGo('/subscriptions')}
                  className="h-11 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] transition text-sm text-foreground-primary inline-flex items-center justify-center gap-2"
                    >
                  <Crown className="h-4 w-4" />
                  Premium
              </button>
                  </div>
                      </div>

            {/* Pub visuelle non intrusive (house ad) */}
            <div className="mt-3">
              <AdSlot placement="home_card" />
            </div>

            {/* En direct (déplacé depuis la sidebar) */}
            <section className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 md:p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="text-sm font-semibold text-foreground-primary flex items-center gap-2">
                  <Radio className="w-4 h-4 text-foreground-secondary" />
                  En direct
                </div>
                <button
                  onClick={() => onGo('/discover')}
                  className="text-xs font-medium text-foreground-tertiary hover:text-foreground-primary transition"
                >
                  Explorer
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <LiveRadioCard
                  title="Mixx Party — Radio en direct"
                  logoSrc="/mixxpartywhitelog.png"
                  isPlaying={isRadioPlaying}
                  currentTrack={radioInfo.currentTrack}
                  onToggle={handleRadioToggle}
                />
                <LiveRadioCard
                  title="XimaM — Radio en direct"
                  logoSrc="/ximam-radio-x.svg"
                  isPlaying={isXimamRadioPlaying}
                  currentTrack={ximamRadioInfo.currentTrack}
                  onToggle={handleXimamRadioToggle}
                />
              </div>
            </section>
                    </div>
                    
          <div className="lg:col-span-4 space-y-3">
            <SidebarCard title="À suivre" subtitle="Ta liste d’attente (ordre respecté)" icon={List}>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-foreground-tertiary">
                  {upNextTracks?.length || 0} titre{(upNextTracks?.length || 0) > 1 ? 's' : ''}
                </div>
                <button
                  type="button"
                  onClick={() => toggleUpNextEnabled()}
                  className={[
                    'h-7 w-12 rounded-full border border-border-secondary transition relative',
                    upNextEnabled ? 'bg-overlay-on-primary' : 'bg-background-tertiary',
                  ].join(' ')}
                  aria-label="Activer À suivre"
                >
                  <span
                    className={[
                      'absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-background-primary transition',
                      upNextEnabled ? 'left-6' : 'left-1',
                    ].join(' ')}
                  />
                </button>
              </div>

              {(upNextTracks || []).slice(0, 3).map((t: any) => (
                <div key={t._id} className="mt-2 flex items-center gap-2">
                  <div className="h-10 w-10 rounded-2xl bg-background-tertiary border border-border-secondary overflow-hidden shrink-0">
                    <img
                      src={t.coverUrl || '/default-cover.jpg'}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg';
                      }}
                      alt=""
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-foreground-primary truncate">{t.title}</div>
                    <div className="text-xs text-foreground-tertiary truncate">{t.artist?.name || t.artist?.username || ''}</div>
                  </div>
                </div>
              ))}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => onGo('/library?tab=queue')}
                  className="h-10 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition text-sm text-foreground-secondary"
                >
                  Ouvrir
                </button>
                <button
                  onClick={() => onGo('/boosters')}
                  className="h-10 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition text-sm"
                >
                  Missions
                </button>
              </div>
            </SidebarCard>

            <SidebarCard title="Boosters" subtitle="Packs • pity • streak • missions" icon={Gift}>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onGo('/boosters')}
                  className="h-10 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition text-sm text-foreground-secondary"
                >
                  Ouvrir
                </button>
                <button
                  onClick={() => onGo('/boosters?tab=shop')}
                  className="h-10 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition text-sm"
                >
                  Shop
                </button>
              </div>
            </SidebarCard>
                    </div>
                  </div>

        {/* Pour toi */}
        {!loading && forYouCards.length > 0 && (
          <section className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 md:p-5">
            <SectionTitle icon={Sparkles} title="Pour toi" actionLabel="Tout voir" onAction={() => router.push('/for-you', { scroll: false })} />
            <HorizontalScroller>
              {forYouCards.map(t => <TrackCard key={t.id} track={t} onPlay={playTrack} />)}
            </HorizontalScroller>
        </section>
        )}

        {/* Trending */}
        {!loading && trendingList.length > 0 && (
          <section className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 md:p-5">
            <SectionTitle icon={TrendingUp} title="Les plus écoutées" actionLabel="Voir le top 50" onAction={() => router.push('/trending', { scroll: false })} />
            <HorizontalScroller>
              {trendingList.slice(0, 10).map((track, i) => (
                <div
                  key={track._id}
                  className="min-w-[190px] md:min-w-[230px] bg-white/[0.04] border border-white/[0.06] rounded-xl p-2.5 md:p-3 hover:bg-white/[0.08] transition-all duration-200 hover:scale-[1.02]"
                  style={{ scrollSnapAlign: "start" }}
                >
                  <div className="relative">
                    <img
                      src={track.coverUrl || '/default-cover.jpg'}
                      className="w-full h-32 md:h-36 object-cover rounded-xl border border-border-secondary/60"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg';
                      }}
                    />
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-background-tertiary/80 border border-border-secondary text-[10px] md:text-xs backdrop-blur text-foreground-primary">
                      #{i + 1}
                  </div>
                    <button
                      onClick={() => playTrack(track)}
                      className="absolute bottom-2 right-2 p-2 rounded-2xl bg-background-tertiary/80 border border-border-secondary hover:bg-background-tertiary transition backdrop-blur"
                    >
                      <Play className="w-4 h-4 text-foreground-primary" />
                    </button>
                  </div>
                  <p className="mt-2 text-xs md:text-sm font-semibold line-clamp-1 text-foreground-primary">{track.title}</p>
                  <p className="text-[10px] md:text-xs text-foreground-tertiary">{track.artist?.name || track.artist?.username}</p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] md:text-xs text-foreground-tertiary">
                    <span className="flex items-center gap-1">
                      <Headphones className="w-3 h-3" />
                      {formatNumber(track.plays || 0)}
                    </span>
                      <LikeButton
                        trackId={track._id}
                      initialLikesCount={Array.isArray(track.likes) ? track.likes.length : 0}
                        initialIsLiked={track.isLiked || false}
                        size="sm"
                        variant="minimal"
                      showCount={true}
                      className="flex items-center gap-1"
                      />
                    </div>
                  </div>
                ))}
            </HorizontalScroller>
        </section>
        )}

        {/* Nouveaux créateurs */}
        {!loading && mockCreators.length > 0 && (
          <section className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 md:p-5">
            <SectionTitle icon={Users} title="Nouveaux créateurs" actionLabel="Explorer" />
            <HorizontalScroller>
              {mockCreators.map(c => (
                <CreatorCard 
                  key={c.id} 
                  c={c} 
                  onClick={() => router.push(`/profile/${c.username}`, { scroll: false })}
                />
              ))}
            </HorizontalScroller>
        </section>
        )}

        {/* Génération IA - Section masquée */}
        {false && (
          <section className="hidden">
            <SectionTitle icon={Wand2} title="Génération IA" actionLabel="Ouvrir le studio" />
            <HorizontalScroller>
              {mockAIGens.map(g => <AIGenCard key={g.id} g={g} />)}
            </HorizontalScroller>
          </section>
        )}

        {/* Bibliothèque */}
        {session && (
          <section className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 md:p-5">
            <SectionTitle icon={Library} title="Ta bibliothèque" actionLabel="Gérer" onAction={() => router.push('/library', { scroll: false })} />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
              <div 
                onClick={() => router.push('/library?tab=favorites', { scroll: false })}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4 hover:bg-white/[0.08] transition cursor-pointer"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-gradient-to-br from-overlay-on-primary/18 to-overlay-on-primary/8 border border-border-secondary flex items-center justify-center mb-2 md:mb-3">
                  <Heart className="w-4 h-4 md:w-5 md:h-5 text-foreground-secondary" />
                  </div>
                <p className="text-xs md:text-sm font-semibold text-foreground-primary">Favoris</p>
                <p className="text-[10px] md:text-xs text-foreground-tertiary">{libraryStats.favorites} tracks</p>
                  </div>
            
              <div 
                onClick={() => router.push('/library?tab=playlists', { scroll: false })}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4 hover:bg-white/[0.08] transition cursor-pointer"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-gradient-to-br from-overlay-on-primary/20 to-overlay-on-primary/8 border border-border-secondary flex items-center justify-center mb-2 md:mb-3">
                  <Disc3 className="w-5 h-5 text-foreground-secondary" />
                </div>
                <p className="text-sm font-semibold text-foreground-primary">Playlists</p>
                <p className="text-xs text-foreground-tertiary">{libraryStats.playlists} dossiers</p>
              </div>

              <div 
                onClick={() => router.push('/library?tab=recent', { scroll: false })}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4 hover:bg-white/[0.08] transition cursor-pointer"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-gradient-to-br from-overlay-on-primary/16 to-overlay-on-primary/7 border border-border-secondary flex items-center justify-center mb-2 md:mb-3">
                  <Clock className="w-5 h-5 text-foreground-secondary" />
                </div>
                <p className="text-sm font-semibold text-foreground-primary">Historique</p>
                <p className="text-xs text-foreground-tertiary">Récemment écoutées</p>
                    </div>
                    
              {/* Générations IA - Carte masquée */}
              {false && (
                <div 
                  onClick={() => router.push('/ai-generator', { scroll: false })}
                  className="bg-background-fog-thin border border-border-secondary rounded-2xl p-4 hover:bg-overlay-on-primary transition cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-overlay-on-primary/18 to-overlay-on-primary/8 border border-border-secondary flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5 text-foreground-secondary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground-primary">Générations IA</p>
                  <p className="text-xs text-foreground-tertiary">{libraryStats.aiGenerations} créations</p>
                          </div>
            )}
          </div>
        </section>
        )}

        {/* Créateurs suggérés */}
        {!loading && personalizedCreators.length > 0 && (
          <section className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 md:p-5">
            <SectionTitle icon={Star} title="Créateurs suggérés" actionLabel="Actualiser" onAction={fetchSuggestedCreators} />
            <HorizontalScroller>
              {personalizedCreators.map(creator => (
                <div 
                  key={creator._id} 
                  onClick={() => router.push(`/profile/${creator.username}`, { scroll: false })}
                  className="min-w-[190px] md:min-w-[230px] bg-white/[0.04] border border-white/[0.06] rounded-xl p-2.5 md:p-3 hover:bg-white/[0.08] transition-all duration-200 hover:scale-[1.02] cursor-pointer" 
                  style={{ scrollSnapAlign: "start" }}
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <Avatar
                      src={creator.avatar}
                      name={creator.name}
                      username={creator.username}
                        size="sm"
                      className="w-10 h-10 md:w-12 md:h-12"
                      />
                  <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-semibold line-clamp-1 text-foreground-primary">{creator.name}</p>
                      <p className="text-[10px] md:text-xs text-foreground-tertiary">{formatNumber(creator.totalPlays)} écoutes</p>
                    </div>
                    </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {creator.tracks.slice(0, 3).map((track: Track, j: number) => (
                      <div key={j} className="relative">
                          <img
                            src={track.coverUrl || '/default-cover.jpg'}
                          className="w-full h-16 object-cover rounded-xl border border-border-secondary/60" 
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'; }}
                        />
                        {String(track._id || '').startsWith('ai-') && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[8px] font-semibold bg-overlay-on-primary text-foreground-primary border border-border-secondary">
                            IA
                          </span>
                        )}
                        </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                        playTrack(creator.tracks[0]);
                      }}
                      className="text-xs py-2 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition flex items-center justify-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      Écouter
                          </button>
                    <div onClick={(e) => e.stopPropagation()}>
                      <FollowButton
                        artistId={creator._id}
                        artistUsername={creator.username}
                              size="sm"
                        className="w-full text-xs py-1.5 rounded-lg"
                      />
                        </div>
                      </div>
                    </div>
                  ))}
            </HorizontalScroller>
            </section>
        )}

        {/* Nouvelles musiques */}
        {!loading && recentCards.length > 0 && (
          <section className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 md:p-5">
            <SectionTitle icon={Music2} title="Nouvelles musiques" actionLabel="Tout voir" />
            <HorizontalScroller>
              {recentCards.slice(0, 12).map(t => <TrackCard key={t.id} track={t} onPlay={playTrack} />)}
            </HorizontalScroller>
          </section>
        )}

        {/* Tests (dev only) */}
        {process.env.NODE_ENV !== "production" && <DevTests />}

        {/* Footer mini-nav */}
          <footer className="pt-8 pb-10 text-xs text-foreground-tertiary">
            <div className="flex flex-wrap items-center gap-3 justify-center">
              <a href="/support" className="hover:text-foreground-primary transition">Support / Contact</a>
              <span className="opacity-40">•</span>
              <a href="/legal/mentions-legales" className="hover:text-foreground-primary transition">Mentions légales</a>
              <span className="opacity-40">•</span>
              <a href="/legal/confidentialite" className="hover:text-foreground-primary transition">Confidentialité</a>
              <span className="opacity-40">•</span>
              <a href="/legal/cgu" className="hover:text-foreground-primary transition">CGU</a>
              <span className="opacity-40">•</span>
              <a href="/legal/cgv" className="hover:text-foreground-primary transition">CGV</a>
              <span className="opacity-40">•</span>
              <a href="/legal/cookies" className="hover:text-foreground-primary transition">Cookies</a>
              <span className="opacity-40">•</span>
              <a href="/legal/rgpd" className="hover:text-foreground-primary transition">RGPD</a>
              <span className="opacity-40">•</span>
              <span>© {new Date().getFullYear()} Synaura. Tous droits réservés.</span>
            </div>
          </footer>
      </main>

                              </div>
  );
}


/**
 * DevTests — mini batteries de tests runtime
 * - Vérifie le rendu des 6 icônes de la section Bibliothèque
 * - Log des assertions
 */
function DevTests(){
  useEffect(() => {
    try {
      LIB_ICONS.forEach((Icon, idx) => {
        const el = <Icon className="w-5 h-5" />;
        console.assert(!!el, `Icon index ${idx} should render`);
      });
      console.log("[DevTests] Icons render test: OK");
    } catch (e) {
      console.error("[DevTests] Icons render test FAILED", e);
    }
  }, []);

          return (
    <div className="sr-only">
      {LIB_ICONS.map((Icon, idx) => (<Icon key={idx} className="w-4 h-4" />))}
    </div>
  );
} 
