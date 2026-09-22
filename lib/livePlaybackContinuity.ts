/** Follow the player's queue only after an ended event on the visible Live item.
 * A swipe or another page taking ownership invalidates the pending transition. */
export function resolveLiveAutomaticAdvance(input: {
  endedItemId: string; endedTrackId: string; endedQueueIndex: number; currentTrackId: string;
  activeItemId: string; feedItemIds: string[]; queueTrackIds: string[];
  playerQueueIds: string[]; playerQueueIndex: number; queueFeedIndices: number[];
}): number | null {
  if (input.endedItemId !== input.activeItemId || (input.currentTrackId === input.endedTrackId && input.endedQueueIndex === input.playerQueueIndex)) return null;
  if (input.queueTrackIds.length !== input.playerQueueIds.length || input.queueTrackIds.some((id, index) => id !== input.playerQueueIds[index])) return null;
  const index = input.queueFeedIndices[input.playerQueueIndex];
  return index !== undefined && input.feedItemIds[index] && input.queueTrackIds[input.playerQueueIndex] === input.currentTrackId ? index : null;
}
