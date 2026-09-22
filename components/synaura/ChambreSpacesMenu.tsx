'use client';

import { useCallback, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Grid2X2 } from 'lucide-react';
import Link from '@/components/navigation/HandoffLink';
import { getWebProfileHref } from '@/lib/primaryNavigation';
import { SynauraOverlay, SynauraOverlayTitle } from '@/components/ui/SynauraOverlay';
import ChambreResonance from '@/components/v2/ChambreResonance';

const SPACES = [
  { title: 'Écouter', number: '01', links: [
    { href: '/live', label: 'Live', detail: 'La musique, en mouvement.' },
    { href: '/discover', label: 'Découvrir', detail: 'Suivez une nouvelle fréquence.' },
    { href: '/library', label: 'Bibliothèque', detail: 'Vos morceaux et vos playlists.' },
    { href: '/search', label: 'Rechercher', detail: 'Sons, artistes, posts et playlists.' },
  ] },
  { title: 'Créer', number: '02', links: [
    { href: '/create', label: 'L’atelier', detail: 'Choisissez votre point de départ.' },
    { href: '/ai-generator', label: 'Création IA', detail: 'D’une idée à vos premières versions.' },
    { href: '/studio', label: 'Studio IDE', detail: 'Un espace de travail pour vos projets.' },
    { href: '/upload', label: 'Publier un son', detail: 'Single, EP ou album.' },
    { href: '/clips/new', label: 'Créer un Clip', detail: 'Un morceau, votre point de vue.' },
    { href: '/ai-library', label: 'Mes créations IA', detail: 'Retrouvez vos générations.' },
  ] },
  { title: 'Rencontrer', number: '03', links: [
    { href: '/community', label: 'Communauté', detail: 'Avis, collaborations et remixes.' },
    { href: '/messages', label: 'Messages', detail: 'Les conversations se poursuivent.' },
    { href: '/notifications', label: 'Notifications', detail: 'Ce qui se passe autour de vous.' },
    { href: '/posts', label: 'Posts', detail: 'Les histoires derrière les sons.' },
    { href: '/city', label: 'Synaura City', detail: 'Les rendez-vous de la communauté.' },
  ] },
] as const;

/** Navigation view only: existing routes, handoffs and access guards remain the owners. */
export default function ChambreSpacesMenu({ username, authenticated = false, triggerLabel = 'Espaces' }: { username?: string | null; authenticated?: boolean; triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const accountLinks = [
    { href: getWebProfileHref(username, authenticated), label: 'Mon profil' },
    { href: '/settings', label: 'Paramètres' },
    { href: '/stats', label: 'Statistiques' },
    { href: '/subscriptions', label: 'Abonnement' },
    { href: '/boosters', label: 'Boosters' },
    { href: '/support', label: 'Aide' },
  ];
  return <>
    <button type="button" className="chambre-spaces-trigger" aria-label={triggerLabel} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <Grid2X2 size={17} aria-hidden="true" /><span>{triggerLabel}</span>
    </button>
    <SynauraOverlay open={open} onClose={close} presentation="responsive" size="full" initialFocusRef={titleRef} history={false} className="chambre-spaces-panel">
      <header className="chambre-spaces-heading">
        <ChambreResonance className="chambre-spaces-resonance" />
        <p>SYNAURA / LE MÊME UNIVERS</p>
        <SynauraOverlayTitle ref={titleRef} tabIndex={-1}>À vous de choisir<br /><span>la suite.</span></SynauraOverlayTitle>
      </header>
      <nav aria-label="Tous les espaces Synaura" className="chambre-spaces-grid">
        {SPACES.map(space => <section key={space.number}>
          <h3><span>{space.number}</span>{space.title}</h3>
          {space.links.map(link => <Link key={link.href} href={link.href} prefetch={false} onClick={close} aria-current={pathname === link.href ? 'page' : undefined}>
            <span><strong>{link.label}</strong><small>{link.detail}</small></span><ArrowUpRight size={17} aria-hidden="true" />
          </Link>)}
        </section>)}
      </nav>
      <nav aria-label="Compte et services" className="chambre-spaces-account">
        {accountLinks.map(link => <Link key={link.href} href={link.href} prefetch={false} onClick={close} aria-current={pathname === link.href ? 'page' : undefined}>{link.label}<ArrowUpRight size={13} aria-hidden="true" /></Link>)}
      </nav>
    </SynauraOverlay>
  </>;
}
