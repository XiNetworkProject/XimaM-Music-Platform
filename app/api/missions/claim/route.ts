import { NextRequest } from 'next/server';
import { boosterMutation } from '@/lib/boosters/http';
import { claimMission, BoosterError } from '@/lib/boosters/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return boosterMutation((db, userId) => {
    const id = String(body?.missionId || '');
    if (!/^[0-9a-f-]{36}$/i.test(id))
      throw new BoosterError('Mission invalide.');
    return claimMission(db, userId, id);
  });
}
