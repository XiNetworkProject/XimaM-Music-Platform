import { NextRequest } from 'next/server';
import { boosterMutation } from '@/lib/boosters/http';
import { activateBooster, BoosterError } from '@/lib/boosters/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return boosterMutation((db, userId) => {
    const inventoryId = String(body?.inventoryId || '').trim();
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        inventoryId
      )
    )
      throw new BoosterError('Booster invalide.');
    return activateBooster(
      db,
      userId,
      inventoryId,
      String(body?.targetTrackId || '').trim()
    );
  }, request);
}
