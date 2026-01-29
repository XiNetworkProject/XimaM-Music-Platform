'use client';

import { useMemo } from 'react';
import { Pause, Play, SkipBack, SkipForward, Sparkles, Activity } from 'lucide-react';

function fmtTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export default function TransportBar({
  currentTrackTitle,
  isPlaying,
  onPlayPause,
  onPrev,
  onNext,
  creditsBalance,
  quotaRemaining,
  runningJobsCount,
  onOpenBuyCredits,
}: {
  currentTrackTitle: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  creditsBalance: number;
  quotaRemaining: number | null;
  runningJobsCount: number;
  onOpenBuyCredits: () => void;
}) {
  const quotaLabel = useMemo(() => {
    if (quotaRemaining == null) return null;
    return `${quotaRemaining} restant`;
  }, [quotaRemaining]);

  return (
    <div className="sticky top-0 z-30 border-b border-border-secondary bg-black/40 backdrop-blur-xl">
      <div className="h-14 px-3 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="h-9 w-9 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
            onClick={onPrev}
            aria-label="Previous"
            title="Previous (J)"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="h-9 w-11 rounded-xl border border-border-secondary bg-white/10 hover:bg-white/15 transition flex items-center justify-center"
            onClick={onPlayPause}
            aria-label="Play/Pause"
            title="Play/Pause (Space / K)"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-[1px]" />}
          </button>
          <button
            type="button"
            className="h-9 w-9 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
            onClick={onNext}
            aria-label="Next"
            title="Next (L)"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[12px] text-foreground-tertiary">TRANSPORT</div>
          <div className="text-[13px] text-foreground-primary truncate">
            {currentTrackTitle ? currentTrackTitle : 'Aucune lecture'}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <div className="px-2 py-1 rounded-xl border border-border-secondary bg-white/5 text-[12px] text-foreground-secondary">
            <span className="text-foreground-tertiary">Crédits:</span>{' '}
            <span className="font-semibold text-foreground-primary">{creditsBalance.toLocaleString()}</span>
          </div>
          {quotaLabel ? (
            <div className="px-2 py-1 rounded-xl border border-border-secondary bg-white/5 text-[12px] text-foreground-secondary">
              <span className="text-foreground-tertiary">Quota:</span>{' '}
              <span className="font-semibold text-foreground-primary">{quotaLabel}</span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onOpenBuyCredits}
            className="h-9 px-3 rounded-xl border border-border-secondary bg-white text-black font-semibold hover:opacity-90 transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Acheter
          </button>
          <div className="h-9 px-3 rounded-xl border border-border-secondary bg-white/5 text-[12px] text-foreground-secondary flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-300" />
            {runningJobsCount} job{runningJobsCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>
    </div>
  );
}

