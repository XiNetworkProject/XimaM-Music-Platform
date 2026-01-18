import { useEffect, useMemo, useRef } from "react";

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
    ignore: false,
  });

  const onSwipeUpRef = useRef<VerticalSwipeOptions["onSwipeUp"]>();
  const onSwipeDownRef = useRef<VerticalSwipeOptions["onSwipeDown"]>();

  useEffect(() => {
    onSwipeUpRef.current = onSwipeUp;
    onSwipeDownRef.current = onSwipeDown;
  }, [onSwipeUp, onSwipeDown]);

  return useMemo<Handlers>(() => {
    const shouldIgnoreTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el || typeof (el as any).closest !== 'function') return false;

      // Permet d'ignorer explicitement des zones (lyrics, seekbar, drawers, etc.)
      if (el.closest('[data-swipe-ignore]')) return true;

      // Éviter de swiper quand on interagit avec des éléments UI
      if (
        el.closest(
          'input,textarea,select,button,a,[role="button"],[role="link"],[role="slider"],[contenteditable="true"]',
        )
      ) {
        return true;
      }

      return false;
    };

    const onTouchStart = (e: React.TouchEvent) => {
      st.current.ignore = shouldIgnoreTarget(e.target);
      if (st.current.ignore) return;
      const y = e.touches?.[0]?.clientY ?? 0;
      st.current.y0 = y;
      st.current.yLast = y;
      st.current.t0 = performance.now();
      st.current.locked = false;
      st.current.moved = false;
    };

    const onTouchMove = (e: React.TouchEvent) => {
      if (st.current.ignore) return;
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
      if (st.current.ignore) return;
      const dy = st.current.yLast - st.current.y0; // + = vers le bas
      const dt = Math.max(1, performance.now() - st.current.t0);
      const velocity = dy / dt; // px/ms

      const isFlick = dt <= maxFlickDuration && Math.abs(velocity) >= minVelocity;
      const isLong = Math.abs(dy) >= minDistance;

      const now = performance.now();
      if (now - st.current.lastFire < cooldownMs) return; // anti double swipe

      if ((isFlick || isLong) && st.current.moved) {
        st.current.lastFire = now;
        if (dy < 0) onSwipeUpRef.current?.();
        else if (dy > 0) onSwipeDownRef.current?.();
      }
    };

    return { onTouchStart, onTouchMove, onTouchEnd };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

