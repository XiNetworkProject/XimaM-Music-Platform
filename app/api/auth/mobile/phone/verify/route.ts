import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneNumber } from '@/lib/accountIdentity';
import { matchOrCreatePhoneAccount } from '@/lib/localAuth';
import { createMobileSession } from '@/lib/mobileAuth';
import { verifyPhoneOtpChallenge } from '@/lib/mobileAuthSecurity';
import { enforceRequestRateLimit, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const originError = rejectUntrustedMutationOrigin(request);
    if (originError) return originError;
    const ipLimit = enforceRequestRateLimit(request, 'auth-phone-otp-verify-ip', 15, 15 * 60_000);
    if (ipLimit) return ipLimit;
    const parsed = await readLimitedJson<any>(request, 8 * 1024);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;
    const phone = normalizePhoneNumber(body?.phone);
    const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : '';
    const challengeToken = typeof body?.challengeToken === 'string' ? body.challengeToken : '';
    if (!phone || code.length !== 6 || !challengeToken) {
      return NextResponse.json({ error: 'Numero ou code SMS invalide' }, { status: 400 });
    }
    const phoneLimit = enforceRequestRateLimit(request, 'auth-phone-otp-verify-phone', 6, 15 * 60_000, phone);
    if (phoneLimit) return phoneLimit;
    if (!verifyPhoneOtpChallenge(phone, code, challengeToken, 'phone-login')) {
      return NextResponse.json({ error: 'Code expire ou incorrect' }, { status: 401 });
    }
    const profile = await matchOrCreatePhoneAccount({ phone });
    const data = await createMobileSession(profile, {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    });
    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[mobile phone verify] echec de verification');
    return NextResponse.json({ error: 'Verification SMS impossible' }, { status: 500 });
  }
}
