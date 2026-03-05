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
} from 'lucide-react';
import type { AITrack, AIGeneration } from '@/lib/aiGenerationService';

type ChipKey = 'all' | 'instrumental' | 'voix' | 'liked' | 'trashed';
type SortKey = 'newest' | 'oldest' | 'title';

const CHIPS: Array<{ key: ChipKey; label: string; icon?: React.ReactNode }> = [
  { key: 'all', label: 'Tout' },
  { key: 'liked', label: 'Likés', icon: <Heart className="w-3 h-3" /> },
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

function sanitizeCoverUrl(url?: string): string {
  if (!url?.trim()) return '';
  const t = url.trim();
  if (t.startsWith('/')) return t;
  try {
    const host = new URL(t).hostname.toLowerCase();
    if (host === 'musicfile.api.box' || host.endsWith('.musicfile.api.box')) return '';
  } catch {}
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

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const menuW = 220;
    let left = rect.right - menuW;
    if (left < 8) left = 8;
    setPos({ top: rect.bottom + 6, left });
  }, [open, anchorRef]);

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

  return createPortal(
    <div
      className="fixed z-[9999] w-[220px] rounded-xl border border-white/10 bg-[#121218]/98 backdrop-blur-2xl py-1.5 shadow-[0_16px_64px_rgba(0,0,0,.7)]"
      style={{ top: pos.top, left: pos.left }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

function Cover({ duration, coverUrl }: { duration: string; coverUrl?: string }) {
  return (
    <div className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[14px] bg-white/[0.06] ring-1 ring-white/[0.08]">
      {coverUrl ? (
        <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/25 via-violet-500/20 to-fuchsia-500/15 flex items-center justify-center">
          <Music2 className="w-5 h-5 text-white/15" />
        </div>
      )}
      <div className="absolute bottom-[3px] left-[3px] rounded-[5px] bg-black/60 px-[5px] py-[1px] text-[9px] font-semibold text-white/90 tabular-nums backdrop-blur-sm">
        {duration}
      </div>
    </div>
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
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const title = track.title || 'Sans titre';
  const subtitle = (track.prompt || gen?.prompt || '').slice(0, 90);
  const duration = formatDuration(Number(track.duration) || 0);
  let coverUrl = sanitizeCoverUrl(track.image_url);
  if (!coverUrl && (track as any).source_links) {
    try {
      const links = JSON.parse((track as any).source_links);
      coverUrl = sanitizeCoverUrl(links?.image || links?.image_url || links?.cover);
    } catch {}
  }
  const model = (track.model_name || gen?.model || 'v5').replace(/^V/, 'v').toLowerCase();

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-[14px] border px-3 py-2.5 transition-all cursor-pointer',
        isSource
          ? 'border-cyan-400/20 bg-cyan-500/[0.08] hover:bg-cyan-500/[0.12]'
          : 'border-white/[0.07] bg-white/[0.05] hover:bg-white/[0.09] hover:border-white/[0.12]'
      )}
      onClick={onPick}
    >
      {/* Play overlay on cover */}
      <div className="relative">
        <Cover duration={duration} coverUrl={coverUrl || undefined} />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPlay(); }}
          className="absolute inset-0 flex items-center justify-center rounded-[14px] bg-black/0 group-hover:bg-black/40 transition-all"
          aria-label="Play"
        >
          <Play className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 fill-current drop-shadow-lg transition-all scale-90 group-hover:scale-100" />
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-white/95">{title}</span>
          <span className="shrink-0 rounded-md bg-white/[0.08] px-1.5 py-px text-[9px] font-semibold text-white/50 uppercase tracking-wider">
            {model}
          </span>
          {isPublished && (
            <span className="shrink-0 rounded-md bg-emerald-400/15 px-1.5 py-px text-[9px] font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-0.5">
              <Globe className="w-2.5 h-2.5" /> publié
            </span>
          )}
          {isSource && (
            <span className="shrink-0 rounded-md bg-cyan-400/15 px-1.5 py-px text-[9px] font-semibold text-cyan-200 uppercase tracking-wider">
              src
            </span>
          )}
        </div>
        {subtitle ? (
          <div className="mt-0.5 truncate text-[11px] text-white/40 leading-snug">{subtitle}</div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {onToggleLike && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-full transition-all',
              isLiked
                ? 'text-rose-400 hover:text-rose-300'
                : 'text-white/20 hover:text-rose-400 hover:bg-white/[0.08] opacity-0 group-hover:opacity-100'
            )}
            aria-label={isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            title={isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className={cn('w-3.5 h-3.5', isLiked && 'fill-current')} />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemix(); }}
          className="w-8 h-8 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all opacity-0 group-hover:opacity-100"
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
            'w-8 h-8 flex items-center justify-center rounded-full transition-all',
            menuOpen
              ? 'bg-white/[0.12] text-white'
              : 'text-white/30 hover:text-white/70 hover:bg-white/[0.08] opacity-0 group-hover:opacity-100'
          )}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        <ContextMenu anchorRef={btnRef} open={menuOpen} onClose={closeMenu}>
          <div className="px-2 py-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Actions</div>
          {onReuseTrack && (
            <button
              type="button"
              onClick={() => { onReuseTrack(); closeMenu(); }}
              className="w-full px-3 py-2 text-left text-[13px] text-white/80 hover:bg-white/[0.06] flex items-center gap-2.5 rounded-lg mx-auto transition"
            >
              <Repeat className="h-4 w-4 text-white/35 shrink-0" />
              Réutiliser les paramètres
            </button>
          )}
          {onCopyLyrics && (
            <button
              type="button"
              onClick={() => { onCopyLyrics(); closeMenu(); }}
              className="w-full px-3 py-2 text-left text-[13px] text-white/80 hover:bg-white/[0.06] flex items-center gap-2.5 rounded-lg mx-auto transition"
            >
              <Copy className="h-4 w-4 text-white/35 shrink-0" />
              Copier les paroles
            </button>
          )}
          <div className="my-1 mx-2 h-px bg-white/[0.06]" />
          <button
            type="button"
            onClick={() => { onSetSource(); closeMenu(); }}
            className="w-full px-3 py-2 text-left text-[13px] text-cyan-200/90 hover:bg-cyan-500/[0.08] flex items-center gap-2.5 rounded-lg mx-auto transition"
          >
            <Wand2 className="h-4 w-4 text-cyan-400/50 shrink-0" />
            Source remix
          </button>
          {onTrash && (
            <>
              <div className="my-1 mx-2 h-px bg-white/[0.06]" />
              <button
                type="button"
                onClick={() => { onTrash(); closeMenu(); }}
                className={cn(
                  'w-full px-3 py-2 text-left text-[13px] flex items-center gap-2.5 rounded-lg mx-auto transition',
                  isTrashed
                    ? 'text-emerald-200/90 hover:bg-emerald-500/[0.08]'
                    : 'text-rose-200/90 hover:bg-rose-500/[0.08]'
                )}
              >
                {isTrashed ? (
                  <><ArchiveRestore className="h-4 w-4 text-emerald-400/50 shrink-0" /> Restaurer</>
                ) : (
                  <><Trash2 className="h-4 w-4 text-rose-400/50 shrink-0" /> Mettre à la corbeille</>
                )}
              </button>
            </>
          )}
        </ContextMenu>
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
  likedTrackIds,
  trashedTrackIds,
  loading = false,
  error = null,
}: LibraryMiddlePanelProps) {
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
  }, [tracks, searchQuery, filterBy, sortBy, likedTrackIds, trashedTrackIds]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    listRef.current?.scrollTo({ top: 0 });
  }, [searchQuery, filterBy, sortBy]);

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

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      {/* ── Toolbar ── */}
      <div className="shrink-0 px-4 pt-4 pb-3 space-y-2.5">
        {/* Search row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher une piste…"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.06] pl-10 pr-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-indigo-400/40 focus:bg-white/[0.08] transition-all"
              aria-label="Rechercher"
            />
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="h-10 w-10 shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.10] transition-all text-white/50 hover:text-white"
            aria-label="Actualiser"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>

          <div className="relative shrink-0" ref={sortRef}>
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.06] px-3.5 flex items-center text-xs font-medium text-white/70 hover:bg-white/[0.10] transition-all gap-1.5"
            >
              {sortBy === 'newest' ? 'Récent' : sortBy === 'oldest' ? 'Ancien' : 'A → Z'}
              <ChevronDown className="h-3.5 w-3.5 text-white/40" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-2 w-40 rounded-xl border border-white/10 bg-[#121218]/98 backdrop-blur-2xl py-1.5 shadow-[0_16px_64px_rgba(0,0,0,.7)] z-50">
                {(['newest', 'oldest', 'title'] as SortKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={cn(
                      'w-full px-3 py-2 text-left text-[13px] rounded-lg transition',
                      sortBy === k ? 'text-white bg-white/[0.06]' : 'text-white/70 hover:bg-white/[0.06]'
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

        {/* Chips row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {CHIPS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onFilterByChange(c.key)}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold border transition-all',
                filterBy === c.key
                  ? 'border-indigo-400/30 bg-indigo-500/15 text-indigo-200 shadow-sm shadow-indigo-500/10'
                  : 'border-white/[0.08] bg-white/[0.05] text-white/60 hover:bg-white/[0.09] hover:text-white/80'
              )}
            >
              {c.icon}
              {c.label}
            </button>
          ))}

          <div className="w-px h-5 bg-white/[0.08] mx-1" />

          <button
            type="button"
            onClick={onRemixModeToggle}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold border transition-all',
              remixMode
                ? 'border-cyan-400/30 bg-cyan-500/15 text-cyan-200 shadow-sm shadow-cyan-500/10'
                : 'border-white/[0.08] bg-white/[0.05] text-white/60 hover:bg-white/[0.09]'
            )}
          >
            <Wand2 className="w-3 h-3" />
            Remix
          </button>

          {remixSourceTrackId && (
            <button
              type="button"
              onClick={onClearRemixSource}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-400/25 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-200 hover:bg-rose-500/15 transition-all"
            >
              <X className="w-3 h-3" />
              {sourceTrack?.title?.slice(0, 20) || 'Source'}
            </button>
          )}

          <span className="ml-auto text-[10px] text-white/30 tabular-nums font-medium">{filtered.length}</span>
        </div>
      </div>

      {/* ── Track list ── */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-400/20 border-t-indigo-400 animate-spin mx-auto mb-4" />
            <span className="text-sm text-white/50">Chargement…</span>
          </div>
        ) : error ? (
          <div className="py-20 text-center text-sm text-red-300/80">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-white/15" />
            </div>
            <p className="text-sm font-medium text-white/45">Aucune piste</p>
            <p className="text-[11px] text-white/25 mt-1">Génère ta première musique pour la voir ici</p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {visible.map((t, visIdx) => {
                const genId = (t as any).generation_id || (t as any).generation?.id;
                const gen = genId ? generationsById.get(String(genId)) || null : null;
                const globalIdx = filtered.indexOf(t);
                const isPublished = gen?.is_public === true || (t as any).generation?.is_public === true;
                return (
                  <TrackRow
                    key={t.id}
                    track={t}
                    gen={gen}
                    isSource={remixSourceTrackId === t.id}
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
                  className="px-5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.05] text-[12px] font-medium text-white/60 hover:bg-white/[0.09] hover:text-white/80 transition-all"
                >
                  Afficher plus ({Math.min(PAGE_SIZE, filtered.length - visibleCount)} sur {filtered.length - visibleCount} restantes)
                </button>
              ) : null}
              <span className="text-[10px] text-white/20 tabular-nums">
                {visible.length} / {filtered.length} piste{filtered.length > 1 ? 's' : ''}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
