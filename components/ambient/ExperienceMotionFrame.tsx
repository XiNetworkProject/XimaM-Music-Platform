'use client';

import { useRef, type ReactNode, type PointerEvent } from 'react';
import { useLivingMotion } from './useLivingMotion';

/** Decorative coordinates only. Respects the existing global pause and OS preferences. */
export default function ExperienceMotionFrame({ children, className }: { children: ReactNode; className: string }) {
  const { enabled } = useLivingMotion();
  const frame = useRef<HTMLDivElement>(null);
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    frame.current?.style.setProperty('--scene-x', `${((event.clientX - bounds.left) / bounds.width - .5) * 16}px`);
    frame.current?.style.setProperty('--scene-y', `${((event.clientY - bounds.top) / bounds.height - .5) * 12}px`);
  };
  return <div ref={frame} className={className} data-motion={enabled} onPointerMove={move} onPointerLeave={() => {
    frame.current?.style.setProperty('--scene-x', '0px');
    frame.current?.style.setProperty('--scene-y', '0px');
  }}>{children}</div>;
}
