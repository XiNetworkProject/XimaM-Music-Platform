'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BoosterOpenModal from '@/components/BoosterOpenModal';
import BoosterPackOpenModal from '@/components/BoosterPackOpenModal';
import DailySpinModal from '@/components/DailySpinModal';

// Explicit local visual specimen. Never submitted, persisted or used as an inventory response.
const specimen = {
  id: 'visual-specimen-only', key: 'visual-specimen-only', name: 'Spécimen de revue — non attribué',
  description: 'Exemple visuel uniquement. Aucun bonus attribué.',
  type: 'track' as const, rarity: 'rare' as const, multiplier: 2, duration_hours: 24,
};

export default function RewardsReview() {
  const [surface, setSurface] = useState<'idle' | 'result' | 'pack' | 'wheel' | null>(null);
  const close = () => setSurface(null);
  useEffect(() => {
    // The real wheel is portaled. Block its only mutation control in this visual lab,
    // including keyboard-generated clicks, even if a real signed-in session is present.
    // No interception of requests, fabricated response, auth override or production change.
    const preventVisualLabSpin = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('.chambre-spin-footer button')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    document.addEventListener('click', preventVisualLabSpin, true);
    return () => document.removeEventListener('click', preventVisualLabSpin, true);
  }, []);
  return <main className="v2-page">
    <aside role="note" style={{ position: 'fixed', top: 4, left: 12, right: 76, zIndex: 1000, background: '#030508', color: '#f3f6fc', borderBottom: '1px solid #315fea', padding: '4px 8px', fontSize: 9, textAlign: 'center', pointerEvents: 'none' }}>
      REVUE VISUELLE LOCALE · SPÉCIMENS NON ATTRIBUÉS · AUCUNE VALIDATION D’ACHAT OU DE TIRAGE
    </aside>
    <p className="v2-kicker mt-10">Chambre / laboratoire des récompenses</p>
    <h1 className="v2-heading mt-6">Les surfaces.<br />Pas les transactions.</h1>
    <p className="v2-intro my-6">Les résultats sont des spécimens visuels explicitement fictifs. Aucun compte n’est simulé et aucune donnée n’est écrite. La roue conserve son statut réel, mais sa commande de tirage est verrouillée dans ce laboratoire, même avec un compte connecté.</p>
    <nav aria-label="États de revue des récompenses" className="flex flex-wrap gap-3">
      <button type="button" className="v2-action" onClick={() => setSurface('idle')}>Avant ouverture</button>
      <button type="button" className="v2-action" onClick={() => setSurface('result')}>Carte révélée — spécimen</button>
      <button type="button" className="v2-action" onClick={() => setSurface('pack')}>Révélation de pack — spécimen</button>
      <button type="button" className="v2-action" onClick={() => setSurface('wheel')}>Roue — statut réel</button>
    </nav>
    <p className="v2-metadata mt-8">Les mutations authentifiées, probabilités, récompenses et soldes ne sont pas validés ici. Cette route renvoie 404 en production.</p>
    <Link href="/dev/v2" className="v2-action mt-6">Autres surfaces de revue</Link>
    <BoosterOpenModal isOpen={surface === 'idle' || surface === 'result'} onClose={close} item={surface === 'result' ? { inventoryId: 'visual-specimen-only', booster: specimen } : null} />
    <BoosterPackOpenModal isOpen={surface === 'pack'} onClose={close} packKey="visual-specimen-only" received={[{ inventory_id: 'visual-specimen-only', booster: specimen }]} />
    <DailySpinModal isOpen={surface === 'wheel'} onClose={close} />
  </main>;
}
