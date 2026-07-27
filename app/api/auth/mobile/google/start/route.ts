import { NextRequest, NextResponse } from 'next/server';
import { MOBILE_AUTH_CALLBACK_URL, isAllowedMobileAuthRedirect } from '@/lib/accountIdentity';
import { createMobileAuthClient } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const redirectTo = body?.redirectTo || MOBILE_AUTH_CALLBACK_URL;
    if (!isAllowedMobileAuthRedirect(redirectTo)) {
      return NextResponse.json({ error: 'Redirection OAuth refusee' }, { status: 400 });
    }

    const authClient = createMobileAuthClient();
    const { data, error } = await authClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });
    if (error || !data.url) {
      return NextResponse.json(
        { error: error?.message || 'Connexion Google indisponible' },
        { status: 503 },
      );
    }
    return NextResponse.json({ success: true, data: { url: data.url, redirectTo } }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Connexion Google impossible' }, { status: 500 });
  }
}

