import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Support & Contact — Synaura',
  description:
    'Besoin d’aide ? Contacte le support Synaura, consulte la FAQ et retrouve les documents légaux (CGU/CGV/RGPD/Cookies).',
  alternates: { canonical: '/support' },
  openGraph: {
    title: 'Support & Contact — Synaura',
    description: 'Support, contact, FAQ et centre légal.',
    type: 'website',
    url: '/support',
  },
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background-primary text-foreground-primary">
      <main className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        <section className="rounded-3xl border border-border-secondary bg-background-fog-thin p-6 md:p-8">
          <div className="text-xs text-foreground-tertiary">Support</div>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">Support & contact</h1>
          <p className="mt-3 text-sm md:text-base text-foreground-secondary max-w-2xl">
            Une question, un bug, un problème de facturation ou de compte ? Voici les bons liens et les bons contacts.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="mailto:contact@synaura.fr"
              className="h-11 px-4 inline-flex items-center justify-center rounded-2xl bg-overlay-on-primary text-foreground-primary border border-border-secondary hover:opacity-90 transition font-semibold"
            >
              Contacter (email)
            </a>
            <Link
              href="/community/faq"
              className="h-11 px-4 inline-flex items-center justify-center rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition font-semibold"
            >
              FAQ
            </Link>
            <Link
              href="/legal"
              className="h-11 px-4 inline-flex items-center justify-center rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition"
            >
              Centre légal
            </Link>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border-secondary bg-white/5 p-5">
            <div className="text-sm font-semibold">Contact</div>
            <div className="mt-2 text-sm text-foreground-secondary space-y-2">
              <div>
                <span className="text-foreground-tertiary">Général :</span>{' '}
                <a className="underline hover:text-foreground-primary" href="mailto:contact@synaura.fr">
                  contact@synaura.fr
                </a>
              </div>
              <div>
                <span className="text-foreground-tertiary">Légal :</span>{' '}
                <a className="underline hover:text-foreground-primary" href="mailto:legal@synaura.fr">
                  legal@synaura.fr
                </a>
              </div>
              <div>
                <span className="text-foreground-tertiary">Facturation :</span>{' '}
                <a className="underline hover:text-foreground-primary" href="mailto:billing@synaura.fr">
                  billing@synaura.fr
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border-secondary bg-white/5 p-5">
            <div className="text-sm font-semibold">Liens utiles</div>
            <div className="mt-2 text-sm text-foreground-secondary space-y-2">
              <div>
                <Link className="underline hover:text-foreground-primary" href="/legal/cgu">
                  CGU
                </Link>{' '}
                <span className="text-foreground-tertiary">• règles d’utilisation</span>
              </div>
              <div>
                <Link className="underline hover:text-foreground-primary" href="/legal/cgv">
                  CGV
                </Link>{' '}
                <span className="text-foreground-tertiary">• abonnements & paiements</span>
              </div>
              <div>
                <Link className="underline hover:text-foreground-primary" href="/legal/confidentialite">
                  Politique de confidentialité
                </Link>
              </div>
              <div>
                <Link className="underline hover:text-foreground-primary" href="/legal/cookies">
                  Politique cookies
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="text-xs text-foreground-tertiary">
          Astuce : pour un bug, indique le navigateur, le device, l’URL exacte et une capture écran si possible.
        </section>
      </main>
    </div>
  );
}

