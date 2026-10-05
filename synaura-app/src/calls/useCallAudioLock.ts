import { useSyncExternalStore } from 'react';
import { isCallAudioLocked, subscribeCallAudioLock } from './callAudioLock';
export function useCallAudioLock() {
  return useSyncExternalStore(subscribeCallAudioLock, isCallAudioLocked, () => false);
}
