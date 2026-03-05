// components/ai-studio/TrackInspector.tsx
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, Play, Download, Share2, Clock, Music, Wand2, Copy } from 'lucide-react';
import type { GeneratedTrack } from '@/lib/aiStudioTypes';

interface TrackInspectorProps {
  track: GeneratedTrack | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (track: GeneratedTrack) => void;
  onDownload: (track: GeneratedTrack) => void;
  onShare: (track: GeneratedTrack) => void;
  onRemix: (track: GeneratedTrack) => void;
  onCopyLyrics?: (track: GeneratedTrack, copyPrompt?: boolean) => void;
  variant?: 'overlay' | 'docked';
}

const formatSec = (sec: number) => {
  if (!sec && sec !== 0) return '\u2014';
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

const normalizeText = (value?: string) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const ActionBtn = ({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-white/50 hover:bg-white/[0.08] hover:text-white/70 transition-all touch-manipulation"
  >
    {children}
  </button>
);

const InfoCard = ({ title, text, onCopy }: { title: string; text: string; onCopy?: () => void }) => (
  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
    <div className="flex items-center justify-between gap-2 mb-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-semibold">{title}</p>
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="text-[10px] uppercase tracking-wider text-white/30 hover:text-white/60 inline-flex items-center gap-1 transition-colors touch-manipulation"
        >
          <Copy className="w-3 h-3" />
          Copier
        </button>
      )}
    </div>
    <p className="text-[13px] text-white/60 whitespace-pre-line leading-relaxed">{text}</p>
  </div>
);

function InspectorContent({
  track,
  onClose,
  onPlay,
  onDownload,
  onShare,
  onRemix,
  onCopyLyrics,
}: Omit<TrackInspectorProps, 'isOpen' | 'variant'> & { track: GeneratedTrack }) {
  const promptText = track.prompt || '';
  const lyricsText = track.lyrics || '';
  const hasPromptCard = Boolean(promptText.trim()) && normalizeText(promptText) !== normalizeText(lyricsText);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-semibold">
            Détails de la piste
          </p>
          <h2 className="text-sm font-semibold text-white/90 truncate max-w-[220px]">
            {track.title || 'Piste générée'}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-white/30 hover:bg-white/[0.06] hover:text-white/60 transition-all touch-manipulation"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Cover + Actions */}
      <div className="px-5 pt-5">
        <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center overflow-hidden mb-4">
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
            <Music className="w-10 h-10 text-white/40" />
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => onPlay(track)}
            className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:brightness-110 transition-all touch-manipulation"
          >
            <Play className="w-4 h-4 shrink-0" />
            <span>Lire</span>
          </button>
          <ActionBtn onClick={() => onRemix(track)} label="Remixer"><Wand2 className="w-4 h-4" /></ActionBtn>
          <ActionBtn onClick={() => onDownload(track)} label="Télécharger"><Download className="w-4 h-4" /></ActionBtn>
          <ActionBtn onClick={() => onShare(track)} label="Partager"><Share2 className="w-4 h-4" /></ActionBtn>
        </div>

        {/* Info grid */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04] mb-4">
          <div className="flex items-center justify-between px-3.5 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-white/40">
              <Clock className="w-3 h-3" />
              Durée
            </span>
            <span className="text-[11px] font-medium text-white/60 tabular-nums">
              {formatSec(track.duration || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between px-3.5 py-2.5">
            <span className="text-[11px] text-white/40">Type</span>
            <span className="text-[11px] font-medium text-white/60">
              {track.isInstrumental ? 'Instrumental' : 'Avec voix'}
            </span>
          </div>
          {track.style && (
            <div className="px-3.5 py-2.5">
              <span className="text-[11px] text-white/40 block mb-1">Style</span>
              <span className="text-[12px] text-white/55">{track.style}</span>
            </div>
          )}
        </div>
      </div>

      {/* Lyrics / Prompt */}
      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">
        {hasPromptCard && (
          <InfoCard
            title="Prompt utilisé"
            text={promptText}
            onCopy={onCopyLyrics ? () => onCopyLyrics(track, true) : undefined}
          />
        )}

        {lyricsText.trim() && (
          <InfoCard
            title="Paroles générées"
            text={lyricsText}
            onCopy={onCopyLyrics ? () => onCopyLyrics(track) : undefined}
          />
        )}

        {onCopyLyrics && promptText.trim() && !lyricsText.trim() && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => onCopyLyrics(track, true)}
              className="text-[10px] uppercase tracking-wider text-white/30 hover:text-white/60 inline-flex items-center gap-1 transition-colors touch-manipulation"
            >
              <Copy className="w-3 h-3" />
              Copier le prompt
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export function TrackInspector(props: TrackInspectorProps) {
  const { track, isOpen, variant = 'overlay' } = props;

  if (variant === 'docked') {
    if (!isOpen || !track) return null;
    return (
      <motion.div
        className="h-full w-full bg-[#0c0c14]/98 border-l border-white/[0.06] backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] flex flex-col"
        initial={{ x: 24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 24, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <InspectorContent {...props} track={track} />
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && track && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={props.onClose}
        >
          <motion.div
            className="h-full w-full max-w-full sm:max-w-md bg-[#0c0c14]/98 border-l border-white/[0.06] backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <InspectorContent {...props} track={track} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
