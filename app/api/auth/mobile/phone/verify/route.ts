import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneNumber } from '@/lib/accountIdentity';
import { matchOrCreatePhoneAccount } from '@/lib/localAuth';
import { createMobileSession } from '@/lib/mobileAuth';
import { verifyPhoneOtpChallenge } from '@/lib/mobileAuthSecurity';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const phone = normalizePhoneNumber(body?.phone);
    const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : '';
    const challengeToken = typeof body?.challengeToken === 'string' ? body.challengeToken : '';
    if (!phone || code.length !== 6 || !challengeToken) {
      return NextResponse.json({ error: 'Numero ou code SMS invalide' }, { status: 400 });
    }
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
    console.error('[mobile phone verify]', error);
    return NextResponse.json({ error: 'Verification SMS impossible' }, { status: 500 });
  }
}
