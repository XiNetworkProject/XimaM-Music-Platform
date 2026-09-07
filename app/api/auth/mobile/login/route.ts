import { NextRequest, NextResponse } from 'next/server';
import { signInMobilePassword } from '@/lib/mobileAuth';
import { enforceRequestRateLimit, normalizeEmailForSecurity, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const originError = rejectUntrustedMutationOrigin(request);
    if (originError) return originError;
    const ipLimit = enforceRequestRateLimit(request, 'auth-mobile-login-ip', 20, 10 * 60_000);
    if (ipLimit) return ipLimit;
    const parsed = await readLimitedJson<any>(request, 8 * 1024);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;
    const email = normalizeEmailForSecurity(body?.email);
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }
    const accountLimit = enforceRequestRateLimit(request, 'auth-mobile-login-account', 8, 10 * 60_000, email);
    if (accountLimit) return accountLimit;
    const data = await signInMobilePassword(email, password, {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    });
    if (!data) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }
    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[auth/mobile] connexion impossible');
    return NextResponse.json({ error: 'Erreur lors de la connexion' }, { status: 500 });
  }
}
