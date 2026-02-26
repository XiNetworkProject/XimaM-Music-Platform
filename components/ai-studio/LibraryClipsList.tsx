'use client';

import { useMemo } from 'react';
import { Play, Music } from 'lucide-react';
import { SUNO_ICON_PILL, SUNO_BTN_BASE } from '@/components/ui/sunoClasses';
import type { AITrack, AIGeneration } from '@/lib/aiGenerationService';

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
  onResetFilters,
}: LibraryClipsListProps) {
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
      <div className="clip-browser-list-scroller min-h-0 h-full overflow-y-auto">
        {loading ? (
          <div className="p-4 text-foreground-tertiary text-sm">Chargement…</div>
        ) : error ? (
          <div className="p-4 text-red-400 text-sm">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-foreground-secondary">No songs found</div>
            <div className="mt-4">
              <button type="button" onClick={onResetFilters} className={SUNO_BTN_BASE}>
                <span className="relative">Reset filters</span>
              </button>
            </div>
          </div>
        ) : (
          <div role="rowgroup" className="divide-y divide-border-primary/40">
            {items.map((t) => {
              const genId = (t as any).generation_id || (t as any).generation?.id;
              const gen = genId ? generationsById.get(String(genId)) || null : null;
              const title = t.title || 'Musique générée';
              let cover = sanitizeCoverUrl(t.image_url) || '/synaura_symbol.svg';
              if ((!cover || cover === '/synaura_symbol.svg') && (t as any).source_links) {
                try {
                  const links = JSON.parse((t as any).source_links);
                  cover = sanitizeCoverUrl(
                    links?.image || links?.image_url || links?.imageUrl || links?.cover || links?.cover_url
                  ) || cover;
                } catch {}
              }

              return (
                <div
                  key={t.id}
                  className="studio-rack-row group flex items-center gap-3 px-3 py-2 hover:bg-overlay-on-primary cursor-pointer"
                  onClick={() => onPickTrack(t, gen)}
                  role="row"
                >
                  <div className="studio-rack-led" aria-hidden="true" />
                  <div className="w-10 h-10 rounded-xl bg-background-tertiary border border-border-primary overflow-hidden flex items-center justify-center shrink-0">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt={title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.src.endsWith('/synaura_symbol.svg')) return;
                          img.src = '/synaura_symbol.svg';
                        }}
                      />
                    ) : (
                      <Music className="w-5 h-5 text-foreground-tertiary" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-foreground-primary truncate">{title}</div>
                    <div className="text-[11px] text-foreground-tertiary truncate">
                      {(t.prompt || gen?.prompt || '').slice(0, 120)}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`${SUNO_ICON_PILL} opacity-0 group-hover:opacity-100 transition-opacity`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack(t, gen);
                    }}
                    aria-label="Play"
                    title="Play"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

