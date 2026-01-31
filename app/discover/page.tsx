import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import DiscoverPlayButton, { type DiscoverTrackLite } from './DiscoverPlayButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Découvrir — Synaura',
  description:
    'Découvre des tracks tendance et des nouveautés. Écoute instantanément, enchaîne, puis connecte-toi pour liker, créer des playlists et accéder au Studio IA.',
  alternates: { canonical: '/discover' },
  openGraph: {
    title: 'Découvrir — Synaura',
    description: 'Tendances + nouveautés, jouable immédiatement.',
    type: 'website',
    url: '/discover',
  },
};

async function fetchPublicFeed(params: string): Promise<DiscoverTrackLite[]> {
  try {
    const h = await headers();
    const proto = h.get('x-forwarded-proto') || 'https';
    const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
    const baseUrl = `${proto}://${host}`;

    const res = await fetch(`${baseUrl}/api/ranking/feed?${params}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    const tracks = Array.isArray((json as any)?.tracks) ? ((json as any).tracks as DiscoverTrackLite[]) : [];
      return tracks;
  } catch {
    return [];
  }
}

function TrackCard({ track }: { track: DiscoverTrackLite }) {
  const artistLabel =
    track.artist?.artistName || track.artist?.name || track.artist?.username || (track.isAI ? 'Créateur IA' : 'Artiste');

    return (
    <div className="rounded-2xl border border-border-secondary bg-white/5 p-3 flex gap-3">
      <img
        src={track.coverUrl || '/default-cover.jpg'}
        className="w-14 h-14 rounded-xl object-cover border border-border-secondary"
        alt=""
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{track.title}</div>
            <div className="text-xs text-foreground-tertiary truncate">{artistLabel}</div>
                              </div>
          <div className="shrink-0">
            <DiscoverPlayButton track={track} />
                          </div>
                          </div>
        {track.audioUrl ? (
          <audio className="mt-2 w-full" controls preload="none" src={track.audioUrl} />
        ) : (
          <div className="mt-2 text-xs text-foreground-tertiary">Audio indisponible</div>
        )}
                          </div>
                        </div>
  );
}

export default async function DiscoverPage() {
  const [trending, newest] = await Promise.all([
    fetchPublicFeed('limit=16&ai=1&strategy=trending'),
    fetchPublicFeed('limit=16&ai=1&strategy=reco'),
  ]);

  return (
    <div className="min-h-screen bg-background-primary text-foreground-primary">
      <main className="mx-auto max-w-6xl px-4 py-10 space-y-10">
        <section className="rounded-3xl border border-border-secondary bg-background-fog-thin p-6 md:p-8">
          <div className="text-xs text-foreground-tertiary">Plateforme de partage musical</div>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">Découvre, écoute, enchaîne.</h1>
          <p className="mt-3 text-sm md:text-base text-foreground-secondary max-w-2xl">
            Catalogue public jouable immédiatement. Connecte-toi pour liker, sauvegarder, créer des playlists et accéder
            au Studio IA.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/auth/signup"
              className="h-11 px-4 inline-flex items-center justify-center rounded-2xl bg-overlay-on-primary text-foreground-primary border border-border-secondary hover:opacity-90 transition font-semibold"
            >
              Créer un compte
            </Link>
            <Link
              href="/auth/signin"
              className="h-11 px-4 inline-flex items-center justify-center rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition font-semibold"
            >
              Se connecter
            </Link>
            <Link
              href="/studio"
              className="h-11 px-4 inline-flex items-center justify-center rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition"
            >
              Studio IA
            </Link>
                        </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Tendances</h2>
            <Link href="/landing" className="text-sm text-foreground-secondary hover:text-foreground-primary transition">
              La promesse →
            </Link>
                            </div>
          <div className="grid md:grid-cols-2 gap-3">
            {trending.length ? trending.map((t) => <TrackCard key={t._id} track={t} />) : (
              <div className="text-sm text-foreground-tertiary">Aucune track à afficher pour le moment.</div>
                          )}
                        </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">Nouveautés</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {newest.length ? newest.map((t) => <TrackCard key={t._id} track={t} />) : (
              <div className="text-sm text-foreground-tertiary">Aucune track à afficher pour le moment.</div>
            )}
                        </div>
        </section>
      </main>
    </div>
  );
} 

