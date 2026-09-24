'use client';

import { useLayoutEffect, useRef } from 'react';
import { messagingViewport } from '@/lib/messagingViewport';

export function useMessagingViewport(ready: boolean) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!ready || !root) return;
    const viewport = window.visualViewport;
    let frame = 0;
    let offset = 0;
    const update = () => {
      const next = messagingViewport(viewport?.height || window.innerHeight, root.getBoundingClientRect().top - offset, viewport?.offsetTop || 0);
      root.style.setProperty('--ms-available-height', `${next.height}px`);
      root.style.setProperty('--ms-viewport-offset', `${next.offset}px`);
      offset = next.offset;
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('resize', schedule);
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    // Also covers navigation breakpoint/font/layout changes without a keyboard event.
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('resize', schedule);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      root.style.removeProperty('--ms-available-height');
      root.style.removeProperty('--ms-viewport-offset');
    };
  }, [ready]);
  return ref;
}
