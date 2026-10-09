'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { MotionControl } from '@/components/ambient/LivingAmbience';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import { CelestialBackdrop, CelestialBrand } from '@/components/celestial/CelestialWorld';
import FennecGuide from '@/components/celestial/FennecGuide';
import './entry-experience.css';
import '@/components/celestial/celestial.css';

export default function EntryFrame({ eyebrow, title, description, children, compact = false }: { eyebrow: string; title: string; description: string; children: ReactNode; compact?: boolean }) {
  const { enabled } = useLivingMotion();
  const [privateInput, setPrivateInput] = useState(false);
  return (
    <main className="entry-auth celestial-auth" data-compact={compact} data-moving={enabled}
      onFocusCapture={event => setPrivateInput(event.target instanceof HTMLInputElement && event.target.type === 'password')}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPrivateInput(false); }}>
      <CelestialBackdrop/>
      <aside className="entry-auth-story">
        <div className="entry-auth-brand"><CelestialBrand/></div>
        <div className="entry-auth-text"><p className="celestial-eyebrow">UN CŒUR DANS LES PIXELS</p><h2>Il y a une place<br /><em>pour toi, ici.</em></h2><p>Ta musique. Tes idées. Tes rencontres.<br />Et un petit compagnon pour la route.</p></div>
        <FennecGuide pose={privateInput ? 'sleep' : 'tail'} text={privateInput ? 'Je ferme les yeux. Cette petite clé, elle n’appartient qu’à toi.' : compact ? 'Pas besoin de tout connaître. On découvre à ton rythme.' : 'Installe-toi. Je reste tout près pendant que tu entres.'}/>
        <div className="entry-auth-bottom"><Link href="/landing/presentation">Découvrir Synaura <ArrowUpRight size={16} /></Link><MotionControl /></div>
      </aside>
      <section className="entry-auth-panel">
        <header><p className="entry-kicker">{eyebrow}</p><h1>{title}</h1><p>{description}</p></header>
        {children}
      </section>
    </main>
  );
}
