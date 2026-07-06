import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { getRadarTracks, attachLikedFlag } from '@/lib/discoverData';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(30, Math.max(4, Number(searchParams.get('limit') || 16)));

    const session = await getApiSession(request).catch(() => null);
    const userId = (session?.user as any)?.id || null;

    const selected = await getRadarTracks(limit);
    const tracks = await attachLikedFlag(selected, userId);
    return NextResponse.json({ tracks });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur interne du serveur' }, { status: 500 });
  }
}
