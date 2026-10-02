/** Reserve the real bottom navigation AND the entry action, including short phones. */
export function resolveLiveEntryLayout(height: number, top: number, bottom: number, width: number) {
  const actionHeight = 72;
  const visibleHeight = Math.max(0, height - top - bottom - actionHeight);
  return {
    actionHeight,
    scrollBottom: bottom + actionHeight + 24,
    coverSize: Math.max(130, Math.min(width - 58, 310, visibleHeight - 206)),
    compact: visibleHeight < 460,
  };
}

export function shouldDismissSheet(distance: number, velocity: number) {
  return distance > 84 || (distance > 24 && velocity > .85);
}
