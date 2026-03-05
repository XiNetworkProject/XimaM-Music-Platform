// components/ai-studio/GenerationTimeline.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Download, Share2, Music, AlertTriangle, CheckCircle2, Loader2, Wand2, MoreVertical, Copy, RotateCcw } from 'lucide-react';
import type { GeneratedTrack } from '@/lib/aiStudioTypes';

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
  onRemixTrack: (track: GeneratedTrack) => void;
  onReuseTrack?: (track: GeneratedTrack) => void;
  onCopyLyrics?: (track: GeneratedTrack) => void;
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
    if (
      host === 'musicfile.api.box' ||
      host.endsWith('.musicfile.api.box')
    ) return '';
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
  onRemixTrack,
  onReuseTrack,
  onCopyLyrics,
}: GenerationTimelineProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpenMenuId(null);
    };
    const t = setTimeout(() => document.addEventListener('click', close), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', close);
    };
  }, [openMenuId]);

  const isPending = generationStatus === 'pending' || sunoState === 'pending' || sunoState === 'first';
  const isError = generationStatus === 'failed' || !!sunoError;
  const isEmpty = !generatedTracks.length;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header statut */}
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-transparent flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {isError ? (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertTriangle className="w-3 h-3" />
              <span className="hidden sm:inline">Erreur de génération</span>
              <span className="sm:hidden">Erreur</span>
            </span>
          ) : isPending ? (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="hidden sm:inline">Génération en cours…</span>
              <span className="sm:hidden">En cours…</span>
            </span>
          ) : generatedTracks.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              <span>{generatedTracks.length} piste(s)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/[0.04] text-foreground-tertiary border border-white/[0.06]">
              <Music className="w-3 h-3" />
              <span className="hidden sm:inline">Studio en attente</span>
              <span className="sm:hidden">En attente</span>
            </span>
          )}
          {currentTaskId && (
            <span className="text-[10px] text-foreground-tertiary hidden sm:inline">
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
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.04] to-white/[0.02] px-6 py-10 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <Music className="w-5 h-5 text-foreground-tertiary" />
          </div>
          <div>
            <p className="text-sm text-foreground-secondary mb-1">
              Aucune piste générée pour l&apos;instant.
            </p>
            <p className="text-xs text-foreground-tertiary max-w-xs mx-auto">
              Configure ton prompt à gauche puis lance une génération pour voir les pistes s&apos;afficher ici.
            </p>
          </div>
        </div>
      )}

      {/* Loader skeleton */}
      {isPending && isEmpty && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.04] to-white/[0.02] flex items-center gap-3 p-3.5 animate-pulse"
            >
              <div className="w-14 h-14 rounded-xl bg-white/[0.08]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded bg-white/[0.10] w-1/2" />
                <div className="h-2 rounded bg-white/[0.06] w-1/3" />
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
              className={`flex gap-2 sm:gap-3 ${openMenuId === (track.id ?? '') ? 'relative z-30' : ''}`}
            >
              {/* Timeline colonne */}
              <div className="flex flex-col items-center pt-1 shrink-0">
                <div className="w-px flex-1 bg-gradient-to-b from-indigo-500/40 via-indigo-500/10 to-transparent" />
                <div className="w-7 h-7 rounded-full bg-black/60 border border-indigo-500/30 flex items-center justify-center text-[11px] text-indigo-300 font-medium">
                  {index + 1}
                </div>
              </div>

              {/* Carte piste */}
              <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.04] to-white/[0.02] p-3.5 flex flex-col gap-2 flex-1 hover:border-white/[0.10] hover:bg-white/[0.06] transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center shrink-0 overflow-hidden relative">
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
                      <Music className="w-6 h-6 text-foreground-primary" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/5 pointer-events-none" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground-primary truncate">
                          {track.title || 'Piste générée'}
                        </p>
                        <p className="text-[11px] text-foreground-tertiary truncate">
                          {track.style || 'Style IA'}
                        </p>
                      </div>
                      <span className="text-[11px] text-foreground-tertiary whitespace-nowrap shrink-0">
                        {formatSec(track.duration || 0)}
                      </span>
                    </div>

                    {track.isInstrumental && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full bg-accent-purple/15 text-[10px] text-accent-purple border border-accent-purple/30">
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
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 shadow-sm shadow-indigo-500/20 transition-all"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Écouter
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenTrack(track)}
                      className="cursor-pointer inline-flex items-center px-3 py-2 rounded-full text-xs font-medium text-foreground-primary border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all"
                    >
                      Détails
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onRemixTrack(track)}
                      className="rounded-full p-2 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all text-foreground-secondary hover:text-foreground-primary"
                      title="Remix"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownloadTrack(track)}
                      className="rounded-full p-2 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all text-foreground-secondary hover:text-foreground-primary"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onShareTrack(track)}
                      className="rounded-full p-2 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all text-foreground-secondary hover:text-foreground-primary"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    {(onReuseTrack || onCopyLyrics) && (
                      <div className="relative" ref={openMenuId === track.id ? menuRef : undefined}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId((prev) => (prev === track.id ? null : track.id));
                          }}
                          className="rounded-full p-2 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all text-foreground-secondary hover:text-foreground-primary"
                          title="Plus d'actions"
                          aria-label="Menu"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {openMenuId === track.id && (
                          <div className="absolute right-0 top-full mt-1 py-1 min-w-[200px] rounded-xl bg-[#0f0d14] border border-white/[0.06] shadow-xl z-50" onClick={(e) => e.stopPropagation()}>
                            {onReuseTrack && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReuseTrack(track);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-left text-xs text-foreground-primary hover:bg-white/[0.06] flex items-center gap-2 transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                Réutiliser titre, style et paroles
                              </button>
                            )}
                            {onCopyLyrics && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCopyLyrics(track);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-left text-xs text-foreground-primary hover:bg-white/[0.06] flex items-center gap-2 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5 shrink-0" />
                                Copier les paroles
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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
