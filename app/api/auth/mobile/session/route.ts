import { NextRequest, NextResponse } from 'next/server';
import { getMobileSessionPayload } from '@/lib/mobileAuth';
import { enforceRequestRateLimit, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const originError = rejectUntrustedMutationOrigin(request);
    if (originError) return originError;
    const limit = enforceRequestRateLimit(request, 'auth-mobile-session-ip', 30, 10 * 60_000);
    if (limit) return limit;
    const parsed = await readLimitedJson<any>(request, 32 * 1024);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;
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
    console.error('[mobile auth session] finalisation impossible');
    return NextResponse.json({ error: 'Impossible de finaliser la connexion' }, { status: 500 });
  }
}
