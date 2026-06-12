import { NextRequest, NextResponse } from 'next/server';
import { GET as getCity } from '@/app/api/city/route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const response = await getCity(request);
  const city = await response.json();
  if (!response.ok) return NextResponse.json(city, { status: response.status });
  return NextResponse.json({
    event: city.currentVoteSession || city.events?.find((event: any) => event.isLive) || null,
    currentVoteSession: city.currentVoteSession || null,
  });
}
