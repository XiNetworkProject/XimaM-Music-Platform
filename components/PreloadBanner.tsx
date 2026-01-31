'use client';

import React, { useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';

export default function PreloadBanner({
  isLoading,
  progress,
  currentTask,
  error,
}: {
  isLoading: boolean;
  progress: number;
  currentTask: string;
  error: string | null;
}) {
  const [dismissed, setDismissed] = useState(false);

  const pct = useMemo(() => {
    const n = Number(progress);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }, [progress]);

  if (!isLoading || dismissed) return null;

  return (
    <div
      className="fixed z-50 left-3 right-3 md:left-auto md:right-4 md:w-[420px] bottom-[86px] md:bottom-4 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="pointer-events-auto rounded-2xl border border-border-secondary bg-background-tertiary/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  error ? 'bg-red-400' : 'bg-emerald-400'
                } shadow-[0_0_10px_rgba(16,185,129,0.55)]`}
              />
              <div className="text-sm font-semibold text-foreground-primary">Préparation…</div>
              <Loader2 className="h-4 w-4 text-foreground-tertiary animate-spin" />
              <div className="text-xs text-foreground-tertiary tabular-nums">{String(pct).padStart(2, '0')}%</div>
            </div>
            <div className="mt-1 text-xs text-foreground-tertiary truncate">
              {error ? `Erreur: ${error}` : currentTask || 'Chargement'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="h-8 w-8 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition grid place-items-center"
            aria-label="Masquer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-violet-500 transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

