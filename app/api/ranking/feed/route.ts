import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  buildRecommendationSignals,
  loadGlobalTrackCandidates,
  parseRecommendationExclusions,
  rerankTracks,
  type RecommendationStrategy,
} from '@/lib/recommendation';
import { getApiSession } from '@/lib/getApiSession';
import { getPublishedVariationCounts, getRemixAttributionForChildren, normalizeRemixTrackRef } from '@/lib/remixServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseStrategy(value: string | null): RecommendationStrategy {
  if (value === 'popular' || value === 'trending' || value === 'fresh' || value === 'boosted' || value === 'mixed') return value;
  return 'reco';
}

function parseNumber(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback;
}

function sessionSeed(input: { requested: string | null; userId: string | null; strategy: RecommendationStrategy; genre: string | null }) {
  const requested = String(input.requested || '').trim().slice(0, 120);
  if (requested) return requested;
  const day = new Date().toISOString().slice(0, 10);
  return `${input.userId || 'anonymous'}:${day}:${input.strategy}:${input.genre || 'all'}`;
}

async function enrichRemixFeedFields(tracks: any[], userId: string | null) {
  if (!tracks.length) return tracks;
  const artistIds = Array.from(new Set(tracks.map((track) => String(track.artist?._id || '')).filter(Boolean)));
  const following = new Set<string>();
  if (userId && artistIds.length) {
    const { data } = await supabaseAdmin
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId)
      .in('following_id', artistIds);
    for (const row of data || []) {
      if (row.following_id) following.add(String(row.following_id));
    }
  }

  const refs = tracks.map((track) => normalizeRemixTrackRef(String(track._id || '')));
  const [attributions, counts] = await Promise.all([
    getRemixAttributionForChildren(refs),
    getPublishedVariationCounts(refs),
  ]);

  return tracks.map((track) => {
    const ref = normalizeRemixTrackRef(String(track._id || ''));
    const creatorId = String(track.artist?._id || '');
    const visibility = track.remixVisibility || 'disabled';
    return {
      ...track,
      canRemixAiVariation: Boolean(
        track.allowAiVariation &&
        visibility !== 'disabled' &&
        (visibility === 'everyone' || (userId && creatorId === userId) || following.has(creatorId)),
      ),
      remixAttribution: attributions.get(`${ref.type}:${ref.id}`) || null,
      variationsCount: counts.get(`${ref.type}:${ref.id}`) || 0,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = parseNumber(searchParams.get('limit'), 30, 1, 200);
    const cursor = parseNumber(searchParams.get('cursor'), 0, 0, 20_000);
    const includeAi = searchParams.get('ai') === '1';
    const strategy = parseStrategy(searchParams.get('strategy'));
    const genreFilter = searchParams.get('genre')?.trim().toLowerCase() || null;
    const seedGenre = searchParams.get('seedGenre')?.trim().toLowerCase() || null;
    const debug = searchParams.get('debug') === '1';
    const session = await getApiSession(request).catch(() => null);
    const userId = (session?.user as any)?.id ? String((session?.user as any).id) : null;
    const requestedSessionId = searchParams.get('session');
    const excludedTrackIds = parseRecommendationExclusions(searchParams.get('exclude'));
    const rankingSeed = sessionSeed({ requested: requestedSessionId, userId, strategy, genre: seedGenre || genreFilter });

    const candidates = await loadGlobalTrackCandidates(includeAi);
    const signals = await buildRecommendationSignals({
      supabase: supabaseAdmin,
      userId,
      candidateTracks: candidates,
      sessionId: requestedSessionId,
    });

    const ranked = rerankTracks(candidates, signals, {
      strategy,
      debug,
      genreFilter,
      seedGenre,
      sessionSeed: rankingSeed,
      maxConsecutiveArtists: 1,
      maxPerArtist: 3,
    }).map((track) => ({
      ...track,
      isLiked: signals.likedTrackIds.has(String(track._id)),
    }));

    const available = excludedTrackIds.size
      ? ranked.filter((track) => !excludedTrackIds.has(String(track._id)))
      : ranked;
    const page = available.slice(cursor, cursor + limit);
    let tracks = page;
    try {
      tracks = await enrichRemixFeedFields(page, userId);
    } catch (error) {
      console.warn('ranking: remix enrichment unavailable', error);
    }
    const nextCursor = cursor + page.length;

    return NextResponse.json({
      tracks,
      nextCursor,
      hasMore: nextCursor < available.length,
      engineVersion: 'discovery-v3',
      sessionId: rankingSeed,
    }, {
      headers: {
        'Cache-Control': userId || requestedSessionId ? 'private, no-store' : 'public, s-maxage=30, stale-while-revalidate=90',
      },
    });
  } catch (error) {
    console.error('ranking feed error:', error);
    return NextResponse.json({ error: 'Impossible de charger les recommandations' }, { status: 500 });
  }
}
