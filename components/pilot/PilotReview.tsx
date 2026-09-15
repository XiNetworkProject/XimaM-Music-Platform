'use client';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBrowserAudioCore } from '@/lib/audio/AudioCore';

/** Explicit review instrumentation: no endpoint, credentials, storage or mutations.
 * A hidden DOM report is readable by QA without accessing application internals.
 * No timer/observer at all on ordinary pilot visits. */
export default function PilotReview() {
  const enabled = useSearchParams().get('pilotReview') === '1';
  const output = useRef<HTMLOutputElement>(null);
  useEffect(() => {
    if (!enabled) return;
    const longTasks: number[] = [];
    let observer: PerformanceObserver | undefined;
    if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      observer = new PerformanceObserver(list => { for (const entry of list.getEntries()) { longTasks.push(entry.duration); if (longTasks.length > 100) longTasks.shift(); } });
      observer.observe({ type: 'longtask', buffered: false });
    }
    const publish = () => {
      if (!output.current) return;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const apiCounts: Record<string, number> = {};
      for (const resource of resources) {
        const path = new URL(resource.name, location.origin).pathname;
        if (path.startsWith('/api/')) apiCounts[path] = (apiCounts[path] || 0) + 1;
      }
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      output.current.textContent = JSON.stringify({
        route: location.pathname, viewport: [innerWidth, innerHeight],
        audio: getBrowserAudioCore()?.getDiagnostics(),
        domNodes: document.querySelectorAll('*').length, heapBytes: memory?.usedJSHeapSize ?? null,
        apiCounts, longTasks: { count: longTasks.length, maxMs: Math.max(0, ...longTasks) },
      });
    };
    publish();
    const timer = setInterval(publish, 1000);
    return () => { clearInterval(timer); observer?.disconnect(); };
  }, [enabled]);
  return enabled ? <output ref={output} data-pilot-review hidden aria-hidden="true" /> : null;
}
