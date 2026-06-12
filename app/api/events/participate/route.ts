import { NextRequest, NextResponse } from 'next/server';
import { POST as participate } from '@/app/api/city/events/[id]/participate/route';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const eventId = typeof body?.eventId === 'string' ? body.eventId.trim() : '';
  const trackId = typeof body?.trackId === 'string' ? body.trackId.trim() : '';
  if (!eventId || !trackId) return NextResponse.json({ error: 'Participation invalide.' }, { status: 400 });
  const forwarded = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ trackId }),
  });
  return participate(forwarded, { params: { id: eventId } });
}
