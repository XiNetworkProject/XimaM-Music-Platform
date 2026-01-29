import type { StudioProject, StudioTrack } from '@/lib/studio/types';

export function getActiveProject(projects: StudioProject[], activeProjectId: string | null): StudioProject | null {
  if (!activeProjectId) return null;
  return projects.find((p) => p.id === activeProjectId) || null;
}

export function getSelectedTrack(tracks: StudioTrack[], selectedTrackId: string | null): StudioTrack | null {
  if (!selectedTrackId) return null;
  return tracks.find((t) => t.id === selectedTrackId) || null;
}

export function getABTracks(tracks: StudioTrack[], aId: string | null, bId: string | null) {
  const a = aId ? tracks.find((t) => t.id === aId) || null : null;
  const b = bId ? tracks.find((t) => t.id === bId) || null : null;
  return { a, b };
}

