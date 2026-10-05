// A call owns audio until its microphone and RTC session are fully stopped.
// Shared with the background music service; it never replaces the music queue.
const holders = new Set<symbol>();
const listeners = new Set<() => void>();
export const isCallAudioLocked = () => holders.size > 0;
export const subscribeCallAudioLock = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export function acquireCallAudioLock() {
  const owner = Symbol('voice-call');
  holders.add(owner); listeners.forEach(listener => listener());
  let released = false;
  return () => {
    if (released) return;
    released = true; holders.delete(owner); listeners.forEach(listener => listener());
  };
}
