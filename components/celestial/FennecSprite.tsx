'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import atlas from '@/public/companions/fennec/atlas.json';
import animations from '@/public/companions/fennec/animations.json';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';

export type FennecPose = keyof typeof animations;

/** Decorative cameos use the original atlas, not a newly generated interpretation. */
export default function FennecSprite({ pose = 'tail', className = '', active = true }: { pose?: FennecPose; className?: string; active?: boolean }) {
  const element = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [frame, setFrame] = useState(0);
  const { enabled } = useLivingMotion();
  const sequence = animations[pose];
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const observer = new IntersectionObserver(entries => setVisible(entries.some(entry => entry.isIntersecting)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setFrame(0);
    if (!enabled || !visible || !active || sequence.frames.length < 2) return;
    const timer = setInterval(() => setFrame(value => (value + 1) % sequence.frames.length), 1000 / sequence.fps);
    return () => clearInterval(timer);
  }, [enabled, visible, active, sequence]);
  const key = sequence.frames[enabled && active ? frame % sequence.frames.length : 0] as keyof typeof atlas.frames;
  const rect = atlas.frames[key];
  return <span ref={element} aria-hidden="true" className={`celestial-fennec ${className}`} data-pose={pose} style={{
    backgroundImage: 'url(/companions/fennec/atlas.webp)', backgroundSize: '800% 900%',
    backgroundPosition: `${rect.x / (atlas.size.w - 320) * 100}% ${rect.y / (atlas.size.h - 320) * 100}%`,
  } as CSSProperties} />;
}
