// components/ai-studio/TrackInspector.tsx
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, Play, Download, Share2, Clock, Music } from 'lucide-react';
import type { GeneratedTrack } from '@/lib/aiStudioTypes';

interface TrackInspectorProps {
  track: GeneratedTrack | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (track: GeneratedTrack) => void;
  onDownload: (track: GeneratedTrack) => void;
  onShare: (track: GeneratedTrack) => void;
}

const formatSec = (sec: number) => {
  if (!sec && sec !== 0) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export function TrackInspector({
  track,
  isOpen,
  onClose,
  onPlay,
  onDownload,
  onShare,
}: TrackInspectorProps) {
  return (
    <AnimatePresence>
      {isOpen && track && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
          <motion.div
            className="h-full w-full max-w-full sm:max-w-md bg-[#05030b]/95 border-l border-white/10 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.6)] flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-foreground-tertiary">
                  Détails de la piste
                </p>
                <h2 className="text-sm font-semibold text-foreground-primary truncate max-w-[220px]">
                  {track.title || 'Piste générée'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10 text-foreground-tertiary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cover + CTA */}
            <div className="px-5 pt-5">
              <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center overflow-hidden mb-4">
                {track.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={track.imageUrl}
                    alt={track.title || 'Cover générée'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music className="w-10 h-10 text-white/80" />
                )}
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => onPlay(track)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-accent-brand text-sm font-medium text-white hover:bg-accent-brand/90 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Lire dans le player
                </button>
                <button
                  onClick={() => onDownload(track)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border border-upload text-xs text-foreground-primary hover:bg-overlay-on-primary"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onShare(track)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border border-upload text-xs text-foreground-primary hover:bg-overlay-on-primary"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Infos */}
              <div className="space-y-3 text-sm mb-4">
                <div className="flex items-center justify-between gap-2 text-xs text-foreground-tertiary">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Durée
                  </span>
                  <span className="font-medium text-foreground-secondary">
                    {formatSec(track.duration || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs text-foreground-tertiary">
                  <span>Type</span>
                  <span className="font-medium text-foreground-secondary">
                    {track.isInstrumental ? 'Instrumental' : 'Avec voix'}
                  </span>
                </div>

                {track.style && (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-foreground-tertiary mb-1">
                      Style
                    </p>
                    <p className="text-[13px] text-foreground-secondary">
                      {track.style}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Paroles / prompt */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
              {track.prompt && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-foreground-tertiary mb-1.5">
                    Prompt utilisé
                  </p>
                  <p className="text-[13px] text-foreground-secondary whitespace-pre-line">
                    {track.prompt}
                  </p>
                </div>
              )}

              {track.lyrics && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-foreground-tertiary mb-1.5">
                    Paroles générées
                  </p>
                  <p className="text-[13px] text-foreground-secondary whitespace-pre-line">
                    {track.lyrics}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

