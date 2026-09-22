'use client';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Radio, Compass, Plus, Library, Users, Search, Bell, MessageCircle, User } from 'lucide-react';
import PilotLink from './PilotLink';
import PilotPlayer from './PilotPlayer';
import PilotReview from './PilotReview';
import './pilot.css';
import { usesUnifiedNavigation } from '@/lib/unifiedNavigation';

const spaces = [
  { href: '/live', label: 'Live', Icon: Radio },
  { href: '/discover', label: 'Découvrir', Icon: Compass },
  { href: '/create', label: 'Créer', Icon: Plus },
  { href: '/library', label: 'Bibliothèque', Icon: Library },
  { href: '/community', label: 'Communauté', Icon: Users },
];
export default function PilotShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const canonicalPath = pathname?.replace(/^\/v2(?=\/)/, '');
  const { data: session } = useSession();
  const username = (session?.user as { username?: string })?.username;
  return <div className="synaura-pilot" data-pilot-route={pathname}>
    <a className="pilot-skip" href="#pilot-main">Aller au contenu</a>
    {!usesUnifiedNavigation(pathname) && <><header className="pilot-identity">
      <PilotLink href="/live" aria-label="Synaura — Live"><img src="/brand/v2/synaura-lockup.svg" width="224" height="52" alt="Synaura" /></PilotLink>
      <span className="pilot-edition">La musique nous relie.</span>
      <div className="pilot-utilities">
        <PilotLink href="/search" aria-label="Rechercher"><Search /></PilotLink>
        <PilotLink href="/messages" aria-label="Messages"><MessageCircle /></PilotLink>
        <PilotLink href="/notifications" aria-label="Notifications"><Bell /></PilotLink>
        <PilotLink href={username ? `/profile/${encodeURIComponent(username)}` : '/settings'} aria-label="Mon compte"><User /></PilotLink>
      </div>
    </header>
    <nav className="pilot-navigation" aria-label="Espaces Synaura">
      {spaces.map(({ href, label, Icon }, index) => <PilotLink key={href} href={href} aria-current={canonicalPath === href ? 'page' : undefined}>
        <span className="pilot-nav-number" aria-hidden="true">0{index + 1}</span><Icon aria-hidden="true" /><span>{label}</span>
      </PilotLink>)}
    </nav></>}
    <main id="pilot-main" className="pilot-main" tabIndex={-1}>{children}</main>
    {canonicalPath !== '/live' && <PilotPlayer />}
    <PilotReview />
  </div>;
}
