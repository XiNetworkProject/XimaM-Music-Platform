import { NextRequest, NextResponse } from 'next/server';
import { getMobileSessionPayload } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : '';
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken.trim() : '';
    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: 'Session OAuth incomplete' }, { status: 400 });
    }
    const data = await getMobileSessionPayload(accessToken, refreshToken);
    if (!data) return NextResponse.json({ error: 'Session OAuth invalide' }, { status: 401 });
    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[mobile auth session]', error);
    return NextResponse.json({ error: 'Impossible de finaliser la connexion' }, { status: 500 });
  }
}
