'use client';

import Link from 'next/link';
import { useRef, type CSSProperties, type ReactNode } from 'react';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import AuroraBackdrop from './AuroraBackdrop';
import './celestial.css';
import FennecMark from './FennecMark';
export { default as FennecMark } from './FennecMark';

export function CelestialBrand({ href = '/landing', small = false }: { href?: string; small?: boolean }) {
  return <Link href={href} className={`celestial-brand ${small ? 'celestial-brand--small' : ''}`} aria-label="Synaura — accueil"><FennecMark /><span>Synaura<i aria-hidden="true">✧</i></span></Link>;
}

export function CelestialBackdrop({ subtle = false }: { subtle?: boolean }) {
  const { enabled } = useLivingMotion();
  return <div className={`celestial-backdrop ${subtle ? 'celestial-backdrop--subtle' : ''}`} data-moving={enabled} aria-hidden="true"><AuroraBackdrop/><div className="celestial-aurora"/><div className="celestial-stars">{Array.from({length:18},(_,index)=><i key={index} style={{'--star-x':`${12+(index*37)%84}%`,'--star-y':`${8+(index*19)%72}%`,'--star-delay':`${-index*.83}s`,'--star-size':`${index%4===0?3:1.5}px`} as CSSProperties}/>)}</div></div>;
}

export function CelestialWorld({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { enabled } = useLivingMotion();
  const root = useRef<HTMLDivElement>(null);
  return <div ref={root} className={`celestial-world ${className}`} data-moving={enabled}
    onPointerMove={event => { if (!enabled || event.pointerType !== 'mouse') return; const box = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty('--world-x', `${(event.clientX-box.left)/box.width*10-5}px`); event.currentTarget.style.setProperty('--world-y',`${(event.clientY-box.top)/box.height*8-4}px`); }}
    onPointerLeave={() => {root.current?.style.setProperty('--world-x','0px');root.current?.style.setProperty('--world-y','0px');}}>{children}</div>;
}
