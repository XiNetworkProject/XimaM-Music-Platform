import { NextRequest, NextResponse } from 'next/server';
import { refreshMobileSession } from '@/lib/mobileAuth';
import { enforceRequestRateLimit, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const originError = rejectUntrustedMutationOrigin(request);
    if (originError) return originError;
    const limit = enforceRequestRateLimit(request, 'auth-mobile-refresh-ip', 60, 10 * 60_000);
    if (limit) return limit;
    const parsed = await readLimitedJson<any>(request, 16 * 1024);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;
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
    console.error('[auth/mobile] renouvellement impossible');
    return NextResponse.json({ error: 'Impossible de renouveler la session' }, { status: 500 });
  }
}
