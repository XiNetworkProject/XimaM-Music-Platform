import { NextRequest, NextResponse } from 'next/server';
import { MOBILE_AUTH_CALLBACK_URL, isAllowedMobileAuthRedirect } from '@/lib/accountIdentity';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const redirectTo = body?.redirectTo || MOBILE_AUTH_CALLBACK_URL;
  if (!isAllowedMobileAuthRedirect(redirectTo)) {
    return NextResponse.json({ error: 'Redirection OAuth refusee' }, { status: 400 });
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: 'Connexion Google indisponible' }, { status: 503 });
  }
  const origin = new URL(request.url).origin;
  const callbackUrl = '/api/auth/mobile/google/callback';
  const url = `${origin}/auth/mobile-google?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  return NextResponse.json({ success: true, data: { url, redirectTo } }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
