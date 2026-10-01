import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/database';
import { getApiSession } from '@/lib/getApiSession';
import {
  buildRecommendationSignals,
  loadGlobalTrackCandidates,
  rerankTracks,
  sortTracksNewest,
  type RecommendedTrack,
  type RecommendationStrategy,
} from '@/lib/recommendation';

import { boundedInteger, isLowExposure, RECOMMENDATION_ENGINE_VERSION, RECOMMENDATION_POLICY_VERSION } from '@/lib/recommendation/policy';

export const dynamic = 'force-dynamic';

function normalizeGenres(value: RecommendedTrack['genre']) {
  if (Array.isArray(value)) return value.map((genre) => String(genre || '').trim().toLowerCase()).filter(Boolean);
  return value ? [String(value).trim().toLowerCase()] : [];
}

function strategyForSort(sort: string): RecommendationStrategy {
  if (sort === 'newest') return 'fresh';
  if (sort === 'hidden') return 'reco';
  if (sort === 'popular') return 'popular';
  return 'trending';
}

function buildArtistResults(tracks: RecommendedTrack[], sort: string) {
  const byArtist = new Map<string, {
    artist: NonNullable<RecommendedTrack['artist']>;
    tracks: number;
    latest: number;
    emerging: number;
    momentum: number;
    quality: number;
    reach: number;
    leadTrack: RecommendedTrack;
  }>();

  for (const track of tracks) {
    const artistId = String(track.artist?._id || '');
    if (!artistId || !track.artist) continue;
    const created = track.createdAt ? new Date(track.createdAt).getTime() : 0;
    const metrics = track.discoveryMetrics;
    const current = byArtist.get(artistId);
    if (!current) {
      byArtist.set(artistId, {
        artist: track.artist,
        tracks: 1,
        latest: created,
        emerging: metrics?.emergingScore || 0,
        momentum: metrics?.momentumScore || 0,
        quality: metrics?.qualityScore || 0,
        reach: metrics?.reachScore || 0,
        leadTrack: track,
      });
      continue;
    }
    current.tracks += 1;
    current.latest = Math.max(current.latest, created);
    current.emerging = Math.max(current.emerging, metrics?.emergingScore || 0);
    current.momentum = Math.max(current.momentum, metrics?.momentumScore || 0);
    current.quality = Math.max(current.quality, metrics?.qualityScore || 0);
    current.reach = Math.max(current.reach, metrics?.reachScore || 0);
  }

  return Array.from(byArtist.values())
    .sort((a, b) => {
      if (sort === 'newest') return b.latest - a.latest;
      if (sort === 'hidden') {
        const aScore = a.emerging + (1 - Math.min(1, Number(a.artist.followersCount || 0) / 500)) * 1.5;
        const bScore = b.emerging + (1 - Math.min(1, Number(b.artist.followersCount || 0) / 500)) * 1.5;
        return bScore - aScore;
      }
      return (b.momentum * 1.2 + b.quality + b.reach * 0.35) - (a.momentum * 1.2 + a.quality + a.reach * 0.35);
    })
    .map((entry) => ({
      _id: String(entry.artist._id || ''),
      username: entry.artist.username || '',
      name: entry.artist.artistName || entry.artist.name || entry.artist.username || 'Artiste Synaura',
      avatar: entry.artist.avatar || '',
      bio: entry.artist.bio || '',
      createdAt: entry.artist.createdAt || null,
      followersCount: Number(entry.artist.followersCount || 0),
      tracksCount: entry.tracks,
      isNew: entry.latest > Date.now() - 14 * 86400000,
      leadTrack: entry.leadTrack,
    }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category') || 'all';
    const sort = searchParams.get('sort') || 'trending';
    const page = boundedInteger(searchParams.get('page'), 0, 0, 20000);
    const limit = boundedInteger(searchParams.get('limit'), 24, 6, 48);
    const profilePage = boundedInteger(searchParams.get('profilePage'), page, 0, 20000);
    const profileLimit = boundedInteger(searchParams.get('profileLimit'), 12, 4, 24);
    const sessionId = searchParams.get('session')?.slice(0, 120) || null;
    const session = await getApiSession(request).catch(() => null);
    const userId = (session?.user as any)?.id ? String((session?.user as any).id) : null;
    const categoryFilter = category === 'all' ? null : category.trim().toLowerCase();
    const candidates = (await loadGlobalTrackCandidates(false)).filter((track) => {
      if (!categoryFilter) return true;
      return normalizeGenres(track.genre).some((genre) => genre.includes(categoryFilter));
    });
    const signals = await buildRecommendationSignals({ db: dbAdmin, userId, candidateTracks: candidates, sessionId });
    const strategy = strategyForSort(sort);
    const visibleCandidates = candidates.filter((track) => !signals.hiddenArtistIds.has(String(track.artist?._id || '')));
    let source = visibleCandidates;

    if (sort === 'hidden') {
      const emerging = visibleCandidates.filter((track) => {
        const metrics = track.discoveryMetrics;
        return isLowExposure(track) && (metrics?.emergingScore || 0) >= 2.5;
      });
      source = (emerging.length ? emerging : visibleCandidates.filter(isLowExposure)).map((track) => ({
        ...track,
        rankingScore: track.discoveryMetrics?.emergingScore || track.rankingScore || 0,
      }));
    } else if (sort === 'featured') {
      const featured = visibleCandidates.filter((track) => track.isFeatured);
      source = featured.length ? featured : visibleCandidates;
    }

    const rankingSeed = sessionId || `${userId || 'anonymous'}:${new Date().toISOString().slice(0, 10)}:discover:${sort}:${category}`;
    const rankedSource = sort === 'newest'
      ? sortTracksNewest(source)
      : rerankTracks(source, signals, {
          surface: 'discover',
          strategy,
          sessionSeed: rankingSeed,
          maxConsecutiveArtists: 1,
          maxPerArtist: 3,
        });
    const ranked = rankedSource.map((track) => ({
      ...track,
      isLiked: signals.likedTrackIds.has(String(track._id)),
    }));
    const artists = buildArtistResults(ranked, sort);
    const from = page * limit;
    const profileFrom = profilePage * profileLimit;
    const tracks = ranked.slice(from, from + limit);
    const artistPage = artists.slice(profileFrom, profileFrom + profileLimit);

    return NextResponse.json({
      tracks,
      artists: artistPage,
      page,
      nextPage: page + 1,
      hasMore: from + tracks.length < ranked.length,
      total: ranked.length,
      profilePage,
      nextProfilePage: profilePage + 1,
      hasMoreProfiles: profileFrom + artistPage.length < artists.length,
      totalArtists: artists.length,
      category,
      sort,
      engineVersion: RECOMMENDATION_ENGINE_VERSION,
      policyVersion: RECOMMENDATION_POLICY_VERSION,
    }, { headers: { 'Cache-Control': userId || sessionId ? 'private, no-store' : 'public, s-maxage=30, stale-while-revalidate=90' } });
  } catch (error: any) {
    console.error('Discover API error:', error);
    return NextResponse.json({ error: error?.message || 'Erreur interne du serveur' }, { status: 500 });
  }
}
