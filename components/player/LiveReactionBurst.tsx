'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { MOMENT_REACTION_META, type MomentReactionType } from '@/lib/momentReactions';
import styles from './LiveReactionBurst.module.css';

export const LIVE_BURST_LIMIT = 4;
export const LIVE_BURST_LIFETIME_MS = 2800;

type Burst = { id: number; type: MomentReactionType };

/** Local feedback for a selection, never a stream of fabricated audience reactions. */
export function useLiveReactionBurst() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);

  function emit(type: MomentReactionType) {
    const id = ++nextId.current;
    // Bound both the visual nodes and cleanup timers during rapid selections.
    if (timers.current.size >= LIVE_BURST_LIMIT) {
      const oldest = timers.current.keys().next().value as number;
      clearTimeout(timers.current.get(oldest));
      timers.current.delete(oldest);
    }
    setBursts(current => [...current.slice(-(LIVE_BURST_LIMIT - 1)), { id, type }]);
    timers.current.set(id, setTimeout(() => {
      timers.current.delete(id);
      setBursts(current => current.filter(burst => burst.id !== id));
    }, LIVE_BURST_LIFETIME_MS));
  }

  return { emit, layer: bursts.length ? <LiveReactionBurst bursts={bursts} /> : null };
}

function LiveReactionBurst({ bursts }: { bursts: Burst[] }) {
  return createPortal(
    <div className={styles.layer} aria-hidden="true" data-live-reaction-bursts>
      {bursts.map(burst => (
        <div key={burst.id} className={styles.burst}>
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className={styles.emoji} style={{
              '--drift': `${(index % 2 ? 1 : -1) * (24 + index * 13)}px`,
              '--sway': `${(index % 2 ? -1 : 1) * (12 + index * 5)}px`,
              '--tilt': `${(index % 2 ? 1 : -1) * (8 + index * 4)}deg`,
              '--delay': `${index * 65}ms`,
              '--flight': `${1700 + index * 95}ms`,
              '--size': `${26 + (index % 3) * 5}px`,
            } as CSSProperties}>{MOMENT_REACTION_META[burst.type].emoji}</span>
          ))}
        </div>
      ))}
    </div>, document.body,
  );
}
