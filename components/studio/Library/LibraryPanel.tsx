'use client';

import { useMemo } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import type { StudioTrack } from '@/lib/studio/types';
import { useStudioStore } from '@/lib/studio/store';
import LibraryItemRow from './LibraryItemRow';
import { SUNO_FIELD } from '@/components/ui/sunoClasses';

export default function LibraryPanel({
  tracks,
  loading,
  error,
  onRefresh,
  searchRef,
  onPlayTrack,
}: {
  tracks: StudioTrack[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  onPlayTrack: (track: StudioTrack) => void;
}) {
  const ui = useStudioStore((s) => s.ui);
  const setUI = useStudioStore((s) => s.setUI);

  const label = useMemo(() => {
    if (loading) return 'Chargement…';
    if (error) return error;
    return `${tracks.length} track${tracks.length === 1 ? '' : 's'}`;
  }, [loading, error, tracks.length]);

  return (
    <div className="panel-suno h-full min-h-0 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border-secondary flex items-center gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Search className="w-4 h-4 text-foreground-tertiary" />
          <input
            ref={searchRef as any}
            className={`${SUNO_FIELD} h-9`}
            placeholder="Search (Ctrl/Cmd+F)"
            value={ui.search}
            onChange={(e) => setUI({ search: e.target.value })}
          />
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="h-9 w-9 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
          title="Refresh"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 py-2 text-[11px] text-foreground-tertiary">{label}</div>

      <div className="clip-browser-list-scroller flex-1 min-h-0 overflow-y-auto px-2 pb-3">
        {tracks.map((t) => (
          <LibraryItemRow key={t.id} track={t} onPlay={onPlayTrack} />
        ))}
        {!loading && !error && tracks.length === 0 ? (
          <div className="p-4 text-sm text-foreground-tertiary">Aucun résultat.</div>
        ) : null}
      </div>
    </div>
  );
}

