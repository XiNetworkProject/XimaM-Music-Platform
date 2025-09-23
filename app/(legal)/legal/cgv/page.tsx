'use client';

import { company } from '@/lib/legal';

export default function CGVPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h2>Conditions générales de vente (CGV)</h2>
      <p>Dernière mise à jour: {company.updatedAt}</p>

      <h3>Objets des services</h3>
      <p>Abonnements Synaura (Free, Starter, Pro, Enterprise) donnant accès à des fonctionnalités et quotas différenciés.</p>

      <h3>Tarifs et paiement</h3>
      <ul>
        <li>Tarifs affichés TTC sauf indication contraire.</li>
        <li>Paiement sécurisé via Stripe. Aucune donnée de carte bancaire n’est stockée chez {company.siteName}.</li>
      </ul>

      <h3>Renouvellement et résiliation</h3>
      <ul>
        <li>Abonnements reconduits automatiquement à l’échéance.</li>
        <li>Résiliation possible à tout moment depuis la rubrique Abonnements, avec effet à la fin de la période en cours.</li>
      </ul>

      <h3>Droit de rétractation</h3>
      <p>Pour les services numériques commencés avant la fin du délai légal, le droit de rétractation peut être limité conformément à la loi.</p>

      <h3>Facturation</h3>
      <p>Une facture est émise pour chaque paiement et accessible via votre espace.</p>
    </article>
  );
}


