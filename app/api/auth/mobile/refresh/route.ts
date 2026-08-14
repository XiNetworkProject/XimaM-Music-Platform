import { NextRequest, NextResponse } from 'next/server';
import { refreshMobileSession } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken.trim() : '';
    if (!refreshToken) {
      return NextResponse.json({ error: 'Session expiree', code: 'REFRESH_TOKEN_REQUIRED' }, { status: 401 });
    }
    const data = await refreshMobileSession(refreshToken);
    if (!data) {
      return NextResponse.json({ error: 'Session expiree', code: 'REFRESH_FAILED' }, { status: 401 });
    }
    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[auth/mobile] renouvellement impossible:', error);
    return NextResponse.json({ error: 'Impossible de renouveler la session' }, { status: 500 });
  }
}
