'use client';

import { company } from '@/lib/legal';

export default function CGUPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h2>Conditions générales d’utilisation (CGU)</h2>
      <p>Dernière mise à jour: {company.updatedAt}</p>

      <h3>Objet</h3>
      <p>Les présentes CGU encadrent l’accès et l’utilisation du service {company.siteName}.</p>

      <h3>Compte utilisateur</h3>
      <ul>
        <li>Vous êtes responsable de la confidentialité de vos identifiants.</li>
        <li>Tout abus (spam, harcèlement, piratage) entraînera la suspension du compte.</li>
      </ul>

      <h3>Contenus</h3>
      <ul>
        <li>Vous garantissez détenir les droits sur les contenus publiés.</li>
        <li>Les contenus illicites ou contrefaisants sont interdits.</li>
      </ul>

      <h3>Modalités de service</h3>
      <ul>
        <li>Le service peut évoluer et être interrompu pour maintenance.</li>
        <li>{company.siteName} ne garantit pas une disponibilité ininterrompue.</li>
      </ul>

      <h3>Responsabilité</h3>
      <p>{company.siteName} ne saurait être tenue responsable des dommages indirects.</p>

      <h3>Droit applicable</h3>
      <p>Droit français. Compétence des tribunaux français.</p>
    </article>
  );
}


