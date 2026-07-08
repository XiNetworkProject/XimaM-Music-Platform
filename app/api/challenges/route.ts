import { NextRequest, NextResponse } from 'next/server';
import { listMusicChallenges, type ChallengeStatus } from '@/lib/musicChallenges';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const statusParam = request.nextUrl.searchParams.get('status');
    const status = statusParam === 'upcoming' || statusParam === 'active' || statusParam === 'ended'
      ? (statusParam as ChallengeStatus)
      : undefined;
    const challenges = await listMusicChallenges({ status });
    return NextResponse.json({ challenges });
  } catch (error) {
    console.error('list music challenges failed', error);
    return NextResponse.json({ error: 'Impossible de charger les defis.' }, { status: 500 });
  }
}
