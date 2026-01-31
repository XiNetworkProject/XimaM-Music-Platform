import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import DiscoverPlayButton, { type DiscoverTrackLite } from './DiscoverPlayButton';
import DiscoverAuthedClient from './DiscoverAuthedClient';
import type { DiscoverArtistLite, DiscoverPlaylistLite } from './DiscoverTiles';

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

async function fetchPublicPlaylists(): Promise<DiscoverPlaylistLite[]> {
  try {
    const h = await headers();
    const proto = h.get('x-forwarded-proto') || 'https';
    const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
    const baseUrl = `${proto}://${host}`;
    const res = await fetch(`${baseUrl}/api/playlists/popular?limit=8`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    const items = Array.isArray((json as any)?.playlists) ? ((json as any).playlists as any[]) : [];
    return items
      .map(
        (p): DiscoverPlaylistLite => ({
          _id: String(p?._id || p?.id || ''),
          name: String(p?.name || 'Playlist'),
          description: typeof p?.description === 'string' ? p.description : '',
          coverUrl: (p?.coverUrl as string | null | undefined) ?? null,
        }),
      )
      .filter((p) => p._id);
  } catch {
    return [];
  }
}

async function fetchPublicArtists(): Promise<DiscoverArtistLite[]> {
  try {
    const h = await headers();
    const proto = h.get('x-forwarded-proto') || 'https';
    const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
    const baseUrl = `${proto}://${host}`;
    const res = await fetch(`${baseUrl}/api/artists?sort=trending&limit=10`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    const items = Array.isArray((json as any)?.artists) ? ((json as any).artists as any[]) : [];
    return items
      .map(
        (a): DiscoverArtistLite => ({
          _id: String(a?._id || a?.id || ''),
          username: String(a?.username || ''),
          name: String(a?.name || a?.username || 'Artiste'),
          avatar: typeof a?.avatar === 'string' ? a.avatar : '',
          totalPlays: typeof a?.totalPlays === 'number' ? a.totalPlays : undefined,
          totalLikes: typeof a?.totalLikes === 'number' ? a.totalLikes : undefined,
          trackCount: typeof a?.trackCount === 'number' ? a.trackCount : undefined,
          isTrending: Boolean(a?.isTrending),
        }),
      )
      .filter((a) => a._id && a.username);
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
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id as string | undefined;

  // Logged-in experience (Spotify-like)
  if (userId) {
    const h = await headers();
    const proto = h.get('x-forwarded-proto') || 'https';
    const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
    const baseUrl = `${proto}://${host}`;

    const [forYouRes, trendingRes, newRes, playlistsRes, artistsRes] = await Promise.all([
      fetch(`${baseUrl}/api/ranking/feed?limit=24&ai=1&strategy=reco`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/ranking/feed?limit=24&ai=1&strategy=trending`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/recommendations/personal?limit=24`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/playlists/popular?limit=12`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/artists?sort=trending&limit=12`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
    ]);

    const initialForYou = Array.isArray((forYouRes as any)?.tracks) ? ((forYouRes as any).tracks as DiscoverTrackLite[]) : [];
    const initialTrending = Array.isArray((trendingRes as any)?.tracks) ? ((trendingRes as any).tracks as DiscoverTrackLite[]) : [];
    const initialNew = Array.isArray((newRes as any)?.tracks) ? ((newRes as any).tracks as DiscoverTrackLite[]) : [];
    const initialPlaylists = Array.isArray((playlistsRes as any)?.playlists) ? ((playlistsRes as any).playlists as any[]) : [];
    const initialArtists = Array.isArray((artistsRes as any)?.artists) ? ((artistsRes as any).artists as any[]) : [];

    const displayName =
      (session?.user as any)?.name ||
      (session?.user as any)?.username ||
      (session?.user as any)?.email ||
      'toi';

    return (
      <DiscoverAuthedClient
        displayName={String(displayName)}
        initialForYou={initialForYou}
        initialTrending={initialTrending}
        initialNew={initialNew}
        initialPlaylists={initialPlaylists.map(
          (p): DiscoverPlaylistLite => ({
            _id: String(p?._id || p?.id || ''),
            name: String(p?.name || 'Playlist'),
            description: typeof p?.description === 'string' ? p.description : '',
            coverUrl: (p?.coverUrl as string | null | undefined) ?? null,
          }),
        )}
        initialArtists={initialArtists.map(
          (a): DiscoverArtistLite => ({
            _id: String(a?._id || a?.id || ''),
            username: String(a?.username || ''),
            name: String(a?.name || a?.username || 'Artiste'),
            avatar: typeof a?.avatar === 'string' ? a.avatar : '',
            totalPlays: typeof a?.totalPlays === 'number' ? a.totalPlays : undefined,
            totalLikes: typeof a?.totalLikes === 'number' ? a.totalLikes : undefined,
            trackCount: typeof a?.trackCount === 'number' ? a.trackCount : undefined,
            isTrending: Boolean(a?.isTrending),
          }),
        )}
      />
    );
  }

  // Guest experience (SEO indexable)
  const [trending, newest, playlists, artists] = await Promise.all([
    fetchPublicFeed('limit=16&ai=1&strategy=trending'),
    fetchPublicFeed('limit=16&ai=1&strategy=reco'),
    fetchPublicPlaylists(),
    fetchPublicArtists(),
  ]);

  return (
    <div className="min-h-screen bg-background-primary text-foreground-primary">
      <main className="mx-auto w-full max-w-none px-3 sm:px-4 lg:px-8 2xl:px-10 py-6 md:py-10 space-y-8 md:space-y-10">
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {trending.length ? trending.map((t) => <TrackCard key={t._id} track={t} />) : (
              <div className="text-sm text-foreground-tertiary">Aucune track à afficher pour le moment.</div>
                          )}
                        </div>
        </section>

        {(playlists.length || artists.length) ? (
          <section className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Playlists populaires</h2>
                <Link href="/auth/signin" className="text-sm text-foreground-secondary hover:text-foreground-primary transition">
                  Se connecter →
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {playlists.map((p) => (
                  <a
                    key={p._id}
                    href={`/playlists/${encodeURIComponent(p._id)}`}
                    className="rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition p-3 flex gap-3"
                  >
                    <img
                      src={p.coverUrl || '/default-cover.jpg'}
                      className="w-14 h-14 rounded-xl object-cover border border-border-secondary"
                      alt=""
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{p.name}</div>
                      <div className="text-xs text-foreground-tertiary line-clamp-2">{p.description || 'Playlist'}</div>
                    </div>
                  </a>
                ))}
                {!playlists.length ? <div className="text-sm text-foreground-tertiary">Aucune playlist.</div> : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Artistes du moment</h2>
                <Link href="/auth/signup" className="text-sm text-foreground-secondary hover:text-foreground-primary transition">
                  Créer un compte →
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {artists.slice(0, 8).map((a) => (
                  <a
                    key={a._id}
                    href={`/profile/${encodeURIComponent(a.username)}`}
                    className="rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition p-3 flex items-center gap-3"
                  >
                    <img
                      src={a.avatar || '/default-avatar.png'}
                      className="w-12 h-12 rounded-full object-cover border border-border-secondary"
                      alt=""
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{a.name}</div>
                      <div className="text-xs text-foreground-tertiary truncate">@{a.username}</div>
                    </div>
                  </a>
                ))}
                {!artists.length ? <div className="text-sm text-foreground-tertiary">Aucun artiste.</div> : null}
              </div>
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-xl font-bold">Nouveautés</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {newest.length ? newest.map((t) => <TrackCard key={t._id} track={t} />) : (
              <div className="text-sm text-foreground-tertiary">Aucune track à afficher pour le moment.</div>
            )}
                        </div>
        </section>
      </main>
    </div>
  );
} 

