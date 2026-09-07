import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneNumber } from '@/lib/accountIdentity';
import { createPhoneOtpChallenge, getMobileAuthCapabilities, sendPhoneOtp } from '@/lib/mobileAuthSecurity';
import { enforceRequestRateLimit, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const originError = rejectUntrustedMutationOrigin(request);
    if (originError) return originError;
    const ipLimit = enforceRequestRateLimit(request, 'auth-phone-otp-send-ip', 6, 60 * 60_000);
    if (ipLimit) return ipLimit;
    const parsed = await readLimitedJson<any>(request, 4 * 1024);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;
    const phone = normalizePhoneNumber(body?.phone);
    if (!phone) {
      return NextResponse.json({ error: 'Numero invalide. Utilise le format +33612345678.' }, { status: 400 });
    }
    const phoneLimit = enforceRequestRateLimit(request, 'auth-phone-otp-send-phone', 3, 15 * 60_000, phone);
    if (phoneLimit) return phoneLimit;
    const capabilities = await getMobileAuthCapabilities();
    if (!capabilities.phone) return NextResponse.json({ error: 'Connexion SMS indisponible' }, { status: 503 });
    const challenge = createPhoneOtpChallenge(phone, 'phone-login');
    await sendPhoneOtp(phone, challenge.code, 'phone-login');
    return NextResponse.json({
      success: true,
      data: {
        phone,
        challengeToken: challenge.challengeToken,
        expiresAt: challenge.expiresAt,
        message: 'Un code de connexion vient de partir par SMS.',
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[mobile phone start] echec d envoi');
    return NextResponse.json({ error: 'SMS impossible a envoyer' }, { status: 500 });
  }
}
