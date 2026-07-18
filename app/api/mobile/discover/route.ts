import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { attachLikedFlag, getRadarTracks } from '@/lib/discoverData';
import { getFeaturedEditorialCollections } from '@/lib/editorialCollections';
import { applyPublicTrackFilter } from '@/lib/publicTracks';
import {
  buildRecommendationSignals,
  loadGlobalTrackCandidates,
  rerankTracks,
  sortTracksNewest,
  type RecommendedTrack,
} from '@/lib/recommendation';

export const dynamic = 'force-dynamic';

function withLikeState(tracks: RecommendedTrack[], likedIds: Set<string>) {
  return tracks.map((track) => ({ ...track, isLiked: likedIds.has(String(track._id)) }));
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const sessionId = request.nextUrl.searchParams.get('session')?.slice(0, 120) || null;
    const session = await getApiSession(request).catch(() => null);
    const userId = session?.user?.id ? String(session.user.id) : null;
    const [candidates, publicCountResult] = await Promise.all([
      loadGlobalTrackCandidates(false),
      applyPublicTrackFilter(supabaseAdmin.from('tracks').select('id', { count: 'exact', head: true })),
    ]);
    const signals = await buildRecommendationSignals({
      supabase: supabaseAdmin,
      userId,
      candidateTracks: candidates,
      sessionId,
    });
    const seed = sessionId || `${userId || 'anonymous'}:${new Date().toISOString().slice(0, 10)}:discover-overview`;
    const newest = withLikeState(sortTracksNewest(candidates).slice(0, 20), signals.likedTrackIds);
    const popular = withLikeState(rerankTracks(candidates, signals, {
      strategy: 'popular',
      sessionSeed: `${seed}:popular`,
      maxPerArtist: 3,
    }).slice(0, 20), signals.likedTrackIds);
    const emerging = candidates.filter((track) => Number(track.plays || 0) < 500 && (track.discoveryMetrics?.emergingScore || 0) >= 2.5);
    const hiddenPool = emerging.length ? emerging : candidates.filter((track) => Number(track.plays || 0) < 500);
    const hidden = withLikeState(rerankTracks(hiddenPool, signals, {
      strategy: 'reco',
      sessionSeed: `${seed}:hidden`,
      maxPerArtist: 2,
    }).slice(0, 20), signals.likedTrackIds);

    const [radarSelection, collections] = await Promise.all([
      getRadarTracks(12),
      getFeaturedEditorialCollections(12),
    ]);
    const radar = await attachLikedFlag(radarSelection, userId);

    return NextResponse.json({
      newest,
      popular,
      hidden,
      radar,
      collections,
      totalTracks: Math.max(0, Number(publicCountResult.count || 0)),
      generatedAt: new Date().toISOString(),
      engineVersion: 'discover-overview-v3',
    }, {
      headers: {
        'Cache-Control': userId || sessionId ? 'private, no-store' : 'public, s-maxage=30, stale-while-revalidate=90',
        'Server-Timing': `discover;dur=${Date.now() - startedAt}`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Découverte indisponible' }, { status: 500 });
  }
}
