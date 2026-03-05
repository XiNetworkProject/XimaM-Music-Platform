import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import DiscoverPlayButton, { type DiscoverTrackLite } from './DiscoverPlayButton';
import DiscoverAuthedClient from './DiscoverAuthedClient';
import type { DiscoverArtistLite, DiscoverPlaylistLite } from './DiscoverTiles';
import { Play, Sparkles, Music2, TrendingUp, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Découvrir — Synaura',
  description:
    'Découvre des tracks tendance et des nouveautés sur Synaura. Écoute instantanément, puis connecte-toi pour liker, créer des playlists et accéder au Studio IA.',
  alternates: { canonical: '/discover' },
  openGraph: {
    title: 'Découvrir — Synaura',
    description: 'Tendances + nouveautés, jouable immédiatement.',
    type: 'website',
    url: '/discover',
  },
};

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') || 'https';
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

async function fetchFeed(baseUrl: string, params: string): Promise<DiscoverTrackLite[]> {
  try {
    const res = await fetch(`${baseUrl}/api/ranking/feed?${params}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    return Array.isArray((json as any)?.tracks) ? (json as any).tracks : [];
  } catch {
    return [];
  }
}

const GENRES = [
  { name: 'Pop', color: 'from-pink-500 to-rose-600' },
  { name: 'Hip-Hop', color: 'from-amber-500 to-orange-600' },
  { name: 'Rock', color: 'from-red-500 to-red-700' },
  { name: 'Electronic', color: 'from-cyan-400 to-blue-600' },
  { name: 'R&B', color: 'from-purple-500 to-violet-700' },
  { name: 'Jazz', color: 'from-yellow-500 to-amber-700' },
  { name: 'Lo-Fi', color: 'from-teal-400 to-emerald-600' },
  { name: 'Classical', color: 'from-slate-400 to-slate-600' },
];

function GuestTrackCard({ track }: { track: DiscoverTrackLite }) {
  const artistLabel =
    track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste';
  const plays = track.plays || 0;

  return (
    <div className="min-w-[160px] md:min-w-[200px] max-w-[160px] md:max-w-[200px] rounded-xl p-2 hover:bg-white/[0.06] transition-all duration-200 group/card shrink-0">
      <div className="relative group/cover">
        <img
          src={track.coverUrl || '/default-cover.jpg'}
          alt={track.title}
          className="w-full aspect-square object-cover rounded-lg"
          loading="lazy"
        />
        <div className="absolute bottom-2 right-2">
          <DiscoverPlayButton
            track={track}
            compact
            className="w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-all shadow-lg shadow-indigo-500/30 hover:scale-110"
          />
        </div>
      </div>
      <div className="mt-2">
        <p className="text-[13px] font-semibold line-clamp-1 text-white">{track.title}</p>
        <p className="text-[11px] text-white/40 truncate">{artistLabel}</p>
      </div>
      <div className="mt-1 text-[10px] text-white/25">
        &#9654; {plays >= 1000 ? `${(plays / 1000).toFixed(1)}K` : plays}
      </div>
    </div>
  );
}

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ genre?: string }> }) {
  const sp = await searchParams;
  const genreFilter = sp?.genre || null;
  const genreParam = genreFilter ? `&genre=${encodeURIComponent(genreFilter)}` : '';

  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id as string | undefined;
  const baseUrl = await getBaseUrl();

  if (userId) {
    const [forYouRes, trendingRes, newRes, playlistsRes, artistsRes] = await Promise.all([
      fetch(`${baseUrl}/api/ranking/feed?limit=36&ai=1&strategy=reco${genreParam}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/ranking/feed?limit=36&ai=1&strategy=trending${genreParam}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/tracks/recent?limit=36`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/playlists/popular?limit=12`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/artists?sort=trending&limit=16`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
    ]);

    const displayName =
      (session?.user as any)?.name ||
      (session?.user as any)?.username ||
      (session?.user as any)?.email?.split?.('@')?.[0] ||
      'toi';

    return (
      <DiscoverAuthedClient
        displayName={String(displayName)}
        genreFilter={genreFilter}
        initialForYou={Array.isArray((forYouRes as any)?.tracks) ? (forYouRes as any).tracks : []}
        initialTrending={Array.isArray((trendingRes as any)?.tracks) ? (trendingRes as any).tracks : []}
        initialNew={Array.isArray((newRes as any)?.tracks) ? (newRes as any).tracks : []}
        initialPlaylists={(Array.isArray((playlistsRes as any)?.playlists) ? (playlistsRes as any).playlists : []).map(
          (p: any): DiscoverPlaylistLite => ({
            _id: String(p?._id || p?.id || ''),
            name: String(p?.name || 'Playlist'),
            description: typeof p?.description === 'string' ? p.description : '',
            coverUrl: (p?.coverUrl as string | null | undefined) ?? null,
          }),
        )}
        initialArtists={(Array.isArray((artistsRes as any)?.artists) ? (artistsRes as any).artists : []).map(
          (a: any): DiscoverArtistLite => ({
            _id: String(a?._id || a?.id || ''),
            username: String(a?.username || ''),
            name: String(a?.name || a?.username || 'Artiste'),
            avatar: typeof a?.avatar === 'string' ? a.avatar : '',
            totalPlays: typeof a?.totalPlays === 'number' ? a.totalPlays : undefined,
            trackCount: typeof a?.trackCount === 'number' ? a.trackCount : undefined,
            isTrending: Boolean(a?.isTrending),
          }),
        )}
      />
    );
  }

  /* ─── Guest Experience (SEO-friendly server rendered) ─── */
  const [trending, newest, playlistsRes, artistsRes] = await Promise.all([
    fetchFeed(baseUrl, `limit=20&ai=1&strategy=trending${genreParam}`),
    fetchFeed(baseUrl, `limit=20&ai=1&strategy=reco${genreParam}`),
    fetch(`${baseUrl}/api/playlists/popular?limit=8`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
    fetch(`${baseUrl}/api/artists?sort=trending&limit=10`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
  ]);

  const playlists: DiscoverPlaylistLite[] = (Array.isArray((playlistsRes as any)?.playlists) ? (playlistsRes as any).playlists : [])
    .map((p: any) => ({
      _id: String(p?._id || p?.id || ''),
      name: String(p?.name || 'Playlist'),
      description: typeof p?.description === 'string' ? p.description : '',
      coverUrl: (p?.coverUrl as string | null | undefined) ?? null,
    }))
    .filter((p: any) => p._id);

  const artists: DiscoverArtistLite[] = (Array.isArray((artistsRes as any)?.artists) ? (artistsRes as any).artists : [])
    .map((a: any) => ({
      _id: String(a?._id || a?.id || ''),
      username: String(a?.username || ''),
      name: String(a?.name || a?.username || 'Artiste'),
      avatar: typeof a?.avatar === 'string' ? a.avatar : '',
      totalPlays: typeof a?.totalPlays === 'number' ? a.totalPlays : undefined,
      trackCount: typeof a?.trackCount === 'number' ? a.trackCount : undefined,
    }))
    .filter((a: any) => a._id && a.username);

  return (
    <div className="min-h-screen text-white">
      <main className="mx-auto w-full max-w-none px-4 sm:px-6 lg:px-10 2xl:px-12 py-6 md:py-10 space-y-8 md:space-y-10">

        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-transparent border border-white/[0.06] p-8 md:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(99,102,241,0.15),transparent_70%)]" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs font-semibold text-indigo-300 mb-4">
              <Music2 className="w-3 h-3" />
              Bibliothèque publique
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              {genreFilter ? genreFilter : 'Découvre. Écoute. Enchaîne.'}
            </h1>
            <p className="mt-3 text-base md:text-lg text-white/50 max-w-xl">
              Des milliers de titres à écouter gratuitement. Crée un compte pour sauvegarder tes favoris et générer ta propre musique avec l&apos;IA.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/auth/signup"
                className="h-11 px-6 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold inline-flex items-center gap-2 transition-all hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-indigo-500/25"
              >
                <Play className="w-4 h-4 fill-current" />
                Créer un compte gratuit
              </Link>
              <Link
                href="/auth/signin"
                className="h-11 px-6 rounded-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white text-sm font-semibold inline-flex items-center gap-2 transition-all"
              >
                Se connecter
              </Link>
              <Link
                href="/ai-generator"
                className="h-11 px-6 rounded-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white text-sm font-semibold inline-flex items-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Studio IA
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Genres Grid ─── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-white">Parcourir par genre</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {GENRES.map((g) => (
              <Link
                key={g.name}
                href={`/discover?genre=${encodeURIComponent(g.name)}`}
                className={`relative overflow-hidden rounded-xl aspect-[4/3] sm:aspect-square bg-gradient-to-br ${g.color} group/genre transition-all hover:scale-[1.03] hover:shadow-xl active:scale-[0.97]`}
              >
                <div className="absolute inset-0 bg-black/10 group-hover/genre:bg-black/0 transition-colors" />
                <div className="absolute bottom-3 left-3">
                  <span className="text-sm font-black text-white drop-shadow-lg">{g.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ─── Tendances ─── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Tendances
            </h2>
            <Link href="/auth/signup" className="text-xs font-semibold text-white/40 hover:text-white transition">
              Voir plus &rsaquo;
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2" style={{ scrollSnapType: 'x mandatory' }}>
            {trending.length > 0 ? (
              trending.map((t) => <GuestTrackCard key={t._id} track={t} />)
            ) : (
              <p className="text-sm text-white/20 py-8">Aucun titre disponible pour le moment.</p>
            )}
          </div>
        </section>

        {/* ─── Artistes + Playlists side by side ─── */}
        {(artists.length > 0 || playlists.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Artistes */}
            {artists.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    Artistes du moment
                  </h2>
                </div>
                <div className="space-y-1">
                  {artists.slice(0, 6).map((a) => (
                    <a
                      key={a._id}
                      href={`/profile/${encodeURIComponent(a.username)}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.06] transition-all"
                    >
                      <img
                        src={a.avatar || '/default-avatar.png'}
                        alt={a.name}
                        className="w-11 h-11 rounded-full object-cover border border-white/10"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-white truncate">{a.name}</p>
                        <p className="text-[11px] text-white/30 truncate">@{a.username}</p>
                      </div>
                      {typeof a.trackCount === 'number' && (
                        <span className="text-[10px] text-white/20 shrink-0">{a.trackCount} titres</span>
                      )}
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Playlists */}
            {playlists.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Music2 className="w-4 h-4 text-indigo-400" />
                    Playlists populaires
                  </h2>
                </div>
                <div className="space-y-1">
                  {playlists.slice(0, 6).map((p) => (
                    <a
                      key={p._id}
                      href={`/playlists/${encodeURIComponent(p._id)}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.06] transition-all"
                    >
                      <img
                        src={p.coverUrl || '/default-cover.jpg'}
                        alt={p.name}
                        className="w-11 h-11 rounded-md object-cover"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-white truncate">{p.name}</p>
                        <p className="text-[11px] text-white/30 line-clamp-1">{p.description || 'Playlist'}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ─── Nouveautés ─── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-white">Nouveautés</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2" style={{ scrollSnapType: 'x mandatory' }}>
            {newest.length > 0 ? (
              newest.map((t) => <GuestTrackCard key={t._id} track={t} />)
            ) : (
              <p className="text-sm text-white/20 py-8">Aucun titre disponible pour le moment.</p>
            )}
          </div>
        </section>

        {/* CTA bottom */}
        <section className="text-center py-8">
          <p className="text-white/30 text-sm mb-4">Inscris-toi pour accéder à toutes les fonctionnalités</p>
          <Link
            href="/auth/signup"
            className="h-11 px-8 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold inline-flex items-center gap-2 transition-all hover:scale-[1.03] shadow-lg shadow-indigo-500/25"
          >
            Commencer gratuitement
          </Link>
        </section>
      </main>
    </div>
  );
}
