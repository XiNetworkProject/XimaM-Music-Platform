import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import DiscoverGuestClient from './DiscoverGuestClient';
import DiscoverAuthedClient from './DiscoverAuthedClient';
import type { DiscoverArtistLite, DiscoverPlaylistLite } from './DiscoverTiles';
import type { DiscoverTrackLite } from './DiscoverPlayButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Découvrir — Synaura',
  description:
    'Explore des milliers de titres par genre, tendance et nouveauté. Écoute en un clic, découvre des artistes et playlists.',
  alternates: { canonical: '/discover' },
  openGraph: {
    title: 'Découvrir — Synaura',
    description: 'Explore des milliers de titres par genre, tendance et nouveauté.',
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

async function fetchFromFeed(baseUrl: string, params: string): Promise<DiscoverTrackLite[]> {
  try {
    const res = await fetch(`${baseUrl}/api/ranking/feed?${params}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    return Array.isArray(json?.tracks) ? json.tracks : [];
  } catch {
    return [];
  }
}

async function fetchFromApi(baseUrl: string, path: string): Promise<DiscoverTrackLite[]> {
  try {
    const res = await fetch(`${baseUrl}${path}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    return Array.isArray(json?.tracks) ? json.tracks : [];
  } catch {
    return [];
  }
}

async function fetchPlaylists(baseUrl: string): Promise<DiscoverPlaylistLite[]> {
  try {
    const res = await fetch(`${baseUrl}/api/playlists/popular?limit=12`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    return (Array.isArray(json?.playlists) ? json.playlists : []).map((p: any) => ({
      _id: String(p?._id || p?.id || ''),
      name: String(p?.name || 'Playlist'),
      description: typeof p?.description === 'string' ? p.description : '',
      coverUrl: p?.coverUrl ?? null,
    })).filter((p: any) => p._id);
  } catch {
    return [];
  }
}

async function fetchArtists(baseUrl: string): Promise<DiscoverArtistLite[]> {
  try {
    const res = await fetch(`${baseUrl}/api/artists?sort=trending&limit=16`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    return (Array.isArray(json?.artists) ? json.artists : []).map((a: any) => ({
      _id: String(a?._id || a?.id || ''),
      username: String(a?.username || ''),
      name: String(a?.name || a?.username || 'Artiste'),
      avatar: typeof a?.avatar === 'string' ? a.avatar : '',
      totalPlays: typeof a?.totalPlays === 'number' ? a.totalPlays : undefined,
      totalLikes: typeof a?.totalLikes === 'number' ? a.totalLikes : undefined,
      trackCount: typeof a?.trackCount === 'number' ? a.trackCount : undefined,
      isTrending: Boolean(a?.isTrending),
    })).filter((a: any) => a._id && a.username);
  } catch {
    return [];
  }
}

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ genre?: string }> }) {
  const sp = await searchParams;
  const genreFilter = sp?.genre || null;
  const genreParam = genreFilter ? `&genre=${encodeURIComponent(genreFilter)}` : '';
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id as string | undefined;
  const baseUrl = await getBaseUrl();

  const [trendingData, forYouData, recentData, playlistsData, artistsData] = await Promise.all([
    fetchFromApi(baseUrl, `/api/tracks/trending?limit=30`),
    fetchFromFeed(baseUrl, `limit=30&ai=1&strategy=reco${genreParam}`),
    fetchFromApi(baseUrl, `/api/tracks/recent?limit=30`),
    fetchPlaylists(baseUrl),
    fetchArtists(baseUrl),
  ]);

  if (userId) {
    const displayName =
      (session?.user as any)?.name ||
      (session?.user as any)?.username ||
      (session?.user as any)?.email?.split?.('@')?.[0] ||
      'toi';

    return (
      <DiscoverAuthedClient
        displayName={String(displayName)}
        genreFilter={genreFilter}
        initialForYou={forYouData}
        initialTrending={trendingData}
        initialNew={recentData}
        initialPlaylists={playlistsData}
        initialArtists={artistsData}
      />
    );
  }

  return (
    <DiscoverGuestClient
      genreFilter={genreFilter}
      trending={trendingData}
      newest={recentData}
      playlists={playlistsData}
      artists={artistsData}
    />
  );
}
