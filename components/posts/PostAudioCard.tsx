'use client';

import Link from 'next/link';
import { Maximize2, Pause, Play, Radio } from 'lucide-react';
import TrackCover from '@/components/TrackCover';

export type PostAudioTrack = {
  id: string;
  title: string;
  artist_name?: string;
  cover_url?: string | null;
  cover_video_url?: string | null;
  coverVideoUrl?: string | null;
  cover_video_poster_url?: string | null;
  coverVideoPosterUrl?: string | null;
  audio_url?: string | null;
  duration?: number | null;
};

function formatDuration(seconds?: number | null) {
  const safe = Math.max(0, Math.floor(Number(seconds || 0)));
  if (!safe) return '';
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function openFullPlayer() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('synaura:open-full-player'));
}

export default function PostAudioCard({
  track,
  playing = false,
  onPlay,
  compact = false,
}: {
  track: PostAudioTrack;
  playing?: boolean;
  onPlay: () => void;
  compact?: boolean;
}) {
  const duration = formatDuration(track.duration);
  const bars = [9, 18, 12, 24, 15, 20, 11, 26, 17, 13, 22, 10, 19, 14];

  return (
    <div className="overflow-hidden rounded-[1.45rem] bg-[#111111] text-white shadow-[0_18px_50px_rgba(17,17,17,0.18)]">
      <div className="relative">
        {track.cover_url ? (
          <div className="absolute inset-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={track.cover_url} alt="" className="h-full w-full scale-150 object-cover opacity-22 blur-2xl" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(17,17,17,0.50),rgba(17,17,17,0.90)),linear-gradient(160deg,rgba(115,87,198,0.22),transparent_42%),linear-gradient(0deg,rgba(74,158,170,0.16),transparent_34%)]" />
          </div>
        ) : null}

        <div className={`relative flex min-w-0 items-center gap-3 ${compact ? 'p-3' : 'p-4 sm:p-5'}`}>
          <Link href={`/track/${encodeURIComponent(track.id)}`} className={`${compact ? 'h-14 w-14 rounded-[1rem]' : 'h-20 w-20 rounded-[1.25rem]'} shrink-0 overflow-hidden bg-white/[0.08] shadow-[0_16px_36px_rgba(0,0,0,0.25)]`}>
            <TrackCover
              src={track.cover_url || '/default-cover.svg'}
              videoSrc={track.cover_video_url || track.coverVideoUrl || null}
              posterSrc={track.cover_video_poster_url || track.coverVideoPosterUrl || track.cover_url || null}
              title={track.title}
              className="h-full w-full"
              rounded="rounded-none"
              objectFit="cover"
            />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/52">
                <Radio className="h-3 w-3 text-[#4A9EAA]" />
                Son attaché
              </span>
              {duration ? <span className="text-[11px] font-black text-white/38">{duration}</span> : null}
            </div>
            <Link href={`/track/${encodeURIComponent(track.id)}`} className={`${compact ? 'mt-1 text-sm' : 'mt-2 text-lg sm:text-xl'} block truncate font-black text-white transition hover:text-white/82`}>
              {track.title}
            </Link>
            <p className="truncate text-xs font-bold text-white/50">{track.artist_name || 'Artiste Synaura'}</p>

            <div className="mt-3 flex h-7 items-center gap-1 rounded-full bg-white/[0.06] px-3">
              {bars.map((height, index) => (
                <span
                  key={index}
                  className="w-1 rounded-full bg-white/55 transition-all"
                  style={{ height: playing ? height : Math.max(5, Math.round(height * 0.42)) }}
                />
              ))}
              <span className="ml-auto text-[10px] font-black uppercase tracking-[0.14em] text-white/32">
                {playing ? 'En lecture' : 'Waveform'}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onPlay();
              }}
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#111111] shadow-[0_14px_30px_rgba(0,0,0,0.25)] transition hover:scale-105"
              aria-label={playing ? 'Pause' : `Lire ${track.title}`}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onPlay();
                window.setTimeout(openFullPlayer, 80);
              }}
              className="grid h-9 w-11 place-items-center rounded-full border border-white/12 bg-white/[0.07] text-white/62 transition hover:bg-white/[0.12] hover:text-white"
              aria-label="Ouvrir le lecteur complet"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

