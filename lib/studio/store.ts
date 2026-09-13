import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SUNO_MODEL, normalizeGenerationModel, SUNO_GENERATION_LIMITS } from '@/lib/sunoModels';
import type {
  GenerationJob,
  StudioProject,
  StudioQueueConfig,
  StudioQueueItem,
  StudioTrack,
} from '@/lib/studio/types';

type SortBy = 'newest' | 'oldest' | 'title';
type FilterBy = 'all' | 'favorites' | 'instrumental' | 'with-lyrics';

type StudioUIState = {
  search: string;
  sort: SortBy;
  filter: FilterBy;
  inspectorOpen: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
  mobileTab?: 'generate' | 'library' | 'timeline' | 'inspector';
};

type StudioFormState = {
  customMode: boolean;
  model: string;
  instrumental: boolean;
  title: string;
  style: string;
  description: string;
  lyrics: string;
  tags: string[];
  negativeTags: string;
  vocalGender: string;
  styleInfluence: number; // 0-100
  weirdness: number; // 0-100
  audioWeight: number; // 0-100
  variations: number;
  duration: number | null;
};

export type StudioState = {
  projects: StudioProject[];
  activeProjectId: string | null;
  taskProjectMap: Record<string, string>;
  tracks: StudioTrack[];
  selectedTrackId: string | null;
  abTrackIdA: string | null;
  abTrackIdB: string | null;
  jobs: GenerationJob[];
  queueItems: StudioQueueItem[];
  queueConfig: StudioQueueConfig;
  selectedTrackIds: string[];
  lastSelectedTrackId: string | null;
  ui: StudioUIState;
  form: StudioFormState;

  // Project actions
  createProject: (name?: string) => string;
  renameProject: (id: string, name: string) => void;
  duplicateProject: (id: string) => string | null;
  archiveProject: (id: string, archived?: boolean) => void;
  setActiveProject: (id: string) => void;

  // Track actions
  setTracks: (tracks: StudioTrack[]) => void;
  selectTrack: (id: string | null) => void;
  toggleFavoriteLocal: (id: string) => void;
  deleteTracksLocal: (ids: string[]) => void;
  clearSelection: () => void;
  toggleSelectTrack: (id: string, opts?: { multi?: boolean; range?: boolean }) => void;

  // A/B
  setAB: (a: string | null, b: string | null) => void;
  swapAB: () => void;
  clearAB: () => void;

  // Jobs/queue (V1 simple)
  upsertJob: (job: GenerationJob) => void;
  updateJobStatus: (id: string, patch: Partial<GenerationJob>) => void;
  bindTaskToProject: (taskId: string, projectId: string) => void;
  enqueueQueueItem: (paramsSnapshot: any, projectId: string) => string;
  updateQueueItem: (id: string, patch: Partial<StudioQueueItem>) => void;
  setQueueConfig: (patch: Partial<StudioQueueConfig>) => void;
  retryQueueItem: (id: string) => string | null;

  // UI
  setUI: (patch: Partial<StudioUIState>) => void;
  setForm: (patch: Partial<StudioFormState>) => void;
  loadTrackIntoForm: (trackId: string) => void;
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

const DEFAULT_FORM: StudioFormState = {
  customMode: false,
  model: DEFAULT_SUNO_MODEL,
  instrumental: false,
  title: '',
  style: '',
  description: '',
  lyrics: '',
  tags: [],
  negativeTags: '',
  vocalGender: '',
  styleInfluence: 50,
  weirdness: 50,
  audioWeight: 50,
  variations: 2,
  duration: null,
};

export function normalizeStudioForm(form: Partial<StudioFormState> | undefined): StudioFormState {
  const next = { ...DEFAULT_FORM, ...form };
  const duration = next.duration;
  return {
    ...next,
    model: normalizeGenerationModel(next.model),
    duration: typeof duration === 'number' && Number.isInteger(duration) &&
      duration >= SUNO_GENERATION_LIMITS.minDuration && duration <= SUNO_GENERATION_LIMITS.maxDuration
      ? duration : null,
  };
}

/** Only normalize drafts and new submissions; keep completed work's original metadata. */
export function normalizeStudioRequestModel(paramsSnapshot: any) {
  return { ...paramsSnapshot, model: normalizeGenerationModel(paramsSnapshot?.model) };
}

const DEFAULT_UI: StudioUIState = {
  search: '',
  sort: 'newest',
  filter: 'all',
  inspectorOpen: true,
  leftOpen: true,
  rightOpen: true,
  mobileTab: 'library',
};

const DEFAULT_QUEUE_CONFIG: StudioQueueConfig = {
  maxConcurrency: 1,
  autoRun: true,
};

function ensureDefaultProject(projects: StudioProject[]) {
  if (projects.length) return projects;
  const t = nowIso();
  return [
    {
      id: 'project_default',
      name: 'Mon projet',
      createdAt: t,
      updatedAt: t,
      pinnedTags: [],
      defaultModel: DEFAULT_SUNO_MODEL,
    },
  ];
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      projects: ensureDefaultProject([]),
      activeProjectId: 'project_default',
      taskProjectMap: {},
      tracks: [],
      selectedTrackId: null,
      abTrackIdA: null,
      abTrackIdB: null,
      jobs: [],
      queueItems: [],
      queueConfig: DEFAULT_QUEUE_CONFIG,
      selectedTrackIds: [],
      lastSelectedTrackId: null,
      ui: DEFAULT_UI,
      form: DEFAULT_FORM,

      createProject: (name) => {
        const id = makeId('project');
        const t = nowIso();
        const p: StudioProject = {
          id,
          name: (name || '').trim() || 'Nouveau projet',
          createdAt: t,
          updatedAt: t,
          pinnedTags: [],
        };
        set((s) => ({ projects: [p, ...s.projects], activeProjectId: id }));
        return id;
      },

      renameProject: (id, name) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, name: name.trim() || p.name, updatedAt: nowIso() } : p
          ),
        }));
      },

      duplicateProject: (id) => {
        const src = get().projects.find((p) => p.id === id);
        if (!src) return null;
        const newId = makeId('project');
        const t = nowIso();
        const copy: StudioProject = {
          ...src,
          id: newId,
          name: `${src.name} (copie)`,
          createdAt: t,
          updatedAt: t,
          archived: false,
        };
        set((s) => ({ projects: [copy, ...s.projects], activeProjectId: newId }));
        return newId;
      },

      archiveProject: (id, archived = true) => {
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, archived, updatedAt: nowIso() } : p)),
        }));
        const { activeProjectId } = get();
        if (activeProjectId === id && archived) {
          const next = get().projects.find((p) => !p.archived && p.id !== id) || null;
          set({ activeProjectId: next?.id || null });
        }
      },

      setActiveProject: (id) => set({ activeProjectId: id }),

      setTracks: (tracks) => set({ tracks }),
      selectTrack: (id) =>
        set({
          selectedTrackId: id,
          ui: { ...get().ui, inspectorOpen: true },
          lastSelectedTrackId: id,
        }),
      toggleFavoriteLocal: (id) =>
        set((s) => ({ tracks: s.tracks.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t)) })),
      deleteTracksLocal: (ids) =>
        set((s) => ({
          tracks: s.tracks.filter((t) => !ids.includes(t.id)),
          selectedTrackId: ids.includes(s.selectedTrackId || '') ? null : s.selectedTrackId,
          selectedTrackIds: (s.selectedTrackIds || []).filter((x) => !ids.includes(x)),
          lastSelectedTrackId: ids.includes(s.lastSelectedTrackId || '') ? null : s.lastSelectedTrackId,
        })),

      clearSelection: () => set({ selectedTrackIds: [], lastSelectedTrackId: null }),

      toggleSelectTrack: (id, opts) => {
        const { multi, range } = opts || {};
        const s = get();
        const current = new Set(s.selectedTrackIds || []);
        const visible = s.tracks || [];
        const lastId = s.lastSelectedTrackId;

        if (range && lastId) {
          const a = visible.findIndex((t) => t.id === lastId);
          const b = visible.findIndex((t) => t.id === id);
          if (a !== -1 && b !== -1) {
            const [start, end] = a < b ? [a, b] : [b, a];
            const ids = visible.slice(start, end + 1).map((t) => t.id);
            ids.forEach((x) => current.add(x));
            set({ selectedTrackIds: Array.from(current), lastSelectedTrackId: id });
            return;
          }
        }

        if (!multi) {
          set({
            selectedTrackIds: [id],
            lastSelectedTrackId: id,
            selectedTrackId: id,
            ui: { ...s.ui, inspectorOpen: true, mobileTab: 'inspector' },
          });
          return;
        }

        if (current.has(id)) current.delete(id);
        else current.add(id);
        set({ selectedTrackIds: Array.from(current), lastSelectedTrackId: id });
      },

      setAB: (a, b) => set({ abTrackIdA: a, abTrackIdB: b }),
      swapAB: () => set((s) => ({ abTrackIdA: s.abTrackIdB, abTrackIdB: s.abTrackIdA })),
      clearAB: () => set({ abTrackIdA: null, abTrackIdB: null }),

      upsertJob: (job) =>
        set((s) => {
          const idx = s.jobs.findIndex((j) => j.id === job.id);
          if (idx === -1) return { jobs: [job, ...s.jobs] };
          const next = s.jobs.slice();
          next[idx] = { ...next[idx], ...job };
          return { jobs: next };
        }),

      updateJobStatus: (id, patch) =>
        set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),

      bindTaskToProject: (taskId, projectId) =>
        set((s) => ({ taskProjectMap: { ...(s.taskProjectMap || {}), [taskId]: projectId } })),

      enqueueQueueItem: (paramsSnapshot, projectId) => {
        const id = makeId('q');
        const item: StudioQueueItem = {
          id,
          projectId: projectId || 'project_default',
          createdAt: nowIso(),
          status: 'pending',
          paramsSnapshot: normalizeStudioRequestModel(paramsSnapshot),
        };
        set((s) => ({ queueItems: [item, ...(s.queueItems || [])] }));
        return id;
      },

      updateQueueItem: (id, patch) =>
        set((s) => ({
          queueItems: (s.queueItems || []).map((q) => (q.id === id ? { ...q, ...patch } : q)),
        })),

      setQueueConfig: (patch) => set((s) => ({ queueConfig: { ...s.queueConfig, ...patch } })),

      retryQueueItem: (id) => {
        const src = get().queueItems.find((q) => q.id === id) || null;
        if (!src) return null;
        const newId = makeId('q');
        const item: StudioQueueItem = {
          id: newId,
          projectId: src.projectId,
          createdAt: nowIso(),
          status: 'pending',
          paramsSnapshot: normalizeStudioRequestModel(src.paramsSnapshot),
        };
        set((s) => ({ queueItems: [item, ...(s.queueItems || [])] }));
        return newId;
      },

      setUI: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),
      setForm: (patch) => set((s) => ({ form: { ...s.form, ...patch, model: normalizeGenerationModel(patch.model ?? s.form.model) } })),

      loadTrackIntoForm: (trackId) => {
        const t = get().tracks.find((x) => x.id === trackId);
        if (!t) return;
        set((s) => ({
          form: {
            ...s.form,
            customMode: true,
            model: normalizeGenerationModel(t.model || s.form.model),
            instrumental: t.hasVocals === false || !(t.lyrics || t.prompt || '').trim(),
            title: t.title || s.form.title,
            style: (t.tags || []).join(', ') || s.form.style,
            lyrics: t.lyrics || t.prompt || '',
            duration: null,
          },
        }));
      },
    }),
    {
      name: 'studio.store.v2',
      merge: (persistedState, currentState) => {
        const saved = (persistedState || {}) as Partial<StudioState>;
        return {
          ...currentState,
          ...saved,
          form: normalizeStudioForm(saved.form),
          ui: { ...DEFAULT_UI, ...saved.ui },
          queueConfig: { ...DEFAULT_QUEUE_CONFIG, ...saved.queueConfig },
          queueItems: (saved.queueItems || []).map((item) => item.status === 'pending'
            ? { ...item, paramsSnapshot: normalizeStudioRequestModel(item.paramsSnapshot) }
            : item),
        };
      },
      partialize: (s) => ({
        projects: ensureDefaultProject(s.projects || []),
        activeProjectId: s.activeProjectId,
        taskProjectMap: s.taskProjectMap,
        queueItems: s.queueItems,
        queueConfig: s.queueConfig,
        selectedTrackIds: s.selectedTrackIds,
        lastSelectedTrackId: s.lastSelectedTrackId,
        ui: s.ui,
        form: s.form,
        selectedTrackId: s.selectedTrackId,
        abTrackIdA: s.abTrackIdA,
        abTrackIdB: s.abTrackIdB,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // ensure we always have at least one project
        state.projects = ensureDefaultProject(state.projects || []);
        if (!state.activeProjectId) state.activeProjectId = state.projects[0]?.id || 'project_default';
      },
    }
  )
);
