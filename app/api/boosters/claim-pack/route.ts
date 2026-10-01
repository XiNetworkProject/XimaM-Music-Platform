import { NextRequest } from 'next/server';
import { boosterMutation } from '@/lib/boosters/http';
import { claimPack } from '@/lib/boosters/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return boosterMutation((db, userId) =>
    claimPack(db, userId, String(body?.packKey || ''))
  );
}
