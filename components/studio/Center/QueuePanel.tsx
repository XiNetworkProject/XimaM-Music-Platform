'use client';

import { useMemo } from 'react';
import { Play, Pause, RefreshCw } from 'lucide-react';
import { useStudioStore } from '@/lib/studio/store';

export default function QueuePanel() {
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const queueItems = useStudioStore((s) => s.queueItems);
  const queueConfig = useStudioStore((s) => s.queueConfig);
  const setQueueConfig = useStudioStore((s) => s.setQueueConfig);
  const retryQueueItem = useStudioStore((s) => s.retryQueueItem);

  const items = useMemo(() => {
    const pid = activeProjectId || 'project_default';
    return (queueItems || [])
      .filter((q) => (q.projectId || 'project_default') === pid)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [queueItems, activeProjectId]);

  const counts = useMemo(() => {
    const pending = items.filter((i) => i.status === 'pending').length;
    const running = items.filter((i) => i.status === 'running').length;
    const done = items.filter((i) => i.status === 'done').length;
    const failed = items.filter((i) => i.status === 'failed').length;
    return { pending, running, done, failed };
  }, [items]);

  return (
    <div className="panel-suno overflow-hidden">
      <div className="p-3 border-b border-border-secondary flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-foreground-tertiary">QUEUE</div>
          <div className="text-sm font-semibold text-foreground-primary">
            {counts.running} running · {counts.pending} pending · {counts.failed} failed
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="h-9 px-2 rounded-xl border border-border-secondary bg-white/5 text-sm"
            value={queueConfig.maxConcurrency}
            onChange={(e) => setQueueConfig({ maxConcurrency: Number(e.target.value) as any })}
            title="Max concurrency"
          >
            <option value={1}>1 job</option>
            <option value={2}>2 jobs</option>
            <option value={3}>3 jobs</option>
          </select>

          <button
            type="button"
            className="h-9 w-9 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
            onClick={() => setQueueConfig({ autoRun: !queueConfig.autoRun })}
            title={queueConfig.autoRun ? 'Pause auto-run' : 'Resume auto-run'}
          >
            {queueConfig.autoRun ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="min-h-0 max-h-[240px] overflow-y-auto p-3 grid gap-2">
        {items.length === 0 ? (
          <div className="text-sm text-foreground-tertiary">Queue vide.</div>
        ) : (
          items.slice(0, 20).map((q) => (
            <div
              key={q.id}
              className="rounded-xl border border-border-secondary bg-white/5 px-3 py-2 flex items-center gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-foreground-primary truncate">
                  {q.paramsSnapshot?.title || q.paramsSnapshot?.prompt || 'Génération'}
                </div>
                <div className="text-[11px] text-foreground-tertiary truncate">
                  {q.status}
                  {q.taskId ? ` · ${q.taskId}` : ''}
                </div>
                {q.error ? <div className="text-[11px] text-red-400 truncate">{q.error}</div> : null}
              </div>
              {q.status === 'failed' ? (
                <button
                  type="button"
                  className="h-9 w-9 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
                  onClick={() => retryQueueItem(q.id)}
                  title="Retry"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

