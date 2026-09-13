import type { Metadata } from 'next';
import Link from '@/components/navigation/HandoffLink';
import { ArrowRight, Upload } from 'lucide-react';
import { SynauraAppShell, SynauraRouteNav, SynauraTopBar } from '@/components/synaura/SynauraShell';
import HandoffReturn from '@/components/navigation/HandoffReturn';

export const metadata: Metadata = {
  title: 'Publier ma musique — Synaura',
  description: 'Prépare ta prochaine sortie sur Synaura : fichiers, identité musicale, droits et diffusion.',
  alternates: { canonical: '/publish' },
};

const STEPS = [
  {
    number: '01', title: 'Un espace à ton nom.',
    description: 'Connecte-toi ou crée ton compte pour retrouver tes morceaux et leur publication.',
    details: ['Ton profil artiste et ses liens', 'Tes créations et ta bibliothèque'],
    cta: { label: 'Créer mon compte', href: '/auth/signup' },
  },
  {
    number: '02', title: 'Le morceau, puis sa présentation.',
    description: 'Importe ton audio. Choisis un single, un EP ou un album ; complète la pochette et les informations de ta sortie.',
    details: ['Fichiers audio et ordre des pistes', 'Titre, artwork, genre, tags et métadonnées', 'Limites de fichier affichées selon ton compte'],
    cta: { label: 'Préparer une sortie', href: '/upload' },
  },
  {
    number: '03', title: 'Décide de sa place dans Synaura.',
    description: 'Vérifie la visibilité, le moment de publication et les autorisations de création avant de partager.',
    details: ['Diffusion et programmation', 'Autorisations Clip, remix et variation', 'Options de visibilité existantes'],
    cta: { label: 'Découvrir les boosters', href: '/boosters' },
  },
];

export default function PublishPage() {
  return (
    <SynauraAppShell contentClassName="v2-creation chambre-signature-publish !max-w-[1480px]">
      <SynauraTopBar />
      <SynauraRouteNav />
      <div className="mb-6"><HandoffReturn fallbackHref="/create" fallbackLabel="Retour à l’atelier" /></div>
      <main className="v2-publish">
      <header className="v2-publish-intro">
        <div className="chambre-signature-publish-copy">
        <p className="v2-kicker">L’atelier / Publier sur Synaura</p>
        <h1>TA MUSIQUE.<br /><span>SANS ATTENDRE.</span></h1>
        <p>Une sortie ne se résume pas à un fichier. Donne-lui un nom, une image et une place dans ton univers.</p>
        <Link href="/upload" className="v2-create-primary mt-8"><Upload size={16} />Préparer ma sortie</Link>
        <div className="mt-6 flex flex-wrap gap-5 text-sm text-[var(--v2-muted)]">
          <Link href="/auth/signin">J’ai déjà un compte</Link>
          <Link href="/create">Explorer les outils de création</Link>
        </div>
        </div>
        <div className="chambre-publish-material" aria-hidden="true"><div className="chambre-signature-release-sleeve"><span>SYNAURA / ÉDITION ORIGINALE</span><img src="/brand/chambre/membrane-cobalt.png" alt="" loading="lazy" decoding="async" /><strong>À TON<br />NOM.</strong><span>SINGLE &nbsp; / &nbsp; EP &nbsp; / &nbsp; ALBUM</span></div></div>
      </header>
      <div className="chambre-signature-release-guide">
        <div className="chambre-signature-section-heading"><p className="v2-kicker">De la préparation à la sortie</p><h2>Chaque détail compte.</h2><span>01 — 03</span></div>
        <section className="chambre-signature-release-steps" aria-label="Les étapes de publication">
          {STEPS.map(({ number, title, description, details, cta }) => (
            <article key={number} className="v2-publish-step">
              <header><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div></header>
              <ul>{details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
              <Link href={cta.href}>{cta.label}<ArrowRight size={16} aria-hidden="true" /></Link>
            </article>
          ))}
        </section>
        <section className="v2-publish-faq" aria-labelledby="publishing-faq">
          <h2 id="publishing-faq" className="v2-kicker">Avant de partager</h2>
          <details><summary>Quels fichiers puis-je importer ?</summary><p>Le formulaire de publication indique les formats et limites disponibles pour ton compte, avant l’envoi. Tu peux y préparer un single, un EP ou un album.</p></details>
          <details><summary>Comment régler les autorisations de création ?</summary><p>Les réglages de diffusion permettent de choisir les autorisations Clip, remix audio et variation IA pour ta sortie. Vérifie que tu disposes des droits nécessaires sur les éléments importés.</p></details>
          <details><summary>Où retrouver mes créations IA ?</summary><p>Ta bibliothèque IA conserve tes générations et propose les actions d’écoute, de téléchargement et de publication.</p><Link href="/ai-library" className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--v2-accent)]">Ouvrir la bibliothèque IA<ArrowRight size={14} /></Link></details>
          <Link href="/community/faq" className="mt-6 inline-flex min-h-11 items-center gap-3 text-sm">Toutes les questions<ArrowRight size={14} /></Link>
        </section>
      </div>
    </main>
    </SynauraAppShell>
  );
}
