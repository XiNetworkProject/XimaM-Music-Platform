import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { buildRecommendationSignals } from './signals';
import { loadGlobalTrackCandidates } from './candidates';
import { rerankTracks } from './engine';
import { sortTracksNewest } from './chronological';
import type { RecommendationStrategy } from './types';

type DiscoveryFeedMode = 'all' | 'following' | 'boosted';

type DiscoveryFeedOptions = {
  strategy: RecommendationStrategy;
  includeAi?: boolean;
  mode?: DiscoveryFeedMode;
  defaultLimit?: number;
  maxLimit?: number;
  strictChronological?: boolean;
};

function integerParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback;
}

export async function legacyDiscoveryFeed(request: NextRequest, options: DiscoveryFeedOptions) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = integerParam(searchParams.get('limit'), options.defaultLimit || 50, 1, options.maxLimit || 200);
    const cursor = integerParam(searchParams.get('cursor'), 0, 0, 20_000);
    const requestedSessionId = searchParams.get('session')?.trim().slice(0, 120) || null;
    const session = await getApiSession(request).catch(() => null);
    const userId = (session?.user as any)?.id ? String((session?.user as any).id) : null;
    const day = new Date().toISOString().slice(0, 10);
    const sessionSeed = requestedSessionId || `${userId || 'anonymous'}:${day}:compat:${options.strategy}`;
    const candidates = await loadGlobalTrackCandidates(options.includeAi ?? false);
    const signals = await buildRecommendationSignals({
      supabase: supabaseAdmin,
      userId,
      candidateTracks: candidates,
      sessionId: requestedSessionId,
    });

    let source = candidates;
    if (options.mode === 'following') {
      if (!userId) source = [];
      else source = candidates.filter((track) => signals.followedArtistIds.has(String(track.artist?._id || '')));
    } else if (options.mode === 'boosted') {
      source = candidates.filter((track) => track.isBoosted);
    }

    const rankedSource = options.strictChronological
      ? sortTracksNewest(source)
      : rerankTracks(source, signals, {
          strategy: options.strategy,
          sessionSeed,
          maxConsecutiveArtists: 1,
          maxPerArtist: 3,
        });
    const ranked = rankedSource.map((track) => ({
      ...track,
      isLiked: signals.likedTrackIds.has(String(track._id)),
    }));
    const tracks = ranked.slice(cursor, cursor + limit);
    const nextCursor = cursor + tracks.length;

    return NextResponse.json({
      tracks,
      nextCursor,
      hasMore: nextCursor < ranked.length,
      engineVersion: 'discovery-v2',
      sessionId: sessionSeed,
    }, {
      headers: {
        'Cache-Control': userId || requestedSessionId ? 'private, no-store' : 'public, s-maxage=30, stale-while-revalidate=90',
      },
    });
  } catch (error) {
    console.error(`legacy discovery feed (${options.strategy}) error:`, error);
    return NextResponse.json({ error: 'Impossible de charger les morceaux' }, { status: 500 });
  }
}
