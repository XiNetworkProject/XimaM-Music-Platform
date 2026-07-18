import { NextRequest, NextResponse } from 'next/server';
import { createMobileAuthClient, getMobileAuthUser, mobileSessionPayload } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken.trim() : '';
    if (!refreshToken) {
      return NextResponse.json({ error: 'Session expirée', code: 'REFRESH_TOKEN_REQUIRED' }, { status: 401 });
    }

    const authClient = createMobileAuthClient();
    const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session || !data.user) {
      return NextResponse.json({ error: 'Session expirée', code: 'REFRESH_FAILED' }, { status: 401 });
    }

    const user = await getMobileAuthUser(data.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Profil utilisateur introuvable' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: mobileSessionPayload(data.session, user) }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Impossible de renouveler la session' }, { status: 500 });
  }
}
