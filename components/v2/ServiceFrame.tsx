import type { ReactNode } from 'react';
import Link from 'next/link';
import SynauraLogo from '@/components/brand/SynauraLogo';

/** A light service chrome, with no session request or additional musical player. */
export default function ServiceFrame({ children }: { children: ReactNode }) {
  return <div className="v2-service-frame" data-chambre-space="service">
    <nav className="v2-service-nav" aria-label="Synaura et assistance">
      <Link href="/" aria-label="Synaura — accueil"><SynauraLogo variant="lockup" size={32} decorative /></Link>
      <div>
        <Link href="/live">Retour à la musique</Link>
        <Link href="/support">Aide & contact</Link>
        <Link href="/legal">Informations légales</Link>
      </div>
    </nav>
    {children}
  </div>;
}
