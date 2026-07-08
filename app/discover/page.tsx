import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { attachLikedFlag, getPublicTrackPool, getRadarTracks } from '@/lib/discoverData';
import { DISCOVER_MOODS, matchesMoodKeywords, type MoodId } from '@/lib/discoverMoods';
import DiscoverClient from './DiscoverClient';
import type { DiscoverPlaylistLite } from './DiscoverTiles';
import type { DiscoverArtistCardLite } from './DiscoverMoodTiles';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Découvrir — Synaura',
  description: 'Choisis une ambiance et entre dans un univers. Ambiances, Radar, collections et artistes réels à explorer.',
  alternates: { canonical: '/discover' },
  openGraph: {
    title: 'Découvrir — Synaura',
    description: 'Choisis une ambiance et entre dans un univers.',
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

async function fetchCollections(baseUrl: string): Promise<DiscoverPlaylistLite[]> {
  try {
    const res = await fetch(`${baseUrl}/api/editorial-collections/featured`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    return (Array.isArray(json?.collections) ? json.collections : []).map((collection: any) => ({
      _id: String(collection.playlistId || collection.id || ''),
      name: String(collection.title || 'Collection Synaura'),
      description: collection.subtitle || collection.description || '',
      coverUrl: collection.coverUrl || collection.bannerUrl || null,
      bannerUrl: collection.bannerUrl || null,
      publicUrl: collection.publicUrl || `/playlists/${collection.slug || collection.playlistId}`,
      isEditorial: true,
      editorialCollection: collection,
      collection,
    })).filter((c: DiscoverPlaylistLite) => c._id);
  } catch {
    return [];
  }
}

async function fetchPopularArtists(baseUrl: string): Promise<any[]> {
  try {
    const res = await fetch(`${baseUrl}/api/users/popular?limit=14`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    return Array.isArray(json?.users) ? json.users : [];
  } catch {
    return [];
  }
}

async function fetchFavoriteMoodIds(userId: string | undefined): Promise<string[]> {
  if (!userId) return [];
  try {
    const { data } = await supabaseAdmin.from('profiles').select('preferences').eq('id', userId).single();
    const favoriteMoods = (data as any)?.preferences?.onboarding?.favoriteMoods;
    return Array.isArray(favoriteMoods) ? favoriteMoods.map(String) : [];
  } catch {
    return [];
  }
}

async function fetchAiPreviewCovers(): Promise<string[]> {
  try {
    const { data } = await supabaseAdmin
      .from('ai_tracks')
      .select('image_url, generation:ai_generations!inner(is_public, status)')
      .eq('is_public', true)
      .eq('generation.status', 'completed')
      .order('created_at', { ascending: false })
      .limit(4);
    return (data || []).map((row: any) => row.image_url).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ mood?: string }> }) {
  const sp = await searchParams;
  const moodParam = (sp?.mood || null) as MoodId | null;
  const initialMood = DISCOVER_MOODS.some((mood) => mood.id === moodParam) ? moodParam : null;

  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id as string | undefined;
  const baseUrl = await getBaseUrl();

  const [pool, radarRaw, collections, popularArtists, aiCovers, favoriteMoodIds] = await Promise.all([
    getPublicTrackPool({ limit: 300 }),
    getRadarTracks(16),
    fetchCollections(baseUrl),
    fetchPopularArtists(baseUrl),
    fetchAiPreviewCovers(),
    fetchFavoriteMoodIds(userId),
  ]);

  const radarTracks = await attachLikedFlag(radarRaw, userId);

  const moodPreviews: Record<string, string[]> = {};
  for (const mood of DISCOVER_MOODS) {
    if (mood.isAiOnly) {
      moodPreviews[mood.id] = aiCovers;
      continue;
    }
    moodPreviews[mood.id] = pool
      .filter((track) => matchesMoodKeywords(track, mood))
      .slice(0, 4)
      .map((track) => track.coverUrl)
      .filter((cover): cover is string => Boolean(cover));
  }

  // Jumelage artiste <-> morceau jouable réel (même principe que le Scroll : croiser
  // des créateurs réels avec un morceau qu'ils ont réellement publié).
  const artists: DiscoverArtistCardLite[] = popularArtists
    .map((user: any): DiscoverArtistCardLite | null => {
      const userId2 = String(user?._id || user?.id || '');
      if (!userId2) return null;
      const track = pool.find((item) => item.artist._id === userId2);
      if (!track) return null;
      return {
        _id: userId2,
        username: String(user?.username || ''),
        name: String(user?.name || user?.username || 'Artiste Synaura'),
        avatar: user?.avatar || null,
        style: track.genre?.[0] || null,
        track: { ...track, coverUrl: track.coverUrl || undefined },
      };
    })
    .filter((artist): artist is DiscoverArtistCardLite => artist !== null)
    .slice(0, 10);

  return (
    <DiscoverClient
      initialMood={initialMood}
      radarTracks={radarTracks as any}
      moodPreviews={moodPreviews}
      collections={collections}
      artists={artists}
      favoriteMoodIds={favoriteMoodIds}
    />
  );
}
