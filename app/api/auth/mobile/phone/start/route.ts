import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneNumber } from '@/lib/accountIdentity';
import { createPhoneOtpChallenge, getMobileAuthCapabilities, sendPhoneOtp } from '@/lib/mobileAuthSecurity';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const phone = normalizePhoneNumber(body?.phone);
    if (!phone) {
      return NextResponse.json({ error: 'Numero invalide. Utilise le format +33612345678.' }, { status: 400 });
    }
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
    console.error('[mobile phone start]', error);
    return NextResponse.json({ error: 'SMS impossible a envoyer' }, { status: 500 });
  }
}
