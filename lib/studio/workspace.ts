import type { GeneratedTrack } from '../aiStudioTypes';
import type { StudioJobView } from './tools';

export type WorkspaceSong = {
  track: GeneratedTrack; liked: boolean; trashed: boolean; published: boolean;
  folder?: string; model?: string; generationId?: string; sourceIds?: string[]; operation?: string;
};
export type SongFilter = 'all' | 'liked' | 'public' | 'private' | 'instrumental' | 'vocals' | 'trash';
export function studioFolder(value: unknown): string | undefined {
  try { const links = typeof value === 'string' ? JSON.parse(value) : value; return links && typeof links === 'object' && typeof links.library_folder === 'string' ? links.library_folder : undefined; }
  catch { return undefined; }
}

/** Relationships are explicit IDs, never inferred from a title or timestamp. */
export function versionFamilies(songs: WorkspaceSong[]) {
  const parent = new Map(songs.map(song => [song.track.id, song.track.id]));
  const root = (id: string): string => {
    let current = id;
    while (parent.has(current) && parent.get(current) !== current) current = parent.get(current)!;
    return current;
  };
  const join = (a: string, b: string) => { if (parent.has(a) && parent.has(b)) parent.set(root(a), root(b)); };
  const generations = new Map<string, string>();
  for (const song of songs) {
    const generation = song.generationId || song.track.generationTaskId;
    if (generation) {
      const sibling = generations.get(generation);
      if (sibling) join(song.track.id, sibling);
      else generations.set(generation, song.track.id);
    }
    for (const source of song.sourceIds || []) join(song.track.id, source);
  }
  const groups = new Map<string, WorkspaceSong[]>();
  for (const song of songs) { const id = root(song.track.id); groups.set(id, [...(groups.get(id) || []), song]); }
  return new Map(songs.map(song => [song.track.id, groups.get(root(song.track.id))!]));
}

export function selectWorkspaceSongs(songs: WorkspaceSong[], options: { query: string; folder: string; filter: SongFilter; sort: string; family?: string }) {
  const familyIds = options.family ? new Set((versionFamilies(songs).get(options.family) || []).map(song => song.track.id)) : null;
  const query = options.query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  return songs.filter(song => {
    if (options.filter === 'trash' ? !song.trashed : song.trashed) return false;
    if (familyIds && !familyIds.has(song.track.id)) return false;
    if (options.folder !== '*' && (song.folder || '') !== options.folder) return false;
    if (options.filter === 'liked' && !song.liked) return false;
    if (options.filter === 'public' && !song.published) return false;
    if (options.filter === 'private' && song.published) return false;
    if (options.filter === 'instrumental' && !song.track.isInstrumental) return false;
    if (options.filter === 'vocals' && song.track.isInstrumental) return false;
    return `${song.track.title} ${song.track.style} ${song.folder || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().includes(query);
  }).sort((a, b) => options.sort === 'title' ? a.track.title.localeCompare(b.track.title)
    : options.sort === 'liked' && a.liked !== b.liked ? Number(b.liked) - Number(a.liked)
      : (options.sort === 'oldest' ? 1 : -1) * ((Date.parse(a.track.createdAt) || 0) - (Date.parse(b.track.createdAt) || 0)) || a.track.id.localeCompare(b.track.id));
}

export const activeStudioJob = (job: StudioJobView) => ['pending', 'submitting', 'uncertain'].includes(job.status);
export function mergeStudioJobs(previous: StudioJobView[], incoming: StudioJobView[]) {
  const next = new Map(previous.map(job => [job.id, job]));
  for (const job of incoming) {
    const old = next.get(job.id);
    // An older list/poll response must never turn a completed result back into a spinner.
    if (old && !activeStudioJob(old) && activeStudioJob(job)) continue;
    next.set(job.id, job);
  }
  return Array.from(next.values()).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
