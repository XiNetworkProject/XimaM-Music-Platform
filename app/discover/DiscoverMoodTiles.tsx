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
}: {
  mood: MoodConfig;
  covers: string[];
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex min-h-[220px] w-full flex-col justify-end overflow-hidden rounded-[1.8rem] p-5 text-left shadow-[0_20px_60px_rgba(23,19,19,0.16)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(23,19,19,0.24)] sm:min-h-[260px] sm:p-6"
      style={{ background: `linear-gradient(150deg, ${mood.gradient[0]}, ${mood.gradient[1]})` }}
    >
      {covers.length ? (
        <div className="absolute inset-0 grid grid-cols-2 opacity-40 saturate-[1.05]">
          {covers.slice(0, 4).map((cover, index) => (
            <img key={`${cover}-${index}`} src={cover} alt="" className="h-full w-full object-cover" />
          ))}
        </div>
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/22 to-black/10" />
      <div className="relative">
        <h3 className="text-2xl font-black leading-[0.98] tracking-[-0.03em] text-white sm:text-[1.9rem]">{mood.label}</h3>
        <p className="mt-2 max-w-[85%] text-sm font-semibold leading-6 text-white/72">{mood.promise}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-white/85">
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
    <div className="min-w-[220px] max-w-[220px] shrink-0 overflow-hidden rounded-[1.6rem] border border-black/[0.08] bg-[#fffaf2]/90 p-4 shadow-[0_16px_45px_rgba(30,25,20,0.08)] sm:min-w-[240px] sm:max-w-[240px]">
      <div className="flex items-center gap-3">
        {artist.avatar ? (
          <img src={artist.avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#7357C6]/70 via-[#D96D63]/60 to-[#4A9EAA]/60 text-lg font-black text-white">
            {(artist.name || artist.username || '?').slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#171313]">{artist.name}</p>
          {artist.style ? <p className="truncate text-xs font-bold text-black/42">{artist.style}</p> : null}
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
          className="mt-3 flex w-full items-center gap-2.5 rounded-[1.1rem] bg-black/[0.04] p-2 text-left transition hover:bg-black/[0.07]"
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[0.8rem] bg-[#171313]">
            {artist.track.coverUrl ? <img src={artist.track.coverUrl} alt="" className="h-full w-full object-cover" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black text-[#171313]">{artist.track.title}</p>
          </div>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#171313] text-white">
            {isPlayingThis ? <Pause className="h-3 w-3" /> : <Play className="ml-0.5 h-3 w-3 fill-current" />}
          </span>
        </button>
      ) : null}

      <Link
        href={`/profile/${encodeURIComponent(artist.username)}`}
        className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-black/[0.055] text-xs font-black text-black/60 transition hover:bg-[#171313] hover:text-white"
      >
        Découvrir son univers
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
