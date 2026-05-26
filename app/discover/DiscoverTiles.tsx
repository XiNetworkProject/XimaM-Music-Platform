'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Disc3, Music, Pause, Play, Sparkles, Zap } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import { type DiscoverTrackLite } from './DiscoverPlayButton';
import TrackCover from '@/components/TrackCover';

export type DiscoverPlaylistLite = {
  _id: string;
  name: string;
  description?: string;
  coverUrl?: string | null;
};

export type DiscoverAlbumLite = {
  _id: string;
  name: string;
  description?: string;
  coverUrl?: string | null;
  trackCount?: number;
  duration?: number;
  genres?: string[];
  createdAt?: string;
  artist?: {
    _id: string;
    username: string;
    name: string;
    avatar?: string | null;
    isArtist?: boolean;
  };
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
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

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
  const actionClassName =
    'inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 text-[11px] font-black uppercase tracking-[0.12em] text-white/72 transition hover:bg-white hover:text-[#171313] sm:w-auto sm:text-xs sm:tracking-[0.16em]';

  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/38">Synaura edit</p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#fffaf2] sm:text-[1.4rem]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-white/45">{subtitle}</p> : null}
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className={actionClassName}>
          {actionLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ) : actionLabel && onAction ? (
        <button type="button" onClick={onAction} className={actionClassName}>
          {actionLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function HorizontalScroller({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 4);
    setShowRight(scrollLeft < scrollWidth - clientWidth - 8);
  };

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.82;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    handleScroll();
    node.addEventListener('scroll', handleScroll);
    return () => node.removeEventListener('scroll', handleScroll);
  }, [children]);

  const arrowClassName =
    'absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-[#fffaf2] text-[#171313] shadow-[0_16px_35px_rgba(0,0,0,0.28)] transition-all hover:scale-[1.03] group-hover:flex';

  return (
    <div className="group relative">
      {showLeft ? (
        <button type="button" onClick={() => scroll('left')} className={cx(arrowClassName, 'left-0')}>
          <ChevronLeft className="h-5 w-5" />
        </button>
      ) : null}

      <div
        ref={scrollRef}
        className="synaura-no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 pr-1 sm:gap-4"
        style={{ scrollSnapType: 'x mandatory' }}
        onScroll={handleScroll}
      >
        {children}
      </div>

      {showRight ? (
        <button type="button" onClick={() => scroll('right')} className={cx(arrowClassName, 'right-0')}>
          <ChevronRight className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}

export function TrackTile({ track, grid }: { track: DiscoverTrackLite; grid?: boolean }) {
  const { playTrack } = useAudioPlayer();
  const artistLabel = track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste';
  const plays = track.plays || 0;
  const duration = track.duration || 0;
  const durationLabel = duration > 0 ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}` : '';
  const genre = Array.isArray((track as any)?.genre) ? (track as any).genre[0] : (track as any)?.genre;
  const isBoosted = Boolean((track as any)?.isBoosted);
  const isAI = Boolean(track.isAI || String(track._id || '').startsWith('ai-'));

  return (
    <div
      className={cx(
        'group/card overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-2.5 transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.09] hover:shadow-[0_18px_40px_rgba(0,0,0,0.24)]',
        grid ? 'w-full' : 'min-w-[144px] max-w-[144px] shrink-0 sm:min-w-[208px] sm:max-w-[208px]',
      )}
      style={{ scrollSnapAlign: grid ? undefined : 'start' }}
    >
      <div className="relative overflow-hidden rounded-[1.3rem]">
        {isBoosted ? (
          <div
            className="pointer-events-none absolute inset-0 rounded-[1.3rem] opacity-85"
            style={{
              background:
                'linear-gradient(140deg, rgba(168,85,247,0.28) 0%, rgba(245,158,11,0.28) 45%, rgba(255,255,255,0.0) 100%)',
            }}
          />
        ) : null}

        <TrackCover
          src={track.coverUrl}
          title={track.title}
          className="aspect-square w-full"
          rounded="rounded-[1.3rem]"
          objectFit="cover"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {durationLabel ? (
            <span className="rounded-full bg-black/58 px-2 py-1 text-[10px] font-bold text-white/88 backdrop-blur-sm">
              {durationLabel}
            </span>
          ) : null}
          {genre ? (
            <span className="rounded-full border border-white/12 bg-black/38 px-2 py-1 text-[10px] font-bold text-white/62 backdrop-blur-sm">
              {genre}
            </span>
          ) : null}
        </div>

        <div className="absolute right-2 top-2 flex gap-1.5">
          {isAI ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/78 px-2 py-1 text-[10px] font-black text-white">
              <Sparkles className="h-3 w-3" />
              IA
            </span>
          ) : null}
          {isBoosted ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black text-white"
              style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.78), rgba(245,158,11,0.72))' }}
            >
              <Zap className="h-3 w-3" />
              Boost
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => track.audioUrl && playTrack(track as any)}
          className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#fffaf2] text-[#171313] shadow-[0_16px_35px_rgba(0,0,0,0.28)] transition duration-200 hover:scale-105 sm:h-11 sm:w-11"
        >
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </button>
      </div>

      <div className="mt-3">
        <p className="line-clamp-1 text-[15px] font-black tracking-[-0.03em] text-[#fffaf2]">{track.title}</p>
        <p className="mt-1 line-clamp-1 text-[12px] text-white/46">{artistLabel}</p>
      </div>

      <div className="mt-3 flex flex-col items-start gap-1.5 text-[10px] text-white/40 sm:flex-row sm:items-center sm:justify-between sm:text-[11px]">
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 font-semibold">{formatK(plays)} ecoutes</span>
        <span className="text-white/28">{isAI ? 'generation IA' : 'publie sur Synaura'}</span>
      </div>
    </div>
  );
}

export function TrackRow({ track, index }: { track: DiscoverTrackLite; index?: number }) {
  const { playTrack } = useAudioPlayer();
  const artistLabel = track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste';
  const isAI = Boolean(track.isAI || String(track._id || '').startsWith('ai-'));
  const isBoosted = Boolean((track as any)?.isBoosted);

  return (
    <div
      className="group/row flex items-start gap-3 rounded-[1.45rem] border border-white/10 bg-white/[0.04] px-3 py-2.5 transition duration-200 hover:bg-white/[0.08] sm:items-center"
      onClick={() => track.audioUrl && playTrack(track as any)}
    >
      {typeof index === 'number' ? (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.07] text-[11px] font-black text-white/52">
          {index + 1}
        </span>
      ) : null}

      <div className="relative shrink-0 overflow-hidden rounded-[1rem]">
        <TrackCover
          src={track.coverUrl}
          title={track.title}
          className="h-12 w-12"
          rounded="rounded-[1rem]"
          objectFit="cover"
        />
        <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover/row:opacity-100">
          <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-[14px] font-black tracking-[-0.03em] text-[#fffaf2]">{track.title}</p>
          {isAI ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/78 px-2 py-0.5 text-[9px] font-black text-white">
              <Sparkles className="h-2.5 w-2.5" />
              IA
            </span>
          ) : null}
          {isBoosted ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black text-white"
              style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.78), rgba(245,158,11,0.72))' }}
            >
              <Zap className="h-2.5 w-2.5" />
              Boost
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-white/42">{artistLabel}</p>
      </div>

      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-white/48">
          {formatK(track.plays || 0)} ecoutes
        </span>
      </div>
    </div>
  );
}

export function PlaylistTile({ playlist }: { playlist: DiscoverPlaylistLite }) {
  return (
    <Link
      href={`/playlists/${encodeURIComponent(playlist._id)}`}
      className="group/card min-w-[152px] max-w-[152px] shrink-0 overflow-hidden rounded-[1.55rem] border border-white/10 bg-white/[0.05] p-2.5 transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.09] sm:min-w-[208px] sm:max-w-[208px] sm:rounded-[1.75rem]"
      style={{ scrollSnapAlign: 'start' }}
    >
      <div className="relative overflow-hidden rounded-[1.3rem]">
        <img
          src={playlist.coverUrl || '/default-cover.svg'}
          alt={playlist.name}
          className="aspect-square w-full object-cover transition duration-300 group-hover/card:scale-[1.03]"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/default-cover.svg';
          }}
        />
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-black text-white/82 backdrop-blur-sm">
          Playlist
        </span>
      </div>
      <div className="mt-3">
        <p className="line-clamp-1 text-[15px] font-black tracking-[-0.03em] text-[#fffaf2]">{playlist.name}</p>
        <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-white/42">
          {playlist.description || 'Selection construite pour prolonger l’ambiance.'}
        </p>
      </div>
    </Link>
  );
}

export function ArtistTile({ artist }: { artist: DiscoverArtistLite }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/profile/${encodeURIComponent(artist.username)}`}
      className="group/card min-w-[126px] max-w-[126px] shrink-0 rounded-[1.55rem] border border-white/10 bg-white/[0.05] p-2.5 text-center transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.09] sm:min-w-[160px] sm:max-w-[160px] sm:rounded-[1.75rem] sm:p-3"
      style={{ scrollSnapAlign: 'start' }}
    >
      {artist.avatar && !imgError ? (
        <img
          src={artist.avatar}
          alt={artist.name}
          className="mx-auto h-16 w-16 rounded-full border-2 border-white/12 object-cover transition duration-200 group-hover/card:border-white/26 sm:h-20 sm:w-20"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/12 bg-gradient-to-br from-[#ff6f61]/72 via-[#7c5cff]/58 to-[#00c2cb]/50 text-xl font-black text-white sm:h-20 sm:w-20">
          {(artist.name || artist.username || '?')[0].toUpperCase()}
        </div>
      )}

      <p className="mt-3 truncate text-[14px] font-black tracking-[-0.03em] text-[#fffaf2]">{artist.name}</p>
      <p className="mt-1 truncate text-[11px] text-white/38">
        {typeof artist.trackCount === 'number' ? `${artist.trackCount} titres` : `@${artist.username}`}
      </p>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-white/44">
        {artist.isTrending ? <span className="rounded-full bg-white/[0.06] px-2 py-1 font-semibold">hot</span> : null}
        {typeof artist.totalPlays === 'number' ? (
          <span className="rounded-full bg-white/[0.06] px-2 py-1 font-semibold">{formatK(artist.totalPlays)} plays</span>
        ) : null}
      </div>
    </Link>
  );
}

const GENRE_COLORS: Record<string, string> = {
  pop: 'from-pink-500 to-rose-600',
  'hip-hop': 'from-amber-500 to-orange-600',
  rap: 'from-amber-500 to-orange-600',
  rock: 'from-red-500 to-red-700',
  electronic: 'from-cyan-400 to-blue-600',
  'r&b': 'from-purple-500 to-violet-700',
  jazz: 'from-yellow-500 to-amber-700',
  'lo-fi': 'from-teal-400 to-emerald-600',
  classical: 'from-slate-400 to-slate-600',
  indie: 'from-emerald-400 to-green-600',
  soul: 'from-orange-400 to-red-500',
  funk: 'from-fuchsia-500 to-pink-600',
  ambient: 'from-sky-400 to-indigo-500',
  metal: 'from-zinc-500 to-zinc-800',
  country: 'from-yellow-600 to-amber-800',
  reggae: 'from-green-500 to-emerald-700',
  latin: 'from-red-400 to-orange-500',
  afro: 'from-amber-400 to-yellow-600',
};

export function AlbumTile({ album }: { album: DiscoverAlbumLite }) {
  const router = useRouter();
  const { audioState, albumContext } = useAudioPlayer();

  const formatAlbumDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h${minutes}` : `${minutes} min`;
  };

  const isThisAlbum = albumContext?.id === album._id;
  const isPlaying = isThisAlbum && audioState.isPlaying;

  return (
    <Link
      href={`/album/${album._id}`}
      className="group/album min-w-[148px] max-w-[148px] shrink-0 rounded-[1.55rem] border border-white/10 bg-white/[0.05] p-2.5 transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.09] sm:min-w-[188px] sm:max-w-[188px] sm:rounded-[1.75rem]"
      style={{ scrollSnapAlign: 'start' }}
    >
      <div className="relative overflow-hidden rounded-[1.3rem]">
        {album.coverUrl ? (
          <img src={album.coverUrl} alt={album.name} className="aspect-square w-full object-cover transition duration-300 group-hover/album:scale-[1.03]" />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-violet-500/28 to-fuchsia-500/22">
            <Disc3 className="h-10 w-10 text-white/22" />
          </div>
        )}

        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-black text-white/82 backdrop-blur-sm">
          <Disc3 className="h-3 w-3" />
          Album
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`/album/${album._id}`);
          }}
          className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#fffaf2] text-[#171313] shadow-[0_16px_35px_rgba(0,0,0,0.28)] transition duration-200 hover:scale-105 sm:h-11 sm:w-11"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
        </button>

        {isThisAlbum ? (
          <div className="absolute right-3 top-3 flex items-end gap-0.5">
            <span className="h-3 w-1 rounded-full bg-[#fffaf2] animate-pulse" />
            <span className="h-5 w-1 rounded-full bg-[#fffaf2] animate-pulse" style={{ animationDelay: '120ms' }} />
            <span className="h-2 w-1 rounded-full bg-[#fffaf2] animate-pulse" style={{ animationDelay: '240ms' }} />
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        <p className="line-clamp-1 text-[15px] font-black tracking-[-0.03em] text-[#fffaf2]">{album.name}</p>
        <p className="mt-1 line-clamp-1 text-[12px] text-white/42">{album.artist?.name || 'Artiste'}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-white/44">
        {album.trackCount ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 font-semibold">
            <Music className="h-3 w-3" />
            {album.trackCount}
          </span>
        ) : null}
        {album.duration ? (
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 font-semibold">{formatAlbumDuration(album.duration)}</span>
        ) : null}
      </div>
    </Link>
  );
}

export function GenreCard({ genre, onClick }: { genre: string; onClick?: () => void }) {
  const gradient = GENRE_COLORS[genre.toLowerCase()] || 'from-indigo-500 to-violet-600';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'group/genre relative aspect-[4/3] w-full overflow-hidden rounded-[1.7rem] bg-gradient-to-br',
        gradient,
        'transition duration-200 hover:scale-[1.02] hover:shadow-[0_20px_40px_rgba(0,0,0,0.24)] active:scale-[0.985]',
      )}
    >
      <div className="absolute inset-0 bg-black/12 transition group-hover/genre:bg-black/0" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" />
      <div className="absolute bottom-4 left-4">
        <span className="text-base font-black tracking-[-0.03em] text-white drop-shadow-lg">{genre}</span>
      </div>
    </button>
  );
}
