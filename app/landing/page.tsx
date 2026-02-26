import type { Metadata } from 'next';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Synaura — Découvre, écoute, partage. Musique & IA en un seul endroit.',
  description:
    "Synaura est une plateforme de partage musical: découvre des tendances, écoute instantanément, et crée de la musique IA. Démo jouable + pages publiques indexables.",
  alternates: { canonical: '/landing' },
  openGraph: {
    title: 'Synaura — Musique & IA',
    description:
      "Découvre des tendances, écoute instantanément, et crée de la musique IA. Démo jouable incluse.",
    type: 'website',
    url: '/landing',
  },
};

type PublicTrack = {
  _id: string;
  title: string;
  artist?: { name?: string; username?: string };
  coverUrl?: string;
  audioUrl?: string;
  plays?: number;
};

async function getTrending(): Promise<PublicTrack[]> {
  try {
    const h = await headers();
    const proto = h.get('x-forwarded-proto') || 'https';
    const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
    const baseUrl = `${proto}://${host}`;

    // Internal fetch (server) to our own route (needs absolute URL in Node)
    const res = await fetch(`${baseUrl}/api/ranking/feed?limit=10&ai=1&strategy=trending`, {
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    const tracks = Array.isArray((json as any)?.tracks) ? ((json as any).tracks as PublicTrack[]) : [];
    return tracks.slice(0, 10);
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const tracks = await getTrending();

  return (
    <div className="min-h-screen bg-background-primary text-foreground-primary">
      <main className="mx-auto max-w-6xl px-4 py-10 space-y-10">
        <section className="rounded-3xl border border-border-secondary bg-background-fog-thin p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="min-w-0">
              <div className="text-xs text-foreground-tertiary">Plateforme de partage musical • Musique IA</div>
              <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
                Découvre, écoute, enchaîne — et crée avec l’IA.
              </h1>
              <p className="mt-3 text-sm md:text-base text-foreground-secondary max-w-2xl">
                Synaura met le catalogue public (tendances / nouveautés) au premier plan, avec une expérience d’écoute
                instantanée. Les features avancées (likes, playlists perso, studio IA) se débloquent avec un compte.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href="/auth/signin"
                  className="h-11 px-4 inline-flex items-center justify-center rounded-2xl bg-overlay-on-primary text-foreground-primary border border-border-secondary hover:opacity-90 transition font-semibold"
                >
                  Se connecter
                </a>
                <a
                  href="/auth/signup"
                  className="h-11 px-4 inline-flex items-center justify-center rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition font-semibold"
                >
                  Créer un compte
                </a>
                <a
                  href="/discover"
                  className="h-11 px-4 inline-flex items-center justify-center rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition"
                >
                  Découvrir (public)
                </a>
              </div>
            </div>

            <div className="grid gap-3 w-full md:w-[360px]">
              <div className="rounded-2xl border border-border-secondary bg-white/5 p-4">
                <div className="text-sm font-semibold">3 bénéfices</div>
                <ul className="mt-2 text-sm text-foreground-secondary space-y-1">
                  <li>Catalogue public jouable en 1 clic</li>
                  <li>Tendances & nouveautés visibles (SEO)</li>
                  <li>Studio IA “pro” pour créer des sons</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-border-secondary bg-white/5 p-4">
                <div className="text-sm font-semibold">Preuve sociale</div>
                <div className="mt-2 text-sm text-foreground-secondary">
                  Découvre ce qui tourne maintenant, puis rejoins la communauté pour publier, liker et créer.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border-secondary bg-background-fog-thin p-6 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Démo jouable — Top 10 tendances</h2>
            <a href="/discover" className="text-sm text-foreground-secondary hover:text-foreground-primary transition">
              Voir plus →
            </a>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-3">
            {tracks.length ? (
              tracks.map((t, idx) => (
                <div key={t._id} className="rounded-2xl border border-border-secondary bg-white/5 p-3 flex gap-3">
                  <img
                    src={t.coverUrl || '/default-cover.jpg'}
                    className="w-14 h-14 rounded-xl object-cover border border-border-secondary"
                    alt=""
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-foreground-tertiary">#{idx + 1}</div>
                    <div className="text-sm font-semibold truncate">{t.title}</div>
                    <div className="text-xs text-foreground-tertiary truncate">
                      {t.artist?.name || t.artist?.username || 'Artiste'}
                    </div>
                    {t.audioUrl ? (
                      // HTML5 audio = démo jouable indexable (sans dépendre du player global)
                      <audio className="mt-2 w-full" controls preload="none" src={t.audioUrl} />
                    ) : (
                      <div className="mt-2 text-xs text-foreground-tertiary">Audio indisponible</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-foreground-tertiary">Catalogue indisponible pour le moment.</div>
            )}
          </div>
        </section>

        <section className="text-xs text-foreground-tertiary">
          Pages publiques indexables: <a className="underline" href="/discover">/discover</a>.
        </section>
      </main>
    </div>
  );
}

