import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { normalizeEmail, normalizePhoneNumber } from '@/lib/accountIdentity';
import { sendEmail } from '@/lib/email';
import { getMobileSessionPayload, verifyMobileAccessToken } from '@/lib/mobileAuth';
import {
  createPhoneOtpChallenge,
  sendPhoneOtp,
  upsertMobilePrivateAccount,
  verifyPhoneOtpChallenge,
} from '@/lib/mobileAuthSecurity';
import { queryDatabase, withDatabaseTransaction } from '@/lib/postgres';

export const dynamic = 'force-dynamic';

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  return authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
}

function signingSecret() {
  const value = process.env.NEXTAUTH_SECRET?.trim();
  if (!value) throw new Error('NEXTAUTH_SECRET manquant');
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = bearerToken(request);
    const body = await request.json().catch(() => null);
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken.trim() : '';
    const action = typeof body?.action === 'string' ? body.action : '';
    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: 'Session incomplete' }, { status: 401 });
    }
    const [verified, session] = await Promise.all([
      verifyMobileAccessToken(accessToken).catch(() => null),
      getMobileSessionPayload(accessToken, refreshToken).catch(() => null),
    ]);
    if (!verified || !session) return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    if (!verified.authorized) {
      return NextResponse.json({ error: 'Verification 2FA requise', code: 'MFA_REQUIRED' }, { status: 403 });
    }

    if (action === 'phone-start') {
      const phone = normalizePhoneNumber(body?.phone);
      if (!phone) return NextResponse.json({ error: 'Numero de telephone invalide' }, { status: 400 });
      const challenge = createPhoneOtpChallenge(phone, 'phone-link');
      await sendPhoneOtp(phone, challenge.code, 'phone-link');
      return NextResponse.json({
        success: true,
        data: {
          phone,
          challengeToken: challenge.challengeToken,
          expiresAt: challenge.expiresAt,
          session,
          message: 'Un code de verification vient de partir par SMS.',
        },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    if (action === 'phone-verify') {
      const phone = normalizePhoneNumber(body?.phone);
      const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : '';
      const challengeToken = typeof body?.challengeToken === 'string' ? body.challengeToken : '';
      if (!phone || code.length !== 6 || !challengeToken
        || !verifyPhoneOtpChallenge(phone, code, challengeToken, 'phone-link')) {
        return NextResponse.json({ error: 'Code expire ou incorrect' }, { status: 401 });
      }
      await withDatabaseTransaction(async (client) => {
        const duplicate = await queryDatabase<{ exists: boolean }>(`
          SELECT EXISTS (
            SELECT 1 FROM auth.users WHERE phone = $2 AND id <> $1::uuid AND deleted_at IS NULL
          ) AS exists
        `, [verified.userId, phone], client);
        if (duplicate.rows[0]?.exists) throw Object.assign(new Error('PHONE_EXISTS'), { code: 'PHONE_EXISTS' });
        await queryDatabase(`
          UPDATE auth.users
          SET phone = $2, phone_confirmed_at = now(), updated_at = now()
          WHERE id = $1::uuid
        `, [verified.userId, phone], client);
        await queryDatabase(`
          INSERT INTO auth.identities (
            id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
          ) VALUES ($1::uuid, $2, $3::uuid, $4::jsonb, 'phone', now(), now(), now())
          ON CONFLICT (provider_id, provider) DO UPDATE SET
            user_id = EXCLUDED.user_id, identity_data = EXCLUDED.identity_data, updated_at = now()
        `, [randomUUID(), phone, verified.userId, JSON.stringify({ sub: phone, phone, phone_verified: true })], client);
      });
      return NextResponse.json({
        success: true,
        data: { session, message: 'Telephone verifie. Tu peux maintenant te connecter avec ce numero.' },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    if (action === 'email-start') {
      const email = normalizeEmail(body?.email);
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 });
      }
      const duplicate = await queryDatabase<{ exists: boolean }>(`
        SELECT EXISTS (
          SELECT 1 FROM auth.users WHERE lower(email) = $2 AND id <> $1::uuid AND deleted_at IS NULL
        ) AS exists
      `, [verified.userId, email]);
      if (duplicate.rows[0]?.exists) {
        return NextResponse.json({ error: 'Cette adresse est deja utilisee' }, { status: 409 });
      }
      const verificationToken = jwt.sign({
        sub: verified.userId,
        email,
        type: 'mobile-email-change',
      }, signingSecret(), { algorithm: 'HS256', expiresIn: '30m', issuer: 'synaura', audience: 'synaura-email-change' });
      const verificationUrl = new URL('/api/auth/mobile/contact/email/verify', request.url);
      verificationUrl.searchParams.set('token', verificationToken);
      await sendEmail({
        to: email,
        subject: 'Confirme ton adresse email Synaura',
        html: `<p>Confirme ton adresse email Synaura en ouvrant ce lien valable 30 minutes :</p><p><a href="${verificationUrl.toString()}">Confirmer mon adresse</a></p>`,
      });
      return NextResponse.json({
        success: true,
        data: { email, session, message: 'Un lien de verification vient de partir par email.' },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    return NextResponse.json({ error: 'Action de contact inconnue' }, { status: 400 });
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === 'PHONE_EXISTS') return NextResponse.json({ error: 'Ce telephone est deja utilise' }, { status: 409 });
    console.error('[mobile contact]', error);
    return NextResponse.json({ error: 'Mise a jour du contact impossible' }, { status: 500 });
  }
}
