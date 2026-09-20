'use client';

import { useState } from 'react';
import { Maximize2, Radio, Compass, Wand2 } from 'lucide-react';
import { SynauraOverlay } from '@/components/ui/SynauraOverlay';

export const PRODUCT_SCREENS = [
  { id: 'live', title: 'Live', icon: Radio, src: '/brand/product/live-desktop.webp', label: 'Le Live Synaura : écoute, waveform et moments partagés', caption: 'Live · capture de l’interface', detail: 'Un morceau. Toute votre attention.' },
  { id: 'discover', title: 'Découvrir', icon: Compass, src: '/brand/product/discover-desktop.webp', label: 'Découvrir sur Synaura : morceaux, artistes et nouvelles rencontres', caption: 'Découvrir · capture de l’interface', detail: 'Votre prochaine rencontre musicale.' },
  { id: 'studio', title: 'Studio IA', icon: Wand2, src: '/brand/product/studio-desktop.webp', label: 'Nouveau Studio unifié : création et bibliothèque réunies', caption: 'Nouveau Studio · aperçu local, données de démonstration', detail: 'Votre idée mérite d’être entendue.' },
] as const;

export function ProductScreen({ screen = 'live', compact = false }: { screen?: typeof PRODUCT_SCREENS[number]['id']; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const current = PRODUCT_SCREENS.find(item => item.id === screen)!;
  return <><figure className={`entry-product-screen ${compact ? 'is-compact' : ''}`}><div className="entry-screen-bar" aria-hidden="true"><span /><span /><span /><small>synaura.fr / {screen === 'discover' ? 'découvrir' : screen}</small></div><button type="button" className="entry-screen-expand" onClick={() => setExpanded(true)} aria-label={`Agrandir la capture ${current.title}`}><img src={current.src} width="1440" height="900" alt={current.label} loading="lazy" decoding="async" /><span><Maximize2 size={15} />Voir en grand</span></button><figcaption>{current.caption}</figcaption></figure><SynauraOverlay open={expanded} onClose={() => setExpanded(false)} ariaLabel={`Capture ${current.title}`} size="full" className="entry-screen-dialog"><img src={current.src} alt={current.label} style={{width:'100%',height:'auto'}} /><p>{current.caption}</p></SynauraOverlay></>;
}

export default function ProductScreens() {
  const [active, setActive] = useState<typeof PRODUCT_SCREENS[number]['id']>('live');
  return <div className="entry-product-gallery"><div className="entry-screen-tabs" role="group" aria-label="Voir les interfaces de Synaura">{PRODUCT_SCREENS.map(screen => <button key={screen.id} type="button" aria-pressed={active === screen.id} onClick={() => setActive(screen.id)}><screen.icon size={16} />{screen.title}</button>)}</div><div className="entry-screen-stage" key={active}><ProductScreen screen={active} /></div></div>;
}
