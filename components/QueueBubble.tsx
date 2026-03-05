'use client';

import React, { useMemo } from 'react';
import { ListMusic } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';

type Props = {
  onClick: () => void;
  className?: string;
  variant?: 'bubble' | 'pill';
};

export default function QueueBubble({ onClick, className = '', variant = 'bubble' }: Props) {
  const { audioState, upNextTracks, upNextEnabled } = useAudioPlayer();

  const count = useMemo(() => {
    return Math.max(0, Array.isArray(upNextTracks) ? upNextTracks.length : 0);
  }, [upNextTracks]);

  if (!upNextEnabled && count <= 0) return null;

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] px-3 py-2 text-xs text-white/60 hover:bg-white/[0.1] hover:text-white transition ${className}`}
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
      className={`fixed right-4 z-[400] pointer-events-auto rounded-full bg-[#0f0f17]/90 border border-white/[0.08] backdrop-blur-xl shadow-2xl shadow-black/40 hover:bg-[#0f0f17] hover:border-white/[0.12] transition-all h-12 w-12 sm:w-auto sm:px-4 flex items-center justify-center sm:justify-start gap-2 group ${className}`}
      style={{
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${audioState.showPlayer ? '9rem' : '5.5rem'})`,
      }}
      aria-label="À suivre"
    >
      <ListMusic className="h-5 w-5 text-white/50 group-hover:text-white/80 transition" />
      <span className="hidden sm:inline text-sm text-white/70 group-hover:text-white transition">À suivre</span>
      {count > 0 && (
        <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums shadow-lg shadow-indigo-500/30">
          {count}
        </span>
      )}
    </button>
  );
}
