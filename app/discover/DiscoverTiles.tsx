'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DiscoverPlayButton, { type DiscoverTrackLite } from './DiscoverPlayButton';

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

export function SectionHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
}: {
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="text-lg md:text-xl font-bold tracking-tight">{title}</div>
        {subtitle ? <div className="text-xs md:text-sm text-foreground-tertiary mt-1">{subtitle}</div> : null}
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="text-sm text-foreground-secondary hover:text-foreground-primary transition shrink-0">
          {actionLabel} →
        </Link>
      ) : null}
    </div>
  );
}

export function HorizontalScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setCanLeft(el.scrollLeft > 8);
      setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update as any);
      window.removeEventListener('resize', update);
    };
  }, []);

  const scrollBy = (dir: 'left' | 'right') => {
    const el = ref.current;
    if (!el) return;
    const dx = Math.max(260, Math.floor(el.clientWidth * 0.7)) * (dir === 'left' ? -1 : 1);
    el.scrollBy({ left: dx, behavior: 'smooth' });
  };

  return (
    <div className="relative group">
      {canLeft ? (
        <button
          type="button"
          onClick={() => scrollBy('left')}
          className="hidden md:grid absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 place-items-center rounded-full border border-border-secondary bg-background-tertiary/80 backdrop-blur opacity-0 group-hover:opacity-100 transition"
          aria-label="Défiler à gauche"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      ) : null}

      <div ref={ref} className="flex gap-3 overflow-x-auto no-scrollbar pb-1 pr-1" style={{ scrollSnapType: 'x mandatory' }}>
        {children}
      </div>

      {canRight ? (
        <button
          type="button"
          onClick={() => scrollBy('right')}
          className="hidden md:grid absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 place-items-center rounded-full border border-border-secondary bg-background-tertiary/80 backdrop-blur opacity-0 group-hover:opacity-100 transition"
          aria-label="Défiler à droite"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}

export function TrackTile({ track }: { track: DiscoverTrackLite }) {
  const artistLabel =
    track.artist?.artistName || track.artist?.name || track.artist?.username || (track.isAI ? 'Créateur IA' : 'Artiste');

  return (
    <div
      className="w-[170px] md:w-[190px] lg:w-[210px] shrink-0 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition p-2"
      style={{ scrollSnapAlign: 'start' }}
    >
      <div className="relative">
        <img
          src={track.coverUrl || '/default-cover.jpg'}
          alt=""
          className="w-full aspect-square object-cover rounded-xl border border-border-secondary/60"
          loading="lazy"
        />
        <div className="absolute bottom-2 right-2">
          <DiscoverPlayButton
            track={track}
            compact
            className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-tertiary/80 hover:bg-background-tertiary backdrop-blur grid place-items-center"
          />
        </div>
      </div>
      <div className="mt-2 min-w-0">
        <div className="text-sm font-semibold truncate">{track.title}</div>
        <div className="text-xs text-foreground-tertiary truncate">{artistLabel}</div>
      </div>
    </div>
  );
}

export function TrackRow({ track }: { track: DiscoverTrackLite }) {
  const artistLabel =
    track.artist?.artistName || track.artist?.name || track.artist?.username || (track.isAI ? 'Créateur IA' : 'Artiste');

  return (
    <div className="rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition p-3 flex items-center gap-3">
      <img
        src={track.coverUrl || '/default-cover.jpg'}
        className="w-12 h-12 rounded-xl object-cover border border-border-secondary"
        alt=""
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{track.title}</div>
        <div className="text-xs text-foreground-tertiary truncate">{artistLabel}</div>
      </div>
      <DiscoverPlayButton
        track={track}
        compact
        className="h-10 w-10 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition grid place-items-center"
      />
    </div>
  );
}

export function PlaylistTile({ playlist }: { playlist: DiscoverPlaylistLite }) {
  return (
    <Link
      href={`/playlists/${encodeURIComponent(playlist._id)}`}
      className="w-[220px] md:w-[240px] lg:w-[260px] shrink-0 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition p-3 flex gap-3"
      style={{ scrollSnapAlign: 'start' }}
    >
      <img
        src={playlist.coverUrl || '/default-cover.jpg'}
        className="w-14 h-14 rounded-xl object-cover border border-border-secondary"
        alt=""
        loading="lazy"
      />
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{playlist.name}</div>
        <div className="text-xs text-foreground-tertiary line-clamp-2">{playlist.description || 'Playlist'}</div>
      </div>
    </Link>
  );
}

export function ArtistTile({ artist }: { artist: DiscoverArtistLite }) {
  return (
    <Link
      href={`/profile/${encodeURIComponent(artist.username)}`}
      className="w-[160px] md:w-[180px] shrink-0 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition p-3"
      style={{ scrollSnapAlign: 'start' }}
    >
      <div className="flex items-center gap-3">
        <img
          src={artist.avatar || '/default-avatar.png'}
          className="w-12 h-12 rounded-full object-cover border border-border-secondary"
          alt=""
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/default-avatar.png';
          }}
        />
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{artist.name}</div>
          <div className="text-xs text-foreground-tertiary truncate">@{artist.username}</div>
        </div>
      </div>
      <div className="mt-2 text-xs text-foreground-tertiary">
        {typeof artist.trackCount === 'number' ? `${artist.trackCount} tracks` : 'Artiste'}
      </div>
    </Link>
  );
}

