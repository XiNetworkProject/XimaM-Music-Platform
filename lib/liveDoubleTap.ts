export type LiveTapPointer = { pointerId: number; pointerType: string; clientX: number; clientY: number; timeStamp: number; button: number; isPrimary: boolean };

/** Pointer-only recognition: never prevents the feed's swipe or native pinch zoom. */
export function createLiveDoubleTap(fire: () => void) {
  let down: LiveTapPointer | null = null;
  let previous: LiveTapPointer | null = null;
  const distance = (a: LiveTapPointer, b: LiveTapPointer) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const reset = () => { down = null; previous = null; };
  return {
    reset,
    start(event: LiveTapPointer, eligible: boolean) {
      if (!eligible || !event.isPrimary || event.button !== 0) { reset(); return; }
      down = { ...event };
    },
    move(event: LiveTapPointer) { if (down && (event.pointerId !== down.pointerId || distance(down, event) > 12)) reset(); },
    end(event: LiveTapPointer) {
      const start = down;
      down = null;
      if (!start || !event.isPrimary || event.pointerId !== start.pointerId || event.timeStamp - start.timeStamp > 300 || distance(start, event) > 12) { previous = null; return; }
      if (previous && event.pointerType === previous.pointerType && event.timeStamp - previous.timeStamp <= 320 && distance(previous, event) <= 28) {
        previous = null;
        fire();
      } else previous = { ...event };
    },
  };
}
