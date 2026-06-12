import { NextRequest, NextResponse } from 'next/server';
import { GET as getCity } from '@/app/api/city/route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const response = await getCity(request);
  const city = await response.json();
  if (!response.ok) return NextResponse.json(city, { status: response.status });
  return NextResponse.json({
    results: (city.events || []).filter((event: any) => event.isEnded || event.winnerTrackId).map((event: any) => ({
      eventId: event.id,
      title: event.title,
      winnerTrackId: event.winnerTrackId || null,
      winners: event.winners || [],
      totalVotes: event.totalVotes || 0,
    })),
  });
}
