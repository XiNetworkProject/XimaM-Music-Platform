'use client';

import React from 'react';
import { Play } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import { notify } from '@/components/NotificationCenter';

export type DiscoverTrackLite = {
  _id: string;
  title: string;
  coverUrl?: string;
  audioUrl?: string;
  artist?: {
    _id?: string;
    username?: string;
    name?: string;
    artistName?: string;
    avatar?: string;
    isArtist?: boolean;
  };
  duration?: number;
  plays?: number;
  isAI?: boolean;
};

export default function DiscoverPlayButton({
  track,
  compact,
  className,
  label,
}: {
  track: DiscoverTrackLite;
  compact?: boolean;
  className?: string;
  label?: string;
}) {
  const { playTrack } = useAudioPlayer();

  return (
    <button
      type="button"
      className={
        className ||
        `h-9 px-3 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition inline-flex items-center gap-2 ${
          compact ? 'text-xs font-semibold' : 'text-sm font-semibold'
        }`
      }
      onClick={() => {
        try {
          if (!track.audioUrl) {
            notify.error('Lecture', "Cette piste n'a pas d'audio disponible.");
            return;
          }
          // "Continue listening" (local)
          try {
            const key = 'discover.recentTracks';
            const raw = localStorage.getItem(key);
            const prev = raw ? (JSON.parse(raw) as DiscoverTrackLite[]) : [];
            const next = [track, ...(Array.isArray(prev) ? prev : [])]
              .filter((t, idx, arr) => t?._id && arr.findIndex((x) => x?._id === t._id) === idx)
              .slice(0, 24);
            localStorage.setItem(key, JSON.stringify(next));
          } catch {}
          playTrack(track as any);
        } catch {
          notify.error('Lecture', 'Impossible de lancer la lecture.');
        }
      }}
      aria-label={`Lire ${track.title}`}
    >
      <Play className="h-4 w-4" />
      {compact ? null : label || 'Lire'}
    </button>
  );
}

