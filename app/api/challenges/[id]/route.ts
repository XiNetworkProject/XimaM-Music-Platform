import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { getMusicChallengeDetail } from '@/lib/musicChallenges';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const challengeId = decodeURIComponent(params.id || '');
    if (!challengeId) return NextResponse.json({ error: 'Defi invalide.' }, { status: 400 });

    const session = await getApiSession(request).catch(() => null);
    const detail = await getMusicChallengeDetail(challengeId, session?.user?.id || null);
    if (!detail) return NextResponse.json({ error: 'Defi introuvable.' }, { status: 404 });

    return NextResponse.json({ challenge: detail });
  } catch (error) {
    console.error('music challenge detail failed', error);
    return NextResponse.json({ error: 'Impossible de charger ce defi.' }, { status: 500 });
  }
}
