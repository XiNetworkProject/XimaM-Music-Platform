import type { GeneratedTrack } from '../aiStudioTypes';

/** IDs only. Two versions can legitimately have identical titles and covers. */
export function sameStudioTrack(a: Pick<GeneratedTrack, 'id' | 'sunoAudioId' | 'generationTaskId'>, b: Pick<GeneratedTrack, 'id' | 'sunoAudioId' | 'generationTaskId'>) {
  if (a.id === b.id) return true;
  const left = a.sunoAudioId || a.id;
  const right = b.sunoAudioId || b.id;
  return left === right && (!a.generationTaskId || !b.generationTaskId || a.generationTaskId === b.generationTaskId);
}

export function uniqueStudioTracks<T extends { track: GeneratedTrack; published?: boolean; liked?: boolean }>(songs: T[]): T[] {
  const result: T[] = [];
  for (const song of songs) {
    const index = result.findIndex(item => sameStudioTrack(item.track, song.track));
    if (index < 0) result.push(song);
    // Keep a public/favorite reference when old duplicated DB rows already exist.
    else if ((song.published && !result[index].published) || (!result[index].published && song.liked && !result[index].liked)) result[index] = song;
  }
  return result;
}
