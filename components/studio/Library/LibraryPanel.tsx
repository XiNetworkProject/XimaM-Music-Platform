'use client';

import { useMemo, useState } from 'react';
import { Search, RefreshCw, Trash2, Package, X } from 'lucide-react';
import type { StudioTrack } from '@/lib/studio/types';
import { useStudioStore } from '@/lib/studio/store';
import LibraryItemRow from './LibraryItemRow';
import { SUNO_FIELD } from '@/components/ui/sunoClasses';
import ExportPackModal from '@/components/studio/modals/ExportPackModal';
import { notify } from '@/components/NotificationCenter';

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
  const selectedTrackIds = useStudioStore((s) => s.selectedTrackIds);
  const clearSelection = useStudioStore((s) => s.clearSelection);
  const deleteTracksLocal = useStudioStore((s) => s.deleteTracksLocal);

  const [showExport, setShowExport] = useState(false);

  const label = useMemo(() => {
    if (loading) return 'Chargement…';
    if (error) return error;
    return `${tracks.length} track${tracks.length === 1 ? '' : 's'}`;
  }, [loading, error, tracks.length]);

  const selectedTracks = useMemo(() => {
    const set = new Set(selectedTrackIds || []);
    return (tracks || []).filter((t) => set.has(t.id));
  }, [tracks, selectedTrackIds]);

  const onBatchDelete = async () => {
    const ids = (selectedTrackIds || []).slice();
    if (!ids.length) return;
    try {
      // Best-effort: call delete for each selected track
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`/api/ai/tracks/${encodeURIComponent(id)}`, { method: 'DELETE' }))
      );
      const ok = results.filter((r) => r.status === 'fulfilled' && (r.value as Response).ok).length;
      if (ok) deleteTracksLocal(ids);
      notify.success('Studio', `${ok}/${ids.length} track(s) supprimée(s)`);
      clearSelection();
    } catch (e: any) {
      notify.error('Suppression', e?.message || 'Erreur');
    }
  };

  return (
    <div className="panel-suno experience-studio-library h-full min-h-0 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border-secondary flex items-center gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Search className="w-4 h-4 text-foreground-tertiary" />
          <input
            ref={searchRef as any}
            className={`${SUNO_FIELD} h-9`}
            placeholder="Rechercher une version…"
            aria-label="Rechercher dans les versions du studio"
            value={ui.search}
            onChange={(e) => setUI({ search: e.target.value })}
          />
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="h-9 w-9 rounded-xl border border-border-secondary bg-[var(--v2-raised)] hover:bg-[var(--v2-raised)] transition flex items-center justify-center"
          title="Refresh"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <div className="text-[11px] text-foreground-tertiary">{label}</div>
        {selectedTracks.length ? (
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-foreground-tertiary">{selectedTracks.length} selected</div>
            <button
              type="button"
              className="h-8 px-2 rounded-xl border border-border-secondary bg-[var(--v2-raised)] hover:bg-[var(--v2-raised)] transition text-xs flex items-center gap-1"
              onClick={() => setShowExport(true)}
            >
              <Package className="w-4 h-4" />
              Export
            </button>
            <button
              type="button"
              className="h-8 px-2 rounded-xl border border-border-secondary bg-[var(--v2-raised)] hover:bg-[var(--v2-raised)] transition text-xs flex items-center gap-1"
              onClick={onBatchDelete}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              type="button"
              className="h-8 w-8 rounded-xl border border-border-secondary bg-[var(--v2-raised)] hover:bg-[var(--v2-raised)] transition flex items-center justify-center"
              onClick={clearSelection}
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="clip-browser-list-scroller flex-1 min-h-0 overflow-y-auto px-2 pb-3">
        {loading ? <div className="experience-library-loading" role="status"><div aria-hidden="true"><span /><span /><span /></div><span>On retrouve tes versions…</span></div> : null}
        {error ? <div className="experience-library-error" role="alert"><strong>La bibliothèque n’a pas pu s’ouvrir.</strong><p>{error}</p></div> : null}
        {tracks.map((t) => (
          <LibraryItemRow key={t.id} track={t} onPlay={onPlayTrack} />
        ))}
        {!loading && !error && tracks.length === 0 ? (
          <div className="experience-library-empty" data-has-collection={Boolean(ui.search) || undefined}>
            <div className="experience-empty-material" aria-hidden="true"><img src="/brand/chambre/membrane-cobalt.png" alt="" loading="lazy" decoding="async" /><span>A</span><span>B</span></div>
            <p className="v2-kicker">Le studio est ouvert</p>
            <h3>{ui.search ? 'Aucune version correspondante.' : 'Une idée peut tout changer.'}</h3>
            <p>{ui.search ? 'Essaie un autre titre ou efface ta recherche.' : 'Décris ton intention dans Composer. Tes versions apparaîtront ici pour l’écoute et la comparaison.'}</p>
          </div>
        ) : null}
      </div>

      <ExportPackModal
        isOpen={showExport}
        tracks={selectedTracks}
        onClose={() => setShowExport(false)}
      />
    </div>
  );
}

