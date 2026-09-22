'use client';

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Heart } from 'lucide-react';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import { createLiveDoubleTap, type LiveTapPointer } from '@/lib/liveDoubleTap';

const sample = (e: PointerEvent): LiveTapPointer => ({ pointerId:e.pointerId, pointerType:e.pointerType, clientX:e.clientX, clientY:e.clientY, timeStamp:e.timeStamp, button:e.button, isPrimary:e.isPrimary });

/** A shortcut to the visible like button, including its existing entity-specific mutation and locks. */
export default function LiveArtwork({ children, active, className = 'pilot-media' }: { children: ReactNode; active: boolean; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const feedback = useRef<{ observer?: MutationObserver; timer?: ReturnType<typeof setTimeout> }>({});
  const [flash, setFlash] = useState<boolean | null>(null);
  const motion = useLivingMotion();
  const cleanup = () => { feedback.current.observer?.disconnect(); clearTimeout(feedback.current.timer); feedback.current = {}; };
  const action = useRef(() => {});
  action.current = () => {
    const button = root.current?.closest('.pilot-slide,.pilot-entry-record')?.querySelector<HTMLButtonElement>('button[data-live-like]');
    if (!active || !button || button.disabled || feedback.current.observer) return;
    const before = button.getAttribute('aria-pressed');
    // Only show success after the original mutation actually changes the visible like state.
    cleanup();
    feedback.current.observer = new MutationObserver(() => {
      const next = button.getAttribute('aria-pressed');
      if (next === before) { if (!button.disabled) cleanup(); return; }
      cleanup();
      setFlash(next === 'true');
      feedback.current.timer = setTimeout(() => setFlash(null), 900);
    });
    feedback.current.observer.observe(button, { attributes:true, attributeFilter:['aria-pressed','disabled'] });
    feedback.current.timer = setTimeout(cleanup, 8000);
    button.click();
  };
  const gesture = useRef<ReturnType<typeof createLiveDoubleTap> | null>(null);
  if (!gesture.current) gesture.current = createLiveDoubleTap(() => action.current());
  useEffect(() => {
    if (!active) { cleanup(); gesture.current?.reset(); setFlash(null); }
    return () => { cleanup(); gesture.current?.reset(); };
  }, [active]);
  return <div ref={root} className={className} data-live-artwork data-like-motion={motion.enabled}
    onPointerDown={e => gesture.current?.start(sample(e), active && !(e.target as Element).closest('button,a,input,select,[role="button"]'))}
    onPointerMove={e => gesture.current?.move(sample(e))}
    onPointerUp={e => gesture.current?.end(sample(e))}
    onPointerCancel={() => gesture.current?.reset()}>
    {children}
    {flash !== null && <span className="live-like-feedback" data-liked={flash} role="status"><Heart aria-hidden="true" fill={flash ? 'currentColor' : 'none'} /><span className="sr-only">{flash ? 'J’aime ajouté' : 'J’aime retiré'}</span></span>}
  </div>;
}
