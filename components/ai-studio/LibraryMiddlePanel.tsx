'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  RefreshCcw,
  ChevronDown,
  Play,
  Wand2,
  MoreHorizontal,
  Copy,
  Repeat,
  Music2,
  Mic2,
  X,
  Sparkles,
  Heart,
  Globe,
  Trash2,
  ArchiveRestore,
  Video,
  Folder,
  FolderOpen,
  MoveRight,
  Check,
} from 'lucide-react';
import type { AITrack, AIGeneration } from '@/lib/aiGenerationService';
import type { GeneratedTrack } from '@/lib/aiStudioTypes';
import { isLikelyExpiredAIProviderUrl } from '@/lib/media-url-health';

type ChipKey = 'all' | 'instrumental' | 'voix' | 'liked' | 'trashed';
type SortKey = 'newest' | 'oldest' | 'title';
type ViewMode = 'list' | 'grid';

const CHIPS: Array<{ key: ChipKey; label: string; icon?: React.ReactNode }> = [
  { key: 'all', label: 'Tout' },
  { key: 'liked', label: 'Favoris', icon: <Heart className="w-3 h-3" /> },
  { key: 'instrumental', label: 'Instru', icon: <Music2 className="w-3 h-3" /> },
  { key: 'voix', label: 'Voix', icon: <Mic2 className="w-3 h-3" /> },
  { key: 'trashed', label: 'Corbeille', icon: <Trash2 className="w-3 h-3" /> },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function formatDuration(sec: number): string {
  if (!sec && sec !== 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function isInstrumentalTrack(s: string): boolean {
  return s.toLowerCase().includes('instrumental');
}

function parseSourceLinks(value?: string | null): Record<string, any> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function trackFolder(track: AITrack | any): string {
  const links = parseSourceLinks(track?.source_links);
  return String(links.library_folder || '').trim();
}

function formatShortDate(value?: string | null): string {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  return new Date(time).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function sanitizeCoverUrl(url?: string, createdAt?: string): string {
  if (!url?.trim()) return '';
  const t = url.trim();
  if (t.startsWith('/')) return t;
  try {
    new URL(t);
    if (isLikelyExpiredAIProviderUrl(t, createdAt)) return '';
  } catch {
    return '';
  }
  return t;
}

export interface LibraryMiddlePanelProps {
  tracks: AITrack[];
  generationsById: Map<string, AIGeneration>;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterBy: ChipKey;
  onFilterByChange: (value: ChipKey) => void;
  sortBy: SortKey;
  onSortByChange: (value: SortKey) => void;
  onRefresh: () => void;
  remixMode: boolean;
  onRemixModeToggle: () => void;
  remixSourceTrackId: string | null;
  onSetRemixSource: (track: AITrack) => void;
  onClearRemixSource: () => void;
  onPickTrack: (track: AITrack, gen: AIGeneration | null) => void;
  onPlayTrack: (track: AITrack, gen: AIGeneration | null) => void;
  onPlayQueue?: (filteredTracks: AITrack[], startIndex: number) => void;
  onRemixTrack: (track: AITrack) => void;
  onReuseTrack?: (track: AITrack, gen: AIGeneration | null) => void;
  onCopyLyrics?: (track: AITrack, gen: AIGeneration | null) => void;
  onToggleLike?: (track: AITrack) => void;
  onTrashTrack?: (track: AITrack) => void;
  onGenerateCoverVideo?: (track: AITrack, gen: AIGeneration | null) => void;
  generatingCoverVideoTrackId?: string | null;
  onMoveToFolder?: (track: AITrack, folder: string | null) => void;
  selectedTrackId?: string | null;
  liveGeneration?: {
    visible: boolean;
    statusLabel: string;
    progress: number;
    taskId?: string | null;
    tracks: GeneratedTrack[];
    expectedSlots?: number;
    error?: string | null;
    isRemix?: boolean;
    onSelectTrack?: (track: GeneratedTrack) => void;
    onPlayTrack?: (track: GeneratedTrack) => void;
  };
  likedTrackIds?: Set<string>;
  trashedTrackIds?: Set<string>;
  loading?: boolean;
  error?: string | null;
}

/* ── Portal-based context menu that can't be clipped by overflow:hidden ── */
function ContextMenu({
  anchorRef,
  open,
  onClose,
  children,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
  }, [open]);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    if (isMobile) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const menuW = 220;
    const menuH = 280;
    let left = rect.right - menuW;
    if (left < 8) left = 8;
    let top = rect.bottom + 6;
    if (top + menuH > window.innerHeight) top = rect.top - menuH - 6;
    if (top < 8) top = 8;
    setPos({ top, left });
  }, [open, anchorRef, isMobile]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => onClose();
    const timer = setTimeout(() => document.addEventListener('click', close), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', close);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  if (isMobile) {
    return createPortal(
      <>
        <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div
          className="fixed inset-x-0 bottom-0 z-[9999] rounded-t-[1.5rem] border-t border-black/[0.08] bg-[#fffaf2]/98 py-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] text-[#171313] shadow-[0_-18px_70px_rgba(30,25,20,.22)] backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/18" />
          {children}
        </div>
      </>,
      document.body
    );
  }

  return createPortal(
    <div
      className="fixed z-[9999] w-[236px] rounded-[1rem] border border-black/[0.08] bg-[#fffaf2]/98 py-1.5 text-[#171313] shadow-[0_18px_60px_rgba(30,25,20,.22)] backdrop-blur-2xl"
      style={{ top: pos.top, left: pos.left }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

function Cover({ duration, coverUrl, className = 'h-[52px] w-[52px]', rounded = 'rounded-[14px]' }: { duration: string; coverUrl?: string; className?: string; rounded?: string }) {
  return (
    <div className={cn('relative shrink-0 overflow-hidden bg-[#171313]/[0.06] ring-1 ring-black/[0.08]', className, rounded)}>
      {coverUrl ? (
        <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_35%_20%,rgba(255,111,97,0.35),transparent_42%),linear-gradient(135deg,rgba(23,19,19,0.14),rgba(23,19,19,0.04))]">
          <Music2 className="w-5 h-5 text-[#171313]/25" />
        </div>
      )}
      <div className="absolute bottom-[3px] left-[3px] rounded-[5px] bg-[#171313]/72 px-[5px] py-[1px] text-[9px] font-semibold text-white tabular-nums backdrop-blur-sm">
        {duration}
      </div>
    </div>
  );
}

function TrackActionMenu({
  onReuseTrack,
  onCopyLyrics,
  onGenerateCoverVideo,
  isGeneratingCoverVideo,
  onMoveToFolder,
  folder,
  folderInput,
  setFolderInput,
  commitFolderMove,
  onSetSource,
  onTrash,
  isTrashed,
  closeMenu,
}: {
  onReuseTrack?: () => void;
  onCopyLyrics?: () => void;
  onGenerateCoverVideo?: () => void;
  isGeneratingCoverVideo?: boolean;
  onMoveToFolder?: (folder: string | null) => void;
  folder: string;
  folderInput: string;
  setFolderInput: React.Dispatch<React.SetStateAction<string>>;
  commitFolderMove: () => void;
  onSetSource: () => void;
  onTrash?: () => void;
  isTrashed: boolean;
  closeMenu: () => void;
}) {
  return (
    <>
      <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-black/36">Actions</div>
      {onReuseTrack && (
        <button
          type="button"
          onClick={() => { onReuseTrack(); closeMenu(); }}
          className="mx-auto flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-bold text-[#171313]/78 transition hover:bg-black/[0.05]"
        >
          <Repeat className="h-4 w-4 shrink-0 text-black/35" />
          Réutiliser les paramètres
        </button>
      )}
      {onCopyLyrics && (
        <button
          type="button"
          onClick={() => { onCopyLyrics(); closeMenu(); }}
          className="mx-auto flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-bold text-[#171313]/78 transition hover:bg-black/[0.05]"
        >
          <Copy className="h-4 w-4 shrink-0 text-black/35" />
          Copier les paroles
        </button>
      )}
      {onGenerateCoverVideo && (
        <button
          type="button"
          onClick={() => { onGenerateCoverVideo(); closeMenu(); }}
          disabled={isGeneratingCoverVideo}
          className="mx-auto flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-bold text-[#6d4bff] transition hover:bg-[#7c5cff]/10 disabled:cursor-wait disabled:opacity-60"
        >
          <Video className="h-4 w-4 shrink-0 text-[#7c5cff]/70" />
          {isGeneratingCoverVideo ? 'Génération clip...' : 'Créer clip vidéo Suno'}
        </button>
      )}
      <button
        type="button"
        onClick={() => { onSetSource(); closeMenu(); }}
        className="mx-auto flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-bold text-[#087b80] transition hover:bg-[#00c2cb]/10"
      >
        <Wand2 className="h-4 w-4 shrink-0 text-[#00a6ad]/65" />
        Source remix
      </button>
      {onMoveToFolder && (
        <div className="mx-2 my-1.5 rounded-xl border border-black/[0.08] bg-white p-2" onClick={(e) => e.stopPropagation()}>
          <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-black/42">
            <MoveRight className="h-3.5 w-3.5" />
            Dossier
          </label>
          <input
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitFolderMove();
            }}
            placeholder="Nom du dossier"
            className="h-8 w-full rounded-lg border border-black/[0.08] bg-[#fffaf2] px-2.5 text-[12px] font-bold text-[#171313] outline-none placeholder:text-black/28 focus:border-[#171313]"
          />
          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={commitFolderMove}
              className="flex-1 rounded-lg bg-[#171313] px-2 py-1.5 text-[11px] font-black text-white transition hover:scale-[1.01]"
            >
              Enregistrer
            </button>
            {folder && (
              <button
                type="button"
                onClick={() => { onMoveToFolder(null); closeMenu(); }}
                className="rounded-lg border border-black/[0.08] bg-[#fffaf2] px-2 py-1.5 text-[11px] font-black text-black/48 transition hover:bg-black/[0.05] hover:text-black/72"
              >
                Aucun
              </button>
            )}
          </div>
        </div>
      )}
      {onTrash && (
        <>
          <div className="my-1 mx-2 h-px bg-black/[0.07]" />
          <button
            type="button"
            onClick={() => { onTrash(); closeMenu(); }}
            className={cn(
              'mx-auto flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition',
              isTrashed
                ? 'font-bold text-emerald-700 hover:bg-emerald-500/[0.10]'
                : 'font-bold text-rose-700 hover:bg-rose-500/[0.10]'
            )}
          >
            {isTrashed ? (
              <><ArchiveRestore className="h-4 w-4 shrink-0 text-emerald-600/70" /> Restaurer</>
            ) : (
              <><Trash2 className="h-4 w-4 shrink-0 text-rose-600/70" /> Mettre à la corbeille</>
            )}
          </button>
        </>
      )}
    </>
  );
}

function TrackRow({
  track,
  gen,
  isSource,
  isLiked,
  isTrashed,
  isPublished,
  onPick,
  onPlay,
  onRemix,
  onSetSource,
  onReuseTrack,
  onCopyLyrics,
  onToggleLike,
  onTrash,
  onGenerateCoverVideo,
  isGeneratingCoverVideo,
  onMoveToFolder,
  isSelected,
  viewMode,
}: {
  track: AITrack;
  gen: AIGeneration | null;
  isSource: boolean;
  isLiked: boolean;
  isTrashed: boolean;
  isPublished: boolean;
  onPick: () => void;
  onPlay: () => void;
  onRemix: () => void;
  onSetSource: () => void;
  onReuseTrack?: () => void;
  onCopyLyrics?: () => void;
  onToggleLike?: () => void;
  onTrash?: () => void;
  onGenerateCoverVideo?: () => void;
  isGeneratingCoverVideo?: boolean;
  onMoveToFolder?: (folder: string | null) => void;
  isSelected?: boolean;
  viewMode: ViewMode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const title = track.title || 'Sans titre';
  const duration = formatDuration(Number(track.duration) || 0);
  const links = parseSourceLinks((track as any).source_links);
  const folder = trackFolder(track);
  const [folderInput, setFolderInput] = useState(folder);
  const mediaFreshAt = links?.provider_urls_refreshed_at || links?.media_cached_at || track.created_at;
  let coverUrl = sanitizeCoverUrl(track.image_url, mediaFreshAt);
  if (!coverUrl && (track as any).source_links) {
    coverUrl = sanitizeCoverUrl(links?.image || links?.image_url || links?.cover || links?.provider_image_url, mediaFreshAt);
  }
  const model = (track.model_name || gen?.model || 'v5').replace(/^V/, 'v').toLowerCase();
  const createdLabel = formatShortDate(track.created_at || gen?.created_at);
  const status = String((track as any).status || gen?.status || '');
  const hasClip = Boolean((track as any).music_video_url || links.music_video_url || links.cover_video_url);

  useEffect(() => {
    setFolderInput(folder);
  }, [folder]);

  const commitFolderMove = useCallback(() => {
    onMoveToFolder?.(folderInput.trim() || null);
    closeMenu();
  }, [closeMenu, folderInput, onMoveToFolder]);

  const badges = (
    <>
      <span className="shrink-0 rounded-md bg-black/[0.06] px-1.5 py-px text-[9px] font-black uppercase tracking-wider text-black/45">
        {model}
      </span>
      {hasClip && (
        <span className="shrink-0 rounded-md bg-[#7c5cff]/10 px-1.5 py-px text-[9px] font-black uppercase tracking-wider text-[#6d4bff]">
          clip
        </span>
      )}
      {isLiked && <Heart className="h-3 w-3 shrink-0 fill-[#ff6f61] text-[#ff6f61]" />}
      {isPublished && (
        <span className="flex shrink-0 items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-px text-[9px] font-black uppercase tracking-wider text-emerald-700">
          <Globe className="w-2.5 h-2.5" /> public
        </span>
      )}
      {isSource && (
        <span className="shrink-0 rounded-md bg-[#00c2cb]/10 px-1.5 py-px text-[9px] font-black uppercase tracking-wider text-[#087b80]">
          source
        </span>
      )}
    </>
  );

  const meta = (
    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-black/38">
      {createdLabel ? <span className="shrink-0">{createdLabel}</span> : null}
      {folder ? (
        <>
          <span className="shrink-0 text-black/20">·</span>
          <span className="inline-flex min-w-0 items-center gap-1 truncate">
            <Folder className="h-3 w-3 shrink-0" />
            <span className="truncate">{folder}</span>
          </span>
        </>
      ) : null}
      {status && status !== 'completed' ? (
        <>
          <span className="shrink-0 text-black/20">·</span>
          <span className="shrink-0 text-amber-700">{status}</span>
        </>
      ) : null}
    </div>
  );

  if (viewMode === 'grid') {
    return (
      <div
        className={cn(
          'group relative min-w-0 overflow-hidden rounded-2xl border transition-all cursor-pointer before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_30%_0%,rgba(255,111,97,0.18),transparent_42%),radial-gradient(circle_at_90%_18%,rgba(0,194,203,0.16),transparent_40%),linear-gradient(135deg,rgba(255,250,242,0.92),rgba(234,255,251,0.74))] before:opacity-0 before:transition-opacity before:duration-200 hover:before:opacity-100 active:before:opacity-100',
          isSelected || isSource
            ? 'border-[#00a6ad]/35 bg-[#eafffb] shadow-[0_18px_46px_rgba(0,166,173,0.14)] before:opacity-100'
            : 'border-black/[0.07] bg-white/72 shadow-[0_12px_30px_rgba(30,25,20,0.06)] hover:border-[#00a6ad]/22 hover:shadow-[0_18px_48px_rgba(0,166,173,0.12)]'
        )}
        onClick={onPick}
      >
        <div className="relative p-2">
          <Cover duration={duration} coverUrl={coverUrl || undefined} className="aspect-square w-full" rounded="rounded-xl" />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className="absolute inset-2 flex items-center justify-center rounded-xl bg-[#171313]/20 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:bg-[#171313]/38"
            aria-label="Lire"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#fffaf2] text-[#171313] shadow-xl">
              <Play className="h-4 w-4 fill-current" />
            </span>
          </button>
        </div>
        <div className="relative px-3 pb-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[13px] font-black text-[#171313]">{title}</span>
            {isSelected ? <Check className="h-3.5 w-3.5 shrink-0 text-[#00a6ad]" /> : null}
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">{badges}</div>
          {meta}
          <div className="mt-2 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemix(); }}
              className="rounded-full border border-black/[0.08] bg-[#fffaf2] px-2.5 py-1.5 text-[11px] font-black text-black/55 transition hover:bg-[#171313] hover:text-white"
            >
              Remix
            </button>
            <div className="flex items-center gap-1">
              {onToggleLike && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
                  className={cn('grid h-8 w-8 place-items-center rounded-full transition', isLiked ? 'text-[#ff6f61]' : 'text-black/32 hover:bg-black/[0.06] hover:text-[#ff6f61]')}
                  aria-label={isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  <Heart className={cn('h-4 w-4', isLiked && 'fill-current')} />
                </button>
              )}
              <button
                ref={btnRef}
                type="button"
                aria-label="Plus d'options"
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                className="grid h-8 w-8 place-items-center rounded-full text-black/38 transition hover:bg-black/[0.06] hover:text-[#171313]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <ContextMenu anchorRef={btnRef} open={menuOpen} onClose={closeMenu}>
          <TrackActionMenu
            onReuseTrack={onReuseTrack}
            onCopyLyrics={onCopyLyrics}
            onGenerateCoverVideo={onGenerateCoverVideo}
            isGeneratingCoverVideo={isGeneratingCoverVideo}
            onMoveToFolder={onMoveToFolder}
            folder={folder}
            folderInput={folderInput}
            setFolderInput={setFolderInput}
            commitFolderMove={commitFolderMove}
            onSetSource={onSetSource}
            onTrash={onTrash}
            isTrashed={isTrashed}
            closeMenu={closeMenu}
          />
        </ContextMenu>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 overflow-hidden rounded-[1rem] border px-2.5 py-2 transition-all cursor-pointer before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_18%_0%,rgba(255,111,97,0.18),transparent_42%),radial-gradient(circle_at_86%_30%,rgba(0,194,203,0.16),transparent_38%),linear-gradient(135deg,rgba(255,250,242,0.94),rgba(234,255,251,0.70))] before:opacity-0 before:transition-opacity before:duration-200 hover:before:opacity-100 active:before:opacity-100',
        isSelected || isSource
          ? 'border-[#00a6ad]/35 bg-[#eafffb] shadow-[0_14px_34px_rgba(0,166,173,0.12)] before:opacity-100'
          : 'border-black/[0.07] bg-white/70 hover:border-[#00a6ad]/22 hover:shadow-[0_14px_38px_rgba(0,166,173,0.10)]'
      )}
      onClick={onPick}
    >
      {/* Play overlay on cover */}
      <div className="relative">
        <Cover duration={duration} coverUrl={coverUrl || undefined} />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPlay(); }}
          className="absolute inset-0 flex items-center justify-center rounded-[14px] bg-[#171313]/30 transition-all touch-manipulation active:scale-95 sm:bg-transparent sm:group-hover:bg-[#171313]/40"
          aria-label="Play"
        >
          <Play className="w-5 h-5 fill-current text-white opacity-80 drop-shadow-lg transition-all sm:opacity-0 sm:group-hover:opacity-100" />
        </button>
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13px] font-black text-[#171313]">{title}</span>
          {isSelected ? <Check className="h-3.5 w-3.5 shrink-0 text-[#00a6ad]" /> : null}
          {badges}
        </div>
        {meta}
      </div>

      {/* Actions — like & menu always visible on mobile (touch), remix on hover only */}
      <div className="relative flex items-center gap-1 shrink-0">
        {onToggleLike && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
            className={cn(
              'w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-all touch-manipulation',
              isLiked
                ? 'text-[#ff6f61] hover:text-[#e25549]'
                : 'text-black/30 hover:bg-black/[0.06] hover:text-[#ff6f61] sm:opacity-0 sm:group-hover:opacity-100'
            )}
            aria-label={isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            title={isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className={cn('w-4 h-4 sm:w-3.5 sm:h-3.5', isLiked && 'fill-current')} />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemix(); }}
          className="hidden h-8 w-8 items-center justify-center rounded-full text-black/28 opacity-0 transition-all hover:bg-black/[0.06] hover:text-[#171313] group-hover:opacity-100 sm:flex"
          aria-label="Remix"
          title="Remix"
        >
          <Wand2 className="w-3.5 h-3.5" />
        </button>

        <button
          ref={btnRef}
          type="button"
          aria-label="Plus d'options"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className={cn(
            'w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-all touch-manipulation',
            menuOpen
              ? 'bg-black/[0.08] text-[#171313]'
              : 'text-black/36 hover:bg-black/[0.06] hover:text-[#171313] sm:opacity-0 sm:group-hover:opacity-100'
          )}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        <ContextMenu anchorRef={btnRef} open={menuOpen} onClose={closeMenu}>
          <TrackActionMenu
            onReuseTrack={onReuseTrack}
            onCopyLyrics={onCopyLyrics}
            onGenerateCoverVideo={onGenerateCoverVideo}
            isGeneratingCoverVideo={isGeneratingCoverVideo}
            onMoveToFolder={onMoveToFolder}
            folder={folder}
            folderInput={folderInput}
            setFolderInput={setFolderInput}
            commitFolderMove={commitFolderMove}
            onSetSource={onSetSource}
            onTrash={onTrash}
            isTrashed={isTrashed}
            closeMenu={closeMenu}
          />
        </ContextMenu>
      </div>
    </div>
  );
}

function LiveGenerationPanel({
  live,
  selectedTrackId,
}: {
  live: NonNullable<LibraryMiddlePanelProps['liveGeneration']>;
  selectedTrackId: string | null;
}) {
  const slotCount = Math.max(live.expectedSlots || 2, live.tracks.length, live.visible ? 2 : 0);
  const progress = Math.max(2, Math.min(100, Math.round(Number(live.progress || 0))));
  const slots = Array.from({ length: slotCount });

  if (!live.visible) return null;

  return (
    <div className="mb-3 overflow-hidden rounded-[1.25rem] border border-[#00a6ad]/20 bg-[#eafffb] shadow-[0_16px_42px_rgba(0,166,173,0.10)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#00a6ad]/10 bg-white/55 px-3 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#087b80]">
            {live.isRemix ? 'Remix en direct' : 'Génération en direct'}
          </p>
          <h3 className="mt-0.5 truncate text-sm font-black text-[#171313]">{live.statusLabel}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {live.taskId ? (
            <span className="rounded-full bg-[#171313]/[0.06] px-2.5 py-1 text-[10px] font-black text-black/45">
              #{String(live.taskId).slice(-6)}
            </span>
          ) : null}
          <span className="rounded-full bg-[#171313] px-2.5 py-1 text-[10px] font-black text-white">{progress}%</span>
        </div>
      </div>
      <div className="h-1.5 bg-[#00a6ad]/10">
        <div
          className="h-full rounded-r-full bg-gradient-to-r from-[#ff6f61] via-[#ffd166] to-[#00c2cb] transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      {live.error ? (
        <div className="mx-3 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{live.error}</div>
      ) : null}
      <div className="grid gap-2 p-3 sm:grid-cols-2">
        {slots.map((_, index) => {
          const track = live.tracks[index];
          const ready = Boolean(track?.audioUrl);
          const selected = track && selectedTrackId === String(track.id).replace(/^ai-/, '');
          return (
            <button
              key={`live-generation-slot-${live.taskId || 'task'}-${index}`}
              type="button"
              disabled={!track}
              onClick={() => {
                if (!track) return;
                live.onSelectTrack?.(track);
              }}
              className={cn(
                'relative min-w-0 overflow-hidden rounded-[1rem] border p-2.5 text-left transition before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_20%_0%,rgba(255,111,97,0.18),transparent_42%),radial-gradient(circle_at_90%_20%,rgba(0,194,203,0.16),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(234,255,251,0.72))] before:opacity-0 before:transition-opacity before:duration-200 hover:before:opacity-100 active:before:opacity-100 disabled:cursor-default',
                selected
                  ? 'border-[#00a6ad] bg-white shadow-[0_14px_34px_rgba(0,166,173,0.14)] before:opacity-100'
                  : ready
                    ? 'border-black/[0.08] bg-white/76 hover:border-[#00a6ad]/22 hover:shadow-[0_14px_34px_rgba(0,166,173,0.10)]'
                    : 'border-dashed border-[#00a6ad]/22 bg-white/42'
              )}
            >
              <div className="relative flex min-w-0 items-center gap-3">
                <Cover
                  duration={track?.duration ? formatDuration(Number(track.duration)) : '...'}
                  coverUrl={track?.imageUrl}
                  className="h-14 w-14"
                  rounded="rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-sm font-black text-[#171313]">
                      {track?.title || `Version ${index + 1}`}
                    </p>
                    {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-[#00a6ad]" /> : null}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] font-bold text-black/42">
                    {ready ? 'Preview prête' : 'Préparation du stream...'}
                  </p>
                </div>
                {ready ? (
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      live.onPlayTrack?.(track);
                    }}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#171313] text-white shadow-[0_10px_24px_rgba(20,15,10,0.18)]"
                    aria-label="Lire la preview"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </span>
                ) : (
                  <Sparkles className="h-4 w-4 shrink-0 animate-pulse text-[#00a6ad]/55" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function LibraryMiddlePanel({
  tracks,
  generationsById,
  searchQuery,
  onSearchChange,
  filterBy,
  onFilterByChange,
  sortBy,
  onSortByChange,
  onRefresh,
  remixMode,
  onRemixModeToggle,
  remixSourceTrackId,
  onSetRemixSource,
  onClearRemixSource,
  onPickTrack,
  onPlayTrack,
  onPlayQueue,
  onRemixTrack,
  onReuseTrack,
  onCopyLyrics,
  onToggleLike,
  onTrashTrack,
  onGenerateCoverVideo,
  generatingCoverVideoTrackId,
  onMoveToFolder,
  selectedTrackId,
  liveGeneration,
  likedTrackIds,
  trashedTrackIds,
  loading = false,
  error = null,
}: LibraryMiddlePanelProps) {
  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const sortRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const folderStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const track of tracks) {
      if (trashedTrackIds?.has(track.id)) continue;
      const folder = trackFolder(track) || 'Sans dossier';
      map.set(folder, (map.get(folder) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === 'Sans dossier') return -1;
      if (b[0] === 'Sans dossier') return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [tracks, trashedTrackIds]);

  const trashedCount = trashedTrackIds?.size || 0;
  const activeCount = Math.max(0, tracks.length - trashedCount);
  const publicCount = useMemo(
    () => tracks.filter((track: any) => track.is_public === true || track.generation?.is_public === true).length,
    [tracks],
  );
  const instrumentalCount = useMemo(() => tracks.filter((track) => !trashedTrackIds?.has(track.id) && isInstrumentalTrack(track.prompt || '')).length, [tracks, trashedTrackIds]);
  const voiceCount = Math.max(0, activeCount - instrumentalCount);
  const filterCounts: Record<ChipKey, number> = {
    all: activeCount,
    liked: likedTrackIds?.size || 0,
    instrumental: instrumentalCount,
    voix: voiceCount,
    trashed: trashedCount,
  };

  useEffect(() => {
    if (!sortOpen) return;
    const close = (e: MouseEvent) => {
      if (sortRef.current?.contains(e.target as Node)) return;
      setSortOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('click', close), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', close);
    };
  }, [sortOpen]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = tracks.filter((t) => {
      const matchSearch = !q || (t.title || '').toLowerCase().includes(q) || (t.prompt || '').toLowerCase().includes(q);
      const instrumental = isInstrumentalTrack(t.prompt || '');
      const trashed = trashedTrackIds?.has(t.id) || false;

      if (filterBy === 'trashed') return matchSearch && trashed;
      if (trashed) return false;
      if (selectedFolder !== 'all') {
        const folder = trackFolder(t) || 'Sans dossier';
        if (folder !== selectedFolder) return false;
      }

      const matchFilter =
        filterBy === 'all' ||
        (filterBy === 'liked' && likedTrackIds?.has(t.id)) ||
        (filterBy === 'instrumental' && instrumental) ||
        (filterBy === 'voix' && !instrumental);
      return matchSearch && matchFilter;
    });
    if (sortBy === 'title') list = [...list].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    else if (sortBy === 'oldest') list = [...list].reverse();
    else list = [...list].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return list;
  }, [tracks, searchQuery, filterBy, sortBy, selectedFolder, likedTrackIds, trashedTrackIds]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    listRef.current?.scrollTo({ top: 0 });
  }, [searchQuery, filterBy, sortBy, selectedFolder]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    const el = listRef.current;
    if (!el || !hasMore) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
        setVisibleCount((v) => Math.min(v + PAGE_SIZE, filtered.length));
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasMore, filtered.length]);

  const sourceTrack = useMemo(
    () => (remixSourceTrackId ? tracks.find((t) => t.id === remixSourceTrackId) : null),
    [tracks, remixSourceTrackId]
  );
  const normalizedSelectedTrackId = selectedTrackId ? String(selectedTrackId).replace(/^ai-/, '') : null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#fffaf2] text-[#171313]">
      {/* ── Toolbar ── */}
      <div className="shrink-0 space-y-1.5 border-b border-black/[0.07] bg-[radial-gradient(circle_at_0%_0%,rgba(255,111,97,0.10),transparent_30%),linear-gradient(180deg,#fffaf2,#f5eadb)] px-2.5 pb-2 pt-2">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-[13px] font-black tracking-[-0.02em] text-[#171313]">Bibliothèque IA</h2>
              {selectedFolder !== 'all' ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-black/[0.08] bg-white/70 px-2 py-0.5 text-[9px] font-black text-black/55">
                  <Folder className="h-3 w-3" />
                  {selectedFolder}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-[10px] font-bold text-black/42">
              {filtered.length} affichée{filtered.length > 1 ? 's' : ''} · {activeCount} active{activeCount > 1 ? 's' : ''} · {publicCount} publique{publicCount > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="hidden rounded-full border border-black/[0.08] bg-white/70 p-0.5 shadow-[0_8px_20px_rgba(30,25,20,0.06)] sm:flex">
              {(['list', 'grid'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'rounded-lg px-2 py-1 text-[10px] font-bold transition',
                    viewMode === mode ? 'bg-[#171313] text-white' : 'text-black/45 hover:text-black/75'
                  )}
                >
                  {mode === 'list' ? 'Liste' : 'Grille'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className="grid h-8 w-8 place-items-center rounded-full border border-black/[0.08] bg-white/80 text-black/45 shadow-[0_8px_20px_rgba(30,25,20,0.06)] transition hover:bg-[#171313] hover:text-white"
              aria-label="Actualiser"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/28" />
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher une piste…"
              className="h-8 w-full rounded-full border border-black/[0.08] bg-white/85 pl-8 pr-3 text-xs font-bold text-[#171313] outline-none transition-all placeholder:text-black/28 focus:border-[#171313] focus:bg-white"
              aria-label="Rechercher"
            />
          </div>

          <div className="relative shrink-0" ref={sortRef}>
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              className="flex h-8 items-center gap-1 rounded-full border border-black/[0.08] bg-white/85 px-2.5 text-[11px] font-black text-black/58 transition-all hover:bg-white hover:text-[#171313]"
            >
              {sortBy === 'newest' ? 'Récent' : sortBy === 'oldest' ? 'Ancien' : 'A → Z'}
              <ChevronDown className="h-3.5 w-3.5 text-black/40" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-40 rounded-xl border border-black/[0.08] bg-[#fffaf2]/98 py-1.5 shadow-[0_16px_48px_rgba(30,25,20,.18)] backdrop-blur-2xl">
                {(['newest', 'oldest', 'title'] as SortKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={cn(
                      'w-full px-3 py-2 text-left text-[13px] font-bold rounded-lg transition',
                      sortBy === k ? 'bg-[#171313] text-white' : 'text-black/62 hover:bg-black/[0.05] hover:text-[#171313]'
                    )}
                    onClick={() => { onSortByChange(k); setSortOpen(false); }}
                  >
                    {k === 'newest' ? 'Plus récent' : k === 'oldest' ? 'Plus ancien' : 'Titre A → Z'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="synaura-no-scrollbar flex items-center gap-1.5 overflow-x-auto">
          {CHIPS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onFilterByChange(c.key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black border transition-all',
                filterBy === c.key
                  ? 'border-[#171313] bg-[#171313] text-white shadow-[0_10px_24px_rgba(20,15,10,0.14)]'
                  : 'border-black/[0.08] bg-white/72 text-black/50 hover:bg-white hover:text-[#171313]'
              )}
            >
              {c.icon}
              {c.label}
              <span className={cn(
                'ml-0.5 rounded-full px-1.5 py-0.5 text-[8px] tabular-nums',
                filterBy === c.key ? 'bg-white/16 text-white/78' : 'bg-black/[0.06] text-black/42'
              )}>
                {filterCounts[c.key]}
              </span>
            </button>
          ))}

          <div className="mx-0.5 h-4 w-px shrink-0 bg-black/[0.08]" />

          <button
            type="button"
            onClick={onRemixModeToggle}
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black border transition-all',
              remixMode
                ? 'border-[#00a6ad]/30 bg-[#eafffb] text-[#087b80] shadow-[0_10px_24px_rgba(0,166,173,0.10)]'
                : 'border-black/[0.08] bg-white/72 text-black/50 hover:bg-white hover:text-[#171313]'
            )}
          >
            <Wand2 className="w-3 h-3" />
            Remix
          </button>

          {remixSourceTrackId && (
            <button
              type="button"
              onClick={onClearRemixSource}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#ff6f61]/25 bg-[#ff6f61]/10 px-2.5 py-1 text-[10px] font-black text-[#c7443a] transition-all hover:bg-[#ff6f61]/15"
            >
              <X className="w-3 h-3" />
              {sourceTrack?.title?.slice(0, 20) || 'Source'}
            </button>
          )}

          <div className="ml-auto flex rounded-full border border-black/[0.08] bg-white/72 p-0.5 sm:hidden">
            {(['list', 'grid'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  'rounded-md px-2 py-1 text-[10px] font-bold transition',
                  viewMode === mode ? 'bg-[#171313] text-white' : 'text-black/45'
                )}
              >
                {mode === 'list' ? 'Liste' : 'Grille'}
              </button>
            ))}
          </div>
        </div>

        <div className="synaura-no-scrollbar flex gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedFolder('all')}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black transition',
                selectedFolder === 'all'
                  ? 'border-[#171313] bg-[#171313] text-white'
                  : 'border-black/[0.08] bg-[#fffaf2] text-black/52 hover:bg-white hover:text-[#171313]'
              )}
            >
              <FolderOpen className="h-3 w-3 opacity-60" />
              Tout
              <span className="rounded-full bg-black/[0.06] px-1.5 py-0.5 text-[8px]">{tracks.length - trashedCount}</span>
            </button>
            {folderStats.map(([folder, count]) => (
              <button
                key={folder}
                type="button"
                onClick={() => setSelectedFolder(folder)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black transition',
                  selectedFolder === folder
                    ? 'border-[#00a6ad]/30 bg-[#eafffb] text-[#087b80]'
                    : 'border-black/[0.08] bg-[#fffaf2] text-black/52 hover:bg-white hover:text-[#171313]'
                )}
              >
                <Folder className="h-3 w-3 opacity-60" />
                {folder}
                <span className="rounded-full bg-black/[0.06] px-1.5 py-0.5 text-[8px]">{count}</span>
              </button>
            ))}
        </div>
      </div>

      {/* ── Track list ── */}
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-3 lg:pb-3">
        {liveGeneration?.visible ? (
          <LiveGenerationPanel live={liveGeneration} selectedTrackId={normalizedSelectedTrackId} />
        ) : null}

        {loading ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-[#171313]" />
            <span className="text-sm font-bold text-black/45">Chargement...</span>
          </div>
        ) : error ? (
          <div className="py-20 text-center text-sm font-bold text-red-700">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.1rem] border border-black/[0.08] bg-white shadow-[0_12px_30px_rgba(30,25,20,0.08)]">
              <Sparkles className="h-6 w-6 text-black/20" />
            </div>
            <p className="text-sm font-black text-[#171313]">Aucune piste</p>
            <p className="mt-1 text-[11px] font-bold text-black/38">Change les filtres ou lance une nouvelle création.</p>
          </div>
        ) : (
          <>
            <div className={cn(viewMode === 'grid' ? 'grid grid-cols-2 gap-2 xl:grid-cols-3' : 'space-y-1')}>
              {visible.map((t, visIdx) => {
                const genId = (t as any).generation_id || (t as any).generation?.id;
                const gen = genId ? generationsById.get(String(genId)) || null : null;
                const globalIdx = filtered.indexOf(t);
                const trackIsPublic = (t as any).is_public;
                const isPublished = trackIsPublic === true || (trackIsPublic == null && (gen?.is_public === true || (t as any).generation?.is_public === true));
                return (
                  <TrackRow
                    key={t.id}
                    track={t}
                    gen={gen}
                    isSource={remixSourceTrackId === t.id}
                    isSelected={normalizedSelectedTrackId === String(t.id)}
                    viewMode={viewMode}
                    isLiked={likedTrackIds?.has(t.id) || false}
                    isTrashed={trashedTrackIds?.has(t.id) || false}
                    isPublished={isPublished}
                    onPick={() => onPickTrack(t, gen)}
                    onPlay={() => {
                      onPlayTrack(t, gen);
                      onPlayQueue?.(filtered, globalIdx >= 0 ? globalIdx : 0);
                    }}
                    onRemix={() => onRemixTrack(t)}
                    onSetSource={() => onSetRemixSource(t)}
                    onReuseTrack={onReuseTrack ? () => onReuseTrack(t, gen) : undefined}
                    onCopyLyrics={onCopyLyrics ? () => onCopyLyrics(t, gen) : undefined}
                    onToggleLike={onToggleLike ? () => onToggleLike(t) : undefined}
                    onTrash={onTrashTrack ? () => onTrashTrack(t) : undefined}
                    onGenerateCoverVideo={onGenerateCoverVideo ? () => onGenerateCoverVideo(t, gen) : undefined}
                    isGeneratingCoverVideo={generatingCoverVideoTrackId === t.id}
                    onMoveToFolder={onMoveToFolder ? (folder) => onMoveToFolder(t, folder) : undefined}
                  />
                );
              })}
            </div>

            {/* Load more / counter */}
            <div className="pt-3 pb-1 flex flex-col items-center gap-2">
              {hasMore ? (
                <button
                  type="button"
                  onClick={() => setVisibleCount((v) => Math.min(v + PAGE_SIZE, filtered.length))}
                  className="rounded-full border border-black/[0.08] bg-white px-5 py-2 text-[12px] font-black text-black/55 transition-all hover:bg-[#171313] hover:text-white"
                >
                  Afficher plus ({Math.min(PAGE_SIZE, filtered.length - visibleCount)} sur {filtered.length - visibleCount} restantes)
                </button>
              ) : null}
              <span className="text-[10px] font-bold tabular-nums text-black/28">
                {visible.length} / {filtered.length} piste{filtered.length > 1 ? 's' : ''}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
