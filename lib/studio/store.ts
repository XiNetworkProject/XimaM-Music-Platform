import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GenerationJob, StudioProject, StudioTrack } from '@/lib/studio/types';

type SortBy = 'newest' | 'oldest' | 'title';
type FilterBy = 'all' | 'favorites' | 'instrumental' | 'with-lyrics';

type StudioUIState = {
  search: string;
  sort: SortBy;
  filter: FilterBy;
  inspectorOpen: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
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
};

export type StudioState = {
  projects: StudioProject[];
  activeProjectId: string | null;
  tracks: StudioTrack[];
  selectedTrackId: string | null;
  abTrackIdA: string | null;
  abTrackIdB: string | null;
  jobs: GenerationJob[];
  queue: string[];
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

  // A/B
  setAB: (a: string | null, b: string | null) => void;
  swapAB: () => void;
  clearAB: () => void;

  // Jobs/queue (V1 simple)
  upsertJob: (job: GenerationJob) => void;
  updateJobStatus: (id: string, patch: Partial<GenerationJob>) => void;

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
  model: 'V4_5',
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
};

const DEFAULT_UI: StudioUIState = {
  search: '',
  sort: 'newest',
  filter: 'all',
  inspectorOpen: true,
  leftOpen: true,
  rightOpen: true,
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
      defaultModel: 'V4_5',
    },
  ];
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      projects: ensureDefaultProject([]),
      activeProjectId: 'project_default',
      tracks: [],
      selectedTrackId: null,
      abTrackIdA: null,
      abTrackIdB: null,
      jobs: [],
      queue: [],
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
      selectTrack: (id) => set({ selectedTrackId: id, ui: { ...get().ui, inspectorOpen: true } }),
      toggleFavoriteLocal: (id) =>
        set((s) => ({ tracks: s.tracks.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t)) })),
      deleteTracksLocal: (ids) =>
        set((s) => ({
          tracks: s.tracks.filter((t) => !ids.includes(t.id)),
          selectedTrackId: ids.includes(s.selectedTrackId || '') ? null : s.selectedTrackId,
        })),

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

      setUI: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),
      setForm: (patch) => set((s) => ({ form: { ...s.form, ...patch } })),

      loadTrackIntoForm: (trackId) => {
        const t = get().tracks.find((x) => x.id === trackId);
        if (!t) return;
        set((s) => ({
          form: {
            ...s.form,
            customMode: true,
            model: t.model || s.form.model,
            title: t.title || s.form.title,
            style: (t.tags || []).join(', ') || s.form.style,
            lyrics: t.lyrics || t.prompt || s.form.lyrics,
          },
        }));
      },
    }),
    {
      name: 'studio.store.v1',
      partialize: (s) => ({
        projects: ensureDefaultProject(s.projects || []),
        activeProjectId: s.activeProjectId,
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

