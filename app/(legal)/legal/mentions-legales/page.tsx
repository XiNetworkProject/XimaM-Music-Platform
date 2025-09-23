'use client';

import { company, formatAddress } from '@/lib/legal';

export default function MentionsLegalesPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h2>Mentions légales</h2>
      <p>Dernière mise à jour: {company.updatedAt}</p>

      <h3>Éditeur du site</h3>
      <ul>
        <li>Nom: {company.companyName}</li>
        <li>SIREN: {company.siren || '—'}</li>
        <li>SIRET: {company.siret || '—'}</li>
        <li>Adresse: {formatAddress(company.address)}</li>
        <li>Email: {company.email}</li>
        {company.phone && <li>Téléphone: {company.phone}</li>}
      </ul>

      <h3>Hébergement</h3>
      <ul>
        <li>Hébergeur: {company.host.name}</li>
        <li>Adresse: {company.host.address}</li>
        {company.host.website && <li>Site: <a href={company.host.website} target="_blank" rel="noreferrer">{company.host.website}</a></li>}
      </ul>

      <h3>Propriété intellectuelle</h3>
      <p>Le contenu du site {company.siteName} ({company.siteUrl}) est protégé par le droit d’auteur. Toute reproduction non autorisée est interdite.</p>

      <h3>Contact</h3>
      <p>Pour toute question, écrivez-nous à {company.email}.</p>
    </article>
  );
}


