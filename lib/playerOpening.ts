type QueueTrack = { _id?: string; id?: string };
const identity = (track: QueueTrack | undefined) => String(track?._id || track?.id || '');

/** The expanded view may align its feed, but opening the current song never
 * resumes it. Compare the same identity/index signature as the provider and use
 * its atomic setters once, instead of setTracks + queue + index mutations. */
export function alignExpandedPlayerQueue<T extends QueueTrack>(
  current: { tracks: readonly T[]; currentTrackIndex: number },
  nextTracks: T[],
  nextIndex: number,
  controls: { setQueueOnly: (tracks: T[], index: number) => void; setQueueAndPlay: (tracks: T[], index: number) => void },
): 'preserved' | 'queue-only' | 'play' {
  const equivalent = current.currentTrackIndex === nextIndex
    && current.tracks.length === nextTracks.length
    && current.tracks.every((track, index) => identity(track) === identity(nextTracks[index]));
  if (equivalent) return 'preserved';

  const currentId = identity(current.tracks[current.currentTrackIndex]);
  if (currentId && currentId === identity(nextTracks[nextIndex])) {
    controls.setQueueOnly(nextTracks, nextIndex);
    return 'queue-only';
  }
  controls.setQueueAndPlay(nextTracks, nextIndex);
  return 'play';
}
