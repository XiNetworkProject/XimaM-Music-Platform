import { NextRequest, NextResponse } from 'next/server';
import {
  createMobileAuthClient,
  ensureMobileAuthProfile,
  mobileSessionPayload,
} from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : '';
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken.trim() : '';
    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: 'Session OAuth incomplete' }, { status: 400 });
    }

    const authClient = createMobileAuthClient();
    const { data, error } = await authClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error || !data.session || !data.user) {
      return NextResponse.json({ error: 'Session OAuth invalide' }, { status: 401 });
    }

    const user = await ensureMobileAuthProfile(data.user);
    return NextResponse.json({
      success: true,
      data: mobileSessionPayload(data.session, user),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[mobile auth session]', error);
    return NextResponse.json({ error: 'Impossible de finaliser la connexion' }, { status: 500 });
  }
}

