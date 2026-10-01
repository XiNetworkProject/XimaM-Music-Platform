import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getPostgresPool } from '@/lib/postgres';
import { boosterInventory } from '@/lib/boosters/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  try {
    return NextResponse.json(
      await boosterInventory(getPostgresPool(), session.user.id)
    );
  } catch {
    return NextResponse.json(
      {
        error: 'Impossible de charger tes boosters. Réessaie dans un instant.',
      },
      { status: 503 }
    );
  }
}
