'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, ChevronDown, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Radio, Compass, Plus, Library, Users, Search, Bell, MessageCircle, User, Settings, Sparkles, Zap } from 'lucide-react';
import Link from './HandoffLink';
import PilotLink from '@/components/pilot/PilotLink';
import ChambreSpacesMenu from '@/components/synaura/ChambreSpacesMenu';
import { SynauraAccountMenu } from '@/components/synaura/SynauraShell';
import MessageInboxButton from '@/components/messaging/MessageInboxButton';
import NotificationCenter from '@/components/NotificationCenter';
import SynauraUniversalSearch from '@/components/synaura/SynauraUniversalSearch';
import { getWebProfileHref, isPrimaryWebRouteActive } from '@/lib/primaryNavigation';
import './app-navigation.css';
import SynauraLogo from '@/components/brand/SynauraLogo';

const spaces = [
  { id: 'home', href: '/live', label: 'Live', Icon: Radio },
  { id: 'discover', href: '/discover', label: 'Découvrir', Icon: Compass },
  { id: 'create', href: '/create', label: 'Créer', Icon: Plus },
  { id: 'library', href: '/library', label: 'Bibliothèque', Icon: Library },
  { id: 'messages', href: '/messages', label: 'Messages', Icon: MessageCircle },
  { id: 'community', href: '/community', label: 'Communauté', Icon: Users },
] as const;

/** Persistent navigation. Search suggestions fetch only after focus and a typed query. */
export default function AppNavigation() {
  const pathname = (usePathname() || '').replace(/^\/v2(?=\/)/, '').replace(/^\/dev\/studio$/, '/studio').replace(/^\/dev\/stats$/, '/stats');
  const { data: session } = useSession();
  const studio = pathname === '/studio';
  const [collapsed, setCollapsed] = useState(true);
  const [headerPinned, setHeaderPinned] = useState(false);
  return <>
    {studio && <button className="syn-studio-edge" aria-label="Afficher la navigation supérieure" aria-expanded={headerPinned} aria-controls="studio-global-header" onClick={() => setHeaderPinned(value => !value)}><ChevronDown size={14}/></button>}
    {pathname !== '/live' && <header id={studio ? 'studio-global-header' : undefined} className="syn-app-header" data-app-navigation="identity" data-studio-header={studio ? '' : undefined} data-pinned={studio && headerPinned ? '' : undefined} onKeyDown={event => { if (studio && event.key === 'Escape') { setHeaderPinned(false); document.querySelector<HTMLButtonElement>('.syn-studio-edge')?.focus(); } }}>
      <PilotLink href="/live" className="syn-app-brand" aria-label="Synaura — Live"><SynauraLogo variant="lockup" size={35} decorative /></PilotLink>
      {pathname !== '/search' && <div className="syn-app-header-search"><SynauraUniversalSearch compact /></div>}
      <div className="syn-app-tools">
        <Link href="/search" className={pathname !== '/search' ? 'syn-app-search-icon' : undefined} aria-label="Rechercher"><Search size={19} /></Link>
        {session?.user ? <><MessageInboxButton /><NotificationCenter /></> : <><Link href="/messages" aria-label="Messages"><MessageCircle size={19} /></Link><Link href="/notifications" aria-label="Notifications"><Bell size={19} /></Link></>}
        <div className="syn-app-header-spaces"><ChambreSpacesMenu username={session?.user?.username} authenticated={Boolean(session?.user)} /></div>
        {session?.user ? <SynauraAccountMenu compact /> : <Link href={getWebProfileHref(undefined, false)} className="syn-app-account" aria-label="Se connecter"><User size={19} /></Link>}
        {studio && <button className="syn-studio-header-close" aria-label="Masquer la navigation supérieure" onClick={event => { setHeaderPinned(false); event.currentTarget.blur(); }}><X size={16}/></button>}
      </div>
    </header>}
    <nav id="synaura-primary-navigation" className="syn-app-nav" aria-label="Navigation principale" data-studio-nav={studio ? (collapsed ? 'compact' : 'expanded') : undefined}>
      {studio && <button className="syn-studio-collapse" aria-label={collapsed ? 'Déplier la navigation latérale' : 'Réduire la navigation latérale'} aria-expanded={!collapsed} aria-controls="synaura-primary-navigation" onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen size={19}/> : <PanelLeftClose size={19}/>}</button>}
      <PilotLink href="/live" className="syn-app-rail-brand" aria-label="Synaura — Live"><span className="syn-app-rail-logo"><SynauraLogo variant="lockup" size={35} decorative /></span></PilotLink>
      {spaces.map(({ id, href, label, Icon }) => {
        const active = id === 'messages' ? pathname.startsWith('/messages') : id === 'community' ? /^\/(community|city)(\/|$)/.test(pathname) : isPrimaryWebRouteActive(id, pathname);
        const NavLink = id === 'home' || id === 'discover' ? PilotLink : Link;
        return <NavLink key={id} href={href} prefetch={false} aria-label={label} title={studio && collapsed ? label : undefined} aria-current={active ? 'page' : undefined} className={`syn-app-destination syn-app-destination--${id}`}><span className="syn-app-nav-icon"><Icon size={20} aria-hidden="true" /></span><span>{label}</span><i aria-hidden="true" /></NavLink>;
      })}
      <div className="syn-app-dock-spaces"><ChambreSpacesMenu triggerLabel="Menu" username={session?.user?.username} authenticated={Boolean(session?.user)} /></div>
      {pathname === '/live' && <div className="syn-app-rail-tools"><Link href="/search" aria-label="Rechercher"><Search size={18} /></Link><Link href="/messages" aria-label="Messages"><MessageCircle size={18} /></Link><Link href="/notifications" aria-label="Notifications"><Bell size={18} /></Link><Link href={getWebProfileHref(session?.user?.username, Boolean(session?.user))} aria-label="Mon compte"><User size={18} /></Link></div>}
      <Link href="/boosters" prefetch={false} aria-label="Boosters et récompenses" aria-current={pathname === '/boosters' ? 'page' : undefined} className="syn-app-settings syn-app-rewards"><Zap size={17} aria-hidden="true" />Boosters</Link>
      <Link href="/subscriptions" prefetch={false} aria-label="Abonnements" aria-current={pathname === '/subscriptions' ? 'page' : undefined} className="syn-app-settings syn-app-membership"><Sparkles size={17} aria-hidden="true" />Abonnements</Link>
      <Link href="/settings" className="syn-app-settings" aria-label="Paramètres"><Settings size={17} />Paramètres</Link>
    </nav>
  </>;
}
