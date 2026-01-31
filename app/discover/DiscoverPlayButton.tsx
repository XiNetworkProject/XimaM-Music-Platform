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

export default function DiscoverPlayButton({ track }: { track: DiscoverTrackLite }) {
  const { playTrack } = useAudioPlayer();

  return (
    <button
      type="button"
      className="h-9 px-3 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition inline-flex items-center gap-2 text-sm font-semibold"
      onClick={() => {
        try {
          if (!track.audioUrl) {
            notify.error('Lecture', "Cette piste n'a pas d'audio disponible.");
            return;
          }
          playTrack(track as any);
        } catch {
          notify.error('Lecture', 'Impossible de lancer la lecture.');
        }
      }}
      aria-label={`Lire ${track.title}`}
    >
      <Play className="h-4 w-4" />
      Lire
    </button>
  );
}

