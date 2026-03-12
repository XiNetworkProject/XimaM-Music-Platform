'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Play, Sparkles, Zap } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import { type DiscoverTrackLite } from './DiscoverPlayButton';
import TrackCover from '@/components/TrackCover';

export type DiscoverPlaylistLite = {
  _id: string;
  name: string;
  description?: string;
  coverUrl?: string | null;
};

export type DiscoverArtistLite = {
  _id: string;
  username: string;
  name: string;
  avatar?: string;
  totalPlays?: number;
  totalLikes?: number;
  trackCount?: number;
  isTrending?: boolean;
};

const formatK = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};

/* ─── Section Title ─── */
export function SectionHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="min-w-0">
        <h2 className="text-base font-black text-white">{title}</h2>
        {subtitle && <p className="text-[11px] text-white/30 mt-0.5">{subtitle}</p>}
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="text-xs font-semibold text-white/40 hover:text-white transition">
          {actionLabel} &rsaquo;
        </Link>
      ) : actionLabel && onAction ? (
        <button onClick={onAction} className="text-xs font-semibold text-white/40 hover:text-white transition">
          {actionLabel} &rsaquo;
        </button>
      ) : null}
    </div>
  );
}

/* ─── Horizontal Scroller (homepage style) ─── */
export function HorizontalScroller({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeft(scrollLeft > 0);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      handleScroll();
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [children]);

  return (
    <div className="relative group">
      {showLeft && (
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 border border-white/10 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm shadow-lg"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto no-scrollbar pb-2 pr-1 -mx-1"
        style={{ scrollSnapType: 'x mandatory' }}
        onScroll={handleScroll}
      >
        {children}
      </div>
      {showRight && (
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 border border-white/10 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm shadow-lg"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      )}
    </div>
  );
}

/* ─── Track Card (homepage style) ─── */
export function TrackTile({ track, grid }: { track: DiscoverTrackLite; grid?: boolean }) {
  const { playTrack } = useAudioPlayer();
  const artistLabel = track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste';
  const plays = track.plays || 0;
  const dur = track.duration || 0;
  const durStr = dur > 0 ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}` : '';
  const genre = Array.isArray((track as any)?.genre) ? (track as any).genre[0] : (track as any)?.genre;

  const handlePlay = () => {
    if (track.audioUrl) {
      playTrack(track as any);
    }
  };

  const isBoosted = Boolean((track as any)?.isBoosted);
  const isAI = Boolean(track.isAI || String(track._id || '').startsWith('ai-'));

  return (
    <div
      className={`rounded-xl p-2 hover:bg-white/[0.06] transition-all duration-200 group/card ${grid ? 'w-full' : 'min-w-[160px] md:min-w-[200px] max-w-[160px] md:max-w-[200px] shrink-0'}`}
      style={{ scrollSnapAlign: grid ? undefined : 'start' }}
    >
      <div className="relative group/cover">
        {isBoosted && (
          <div className="absolute -inset-[2px] rounded-lg z-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.45), rgba(245,158,11,0.35), rgba(236,72,153,0.35))', filter: 'blur(5px)', animation: 'boost-halo-pulse 3s ease-in-out infinite' }} />
        )}
        <TrackCover
          src={track.coverUrl}
          title={track.title}
          className={`w-full aspect-square rounded-lg ${isBoosted ? 'relative z-[1]' : ''}`}
          rounded="rounded-lg"
          objectFit="cover"
        />
        {durStr && (
          <span className={`absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-semibold text-white tabular-nums backdrop-blur-sm ${isBoosted ? 'z-[2]' : ''}`}>
            {durStr}
          </span>
        )}
        {isAI && (
          <span className={`absolute top-2 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/70 backdrop-blur-sm text-[8px] font-bold text-white border border-violet-400/30 ${isBoosted ? 'z-[2]' : ''}`}>
            <Sparkles className="w-2.5 h-2.5" /> IA
          </span>
        )}
        {isBoosted && !isAI && (
          <div className="absolute z-[2] top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-violet-400/30" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.5), rgba(245,158,11,0.4))', backdropFilter: 'blur(8px)' }}>
            <Zap className="w-2.5 h-2.5 text-amber-300" style={{ fill: 'rgba(245,158,11,0.4)' }} />
            <span className="text-[8px] font-bold text-white">Boosted</span>
          </div>
        )}
        <button
          onClick={handlePlay}
          className={`absolute bottom-2 right-2 w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-all shadow-lg shadow-indigo-500/30 hover:scale-110 ${isBoosted ? 'z-[2]' : ''}`}
        >
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </button>
      </div>

      <div className="mt-2">
        <p className="text-[13px] font-semibold line-clamp-1 text-white">{track.title}</p>
        {genre && <p className="text-[10px] text-white/30 truncate mt-0.5">{genre}</p>}
      </div>

      <div className="mt-1.5 flex items-center gap-2.5 text-[10px] text-white/35">
        <span className="flex items-center gap-0.5">&#9654; {formatK(plays)}</span>
      </div>

      {track.artist && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <img
            src={track.artist.avatar || '/default-avatar.png'}
            className="w-4 h-4 rounded-full object-cover shrink-0"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.png'; }}
            alt=""
          />
          <span className="text-[11px] text-white/40 truncate">{artistLabel}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Track Row (compact list item) ─── */
export function TrackRow({ track, index }: { track: DiscoverTrackLite; index?: number }) {
  const { playTrack } = useAudioPlayer();
  const artistLabel = track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste';
  const isAI = Boolean(track.isAI || String(track._id || '').startsWith('ai-'));
  const isBoosted = Boolean((track as any)?.isBoosted);

  return (
    <div
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.06] transition-all group/row cursor-pointer"
      onClick={() => track.audioUrl && playTrack(track as any)}
    >
      {typeof index === 'number' && (
        <span className="w-5 text-center text-xs font-semibold text-white/25 tabular-nums shrink-0">
          {index + 1}
        </span>
      )}
      <div className="relative shrink-0">
        <TrackCover
          src={track.coverUrl}
          title={track.title}
          className="w-11 h-11"
          rounded="rounded-md"
          objectFit="cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md opacity-0 group-hover/row:opacity-100 transition-opacity">
          <Play className="w-4 h-4 text-white fill-white" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold truncate text-white">{track.title}</p>
          {isAI && (
            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/60 text-[7px] font-bold text-white">
              <Sparkles className="w-2 h-2" /> IA
            </span>
          )}
          {isBoosted && (
            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-bold text-white" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.5), rgba(245,158,11,0.4))' }}>
              <Zap className="w-2 h-2 text-amber-300" /> Boosted
            </span>
          )}
        </div>
        <p className="text-[11px] text-white/40 truncate">{artistLabel}</p>
      </div>
      <span className="text-[11px] text-white/25 tabular-nums shrink-0">
        {formatK(track.plays || 0)}
      </span>
    </div>
  );
}

/* ─── Playlist Tile ─── */
export function PlaylistTile({ playlist }: { playlist: DiscoverPlaylistLite }) {
  return (
    <Link
      href={`/playlists/${encodeURIComponent(playlist._id)}`}
      className="min-w-[200px] md:min-w-[240px] max-w-[200px] md:max-w-[240px] rounded-xl p-2 hover:bg-white/[0.06] transition-all group/card shrink-0"
      style={{ scrollSnapAlign: 'start' }}
    >
      <img
        src={playlist.coverUrl || '/default-cover.svg'}
        alt={playlist.name}
        className="w-full aspect-square object-cover rounded-lg"
        loading="lazy"
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.svg'; }}
      />
      <div className="mt-2">
        <p className="text-[13px] font-semibold line-clamp-1 text-white">{playlist.name}</p>
        <p className="text-[11px] text-white/40 line-clamp-1">{playlist.description || 'Playlist'}</p>
      </div>
    </Link>
  );
}

/* ─── Artist Tile ─── */
export function ArtistTile({ artist }: { artist: DiscoverArtistLite }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/profile/${encodeURIComponent(artist.username)}`}
      className="min-w-[140px] md:min-w-[160px] max-w-[140px] md:max-w-[160px] rounded-xl p-3 hover:bg-white/[0.06] transition-all group/card text-center shrink-0"
      style={{ scrollSnapAlign: 'start' }}
    >
      {artist.avatar && !imgError ? (
        <img
          src={artist.avatar}
          alt={artist.name}
          className="w-20 h-20 rounded-full object-cover mx-auto border-2 border-white/10 group-hover/card:border-indigo-500/50 transition-colors"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/40 to-violet-500/30 mx-auto border-2 border-white/10 flex items-center justify-center text-lg font-bold text-white">
          {(artist.name || artist.username || '?')[0].toUpperCase()}
        </div>
      )}
      <p className="mt-2 text-[13px] font-semibold text-white truncate">{artist.name}</p>
      <p className="text-[10px] text-white/30">
        {typeof artist.trackCount === 'number' ? `${artist.trackCount} titres` : '@' + artist.username}
      </p>
    </Link>
  );
}

/* ─── Genre Card ─── */
const GENRE_COLORS: Record<string, string> = {
  'pop': 'from-pink-500 to-rose-600',
  'hip-hop': 'from-amber-500 to-orange-600',
  'rap': 'from-amber-500 to-orange-600',
  'rock': 'from-red-500 to-red-700',
  'electronic': 'from-cyan-400 to-blue-600',
  'r&b': 'from-purple-500 to-violet-700',
  'jazz': 'from-yellow-500 to-amber-700',
  'lo-fi': 'from-teal-400 to-emerald-600',
  'classical': 'from-slate-400 to-slate-600',
  'indie': 'from-emerald-400 to-green-600',
  'soul': 'from-orange-400 to-red-500',
  'funk': 'from-fuchsia-500 to-pink-600',
  'ambient': 'from-sky-400 to-indigo-500',
  'metal': 'from-zinc-500 to-zinc-800',
  'country': 'from-yellow-600 to-amber-800',
  'reggae': 'from-green-500 to-emerald-700',
  'latin': 'from-red-400 to-orange-500',
  'afro': 'from-amber-400 to-yellow-600',
};

export function GenreCard({ genre, onClick }: { genre: string; onClick?: () => void }) {
  const gradient = GENRE_COLORS[genre.toLowerCase()] || 'from-indigo-500 to-violet-600';

  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl aspect-[4/3] md:aspect-square w-full bg-gradient-to-br ${gradient} group/genre transition-all hover:scale-[1.03] hover:shadow-xl active:scale-[0.97]`}
    >
      <div className="absolute inset-0 bg-black/10 group-hover/genre:bg-black/0 transition-colors" />
      <div className="absolute bottom-3 left-3">
        <span className="text-sm md:text-base font-black text-white drop-shadow-lg">{genre}</span>
      </div>
    </button>
  );
}
