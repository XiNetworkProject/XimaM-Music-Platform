'use client';

import React, { useState } from 'react';
import { ACTION_COSTS } from '@/lib/billing/pricing';
import {
  Volume2,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Download,
  Wand2,
  Search,
  Eye,
  EyeOff,
  Music,
  Copy,
  Globe,
  Lock,
  Upload,
  AlertTriangle,
  Check,
  Loader2,
} from 'lucide-react';
import type { GeneratedTrack } from '@/lib/aiStudioTypes';
import { useAudioPlayer } from '@/app/providers';

interface TimestampedWord {
  word: string;
  startS: number;
  endS: number;
}

function formatDuration(sec: number): string {
  if (!sec && sec !== 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function TabPill({
  active,
  icon,
  children,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-medium transition-all duration-200',
        active
          ? 'bg-gradient-to-r from-indigo-500/25 to-violet-500/25 text-white shadow-sm shadow-indigo-500/10 border border-indigo-400/20'
          : 'text-white/50 hover:text-white/70 hover:bg-white/[0.05] border border-transparent',
      ].join(' ')}
    >
      {icon}
      {children}
    </button>
  );
}

function PublishSection({
  selectedGeneration,
  publishing,
  onToggle,
}: {
  selectedGeneration?: { is_public?: boolean } | null;
  publishing?: boolean;
  onToggle?: () => void;
}) {
  const [confirmAction, setConfirmAction] = useState<'publish' | 'unpublish' | null>(null);
  const isPublic = selectedGeneration?.is_public === true;

  const handleConfirm = () => {
    if (onToggle) onToggle();
    setConfirmAction(null);
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-medium">Publication</p>

      {/* Status badge */}
      {selectedGeneration && (
        <div className={[
          'flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium',
          isPublic
            ? 'bg-emerald-500/[0.08] border border-emerald-400/15 text-emerald-300'
            : 'bg-white/[0.03] border border-white/[0.06] text-white/40',
        ].join(' ')}>
          {isPublic ? <Globe className="h-3.5 w-3.5 shrink-0" /> : <Lock className="h-3.5 w-3.5 shrink-0" />}
          <span className="flex-1">{isPublic ? 'Publié sur Synaura' : 'Privé — visible par toi uniquement'}</span>
          {isPublic && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0e0e18] p-3.5 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${confirmAction === 'unpublish' ? 'text-amber-400' : 'text-indigo-400'}`} />
            <div className="min-w-0 space-y-1">
              <p className="text-[12px] font-semibold text-white/85">
                {confirmAction === 'publish' ? 'Publier cette musique ?' : 'Retirer de Synaura ?'}
              </p>
              <p className="text-[11px] text-white/40 leading-relaxed">
                {confirmAction === 'publish'
                  ? 'Elle sera visible par tous les utilisateurs de Synaura et apparaîtra dans le feed.'
                  : 'La musique ne sera plus visible publiquement. Les écoutes et likes seront conservés.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="flex-1 h-8 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] font-medium text-white/60 hover:bg-white/[0.08] transition-all"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={publishing}
              className={[
                'flex-1 h-8 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5',
                confirmAction === 'publish'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-400 hover:to-violet-400 shadow-sm shadow-indigo-500/20'
                  : 'bg-amber-500/15 border border-amber-400/20 text-amber-200 hover:bg-amber-500/25',
                publishing ? 'opacity-60 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {publishing
                ? <><Loader2 className="h-3 w-3 animate-spin" /> En cours...</>
                : confirmAction === 'publish' ? 'Confirmer la publication' : 'Confirmer le retrait'}
            </button>
          </div>
        </div>
      )}

      {/* Action button */}
      {!confirmAction && (
        <button
          type="button"
          onClick={() => {
            if (!selectedGeneration) return;
            setConfirmAction(isPublic ? 'unpublish' : 'publish');
          }}
          disabled={!selectedGeneration || publishing}
          className={[
            'w-full flex items-center gap-3 rounded-xl p-3 text-left text-xs font-medium transition-all',
            !selectedGeneration || publishing
              ? 'border border-white/[0.06] bg-white/[0.02] text-white/30 cursor-not-allowed'
              : isPublic
              ? 'border border-amber-400/20 bg-amber-400/[0.07] text-amber-200 hover:bg-amber-400/[0.12]'
              : 'border border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200 hover:bg-emerald-400/[0.12]',
          ].join(' ')}
        >
          {publishing
            ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            : isPublic
            ? <EyeOff className="h-4 w-4 shrink-0" />
            : <Upload className="h-4 w-4 shrink-0" />}
          <div className="min-w-0">
            <span className="block">
              {publishing
                ? 'Mise à jour...'
                : !selectedGeneration
                ? 'Sélectionne une génération'
                : isPublic
                ? 'Retirer de Synaura'
                : 'Publier sur Synaura'}
            </span>
            {selectedGeneration && !publishing && (
              <span className="block text-[10px] opacity-60 mt-0.5">
                {isPublic ? 'Rendre privé et retirer du feed' : 'Rendre visible à tous les utilisateurs'}
              </span>
            )}
          </div>
        </button>
      )}
    </div>
  );
}

export default function RightPanelImproved({
  track,
  stylePrompt,
  lyrics,
  onRemix,
  onDownload,
  modelVersion,
  onSetModelVersion,
  selectedGenerationForVisibility,
  publishingVisibility,
  toggleGenerationVisibility,
  timestampedWords = [],
  timestampedLoading = false,
  timestampedError = null,
  onSyncLyrics,
}: {
  track: GeneratedTrack | null;
  stylePrompt?: string;
  lyrics?: string;
  onRemix?: () => void;
  onDownload?: () => void;
  modelVersion?: string;
  onSetModelVersion?: (id: string) => void;
  selectedGenerationForVisibility?: { is_public?: boolean } | null;
  publishingVisibility?: boolean;
  toggleGenerationVisibility?: () => void;
  timestampedWords?: TimestampedWord[];
  timestampedLoading?: boolean;
  timestampedError?: string | null;
  onSyncLyrics?: () => void;
}) {
  const { audioState, play, pause, nextTrack, previousTrack } = useAudioPlayer();
  const isPlaying = audioState.isPlaying;
  const progress = Math.min(1, (audioState.duration || 0) > 0 ? (audioState.currentTime || 0) / (audioState.duration || 1) : 0);
  const currentTime = Number(audioState.currentTime || 0);
  const duration = Number(audioState.duration || track?.duration || 0);
  const [tab, setTab] = React.useState<'inspector' | 'models' | 'export'>('inspector');
  const activeLyricWordRef = React.useRef<HTMLSpanElement | null>(null);
  const lyricsSyncScrollRef = React.useRef<HTMLDivElement | null>(null);
  const activeWordIndex = React.useMemo(() => {
    if (!timestampedWords.length) return -1;
    return timestampedWords.findIndex((w) => currentTime >= Number(w.startS || 0) && currentTime <= Number(w.endS || 0));
  }, [currentTime, timestampedWords]);
  const coverUrl =
    (track as any)?.coverUrl ||
    (track as any)?.image_url ||
    (track as any)?.imageUrl ||
    (track as any)?.cover ||
    (track as any)?.cover_url ||
    '';

  React.useEffect(() => {
    if (activeWordIndex < 0) return;
    const container = lyricsSyncScrollRef.current;
    const word = activeLyricWordRef.current;
    if (!container || !word) return;
    const cRect = container.getBoundingClientRect();
    const wRect = word.getBoundingClientRect();
    const relativeTop = wRect.top - cRect.top + container.scrollTop;
    const targetScroll = relativeTop - container.clientHeight / 2 + wRect.height / 2;
    const clamped = Math.max(0, Math.min(targetScroll, container.scrollHeight - container.clientHeight));
    container.scrollTo({ top: clamped, behavior: 'smooth' });
  }, [activeWordIndex]);

  const syncedLyricLines = React.useMemo(() => {
    const lines: TimestampedWord[][] = [];
    let currentLine: TimestampedWord[] = [];
    timestampedWords.forEach((w) => {
      const word = String(w.word || '').trim();
      currentLine.push(w);
      if (/[.!?;:\n]$/.test(word) || currentLine.length >= 10) {
        lines.push([...currentLine]);
        currentLine = [];
      }
    });
    if (currentLine.length) lines.push(currentLine);
    return lines;
  }, [timestampedWords]);

  return (
    <aside className="col-span-12 md:col-span-3 lg:col-span-3 lg:shrink-0 hidden lg:flex flex-col rounded-3xl border border-white/[0.06] bg-white/[0.03] backdrop-blur overflow-hidden">

      {/* ── Cover with overlay ── */}
      <div className="relative w-full aspect-square shrink-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/40 via-indigo-700/30 to-cyan-600/20" />
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={track?.title || ''}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.includes('/brand/2026/synaura-symbol-2026-white.png')) {
                img.src = '/brand/2026/synaura-symbol-2026-white.png';
              }
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Music className="h-16 w-16 text-white/10" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
          <h2 className="text-sm font-semibold text-white truncate drop-shadow-lg">
            {track?.title || 'No track selected'}
          </h2>
        </div>
      </div>

      {/* ── Mini player ── */}
      <div className="shrink-0 px-4 pt-3 pb-3 border-b border-white/[0.06] bg-black/20">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-[width] duration-150"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] font-mono text-white/40 tabular-nums">{formatDuration(currentTime)}</span>
          <span className="text-[10px] font-mono text-white/40 tabular-nums">{formatDuration(duration)}</span>
        </div>

        <div className="mt-1 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => previousTrack()}
            className="rounded-full p-1.5 text-white/50 hover:text-white/80 transition-colors"
            aria-label="Précédent"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { if (isPlaying) pause(); else play(); }}
            className="rounded-full bg-white p-2 text-black hover:bg-white/90 transition-colors shadow-lg shadow-white/10"
            aria-label={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          </button>
          <button
            type="button"
            onClick={() => nextTrack()}
            className="rounded-full p-1.5 text-white/50 hover:text-white/80 transition-colors"
            aria-label="Suivant"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="shrink-0 px-4 pt-3 pb-2">
        <div className="inline-flex gap-1 rounded-xl border border-white/[0.06] bg-black/25 p-1">
          <TabPill active={tab === 'inspector'} onClick={() => setTab('inspector')} icon={<Search className="h-3 w-3" />}>
            Inspector
          </TabPill>
          <TabPill active={tab === 'models'} onClick={() => setTab('models')} icon={<Wand2 className="h-3 w-3" />}>
            Models
          </TabPill>
          <TabPill active={tab === 'export'} onClick={() => setTab('export')} icon={<Download className="h-3 w-3" />}>
            Export
          </TabPill>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-hidden">

        {/* ── Inspector ── */}
        {tab === 'inspector' && (
          <div className="h-full overflow-y-auto px-5 pb-6 pt-4 space-y-5">

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => play()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-xs font-semibold text-white hover:from-indigo-400 hover:to-violet-400 transition-all shadow-lg shadow-indigo-500/20"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Lire
              </button>
              <button
                type="button"
                title="Remix"
                onClick={() => onRemix?.()}
                className="inline-flex items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5 text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors"
                aria-label="Remix"
              >
                <Wand2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Télécharger"
                onClick={() => onDownload?.()}
                className="inline-flex items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5 text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors"
                aria-label="Télécharger"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>

            {/* Details */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-medium">Détails</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/45">Durée</span>
                <span className="font-mono text-white/75 tabular-nums">{formatDuration(duration)}</span>
              </div>
              {track?.title && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/45">Titre</span>
                  <span className="font-medium text-white/75 truncate max-w-[180px]">{track.title}</span>
                </div>
              )}
            </div>

            {/* Style prompt */}
            {(stylePrompt && stylePrompt.trim() && stylePrompt !== (lyrics || '')) || ((track as any)?.style || (track as any)?.stylePrompt) ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/40 font-medium">Style</p>
                <p className="text-[12px] leading-relaxed text-white/60">
                  {stylePrompt && stylePrompt.trim() && stylePrompt !== (lyrics || '')
                    ? stylePrompt
                    : (track as any)?.style || (track as any)?.stylePrompt || ''}
                </p>
              </div>
            ) : null}

            {/* Lyrics sync */}
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.045] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-100/42 font-medium">Paroles</p>
                  <p className="mt-0.5 text-[11px] text-white/38">
                    {timestampedWords.length ? `${timestampedWords.length} mots synchronisés` : 'Texte simple ou sync Suno'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(lyrics || '')}
                    disabled={!lyrics}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.035] px-2.5 text-[10px] text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white/75 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Copy className="h-3 w-3" />
                    Copier
                  </button>
                  <button
                    type="button"
                    onClick={onSyncLyrics}
                    disabled={!track || timestampedLoading}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-2.5 text-[10px] font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {timestampedLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    {timestampedLoading ? 'Sync...' : 'Synchroniser'}
                  </button>
                </div>
              </div>

              {timestampedError ? (
                <div className="mb-3 rounded-xl border border-amber-300/15 bg-amber-400/10 px-3 py-2 text-[11px] font-medium text-amber-100/80">
                  {timestampedError}
                </div>
              ) : null}

              {syncedLyricLines.length > 0 ? (
                <div ref={lyricsSyncScrollRef} className="max-h-[270px] overflow-y-auto rounded-xl border border-cyan-300/12 bg-black/25 px-3 py-4 scroll-smooth">
                  <div className="space-y-3">
                    {(() => {
                      let offset = 0;
                      return syncedLyricLines.map((lineWords, lineIdx) => {
                        const lineStart = offset;
                        offset += lineWords.length;
                        return (
                          <p key={`sync-line-${lineIdx}`} className="text-center text-[13px] leading-[1.85] tracking-wide">
                            {lineWords.map((w, wordIdx) => {
                              const idx = lineStart + wordIdx;
                              const isActive = idx === activeWordIndex;
                              const isPast = activeWordIndex >= 0 && idx < activeWordIndex;
                              return (
                                <span
                                  key={`sync-word-${idx}-${w.startS}`}
                                  ref={isActive ? activeLyricWordRef : undefined}
                                  className={[
                                    'inline-block rounded-md px-1 py-px transition-all duration-200',
                                    isActive
                                      ? 'bg-cyan-300/25 text-cyan-50 font-semibold shadow-[0_0_14px_rgba(34,211,238,0.3)]'
                                      : isPast
                                        ? 'text-white/34'
                                        : 'text-white/78',
                                  ].join(' ')}
                                >
                                  {w.word}
                                  {wordIdx < lineWords.length - 1 ? '\u00A0' : ''}
                                </span>
                              );
                            })}
                          </p>
                        );
                      });
                    })()}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-black/25 border border-white/[0.04] p-3.5">
                  <pre className="whitespace-pre-wrap text-[12px] leading-[1.7] text-white/55 font-sans">{lyrics || 'Aucune parole'}</pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Models ── */}
        {tab === 'models' && (
          <div className="h-full overflow-y-auto px-5 pb-6 pt-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-medium">Modèle IA</p>
              <span className="text-[10px] text-white/25 ml-auto tabular-nums">{ACTION_COSTS.generation.credits} crédits / génération</span>
            </div>
            {[
              { id: 'V4_5', label: 'v4.5', desc: 'Rapide et stable — idéal pour l\'itération', tag: 'Rapide', color: 'emerald' },
              { id: 'V4_5PLUS', label: 'v4.5+', desc: 'Voix plus détaillées et naturelles', tag: 'Pro', color: 'violet' },
              { id: 'V5', label: 'v5', desc: 'Qualité studio premium, rendu avancé', tag: 'Beta', color: 'indigo' },
              { id: 'V5_5', label: 'v5.5', desc: 'Dernier modele Suno, rendu plus riche et plus propre', tag: 'New', color: 'sky' },
            ].map((m) => {
              const isActive = modelVersion === m.id;
              const colorMap: Record<string, { active: string; tag: string; glow: string }> = {
                sky: { active: 'from-sky-500/15 to-cyan-500/15 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.25)]', tag: 'bg-sky-400/20 text-sky-300', glow: 'from-sky-500/20 via-transparent to-cyan-500/20' },
                emerald: { active: 'from-emerald-500/15 to-teal-500/15 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.25)]', tag: 'bg-emerald-400/20 text-emerald-300', glow: 'from-emerald-500/20 via-transparent to-teal-500/20' },
                violet: { active: 'from-violet-500/15 to-purple-500/15 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.25)]', tag: 'bg-violet-400/20 text-violet-300', glow: 'from-violet-500/20 via-transparent to-purple-500/20' },
                indigo: { active: 'from-indigo-500/15 to-blue-500/15 shadow-[inset_0_0_0_1px_rgba(129,140,248,0.25)]', tag: 'bg-indigo-400/20 text-indigo-300', glow: 'from-indigo-500/20 via-transparent to-blue-500/20' },
              };
              const c = colorMap[m.color];
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSetModelVersion?.(m.id)}
                  className={[
                    'relative w-full text-left rounded-2xl border p-4 transition-all duration-200',
                    isActive
                      ? `border-transparent bg-gradient-to-r ${c.active}`
                      : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.1]',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white/90">{m.label}</span>
                      <span className={[
                        'text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full',
                        isActive ? c.tag : 'bg-white/[0.05] text-white/35',
                      ].join(' ')}>
                        {m.tag}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/25 tabular-nums">{ACTION_COSTS.generation.credits} cr.</span>
                  </div>
                  <p className="text-[11px] text-white/45 leading-relaxed">{m.desc}</p>
                  {isActive && (
                    <div className={`absolute -top-px -left-px -right-px -bottom-px rounded-2xl pointer-events-none bg-gradient-to-r ${c.glow} -z-10`} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Export ── */}
        {tab === 'export' && (
          <div className="h-full overflow-y-auto px-5 pb-6 pt-4 space-y-4">
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  if (onDownload) onDownload();
                  else console.log('export mp3');
                }}
                className="w-full flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] p-4 text-left transition-colors group"
              >
                <div className="shrink-0 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 p-3">
                  <Download className="h-5 w-5 text-indigo-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white/85 group-hover:text-white transition-colors">Export MP3</div>
                  <div className="text-[11px] text-white/35">Format compressé, compatible partout</div>
                </div>
              </button>

              <button
                type="button"
                disabled
                className="w-full flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-left opacity-50 cursor-not-allowed"
              >
                <div className="shrink-0 rounded-xl bg-white/[0.04] p-3">
                  <Download className="h-5 w-5 text-white/30" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white/50">Export WAV</div>
                  <div className="text-[11px] text-white/25">Bientôt disponible</div>
                </div>
              </button>
            </div>

            <div className="h-px bg-white/[0.06]" />

            <PublishSection
              selectedGeneration={selectedGenerationForVisibility}
              publishing={publishingVisibility}
              onToggle={toggleGenerationVisibility}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
