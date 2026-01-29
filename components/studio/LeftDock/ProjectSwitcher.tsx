'use client';

import { useMemo, useState } from 'react';
import { Folder, Plus, Pencil, Copy, Archive } from 'lucide-react';
import { useStudioStore } from '@/lib/studio/store';
import { SUNO_BTN_BASE, SUNO_FIELD } from '@/components/ui/sunoClasses';

export default function ProjectSwitcher() {
  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const setActiveProject = useStudioStore((s) => s.setActiveProject);
  const createProject = useStudioStore((s) => s.createProject);
  const renameProject = useStudioStore((s) => s.renameProject);
  const duplicateProject = useStudioStore((s) => s.duplicateProject);
  const archiveProject = useStudioStore((s) => s.archiveProject);

  const active = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || projects[0] || null,
    [projects, activeProjectId]
  );

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const visible = useMemo(() => projects.filter((p) => !p.archived), [projects]);

  return (
    <div className="panel-suno overflow-hidden">
      <div className="px-4 py-3 border-b border-border-secondary flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-foreground-tertiary" />
          <div className="text-sm font-semibold text-foreground-primary">Projects</div>
        </div>
        <button
          type="button"
          className="h-8 px-2 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition flex items-center gap-1 text-xs"
          onClick={() => createProject()}
          title="New project"
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] text-foreground-tertiary">Active</div>
            <div className="text-[13px] text-foreground-primary truncate">{active?.name || '—'}</div>
          </div>
          {active ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="h-8 w-8 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
                onClick={() => {
                  setRenamingId(active.id);
                  setRenameValue(active.name);
                }}
                title="Rename"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
                onClick={() => duplicateProject(active.id)}
                title="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
                onClick={() => archiveProject(active.id, true)}
                title="Archive"
              >
                <Archive className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>

        {renamingId ? (
          <div className="mt-3 flex items-center gap-2">
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className={`${SUNO_FIELD} h-9`}
              placeholder="Project name"
              autoFocus
            />
            <button
              type="button"
              className={SUNO_BTN_BASE}
              onClick={() => {
                renameProject(renamingId, renameValue);
                setRenamingId(null);
              }}
            >
              <span className="relative">OK</span>
            </button>
            <button type="button" className={SUNO_BTN_BASE} onClick={() => setRenamingId(null)}>
              <span className="relative">Cancel</span>
            </button>
          </div>
        ) : null}

        <div className="mt-4">
          <div className="text-[11px] text-foreground-tertiary mb-2">Switch</div>
          <div className="grid gap-2">
            {visible.map((p) => {
              const isActive = p.id === activeProjectId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveProject(p.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl border transition ${
                    isActive
                      ? 'border-white/20 bg-white/10'
                      : 'border-border-secondary bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="text-[13px] text-foreground-primary truncate">{p.name}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

