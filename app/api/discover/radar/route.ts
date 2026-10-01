import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { getRadarTracks, attachLikedFlag } from '@/lib/discoverData';
import { dbAdmin } from '@/lib/database';
import { buildRecommendationSignals } from '@/lib/recommendation';
import { boundedInteger, RECOMMENDATION_POLICY_VERSION } from '@/lib/recommendation/policy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = boundedInteger(searchParams.get('limit'), 16, 4, 30);

    const session = await getApiSession(request).catch(() => null);
    const userId = (session?.user as any)?.id || null;

    const signals = await buildRecommendationSignals({ db: dbAdmin, userId });
    const selected = await getRadarTracks(limit, signals.hiddenArtistIds);
    const tracks = await attachLikedFlag(selected, userId);
    return NextResponse.json({ tracks, policyVersion: RECOMMENDATION_POLICY_VERSION }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur interne du serveur' }, { status: 500 });
  }
}
