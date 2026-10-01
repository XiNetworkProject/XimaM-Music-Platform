import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { withDatabaseTransaction } from '@/lib/postgres';
import { claimMission, BoosterError } from '@/lib/boosters/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const ids: string[] = Array.from(
    new Set<string>(
      Array.isArray(body?.missionIds)
        ? body.missionIds.filter(
            (id: unknown) =>
              typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)
          )
        : []
    )
  ).slice(0, 20);
  if (!ids.length)
    return NextResponse.json({ error: 'missionIds requis' }, { status: 400 });
  const claimed = [],
    errors = [];
  // Each mission commits completely or rolls back. Report partial batch success.
  for (const missionId of ids) {
    try {
      const result = await withDatabaseTransaction((db) =>
        claimMission(db, session.user.id, missionId)
      );
      claimed.push({ missionId, rewardInventoryId: result.rewardInventoryId });
    } catch (error) {
      errors.push({
        missionId,
        error:
          error instanceof BoosterError
            ? error.message
            : 'Récompense indisponible. Aucune attribution enregistrée.',
      });
    }
  }
  return NextResponse.json({ ok: true, claimed, errors });
}
