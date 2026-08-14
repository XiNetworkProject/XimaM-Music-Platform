import { NextRequest, NextResponse } from 'next/server';
import { signInMobilePassword } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }
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
    console.error('[auth/mobile] connexion impossible:', error);
    return NextResponse.json({ error: 'Erreur lors de la connexion' }, { status: 500 });
  }
}
