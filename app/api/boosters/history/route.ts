import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getPostgresPool } from '@/lib/postgres';
import { boosterHistory, BoosterError } from '@/lib/boosters/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json(
      await boosterHistory(getPostgresPool(), session.user.id, {
        limit: Number(params.get('limit') || 30),
        cursor: params.get('cursor'),
        sourcePrefix: params.get('sourcePrefix') || '',
      })
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof BoosterError
            ? error.message
            : 'Historique indisponible.',
      },
      { status: error instanceof BoosterError ? error.status : 503 }
    );
  }
}
