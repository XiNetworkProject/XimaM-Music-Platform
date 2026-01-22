'use client';

import React, { useMemo } from 'react';
import { ListMusic } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';

type Props = {
  onClick: () => void;
  className?: string;
  variant?: 'bubble' | 'pill';
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export default function QueueBubble({ onClick, className = '', variant = 'bubble' }: Props) {
  const { audioState } = useAudioPlayer();

  const count = useMemo(() => {
    const idx = Math.max(0, audioState.currentTrackIndex || 0);
    const len = Array.isArray(audioState.tracks) ? audioState.tracks.length : 0;
    return Math.max(0, len - idx - 1);
  }, [audioState.currentTrackIndex, audioState.tracks]);

  if (count <= 0) return null;

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cx(
          'inline-flex items-center gap-2 rounded-full border border-border-secondary bg-background-fog-thin px-3 py-2 text-xs text-foreground-secondary hover:bg-overlay-on-primary transition',
          className,
        )}
        aria-label="À suivre"
      >
        <ListMusic className="h-4 w-4" />
        <span>À suivre</span>
        <span className="ml-1 inline-flex min-w-[1.5rem] justify-center rounded-full bg-overlay-on-primary/40 px-2 py-0.5 text-[11px] text-foreground-primary tabular-nums">
          {count}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'fixed right-4 z-[250] rounded-full border border-border-secondary bg-background-tertiary/80 backdrop-blur-xl shadow-xl hover:bg-overlay-on-primary transition',
        'h-12 px-4 flex items-center gap-2',
        className,
      )}
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 7.25rem)' }}
      aria-label="À suivre"
    >
      <ListMusic className="h-5 w-5 text-foreground-secondary" />
      <span className="text-sm text-foreground-primary">À suivre</span>
      <span className="inline-flex min-w-[1.5rem] justify-center rounded-full bg-overlay-on-primary/40 px-2 py-0.5 text-[11px] text-foreground-primary tabular-nums">
        {count}
      </span>
    </button>
  );
}

