import type { Metadata } from 'next';
import Link from 'next/link';
import { Ban, CheckCircle2, Link2, ArrowRight, Music2 } from 'lucide-react';
import { RevealEmailButton } from '@/app/support/SupportForm';

export const metadata: Metadata = {
  title: 'Partenariats & Presse — Synaura',
  description:
    'Collaborations, sponsoring et demandes presse pour Synaura. Aucun service de booking, radio promo ou label — lire avant d\'écrire.',
  alternates: { canonical: '/partnerships' },
  openGraph: {
    title: 'Partenariats & Presse — Synaura',
    description: 'Demandes de partenariats pour Synaura : collaborations, intégrations, sponsoring.',
    type: 'website',
    url: '/partnerships',
  },
};

const NOT_AVAILABLE = [
  'Booking / management artistique',
  'Radio promotionnelle ou airplay payant',
  'Services de label, édition ou distribution',
  'Achat / vente de listes d\'abonnés ou leads',
  'Sponsoring de concerts ou festivals',
  'Demandes de featuring pour artistes tiers',
];

const ELIGIBLE = [
  'Intégration technique ou API (plateformes musicales, outils créatifs)',
  'Sponsoring de fonctionnalités ou de contenus dans l\'app',
  'Couverture presse / podcast / newsletter autour de la plateforme',
  'Partenariat école / formation / incubateur',
  'Collaboration avec d\'autres services SaaS ou B2B',
];

export default function PartnershipsPage() {
  return (
    <div className="min-h-screen text-white">
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">

        {/* ── Header ───────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <Link2 size={12} />
            Partenariats & Presse
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Travailler avec Synaura
          </h1>
          <p className="text-sm md:text-base text-white/50 max-w-xl leading-relaxed">
            Synaura est une plateforme musicale indépendante. Si tu veux collaborer avec nous,
            lis d'abord attentivement ce que nous faisons — et ce que nous ne faisons pas.
          </p>
        </section>

        {/* ── Ce que nous ne faisons PAS ───────────────────── */}
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Ban size={16} className="text-rose-400" />
            <h2 className="text-sm font-semibold text-rose-300">Ce que nous ne proposons pas</h2>
          </div>
          <p className="text-xs text-rose-300/60 leading-relaxed">
            Nous recevons beaucoup de messages hors-sujet. Merci de vérifier cette liste avant
            de nous contacter : si ta demande y figure, nous ne pourrons pas y donner suite.
          </p>
          <ul className="space-y-2">
            {NOT_AVAILABLE.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-xs text-rose-300/80">
                <Ban size={12} className="mt-0.5 shrink-0 text-rose-500" />
                {item}
              </li>
            ))}
          </ul>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-xs text-rose-300/70">
            Tu es artiste et tu cherches à distribuer ta musique ?{' '}
            <Link href="/publish" className="underline hover:text-rose-200 transition">
              Voir comment publier sur Synaura →
            </Link>
          </div>
        </section>

        {/* ── Ce que nous faisons ──────────────────────────── */}
        <section className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-600/10 to-violet-600/8 p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-indigo-300">Partenariats éligibles</h2>
          </div>
          <ul className="space-y-2">
            {ELIGIBLE.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-xs text-white/65">
                <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-400/70" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Comment nous contacter ───────────────────────── */}
        <section className="rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] p-5 md:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white/80">Soumettre une demande</h2>
          <p className="text-xs text-white/45 leading-relaxed">
            Envoie-nous un email avec :<br />
            <strong className="text-white/70">Objet :</strong>{' '}
            <code className="rounded bg-white/8 px-1.5 py-0.5 text-indigo-300">
              [Partenariat] Nom de ta société / ton projet
            </code>
            <br />
            <strong className="text-white/70">Corps :</strong> Qui tu es, ce que tu proposes, la durée envisagée et ce que ça apporte à Synaura.
          </p>

          <div className="space-y-2">
            <p className="text-xs text-white/40">Adresse de contact (cliquer pour révéler) :</p>
            <RevealEmailButton />
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300/70">
            Les demandes hors-sujet (booking, promo radio, listes, etc.) ne reçoivent pas de réponse.
            Merci de ta compréhension.
          </div>
        </section>

        {/* ── Artistes → /publish ──────────────────────────── */}
        <section className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-600/10 to-indigo-600/8 p-5 flex items-center gap-4">
          <Music2 size={28} className="shrink-0 text-violet-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Tu es artiste ?</p>
            <p className="text-xs text-white/45 mt-0.5">
              Publie ta musique directement sur Synaura — gratuitement et sans intermédiaire.
            </p>
          </div>
          <Link
            href="/publish"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white text-black px-4 py-2 text-xs font-semibold hover:bg-white/90 transition whitespace-nowrap"
          >
            Publier
            <ArrowRight size={13} />
          </Link>
        </section>

      </main>
    </div>
  );
}
