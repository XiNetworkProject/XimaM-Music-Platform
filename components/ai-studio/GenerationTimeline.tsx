// components/ai-studio/GenerationTimeline.tsx
'use client';

import { motion } from 'framer-motion';
import { Play, Download, Share2, Music, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import type { GeneratedTrack } from '@/lib/aiStudioTypes';
import { SUNO_BTN_BASE, SUNO_CARD, SUNO_ICON_PILL } from '@/components/ui/sunoClasses';

type GenerationStatus = 'idle' | 'pending' | 'completed' | 'failed';

interface GenerationTimelineProps {
  generatedTracks: GeneratedTrack[];
  generationStatus: GenerationStatus;
  currentTaskId?: string | null;
  sunoState?: string;
  sunoError?: string | null;
  onOpenTrack: (track: GeneratedTrack) => void;
  onPlayTrack: (track: GeneratedTrack) => void;
  onDownloadTrack: (track: GeneratedTrack) => void;
  onShareTrack: (track: GeneratedTrack) => void;
}

const formatSec = (sec: number) => {
  if (!sec && sec !== 0) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const sanitizeCoverUrl = (url?: string) => {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    if (host === 'musicfile.api.box' || host.endsWith('.musicfile.api.box')) return '';
    return trimmed;
  } catch {
    return '';
  }
};

export function GenerationTimeline({
  generatedTracks,
  generationStatus,
  currentTaskId,
  sunoState,
  sunoError,
  onOpenTrack,
  onPlayTrack,
  onDownloadTrack,
  onShareTrack,
}: GenerationTimelineProps) {
  const isPending = generationStatus === 'pending' || sunoState === 'pending' || sunoState === 'first';
  const isError = generationStatus === 'failed' || !!sunoError;
  const isEmpty = !generatedTracks.length;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header statut */}
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background-primary/80 backdrop-blur-md flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {isError ? (
            <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-red-500/10 text-red-400 border border-red-400/30">
              <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden sm:inline">Erreur de génération</span>
              <span className="sm:hidden">Erreur</span>
            </span>
          ) : isPending ? (
            <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-accent-brand/10 text-accent-brand border border-accent-brand/40">
              <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" />
              <span className="hidden sm:inline">Génération en cours…</span>
              <span className="sm:hidden">En cours…</span>
            </span>
          ) : generatedTracks.length > 0 ? (
            <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-400/40">
              <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>{generatedTracks.length} piste(s)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-white/5 text-foreground-tertiary border border-white/10">
              <Music className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden sm:inline">Studio en attente</span>
              <span className="sm:hidden">En attente</span>
            </span>
          )}
          {currentTaskId && (
            <span className="text-[9px] sm:text-[10px] text-foreground-tertiary hidden sm:inline">
              Task ID : {currentTaskId.slice(0, 10)}…
            </span>
          )}
        </div>

        {sunoError && (
          <p className="text-[11px] text-red-300 max-w-xs text-right">
            {sunoError}
          </p>
        )}
      </div>

      {/* Empty state */}
      {isEmpty && !isPending && (
        <div className={`${SUNO_CARD} px-4 py-6 text-center`}>
          <p className="text-sm text-foreground-secondary mb-1">
            Aucune piste générée pour l'instant.
          </p>
          <p className="text-xs text-foreground-tertiary">
            Configure ton prompt à gauche puis lance une génération pour voir les pistes s'afficher ici.
          </p>
        </div>
      )}

      {/* Loader skeleton */}
      {isPending && isEmpty && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className={`${SUNO_CARD} flex items-center gap-3 p-3 animate-pulse`}
            >
              <div className="w-10 h-10 rounded-lg bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded bg-white/15 w-1/2" />
                <div className="h-2 rounded bg-white/10 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Timeline des pistes */}
      {!isEmpty && (
        <div className="space-y-4">
          {generatedTracks.map((track, index) => (
            <motion.div
              key={track.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="flex gap-2 sm:gap-3"
            >
              {/* Timeline colonne */}
              <div className="flex flex-col items-center pt-1 shrink-0">
                <div className="w-px flex-1 bg-gradient-to-b from-accent-brand/60 via-accent-brand/20 to-transparent" />
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 border border-accent-brand/50 flex items-center justify-center text-[10px] sm:text-[11px] text-accent-brand">
                  {index + 1}
                </div>
              </div>

              {/* Carte piste */}
              <div className={`${SUNO_CARD} p-3 flex flex-col gap-2`}>
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center shrink-0 overflow-hidden">
                    {sanitizeCoverUrl(track.imageUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sanitizeCoverUrl(track.imageUrl)}
                        alt={track.title || 'Cover générée'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.src.endsWith('/synaura_symbol.svg')) return;
                          img.src = '/synaura_symbol.svg';
                        }}
                      />
                    ) : (
                      <Music className="w-5 h-5 sm:w-6 sm:h-6 text-foreground-primary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-foreground-primary truncate">
                          {track.title || 'Piste générée'}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-foreground-tertiary truncate">
                          {track.style || 'Style IA'}
                        </p>
                      </div>
                      <span className="text-[10px] sm:text-[11px] text-foreground-tertiary whitespace-nowrap shrink-0">
                        {formatSec(track.duration || 0)}
                      </span>
                    </div>

                    {track.isInstrumental && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full bg-accent-purple/15 text-[10px] text-accent-purple border border-accent-purple/40">
                        Instrumental
                      </span>
                    )}

                    {track.lyrics && (
                      <p className="mt-2 text-[11px] text-foreground-secondary line-clamp-2 whitespace-pre-line">
                        {track.lyrics}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => onPlayTrack(track)}
                      className={`${SUNO_BTN_BASE} cursor-pointer px-4 py-2 rounded-full text-foreground-primary bg-background-tertiary enabled:hover:before:bg-overlay-on-primary text-xs leading-[24px]`}
                    >
                      <span className="relative flex flex-row items-center justify-center gap-2">
                        <Play className="w-4 h-4" />
                        Écouter
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenTrack(track)}
                      className={`${SUNO_BTN_BASE} cursor-pointer px-3 py-2 rounded-full text-foreground-primary bg-transparent before:border-border-primary enabled:hover:before:bg-overlay-on-primary text-xs leading-[24px]`}
                    >
                      <span className="relative">Détails</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <button
                      type="button"
                      onClick={() => onDownloadTrack(track)}
                      className={`${SUNO_ICON_PILL} p-1 sm:p-1.5`}
                    >
                      <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onShareTrack(track)}
                      className={`${SUNO_ICON_PILL} p-1 sm:p-1.5`}
                    >
                      <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

