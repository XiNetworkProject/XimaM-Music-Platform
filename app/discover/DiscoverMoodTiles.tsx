'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Pause, Play } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import type { MoodConfig } from '@/lib/discoverMoods';
import type { DiscoverTrackLite } from './DiscoverPlayButton';

export type DiscoverArtistCardLite = {
  _id: string;
  username: string;
  name: string;
  avatar?: string | null;
  style?: string | null;
  track: DiscoverTrackLite | null;
};

export function MoodCard({
  mood,
  covers,
  onOpen,
  highlighted = false,
}: {
  mood: MoodConfig;
  covers: string[];
  onOpen: () => void;
  highlighted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex min-h-[152px] w-full flex-col justify-end overflow-hidden rounded-[14px] p-4 text-left shadow-[0_16px_42px_rgba(23,19,19,0.16)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(23,19,19,0.22)] sm:min-h-[180px] sm:rounded-[16px] sm:p-5"
      style={{
        background: `linear-gradient(150deg, ${mood.gradient[0]}, ${mood.gradient[1]})`,
        boxShadow: highlighted ? '0 0 0 2px #7357C6, 0 20px 60px rgba(23,19,19,0.16)' : undefined,
      }}
    >
      {highlighted ? (
        <span className="absolute left-4 top-4 z-10 inline-flex items-center rounded-[8px] bg-[#7357C6] px-2.5 py-1 text-[10px] font-black uppercase text-white">
          Pour toi
        </span>
      ) : null}
      {covers.length ? (
        <div className="absolute inset-0 grid grid-cols-2 opacity-40 saturate-[1.05]">
          {covers.slice(0, 4).map((cover, index) => (
            <img key={`${cover}-${index}`} src={cover} alt="" className="h-full w-full object-cover" />
          ))}
        </div>
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/22 to-black/10" />
      <div className="relative">
        <h3 className="text-xl font-black leading-tight text-white sm:text-2xl">{mood.label}</h3>
        <p className="mt-1.5 max-w-[90%] text-xs font-semibold leading-5 text-white/72 sm:text-sm">{mood.promise}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-white/85">
          Entrer
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

export function ArtistDiscoverCard({ artist }: { artist: DiscoverArtistCardLite }) {
  const { playTrack, pause, play, audioState } = useAudioPlayer();
  const currentId = audioState.tracks[audioState.currentTrackIndex]?._id;
  const isCurrentTrack = Boolean(artist.track) && currentId === artist.track?._id;
  const isPlayingThis = isCurrentTrack && audioState.isPlaying;

  return (
    <div className="min-w-[220px] max-w-[220px] shrink-0 overflow-hidden rounded-[14px] border border-[var(--syn-border)] bg-[var(--syn-surface)] p-4 shadow-[0_16px_45px_var(--syn-shadow)] sm:min-w-[240px] sm:max-w-[240px] sm:rounded-[16px]">
      <div className="flex items-center gap-3">
        {artist.avatar ? (
          <img src={artist.avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#7357C6]/70 via-[#D96D63]/60 to-[#4A9EAA]/60 text-lg font-black text-white">
            {(artist.name || artist.username || '?').slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[var(--syn-text-primary)]">{artist.name}</p>
          {artist.style ? <p className="truncate text-xs font-bold text-[var(--syn-text-secondary)]">{artist.style}</p> : null}
        </div>
      </div>

      {artist.track ? (
        <button
          type="button"
          onClick={() => {
            if (!artist.track?.audioUrl) return;
            if (isCurrentTrack) {
              audioState.isPlaying ? pause() : play();
            } else {
              playTrack(artist.track as any);
            }
          }}
          className="mt-3 flex w-full items-center gap-2.5 rounded-[10px] bg-[var(--syn-soft)] p-2 text-left transition hover:bg-[var(--syn-soft-strong)]"
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[8px] bg-[var(--syn-surface-muted)]">
            {artist.track.coverUrl ? <img src={artist.track.coverUrl} alt="" className="h-full w-full object-cover" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black text-[var(--syn-text-primary)]">{artist.track.title}</p>
          </div>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--syn-contrast-bg)] text-[var(--syn-contrast-text)]">
            {isPlayingThis ? <Pause className="h-3 w-3" /> : <Play className="ml-0.5 h-3 w-3 fill-current" />}
          </span>
        </button>
      ) : null}

      <Link
        href={`/profile/${encodeURIComponent(artist.username)}`}
        className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[9px] bg-[var(--syn-soft)] text-xs font-black text-[var(--syn-text-secondary)] transition hover:bg-[var(--syn-contrast-bg)] hover:text-[var(--syn-contrast-text)]"
      >
        Découvrir son univers
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
