'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { MotionControl } from '@/components/ambient/LivingAmbience';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import { ProductScreen } from './ProductScreens';
import './entry-experience.css';

export default function EntryFrame({ eyebrow, title, description, children, compact = false }: { eyebrow: string; title: string; description: string; children: ReactNode; compact?: boolean }) {
  const { enabled } = useLivingMotion();
  return (
    <main className="entry-auth" data-compact={compact} data-moving={enabled}>
      <aside className="entry-auth-story">
        <div className="entry-auth-glow" aria-hidden="true" />
        <Link className="entry-auth-brand" href="/landing" aria-label="Synaura, présentation"><img src="/brand/v2/synaura-lockup.svg" width="155" height="38" alt="Synaura" /></Link>
        <div className="entry-auth-text"><p className="entry-kicker">ÉCOUTER. CRÉER. SE RENCONTRER.</p><h2>Le son nous<br /><em>rapproche.</em></h2><p>Un nouvel artiste. Une idée qui prend vie.<br />Et cette sensation d’être à sa place.</p></div>
        <div className="entry-auth-preview"><ProductScreen screen="discover" compact /></div>
        <div className="entry-auth-bottom"><Link href="/landing/presentation">Découvrir Synaura <ArrowUpRight size={16} /></Link><MotionControl /></div>
      </aside>
      <section className="entry-auth-panel">
        <div className="entry-auth-mobile-nav"><Link href="/landing" aria-label="Synaura, présentation"><img src="/brand/v2/synaura-lockup.svg" width="127" height="32" alt="Synaura" /></Link><div><MotionControl /><Link href="/landing" className="entry-text-link" aria-label="Retour à la présentation"><ArrowLeft size={18} /></Link></div></div>
        <header><p className="entry-kicker">{eyebrow}</p><h1>{title}</h1><p>{description}</p></header>
        {children}
      </section>
    </main>
  );
}
