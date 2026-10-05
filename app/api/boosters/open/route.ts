import { boosterMutation } from '@/lib/boosters/http';
import type { NextRequest } from 'next/server';
import { openDaily } from '@/lib/boosters/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  return boosterMutation(openDaily, request);
}
