import { NextRequest, NextResponse } from 'next/server';
import { GET as getCity } from '@/app/api/city/route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const response = await getCity(request);
  const city = await response.json();
  if (!response.ok) return NextResponse.json(city, { status: response.status });
  return NextResponse.json({
    events: city.events || [],
    voteSessions: city.voteSessions || [],
    currentVoteSession: city.currentVoteSession || null,
    nextVoteSession: city.nextVoteSession || null,
  });
}
