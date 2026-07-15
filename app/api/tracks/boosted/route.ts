import { NextRequest } from 'next/server';
import { legacyDiscoveryFeed } from '@/lib/recommendation/serverFeed';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return legacyDiscoveryFeed(request, { strategy: 'boosted', includeAi: false, mode: 'boosted', maxLimit: 50 });
}
