import { createHash, randomBytes, randomInt } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, resetEmailTemplate } from '@/lib/email';
import { findLocalAuthUserIdByEmail } from '@/lib/localAuth';
import { queryDatabase } from '@/lib/postgres';

export const dynamic = 'force-dynamic';

function tokenDigest(token: string) {
  return `sha256:${createHash('sha256').update(token).digest('hex')}`;
}

export async function POST(request: NextRequest) {
  const genericResponse = NextResponse.json({
    message: 'Si un compte existe avec cet email, vous recevrez un lien de reinitialisation',
  });
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Format email invalide' }, { status: 400 });
    }

    const userId = await findLocalAuthUserIdByEmail(email);
    if (!userId) return genericResponse;

    const token = randomBytes(32).toString('hex');
    const code = String(randomInt(100000, 1_000_000));
    await queryDatabase(`
      INSERT INTO public.password_resets (
        user_id, email, token, code, expires_at, ip, user_agent
      ) VALUES ($1::uuid, $2, $3, $4, now() + interval '10 minutes', $5, $6)
    `, [
      userId,
      email,
      tokenDigest(token),
      code,
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      request.headers.get('user-agent') || null,
    ]);

    const link = new URL('/auth/reset-password', request.url);
    link.searchParams.set('token', token);
    await sendEmail({
      to: email,
      subject: 'Reinitialisez votre mot de passe - Synaura',
      html: resetEmailTemplate({ code, link: link.toString() }),
    });
  } catch (error) {
    // La reponse reste identique afin de ne pas reveler l'existence d'un compte.
    console.error('[auth] demande de reinitialisation non traitee:', error);
  }
  return genericResponse;
}
