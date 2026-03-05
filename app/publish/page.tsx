import type { Metadata } from 'next';
import Link from 'next/link';
import { UserPlus, Upload, Sparkles, ArrowRight, CheckCircle2, Music2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Publier ma musique — Synaura',
  description:
    'Artiste ? Publie ta musique sur Synaura en 3 étapes simples : crée ton compte, uploade tes sons et partage-les avec la communauté.',
  alternates: { canonical: '/publish' },
  openGraph: {
    title: 'Publier ma musique sur Synaura',
    description: 'Guide complet pour mettre en ligne tes sons en 3 étapes.',
    type: 'website',
    url: '/publish',
  },
};

const STEPS = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Crée ton compte gratuitement',
    description:
      'Inscris-toi avec ton email ou ton compte Google en moins d\'une minute. Aucune carte bancaire requise.',
    details: [
      'Compte artiste gratuit, sans engagement',
      'Pseudonyme + photo de profil personnalisables',
      'Accès immédiat à l\'upload et au studio IA',
    ],
    cta: { label: 'Créer mon compte', href: '/auth/signup' },
    gradient: 'from-violet-600/15 to-indigo-600/10',
    border: 'border-violet-500/25',
    iconBg: 'bg-violet-600/20',
    iconColor: 'text-violet-300',
    numberColor: 'text-violet-500/50',
  },
  {
    number: '02',
    icon: Upload,
    title: 'Uploade ton son',
    description:
      'Dépose ton fichier audio (MP3, WAV, FLAC…) directement depuis ton dashboard. Ajoute une pochette, un titre, un genre et des tags.',
    details: [
      'Formats supportés : MP3, WAV, FLAC, AAC',
      'Jusqu\'à 50 Mo par fichier (plan gratuit)',
      'Métadonnées complètes (BPM, key, genre, mood…)',
    ],
    cta: { label: 'Accéder à l\'upload', href: '/upload' },
    gradient: 'from-indigo-600/15 to-cyan-600/10',
    border: 'border-indigo-500/25',
    iconBg: 'bg-indigo-600/20',
    iconColor: 'text-indigo-300',
    numberColor: 'text-indigo-500/50',
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'Partage & booste ta visibilité',
    description:
      'Ton son est instantanément visible dans le fil Découvrir. Utilise les boosters et le studio IA pour augmenter ta portée.',
    details: [
      'Apparition dans les sections Tendances & Pour toi',
      'Studio IA : génère des variations et des remixes',
      'Boosters de visibilité disponibles dans ton espace',
    ],
    cta: { label: 'Voir les boosters', href: '/boosters' },
    gradient: 'from-cyan-600/15 to-teal-600/10',
    border: 'border-cyan-500/25',
    iconBg: 'bg-cyan-600/20',
    iconColor: 'text-cyan-300',
    numberColor: 'text-cyan-500/50',
  },
] as const;

export default function PublishPage() {
  return (
    <div className="min-h-screen text-white">
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">

        {/* ── Header ───────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
            <Music2 size={12} />
            Pour les artistes
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Publie ta musique sur Synaura
          </h1>
          <p className="text-sm md:text-base text-white/50 max-w-xl leading-relaxed">
            Synaura est une plateforme musicale collaborative. En quelques minutes, tes sons
            peuvent être écoutés par des milliers de personnes — c'est simple, gratuit et tu
            gardes le contrôle.
          </p>
        </section>

        {/* ── 3 Steps ──────────────────────────────────────── */}
        <section className="space-y-4">
          {STEPS.map(({ number, icon: Icon, title, description, details, cta, gradient, border, iconBg, iconColor, numberColor }) => (
            <div
              key={number}
              className={`rounded-2xl border ${border} bg-gradient-to-br ${gradient} p-5 md:p-6 space-y-4`}
            >
              <div className="flex items-start gap-4">
                <div className={`shrink-0 rounded-xl ${iconBg} p-2.5`}>
                  <Icon size={20} className={iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-4xl font-black ${numberColor} leading-none mb-1`}>
                    {number}
                  </div>
                  <h2 className="text-base md:text-lg font-semibold text-white">{title}</h2>
                  <p className="mt-1.5 text-sm text-white/50 leading-relaxed">{description}</p>
                </div>
              </div>

              <ul className="space-y-1.5 pl-1">
                {details.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-xs text-white/60">
                    <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-400/70" />
                    {d}
                  </li>
                ))}
              </ul>

              <Link
                href={cta.href}
                className="inline-flex items-center gap-2 rounded-xl bg-white/8 border border-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/14 transition"
              >
                {cta.label}
                <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </section>

        {/* ── Main CTA ─────────────────────────────────────── */}
        <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/15 to-indigo-600/10 p-6 md:p-8 text-center space-y-4">
          <h2 className="text-xl font-bold">Prêt à partager ta musique ?</h2>
          <p className="text-sm text-white/50 max-w-sm mx-auto">
            Rejoins des milliers d'artistes qui publient déjà sur Synaura.
            C'est gratuit, c'est maintenant.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition"
            >
              <UserPlus size={15} />
              Créer mon compte
            </Link>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              J'ai déjà un compte
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* ── FAQ rapide ───────────────────────────────────── */}
        <section className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white/70">Questions fréquentes</h2>
          <div className="space-y-3">
            {[
              {
                q: 'Est-ce que c\'est vraiment gratuit ?',
                a: 'Oui. La création de compte et l\'upload de musique sont entièrement gratuits. Des options premium existent pour booster ta visibilité.',
              },
              {
                q: 'Je garde mes droits sur ma musique ?',
                a: 'Absolument. Synaura ne réclame aucun droit sur ton contenu. Tu restes seul propriétaire de tes œuvres.',
              },
              {
                q: 'Quels formats audio sont acceptés ?',
                a: 'MP3, WAV, FLAC et AAC sont supportés. La qualité maximale recommandée est 320 kbps / 44.1 kHz.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="space-y-1">
                <p className="text-sm font-medium text-white/80">{q}</p>
                <p className="text-xs text-white/45 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
          <Link
            href="/community/faq"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition"
          >
            Voir toutes les questions →
          </Link>
        </section>

      </main>
    </div>
  );
}
