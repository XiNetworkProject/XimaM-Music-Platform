'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Pause, Sparkles } from 'lucide-react';
import { useLivingMotion } from './useLivingMotion';
import './living-ambience.css';

export function MotionControl({ className = '' }: { className?: string }) {
  const motion = useLivingMotion();
  return <button type="button" className={`living-motion-control ${className}`} onClick={() => motion.setEnabled(!motion.preferred)} disabled={motion.constrained} aria-pressed={motion.preferred} aria-label={motion.constrained ? 'Animations limitées par vos préférences système' : motion.preferred ? 'Mettre les animations d’ambiance en pause' : 'Activer les animations d’ambiance'} title={motion.constrained ? 'Mouvement réduit / économie de données' : motion.preferred ? 'Mettre l’ambiance en pause' : 'Animer l’ambiance'}>{motion.preferred ? <Pause size={14} /> : <Sparkles size={14} />}<span>Ambiance</span></button>;
}

/** One decorative layer, no audio access, no continuous JavaScript animation loop. */
export default function LivingAmbience() {
  const pathname = usePathname() || '/';
  const { enabled } = useLivingMotion();
  const light = useRef<HTMLDivElement>(null);
  const publicScene = pathname === '/' || /^\/(landing|auth|enter|onboarding|dev\/chambre)(\/|$)/.test(pathname);
  const excluded = publicScene || /^\/(admin|embed|test|api)(\/|$)/.test(pathname);
  useEffect(() => {
    if (excluded || !enabled) return;
    const fine = matchMedia('(pointer: fine)');
    let frame = 0;
    const move = (event: PointerEvent) => {
      if (!fine.matches || event.pointerType === 'touch' || document.hidden || frame) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable], [role="dialog"]')) return;
      const x = (event.clientX / Math.max(1, innerWidth) - .5) * 60;
      const y = (event.clientY / Math.max(1, innerHeight) - .5) * 40;
      frame = requestAnimationFrame(() => {
        frame = 0;
        light.current?.style.setProperty('--living-x', `${x.toFixed(1)}px`);
        light.current?.style.setProperty('--living-y', `${y.toFixed(1)}px`);
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(frame); };
  }, [enabled, excluded, pathname]);
  if (excluded) return null;
  return <><div ref={light} className="living-ambience" data-moving={enabled} data-warm={/^\/(studio|create|upload|publish)/.test(pathname)} aria-hidden="true"><div className="living-ambience-orbit"><i /><i /></div></div><MotionControl className="living-app-control" /></>;
}
