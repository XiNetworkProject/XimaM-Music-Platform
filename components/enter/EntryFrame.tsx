'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import SynauraLogo from '@/components/brand/SynauraLogo';

export default function EntryFrame({ eyebrow, title, description, children, compact = false }: { eyebrow: string; title: string; description: string; children: ReactNode; compact?: boolean }) {
  return (
    <main className="v2-entry-frame" data-compact={compact}>
      <aside className="v2-entry-aside">
        <Link href="/" aria-label="Synaura, accueil"><SynauraLogo variant="wordmark" size={52} decorative /></Link>
        <div className="v2-entry-invitation"><p className="v2-kicker">Écouter. Créer. Se rencontrer.</p><p className="v2-heading">LE SON<br />NOUS<br /><em>RAPPROCHE.</em></p><p className="v2-intro">Tes découvertes, tes idées et les personnes qui leur donnent une nouvelle dimension.</p></div>
        <Link href="/discover" className="v2-entry-preview">Explorer avant d’entrer <ArrowUpRight size={17} /></Link>
      </aside>
      <section className="v2-entry-form">
        <div className="v2-entry-mobile-brand"><Link href="/" aria-label="Synaura, accueil"><SynauraLogo variant="wordmark" size={40} decorative /></Link><Link href="/" className="v2-action" aria-label="Retour à la découverte"><ArrowLeft size={18} /></Link></div>
        <header><p className="v2-kicker">{eyebrow}</p><h1 className="v2-heading">{title}</h1><p className="v2-intro">{description}</p></header>
        {children}
      </section>
    </main>
  );
}
