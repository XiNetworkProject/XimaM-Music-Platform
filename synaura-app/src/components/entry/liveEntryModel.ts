export function selectEntryTrack<T extends { _id: string; audioUrl?: string | null }>(tracks: T[], currentId?: string | null): T | null {
  const playable = tracks.filter(track => Boolean(track.audioUrl));
  return playable.find(track => track._id === currentId) || playable[0] || null;
}
