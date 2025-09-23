'use client';

import { company } from '@/lib/legal';

export default function ConfidentialitePage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h2>Politique de confidentialité</h2>
      <p>Dernière mise à jour: {company.updatedAt}</p>

      <h3>Responsable du traitement</h3>
      <p>{company.companyName} est responsable du traitement des données collectées sur {company.siteUrl}.</p>

      <h3>Données collectées</h3>
      <ul>
        <li>Données de compte (email, nom, pseudo)</li>
        <li>Contenu musical et métadonnées</li>
        <li>Données d’usage (plays, likes, statistiques)</li>
        <li>Données de paiement (Stripe) – traitées par notre prestataire</li>
      </ul>

      <h3>Base légale</h3>
      <p>Exécution du contrat, intérêt légitime, et consentement (pour les cookies non essentiels).</p>

      <h3>Durées de conservation</h3>
      <p>Les données sont conservées pendant la durée nécessaire aux finalités, puis supprimées ou anonymisées.</p>

      <h3>Vos droits</h3>
      <ul>
        <li>Accès, rectification, suppression</li>
        <li>Limitation, opposition, portabilité</li>
        <li>Retrait du consentement à tout moment</li>
      </ul>
      <p>Contact: {company.email}{company.dpoEmail ? ` / DPO: ${company.dpoEmail}` : ''}</p>

      <h3>Sous-traitants</h3>
      <ul>
        <li>Stripe (paiement)</li>
        <li>Supabase (hébergement des données)</li>
        <li>Vercel (hébergement applicatif)</li>
        <li>Cloudinary (médias)</li>
      </ul>
    </article>
  );
}


