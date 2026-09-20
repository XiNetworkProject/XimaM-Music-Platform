'use client';

import { useSyncExternalStore } from 'react';

export const LIVING_MOTION_KEY = 'synaura.living-motion.v1';
const CHANGE = 'synaura:living-motion';
type Connection = EventTarget & { saveData?: boolean };
const connection = () => (navigator as Navigator & { connection?: Connection }).connection;

function snapshot() {
  if (typeof window === 'undefined') return 0;
  let enabled = true;
  try {
    const preference = localStorage.getItem(LIVING_MOTION_KEY);
    enabled = preference === 'on' || (preference !== 'off' && localStorage.getItem('synaura.auraVisuals.enabled') !== '0');
  } catch {}
  return (enabled ? 1 : 0) | (matchMedia('(prefers-reduced-motion: reduce)').matches ? 2 : 0) | (connection()?.saveData ? 4 : 0) | (!document.hidden ? 8 : 0);
}
function subscribe(notify: () => void) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const network = connection();
  window.addEventListener('storage', notify);
  window.addEventListener(CHANGE, notify);
  window.addEventListener('focus', notify);
  document.addEventListener('visibilitychange', notify);
  reduced.addEventListener('change', notify);
  network?.addEventListener('change', notify);
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener(CHANGE, notify);
    window.removeEventListener('focus', notify);
    document.removeEventListener('visibilitychange', notify);
    reduced.removeEventListener('change', notify);
    network?.removeEventListener('change', notify);
  };
}
export function useLivingMotion() {
  const state = useSyncExternalStore(subscribe, snapshot, () => 0);
  return {
    enabled: Boolean((state & 1) && !(state & 6) && (state & 8)),
    preferred: Boolean(state & 1),
    constrained: Boolean(state & 6),
    setEnabled(enabled: boolean) {
      try { localStorage.setItem(LIVING_MOTION_KEY, enabled ? 'on' : 'off'); } catch {}
      window.dispatchEvent(new Event(CHANGE));
    },
  };
}
