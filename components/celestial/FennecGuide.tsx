'use client';

import { useState } from 'react';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import FennecSprite, { type FennecPose } from './FennecSprite';
import './celestial.css';

export default function FennecGuide({ text, pose = 'tail', compact = false, active = true, help = false }: { text: string; pose?: FennecPose; compact?: boolean; active?: boolean; help?: boolean }) {
  const [petted, setPetted] = useState(false);
  return <aside className={`celestial-guide ${compact ? 'celestial-guide--compact' : ''}`} aria-label="Un mot du fennec" data-fennec-host={active ? '' : undefined}>
    <button type="button" className="celestial-guide-pet" onClick={() => setPetted(value => !value)} aria-pressed={petted} aria-label="Faire un petit coucou au fennec"><FennecSprite pose={petted ? 'happy' : pose} active={active}/><span className="celestial-pet-star" aria-hidden="true">✧</span></button>
    <div className="celestial-guide-note"><span className="celestial-guide-sign"><Sparkles size={11}/> TON PETIT GUIDE</span><p aria-live="polite">{petted ? 'Un petit coucou ? Je suis bien avec toi. ✧' : text}</p>{help && <button className="celestial-guide-help" onClick={() => window.dispatchEvent(new Event('synaura:companion-open'))}>Demander de l’aide <ArrowUpRight size={13}/></button>}</div>
  </aside>;
}
