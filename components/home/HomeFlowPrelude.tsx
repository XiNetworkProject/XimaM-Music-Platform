'use client';

import {
  type ComponentProps,
  type TouchEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import HomeFlowPreludeVisual from './HomeFlowPreludeVisual';

type Props = ComponentProps<typeof HomeFlowPreludeVisual>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function HomeFlowPrelude(props: Props) {
  const { open, onEnterFlow } = props;
  const [offsetY, setOffsetY] = useState(0);
  const [settling, setSettling] = useState(false);

  const offsetRef = useRef(0);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const lastYRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const verticalGestureRef = useRef(false);
  const finishingRef = useRef(false);
  const finishTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);

  const updateOffset = useCallback((next: number) => {
    offsetRef.current = next;
    setOffsetY(next);
  }, []);

  useEffect(() => {
    if (open) {
      finishingRef.current = false;
      verticalGestureRef.current = false;
      setSettling(false);
      updateOffset(0);
    }

    return () => {
      if (finishTimerRef.current != null) window.clearTimeout(finishTimerRef.current);
      if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);
      finishTimerRef.current = null;
      settleTimerRef.current = null;
    };
  }, [open, updateOffset]);

  const finishGesture = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setSettling(true);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onEnterFlow();
      return;
    }

    const target = Math.max(window.innerHeight, document.documentElement.clientHeight || 0);
    window.requestAnimationFrame(() => updateOffset(target));
    finishTimerRef.current = window.setTimeout(onEnterFlow, 330);
  }, [onEnterFlow, updateOffset]);

  const resetGesture = useCallback(() => {
    setSettling(true);
    updateOffset(0);
    settleTimerRef.current = window.setTimeout(() => setSettling(false), 340);
  }, [updateOffset]);

  const handleTouchStartCapture = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1 || finishingRef.current) return;
    const touch = event.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    lastYRef.current = touch.clientY;
    lastTimeRef.current = performance.now();
    verticalGestureRef.current = false;
    setSettling(false);
  };

  const handleTouchMoveCapture = (event: TouchEvent<HTMLDivElement>) => {
    const startX = startXRef.current;
    const startY = startYRef.current;
    const touch = event.touches[0];
    if (startX == null || startY == null || !touch || finishingRef.current) return;

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (!verticalGestureRef.current) {
      const verticalDistance = Math.abs(deltaY);
      const horizontalDistance = Math.abs(deltaX);
      if (deltaY < -8 && verticalDistance > horizontalDistance * 1.16) {
        verticalGestureRef.current = true;
      } else {
        return;
      }
    }

    event.preventDefault();
    event.stopPropagation();

    const viewportHeight = Math.max(1, window.innerHeight);
    updateOffset(clamp(-deltaY, 0, viewportHeight));
    lastYRef.current = touch.clientY;
    lastTimeRef.current = performance.now();
  };

  const handleTouchEndCapture = (event: TouchEvent<HTMLDivElement>) => {
    const wasVertical = verticalGestureRef.current;
    const lastY = lastYRef.current;
    const lastTime = lastTimeRef.current;
    const endY = event.changedTouches[0]?.clientY ?? lastY;

    startXRef.current = null;
    startYRef.current = null;
    lastYRef.current = null;
    verticalGestureRef.current = false;

    if (!wasVertical || finishingRef.current) return;

    event.preventDefault();
    event.stopPropagation();

    const elapsed = Math.max(1, performance.now() - lastTime);
    const velocityY = lastY == null || endY == null ? 0 : (endY - lastY) / elapsed;
    const viewportHeight = Math.max(1, window.innerHeight);
    const shouldOpen = offsetRef.current >= Math.max(72, viewportHeight * 0.1) || velocityY < -0.28;

    if (shouldOpen) finishGesture();
    else resetGesture();
  };

  if (!open) return null;

  const viewportHeight = typeof window === 'undefined' ? 1 : Math.max(1, window.innerHeight);
  const progress = clamp(offsetY / viewportHeight, 0, 1);

  return (
    <div
      className="fixed inset-0 z-[121] overflow-hidden"
      style={{ touchAction: 'pan-x' }}
      onTouchStartCapture={handleTouchStartCapture}
      onTouchMoveCapture={handleTouchMoveCapture}
      onTouchEndCapture={handleTouchEndCapture}
      onTouchCancelCapture={handleTouchEndCapture}
    >
      <div
        className="h-full w-full"
        style={{
          transform: `translate3d(0, ${-offsetY}px, 0) scale(${1 - progress * 0.012})`,
          opacity: 1 - progress * 0.22,
          transition: settling
            ? 'transform 330ms cubic-bezier(.22,.8,.2,1), opacity 300ms ease'
            : 'none',
          willChange: 'transform, opacity',
        }}
      >
        <HomeFlowPreludeVisual {...props} />
      </div>
    </div>
  );
}
