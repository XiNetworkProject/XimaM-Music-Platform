'use client';

import { useEffect, useState, type RefObject } from 'react';

/** Cover videos are decoration: don't decode them outside the viewport. */
export function useCoverVisibility(ref: RefObject<HTMLVideoElement>, source: string | null, mounted: boolean) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    setVisible(false);
    if (!element || !mounted) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: 0.05 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, source, mounted]);
  return visible;
}
