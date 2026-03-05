'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { Play, Music, Wand2, MoreVertical, Copy, RotateCcw } from 'lucide-react';
import type { AITrack, AIGeneration } from '@/lib/aiGenerationService';

function formatDuration(sec: number): string {
  if (!sec && sec !== 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

type SortBy = 'newest' | 'oldest' | 'title';
type FilterBy = 'all' | 'instrumental' | 'with-lyrics';

interface LibraryClipsListProps {
  tracks: AITrack[];
  generationsById: Map<string, AIGeneration>;
  searchQuery: string;
  sortBy: SortBy;
  filterBy: FilterBy;
  loading: boolean;
  error: string | null;
  onPickTrack: (track: AITrack, generation: AIGeneration | null) => void;
  onPlayTrack: (track: AITrack, generation: AIGeneration | null) => void;
  onRemixTrack: (track: AITrack, generation: AIGeneration | null) => void;
  onReuseTrack?: (track: AITrack, generation: AIGeneration | null) => void;
  onCopyLyrics?: (track: AITrack, generation: AIGeneration | null) => void;
  onResetFilters: () => void;
}

function isInstrumentalText(s: string) {
  return s.toLowerCase().includes('instrumental');
}

function sanitizeCoverUrl(url?: string) {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    if (
      host === 'musicfile.api.box' ||
      host.endsWith('.musicfile.api.box')
    ) {
      return '';
    }
  } catch {
    return '';
  }
  return trimmed;
}

export function LibraryClipsList({
  tracks,
  generationsById,
  searchQuery,
  sortBy,
  filterBy,
  loading,
  error,
  onPickTrack,
  onPlayTrack,
  onRemixTrack,
  onReuseTrack,
  onCopyLyrics,
  onResetFilters,
}: LibraryClipsListProps) {
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

  const items = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = tracks.filter((t) => {
      const title = (t.title || '').toLowerCase();
      const prompt = (t.prompt || '').toLowerCase();
      const matchesSearch = !q || title.includes(q) || prompt.includes(q);

      const instrumental = isInstrumentalText(t.prompt || '');
      const matchesFilter =
        filterBy === 'all' ||
        (filterBy === 'instrumental' && instrumental) ||
        (filterBy === 'with-lyrics' && !instrumental);

      return matchesSearch && matchesFilter;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      const aT = new Date(a.created_at || 0).getTime();
      const bT = new Date(b.created_at || 0).getTime();
      return sortBy === 'newest' ? bT - aT : aT - bT;
    });

    return filtered;
  }, [tracks, searchQuery, sortBy, filterBy]);

  return (
    <div className="flex-1 min-h-0">
      <div className="min-h-0 h-full overflow-y-auto">
        {loading ? (
          <div className="p-6 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 text-red-400/80 text-sm">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-white/40">Aucun titre trouvé</p>
            <button
              type="button"
              onClick={onResetFilters}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white/60 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div role="rowgroup">
            {items.map((t) => {
              const genId = (t as any).generation_id || (t as any).generation?.id;
              const gen = genId ? generationsById.get(String(genId)) || null : null;
              const title = t.title || 'Musique générée';
              const durationSec = Number((t as any).duration) || 0;
              let cover = sanitizeCoverUrl(t.image_url) || '/synaura_symbol.svg';
              if ((!cover || cover === '/synaura_symbol.svg') && (t as any).source_links) {
                try {
                  const links = JSON.parse((t as any).source_links);
                  cover = sanitizeCoverUrl(
                    links?.image || links?.image_url || links?.imageUrl || links?.cover || links?.cover_url
                  ) || cover;
                } catch {}
              }
              const promptText = (t.prompt || gen?.prompt || '').slice(0, 200);

              return (
                <div
                  key={t.id}
                  className={`group flex items-center gap-3 px-3 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors ${openMenuId === t.id ? 'relative z-30 bg-white/[0.03]' : ''}`}
                  role="row"
                  aria-label={title}
                >
                  {/* Cover */}
                  <div
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/[0.04] cursor-pointer flex items-center justify-center"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack(t, gen);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && onPlayTrack(t, gen)}
                    aria-label={`Lire ${title}`}
                  >
                    {cover && cover !== '/synaura_symbol.svg' ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cover}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (img.src.endsWith('/synaura_symbol.svg')) return;
                            img.src = '/synaura_symbol.svg';
                          }}
                        />
                        <div className="absolute inset-0 hidden items-center justify-center bg-black/50 group-hover:flex">
                          <Play className="w-5 h-5 text-white" fill="currentColor" />
                        </div>
                        {durationSec > 0 && (
                          <div className="absolute bottom-0 left-0 rounded-tr-md bg-black/70 px-1 py-0.5 font-mono text-[9px] text-white/80 tabular-nums">
                            {formatDuration(durationSec)}
                          </div>
                        )}
                      </>
                    ) : (
                      <Music className="w-5 h-5 text-white/25" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <button
                      type="button"
                      className="text-left text-sm font-medium text-white/80 truncate max-w-full block hover:text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPickTrack(t, gen);
                      }}
                    >
                      {title}
                    </button>
                    {promptText && (
                      <p className="truncate text-[11px] text-white/30">{promptText}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/50 hover:bg-white/[0.12] hover:text-white/80 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemixTrack(t, gen);
                      }}
                      aria-label="Remix"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                    </button>
                    {(onReuseTrack || onCopyLyrics) && (
                      <div className="relative" ref={openMenuId === t.id ? menuRef : undefined}>
                        <button
                          type="button"
                          className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/50 hover:bg-white/[0.12] hover:text-white/80 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId((prev) => (prev === t.id ? null : t.id));
                          }}
                          aria-label="Menu"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {openMenuId === t.id && (
                          <div
                            className="absolute right-0 top-full mt-1 py-1 min-w-[200px] rounded-xl bg-[#0c0c14]/98 backdrop-blur-xl border border-white/[0.08] shadow-[0_10px_40px_rgba(0,0,0,.6)] z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {onReuseTrack && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReuseTrack(t, gen);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-left text-xs text-white/70 hover:bg-white/[0.06] flex items-center gap-2 transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5 shrink-0 text-white/40" />
                                Réutiliser titre, style et paroles
                              </button>
                            )}
                            {onCopyLyrics && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCopyLyrics(t, gen);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-left text-xs text-white/70 hover:bg-white/[0.06] flex items-center gap-2 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5 shrink-0 text-white/40" />
                                Copier les paroles
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
