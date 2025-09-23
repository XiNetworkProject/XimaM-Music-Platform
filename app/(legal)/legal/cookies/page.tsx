'use client';

import { company } from '@/lib/legal';

export default function CookiesPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h2>Politique Cookies</h2>
      <p>Dernière mise à jour: {company.updatedAt}</p>

      <h3>Qu’est-ce qu’un cookie ?</h3>
      <p>Un cookie est un petit fichier déposé sur votre terminal pour assurer le bon fonctionnement du site et mesurer son audience.</p>

      <h3>Cookies utilisés</h3>
      <ul>
        <li>Cookies techniques essentiels (authentification, sécurité)</li>
        <li>Cookies de mesure d’audience (analytiques) si consentement</li>
      </ul>

      <h3>Gestion du consentement</h3>
      <p>Vous pouvez accepter/refuser les cookies non essentiels via la bannière de consentement et les paramètres de votre navigateur.</p>
    </article>
  );
}


