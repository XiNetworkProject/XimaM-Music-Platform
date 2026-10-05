import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { getPostgresPool } from '@/lib/postgres';
import { boosterMutation } from '@/lib/boosters/http';
import { spinDaily, spinStatus } from '@/lib/boosters/spin';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  try {
    return NextResponse.json(
      await spinStatus(getPostgresPool(), session.user.id)
    );
  } catch {
    return NextResponse.json(
      { error: 'Roue momentanément indisponible.' },
      { status: 503 }
    );
  }
}
export async function POST(request: NextRequest) {
  return boosterMutation(spinDaily, request);
}
