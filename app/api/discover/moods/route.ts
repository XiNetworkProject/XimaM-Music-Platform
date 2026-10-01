import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/database';
import { getApiSession } from '@/lib/getApiSession';
import { getMoodById, matchesMoodKeywords } from '@/lib/discoverMoods';
import { buildRecommendationSignals, loadGlobalTrackCandidates, rerankTracks } from '@/lib/recommendation';
import { boundedInteger, normalizedGenres, RECOMMENDATION_POLICY_VERSION } from '@/lib/recommendation/policy';

export const dynamic = 'force-dynamic';
const MIN_MOOD_TRACKS = 3;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mood = getMoodById(searchParams.get('mood'));
    if (!mood) return NextResponse.json({ error: 'Ambiance inconnue' }, { status: 400 });
    const limit = boundedInteger(searchParams.get('limit'), 30, 6, 60);
    const session = await getApiSession(request).catch(() => null);
    const userId = session?.user?.id || null;
    // Shared stratified public pool instead of only the most-played 400 titles.
    // Explicit AI mood remains AI-only; the other moods remain classic.
    const candidates = (await loadGlobalTrackCandidates(Boolean(mood.isAiOnly))).filter((track) => mood.isAiOnly
      ? track.isAI
      : !track.isAI && matchesMoodKeywords({ genre: normalizedGenres(track.genre), data: { tags: track.discoveryTags, mood: track.discoveryMood } }, mood));
    const signals = await buildRecommendationSignals({ db: dbAdmin, userId, candidateTracks: candidates });
    const tracks = rerankTracks(candidates, signals, {
      surface: 'discover',
      strategy: 'reco', sessionSeed: [userId || 'anonymous', new Date().toISOString().slice(0, 10), 'mood', mood.id].join(':'),
    }).slice(0, limit).map((track) => ({ ...track, isLiked: signals.likedTrackIds.has(track._id) }));
    return NextResponse.json({ mood: mood.id, tracks, hasEnough: tracks.length >= MIN_MOOD_TRACKS, policyVersion: RECOMMENDATION_POLICY_VERSION },
      { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Ambiance indisponible' }, { status: 500 });
  }
}
