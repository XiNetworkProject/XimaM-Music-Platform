'use client';

import React, { useMemo } from 'react';
import { ListMusic } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';

type Props = {
  onClick: () => void;
  className?: string;
  variant?: 'bubble' | 'pill' | 'icon';
};

export default function QueueBubble({ onClick, className = '', variant = 'bubble' }: Props) {
  const { audioState, upNextTracks, upNextEnabled } = useAudioPlayer();

  const count = useMemo(() => {
    return Math.max(0, Array.isArray(upNextTracks) ? upNextTracks.length : 0);
  }, [upNextTracks]);

  if (!upNextEnabled && count <= 0 && variant !== 'icon') return null;

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-black/32 text-white/70 backdrop-blur-xl transition hover:bg-black/48 hover:text-white ${className}`}
        aria-label="File d’attente"
      >
        <ListMusic className="h-5 w-5" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[1.2rem] justify-center rounded-full bg-[#ff6f61] px-1.5 py-0.5 text-[10px] font-black text-white tabular-nums">
            {count}
          </span>
        ) : null}
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.08] px-3 py-2 text-xs font-black text-white/70 transition hover:bg-white/[0.13] hover:text-white ${className}`}
        aria-label="À suivre"
      >
        <ListMusic className="h-4 w-4" />
        <span>À suivre</span>
        {count > 0 && (
          <span className="ml-0.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-indigo-500/80 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed right-4 z-[400] pointer-events-auto flex h-12 w-12 items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-[#fffaf2]/94 text-[#171313] shadow-[0_18px_46px_rgba(44,33,19,0.2)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white sm:w-auto sm:px-4 sm:justify-start group ${className}`}
      style={{
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${audioState.showPlayer ? '9rem' : '5.5rem'})`,
      }}
      aria-label="À suivre"
    >
      <ListMusic className="h-5 w-5 text-[#171313]/70 transition group-hover:text-[#171313]" />
      <span className="hidden text-sm font-black text-[#171313]/70 transition group-hover:text-[#171313] sm:inline">File</span>
      {count > 0 && (
        <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-[#ff6f61] px-1.5 py-0.5 text-[10px] font-black text-white tabular-nums shadow-lg shadow-[#ff6f61]/25">
          {count}
        </span>
      )}
    </button>
  );
}
