'use client';

import { useCallback, useMemo, useState } from 'react';
import StudioBackground from '@/components/StudioBackground';
import { LibraryToolbar, type LibraryFilterBy, type LibrarySortBy } from '@/components/studio/LibraryToolbar';
import { TrackRowStudio, type LibraryTrackMinimal } from '@/components/studio/TrackRowStudio';

const MOCK_TRACKS: LibraryTrackMinimal[] = [
  { id: '1', title: 'Le Royaume Des Couleurs Générique Français', durationSec: 104, modelTag: 'v5', description: 'anime, electro, orchestral, 808 bass', coverUrl: '', createdAt: '2025-03-01T12:00:00Z' },
  { id: '2', title: 'Les Mystérieuses Cités d\'Or - French Opening', durationSec: 143, modelTag: 'v5', description: 'French TikTok dance remix, modern playful club beat, 138–140 BPM', coverUrl: '', createdAt: '2025-03-02T10:00:00Z' },
  { id: '3', title: 'Titi Rage sur Open Front', durationSec: 193, modelTag: 'v5', description: 'French electro pop / EDM humorous, 128 BPM, catchy hook, bouncy bass', coverUrl: '', createdAt: '2025-03-03T14:00:00Z' },
  { id: '4', title: 'Sunny vs Luna : Battle MEOW', durationSec: 181, modelTag: 'v5', description: 'epic electro-orchestral, cartoon-fight, light dubstep, cat FX', coverUrl: '', createdAt: '2025-03-04T09:00:00Z' },
  { id: '5', title: 'Instrumental Chill Beats', durationSec: 120, modelTag: 'v5', description: 'Instrumental lofi hip hop, smooth piano, vinyl crackle, 85 BPM', coverUrl: '', createdAt: '2025-03-05T11:00:00Z' },
];

function isInstrumentalText(s: string): boolean {
  return s.toLowerCase().includes('instrumental');
}

export default function StudioLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<LibraryFilterBy>('all');
  const [sortBy, setSortBy] = useState<LibrarySortBy>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRemixMode, setIsRemixMode] = useState(false);
  const [remixSourceLabel, setRemixSourceLabel] = useState<string | null>(null);
  const [tracks, setTracks] = useState<LibraryTrackMinimal[]>(MOCK_TRACKS);
  const [loading, setLoading] = useState(false);

  const hasRemixSource = remixSourceLabel != null && remixSourceLabel.length > 0;

  const clearRemixSource = useCallback(() => {
    setRemixSourceLabel(null);
    if (typeof window !== 'undefined') console.log('[Library] Retirer source remix');
  }, []);

  const onRefresh = useCallback(() => {
    setLoading(true);
    if (typeof window !== 'undefined') console.log('[Library] Refresh');
    setTimeout(() => {
      setTracks((prev) => [...prev]);
      setLoading(false);
    }, 400);
  }, []);

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = tracks.filter((t) => {
      const matchSearch = !q || (t.title || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
      const instrumental = isInstrumentalText(t.description || '');
      const matchFilter =
        filterBy === 'all' ||
        (filterBy === 'instrumental' && instrumental) ||
        (filterBy === 'with-lyrics' && !instrumental);
      return matchSearch && matchFilter;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      const aT = new Date(a.createdAt || 0).getTime();
      const bT = new Date(b.createdAt || 0).getTime();
      return sortBy === 'newest' ? bT - aT : aT - bT;
    });
    return list;
  }, [tracks, searchQuery, filterBy, sortBy]);

  const toggleSelect = useCallback((id: string, options?: { multi?: boolean; range?: boolean }) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onPick = useCallback((track: LibraryTrackMinimal) => {
    if (typeof window !== 'undefined') console.log('[Library] onPick', track.id, track.title);
  }, []);

  const onPlay = useCallback((track: LibraryTrackMinimal) => {
    if (typeof window !== 'undefined') console.log('[Library] onPlay', track.id, track.title);
  }, []);

  const onRemix = useCallback((track: LibraryTrackMinimal) => {
    if (typeof window !== 'undefined') console.log('[Library] onRemix', track.id, track.title);
    setRemixSourceLabel(track.title);
  }, []);

  const onReuseTrack = useCallback((track: LibraryTrackMinimal) => {
    if (typeof window !== 'undefined') console.log('[Library] onReuseTrack', track.id, track.title);
  }, []);

  const onCopyLyrics = useCallback((track: LibraryTrackMinimal) => {
    if (typeof window !== 'undefined') console.log('[Library] onCopyLyrics', track.id, track.title);
  }, []);

  return (
    <div className="min-h-screen relative">
      <StudioBackground />
      <div
        className="relative z-10 flex flex-col min-h-screen max-w-4xl mx-auto"
        style={{
          background: 'linear-gradient(180deg, rgba(88,28,135,0.08) 0%, transparent 30%, transparent 70%, rgba(139,92,246,0.06) 100%)',
        }}
      >
        <div className="flex-1 flex flex-col overflow-hidden border border-white/10 rounded-2xl bg-background-primary/80 backdrop-blur mx-2 my-2 md:mx-4 md:my-4">
          <header className="p-3 border-b border-border-primary/60">
            <h1 className="text-lg font-semibold text-foreground-primary">Bibliothèque Studio</h1>
            <p className="text-[11px] text-foreground-tertiary mt-0.5">Vos pistes et remix</p>
          </header>

          <LibraryToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterBy={filterBy}
            onFilterByChange={setFilterBy}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            onRefresh={onRefresh}
            isRemixMode={isRemixMode}
            onRemixModeToggle={() => setIsRemixMode((v) => !v)}
            remixSourceLabel={remixSourceLabel}
            onClearRemixSource={clearRemixSource}
            hasRemixSource={hasRemixSource}
          />

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-foreground-tertiary text-sm">Chargement…</div>
            ) : filteredAndSorted.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-foreground-secondary text-sm">Aucune piste trouvée.</p>
              </div>
            ) : (
              <div role="rowgroup" className="divide-y divide-border-primary/40">
                {filteredAndSorted.map((track) => (
                  <TrackRowStudio
                    key={track.id}
                    track={track}
                    isSelected={selectedIds.has(track.id)}
                    onToggleSelect={toggleSelect}
                    onPick={onPick}
                    onPlay={onPlay}
                    onRemix={onRemix}
                    onReuseTrack={onReuseTrack}
                    onCopyLyrics={onCopyLyrics}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
