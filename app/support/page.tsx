import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, HelpCircle, Scale, Music, Handshake } from 'lucide-react';
import { SupportHero, NoBookingNotice, RevealEmailButton, SupportForm } from './SupportForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Support & Contact — Synaura',
  description:
    'Besoin d\'aide ? Accède au support Synaura, signale un bug, consulte la FAQ ou publie ta musique en 3 étapes.',
  alternates: { canonical: '/support' },
  openGraph: {
    title: 'Support & Contact — Synaura',
    description: 'Support, contact, FAQ et ressources pour les artistes.',
    type: 'website',
    url: '/support',
  },
};

export default function SupportPage() {
  return (
    <div className="min-h-screen text-white">
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">

        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Support</div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Comment peut-on t'aider ?
          </h1>
          <p className="text-sm md:text-base text-white/50 max-w-xl">
            Choisis l'action qui correspond à ta situation. La plupart des demandes trouvent
            une réponse sans avoir à nous contacter.
          </p>
        </section>

        {/* ── 3 CTAs ───────────────────────────────────────── */}
        <SupportHero />

        {/* ── No-booking notice ────────────────────────────── */}
        <NoBookingNotice />

        {/* ── Ressources ───────────────────────────────────── */}
        <section className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white/80">Ressources utiles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { href: '/community/faq', icon: HelpCircle, label: 'FAQ', sub: 'Réponses aux questions fréquentes' },
              { href: '/publish', icon: Music, label: 'Publier ma musique', sub: 'Guide en 3 étapes pour artistes' },
              { href: '/partnerships', icon: Handshake, label: 'Partenariats', sub: 'Collaborations & presse' },
              { href: '/legal', icon: Scale, label: 'Centre légal', sub: 'CGU, CGV, RGPD, Cookies' },
            ].map(({ href, icon: Icon, label, sub }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3 hover:bg-white/6 hover:border-white/15 transition group"
              >
                <Icon size={16} className="text-indigo-400 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-white group-hover:text-indigo-300 transition">{label}</div>
                  <div className="text-xs text-white/40">{sub}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Contact direct ───────────────────────────────── */}
        <section className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white/80">Contact direct</h2>
          <p className="text-xs text-white/40">
            Pour les questions sensibles (légal, facturation, données personnelles) ou si le formulaire
            ci-dessous ne convient pas, tu peux nous écrire directement.
          </p>
          <RevealEmailButton />
        </section>

        {/* ── Formulaire de support ─────────────────────────── */}
        <section
          id="contact-form"
          className="rounded-2xl border border-white/8 bg-white/3 p-5 md:p-6 space-y-5 scroll-mt-24"
        >
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white">Formulaire de support</h2>
            <p className="text-xs text-white/40">
              Décris ton problème, nous t'répondrons dès que possible.
            </p>
          </div>
          <SupportForm />
        </section>

        {/* ── Footer note ──────────────────────────────────── */}
        <p className="text-center text-xs text-white/25 pb-4">
          Astuce : pour un bug, précise ton navigateur, ton appareil et l'URL exacte — ça nous fait gagner beaucoup de temps.
        </p>
      </main>
    </div>
  );
}
