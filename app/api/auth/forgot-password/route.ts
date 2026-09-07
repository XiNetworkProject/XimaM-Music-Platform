import { createHash, randomBytes, randomInt } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, resetEmailTemplate } from '@/lib/email';
import { findLocalAuthUserIdByEmail } from '@/lib/localAuth';
import { queryDatabase } from '@/lib/postgres';
import { enforceRequestRateLimit, normalizeEmailForSecurity, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

export const dynamic = 'force-dynamic';

function tokenDigest(token: string) {
  return `sha256:${createHash('sha256').update(token).digest('hex')}`;
}

export async function POST(request: NextRequest) {
  const genericResponse = NextResponse.json({
    message: 'Si un compte existe avec cet email, vous recevrez un lien de reinitialisation',
  });
  try {
    const originError = rejectUntrustedMutationOrigin(request);
    if (originError) return originError;
    const ipLimit = enforceRequestRateLimit(request, 'auth-forgot-ip', 10, 60 * 60_000);
    if (ipLimit) return ipLimit;
    const parsed = await readLimitedJson<any>(request, 4 * 1024);
    if (!parsed.ok) return parsed.response;
    const email = normalizeEmailForSecurity(parsed.value?.email);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Format email invalide' }, { status: 400 });
    }
    const emailLimit = enforceRequestRateLimit(request, 'auth-forgot-email', 3, 30 * 60_000, email);
    if (emailLimit) return emailLimit;

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
    console.error('[auth] demande de reinitialisation non traitee');
  }
  return genericResponse;
}
