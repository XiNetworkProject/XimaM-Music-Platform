'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Radio, Compass, Plus, Library, Users, Search, Bell, MessageCircle, User, Settings } from 'lucide-react';
import Link from './HandoffLink';
import PilotLink from '@/components/pilot/PilotLink';
import ChambreSpacesMenu from '@/components/synaura/ChambreSpacesMenu';
import { SynauraAccountMenu } from '@/components/synaura/SynauraShell';
import MessageInboxButton from '@/components/messaging/MessageInboxButton';
import NotificationCenter from '@/components/NotificationCenter';
import { getWebProfileHref, isPrimaryWebRouteActive } from '@/lib/primaryNavigation';
import './app-navigation.css';

const spaces = [
  { id: 'home', href: '/live', label: 'Live', Icon: Radio },
  { id: 'discover', href: '/discover', label: 'Découvrir', Icon: Compass },
  { id: 'create', href: '/create', label: 'Créer', Icon: Plus },
  { id: 'library', href: '/library', label: 'Bibliothèque', Icon: Library },
  { id: 'messages', href: '/messages', label: 'Messages', Icon: MessageCircle },
  { id: 'community', href: '/community', label: 'Communauté', Icon: Users },
] as const;

/** Mounted once by the persistent root frame. No audio, data fetching or page state. */
export default function AppNavigation() {
  const pathname = (usePathname() || '').replace(/^\/v2(?=\/)/, '').replace('/dev/studio', '/studio');
  const { data: session } = useSession();
  return <>
    {pathname !== '/live' && <header className="syn-app-header" data-app-navigation="identity">
      <PilotLink href="/live" className="syn-app-brand" aria-label="Synaura — Live"><img src="/brand/v2/synaura-lockup.svg" width="224" height="52" alt="Synaura" /></PilotLink>
      <div className="syn-app-tools">
        <Link href="/search" aria-label="Rechercher"><Search size={19} /></Link>
        {session?.user ? <><MessageInboxButton /><NotificationCenter /></> : <><Link href="/messages" aria-label="Messages"><MessageCircle size={19} /></Link><Link href="/notifications" aria-label="Notifications"><Bell size={19} /></Link></>}
        <div className="syn-app-header-spaces"><ChambreSpacesMenu username={session?.user?.username} authenticated={Boolean(session?.user)} /></div>
        {session?.user ? <SynauraAccountMenu compact /> : <Link href={getWebProfileHref(undefined, false)} className="syn-app-account" aria-label="Se connecter"><User size={19} /></Link>}
      </div>
    </header>}
    <nav className="syn-app-nav" aria-label="Navigation principale">
      <PilotLink href="/live" className="syn-app-rail-brand" aria-label="Synaura — Live"><span className="syn-app-rail-logo"><img src="/brand/v2/synaura-lockup.svg" alt="Synaura" width="155" height="36" /></span></PilotLink>
      {spaces.map(({ id, href, label, Icon }) => {
        const active = id === 'messages' ? pathname.startsWith('/messages') : id === 'community' ? /^\/(community|city)(\/|$)/.test(pathname) : isPrimaryWebRouteActive(id, pathname);
        const NavLink = id === 'home' || id === 'discover' ? PilotLink : Link;
        return <NavLink key={id} href={href} prefetch={false} aria-current={active ? 'page' : undefined} className={`syn-app-destination syn-app-destination--${id}`}><span className="syn-app-nav-icon"><Icon size={20} aria-hidden="true" /></span><span>{label}</span><i aria-hidden="true" /></NavLink>;
      })}
      <div className="syn-app-dock-spaces"><ChambreSpacesMenu triggerLabel="Menu" username={session?.user?.username} authenticated={Boolean(session?.user)} /></div>
      {pathname === '/live' && <div className="syn-app-rail-tools"><Link href="/search" aria-label="Rechercher"><Search size={18} /></Link><Link href="/messages" aria-label="Messages"><MessageCircle size={18} /></Link><Link href="/notifications" aria-label="Notifications"><Bell size={18} /></Link><Link href={getWebProfileHref(session?.user?.username, Boolean(session?.user))} aria-label="Mon compte"><User size={18} /></Link></div>}
      <Link href="/settings" className="syn-app-settings"><Settings size={17} />Paramètres</Link>
    </nav>
  </>;
}
