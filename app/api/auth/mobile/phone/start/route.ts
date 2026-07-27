import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneNumber } from '@/lib/accountIdentity';
import { createMobileAuthClient } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const phone = normalizePhoneNumber(body?.phone);
    if (!phone) {
      return NextResponse.json(
        { error: 'Numero invalide. Utilise le format +33612345678.' },
        { status: 400 },
      );
    }

    const authClient = createMobileAuthClient();
    const { error } = await authClient.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: true,
        data: { source: 'synaura-mobile' },
      },
    });
    if (error) {
      return NextResponse.json({ error: error.message || 'SMS impossible a envoyer' }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      data: {
        phone,
        message: 'Un code de connexion vient de partir par SMS.',
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'SMS impossible a envoyer' }, { status: 500 });
  }
}

