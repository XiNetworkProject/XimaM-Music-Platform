'use client';

import { useMemo } from 'react';
import { Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { BackgroundGeneration } from '@/hooks/useBackgroundGeneration';
import type { StudioTrack } from '@/lib/studio/types';
import { useAudioPlayer } from '@/app/providers';
import { useStudioStore } from '@/lib/studio/store';
import LibraryPanel from '@/components/studio/Library/LibraryPanel';
import QueuePanel from '@/components/studio/Center/QueuePanel';

function statusChip(g: BackgroundGeneration) {
  if (g.status === 'pending') return { label: 'running', icon: <Loader2 className="w-3 h-3 animate-spin" /> };
  if (g.status === 'completed') return { label: 'done', icon: <CheckCircle2 className="w-3 h-3" /> };
  return { label: 'failed', icon: <XCircle className="w-3 h-3" /> };
}

export default function StudioTimeline({
  tracks,
  loading,
  error,
  bgGenerations,
  onRefreshLibrary,
  searchRef,
}: {
  tracks: StudioTrack[];
  loading: boolean;
  error: string | null;
  bgGenerations: BackgroundGeneration[];
  onRefreshLibrary: () => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { setQueueAndPlay } = useAudioPlayer();
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const mobileTab = useStudioStore((s) => s.ui.mobileTab);
  const jobs = useStudioStore((s) => s.jobs);

  const sortedJobs = useMemo(() => {
    const pid = activeProjectId || 'project_default';
    const copy = [...(jobs || [])].filter((j) => (j.projectId || 'project_default') === pid);
    copy.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return copy.slice(0, 30);
  }, [jobs, activeProjectId]);

  const onPlayTrack = (t: StudioTrack) => {
    const playerTrack: any = {
      _id: `ai-${t.id}`,
      title: t.title,
      artist: { _id: 'ai', name: t.artistName, username: t.artistName },
      duration: t.durationSec || 120,
      audioUrl: t.audioUrl || '',
      coverUrl: t.coverUrl || '/synaura_symbol.svg',
      genre: ['IA', 'Généré'],
      plays: 0,
      likes: [],
      comments: [],
      lyrics: (t.lyrics || t.prompt || '').trim(),
    };
    // Play in a queue to allow next/prev inside the library
    const queue = tracks.map((x) => ({
      _id: `ai-${x.id}`,
      title: x.title,
      artist: { _id: 'ai', name: x.artistName, username: x.artistName },
      duration: x.durationSec || 120,
      audioUrl: x.audioUrl || '',
      coverUrl: x.coverUrl || '/synaura_symbol.svg',
      genre: ['IA', 'Généré'],
      plays: 0,
      likes: [],
      comments: [],
      lyrics: (x.lyrics || x.prompt || '').trim(),
    }));
    const idx = tracks.findIndex((x) => x.id === t.id);
    setQueueAndPlay(queue as any, Math.max(0, idx));
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <QueuePanel />

      {mobileTab !== 'library' ? (
        <div className="panel-suno overflow-hidden">
          <div className="p-3 border-b border-border-secondary">
            <div className="text-[11px] text-foreground-tertiary">CENTER</div>
            <div className="text-sm font-semibold text-foreground-primary">Timeline</div>
          </div>

          <div className="min-h-0 overflow-y-auto p-3">
            {sortedJobs.length === 0 ? (
              <div className="text-sm text-foreground-tertiary">Aucun job en cours.</div>
            ) : (
              <div className="grid gap-2">
                {sortedJobs.map((j) => {
                  const bg = (bgGenerations || []).find((x) => x.taskId === j.id) || null;
                  const chip = bg ? statusChip(bg) : { label: j.status, icon: <Clock className="w-3 h-3" /> };
                  return (
                    <div
                      key={j.id}
                      className="rounded-xl border border-border-secondary bg-white/5 px-3 py-2 flex items-center gap-3"
                    >
                      <div className="text-foreground-tertiary">{chip.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-foreground-primary truncate">
                          {j.paramsSnapshot?.title || j.paramsSnapshot?.prompt || 'Génération'}
                        </div>
                        <div className="text-[11px] text-foreground-tertiary truncate">
                          {j.paramsSnapshot?.style || j.paramsSnapshot?.model || ''}
                        </div>
                      </div>
                      <div className="text-[11px] text-foreground-tertiary flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {chip.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {mobileTab !== 'timeline' ? (
        <LibraryPanel
          tracks={tracks}
          loading={loading}
          error={error}
          onRefresh={onRefreshLibrary}
          searchRef={searchRef}
          onPlayTrack={onPlayTrack}
        />
      ) : null}
    </div>
  );
}

