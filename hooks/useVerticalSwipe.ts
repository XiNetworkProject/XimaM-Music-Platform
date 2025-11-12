import { useRef, useMemo } from "react";

export type VerticalSwipeOptions = {
  minDistance?: number;        // px — swipe lent
  minVelocity?: number;        // px/ms — swipe rapide (flick)
  lockDistance?: number;       // px — lock pour ignorer micro scrolls
  maxFlickDuration?: number;   // ms — durée max d'un flick
  cooldownMs?: number;         // ms — anti double swipe
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  preventDefaultWhenLocked?: boolean; // empêche le scroll natif quand lock
};

type Handlers = {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
};

export function useVerticalSwipe(opts?: VerticalSwipeOptions): Handlers {
  const {
    minDistance = 60,
    minVelocity = 0.6,
    lockDistance = 8,
    maxFlickDuration = 350,
    cooldownMs = 260,
    onSwipeUp,
    onSwipeDown,
    preventDefaultWhenLocked = true,
  } = opts || {};

  const st = useRef({
    y0: 0,
    yLast: 0,
    t0: 0,
    locked: false,
    moved: false,
    lastFire: 0,
  });

  return useMemo<Handlers>(() => {
    const onTouchStart = (e: React.TouchEvent) => {
      const y = e.touches?.[0]?.clientY ?? 0;
      st.current.y0 = y;
      st.current.yLast = y;
      st.current.t0 = performance.now();
      st.current.locked = false;
      st.current.moved = false;
    };

    const onTouchMove = (e: React.TouchEvent) => {
      const y = e.touches?.[0]?.clientY ?? st.current.yLast;
      st.current.yLast = y;
      const dy = y - st.current.y0;

      if (!st.current.locked && Math.abs(dy) > lockDistance) {
        st.current.locked = true;
      }
      st.current.moved = true;

      if (st.current.locked && preventDefaultWhenLocked) {
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      const dy = st.current.yLast - st.current.y0; // + = vers le bas
      const dt = Math.max(1, performance.now() - st.current.t0);
      const velocity = dy / dt; // px/ms

      const isFlick = dt <= maxFlickDuration && Math.abs(velocity) >= minVelocity;
      const isLong = Math.abs(dy) >= minDistance;

      const now = performance.now();
      if (now - st.current.lastFire < cooldownMs) return; // anti double swipe

      if ((isFlick || isLong) && st.current.moved) {
        st.current.lastFire = now;
        if (dy < 0) onSwipeUp?.();
        else if (dy > 0) onSwipeDown?.();
      }
    };

    return { onTouchStart, onTouchMove, onTouchEnd };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

