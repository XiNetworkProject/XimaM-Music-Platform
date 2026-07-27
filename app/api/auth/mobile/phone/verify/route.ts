import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneNumber } from '@/lib/accountIdentity';
import {
  createMobileAuthClient,
  ensureMobileAuthProfile,
  mobileSessionPayload,
} from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const phone = normalizePhoneNumber(body?.phone);
    const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : '';
    if (!phone || code.length !== 6) {
      return NextResponse.json({ error: 'Numero ou code SMS invalide' }, { status: 400 });
    }

    const authClient = createMobileAuthClient();
    const { data, error } = await authClient.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });
    if (error || !data.user || !data.session) {
      return NextResponse.json({ error: 'Code expire ou incorrect' }, { status: 401 });
    }
    const user = await ensureMobileAuthProfile(data.user);
    return NextResponse.json({
      success: true,
      data: mobileSessionPayload(data.session, user),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[mobile phone verify]', error);
    return NextResponse.json({ error: 'Verification SMS impossible' }, { status: 500 });
  }
}
