'use client';

import { company } from '@/lib/legal';

export default function RGPDPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h2>Données personnelles (RGPD)</h2>
      <p>Dernière mise à jour: {company.updatedAt}</p>

      <h3>Finalités</h3>
      <ul>
        <li>Fourniture du service de streaming et d’hébergement de contenus</li>
        <li>Mesure de performance et lutte contre la fraude/abus</li>
        <li>Facturation et support client</li>
      </ul>

      <h3>Droits des personnes</h3>
      <p>Vous disposez des droits prévus par le RGPD. Pour les exercer: {company.email} {company.dpoEmail ? `(DPO: ${company.dpoEmail})` : ''}.</p>

      <h3>Transferts hors UE</h3>
      <p>Certains sous-traitants peuvent être situés hors UE. Des garanties appropriées sont mises en place (clauses contractuelles types).</p>
    </article>
  );
}


