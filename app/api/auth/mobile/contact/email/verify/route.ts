import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { queryDatabase, withDatabaseTransaction } from '@/lib/postgres';
import { upsertMobilePrivateAccount } from '@/lib/mobileAuthSecurity';
import { enforceRequestRateLimit } from '@/lib/security/requestSecurity';

export const dynamic = 'force-dynamic';

function html(message: string, ok: boolean) {
  return new Response(`<!doctype html><html lang="fr"><meta charset="utf-8"><title>Synaura</title><body style="font-family:system-ui;background:#0d0c12;color:white;display:grid;place-items:center;min-height:100vh"><main><h1>Synaura</h1><p>${message}</p><p>${ok ? 'Tu peux retourner dans l’application.' : 'Demande un nouveau lien depuis l’application.'}</p></main></body></html>`, {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' },
  });
}

export async function GET(request: NextRequest) {
  const limited = enforceRequestRateLimit(request, 'auth-mobile-email-verify-ip', 20, 60 * 60_000);
  if (limited) return limited;
  const token = request.nextUrl.searchParams.get('token') || '';
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!token || !secret) return html('Lien de verification invalide.', false);
  try {
    const claims = jwt.verify(token, secret, {
      algorithms: ['HS256'], issuer: 'synaura', audience: 'synaura-email-change',
    }) as jwt.JwtPayload;
    const userId = typeof claims.sub === 'string' ? claims.sub : '';
    const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
    if (claims.type !== 'mobile-email-change' || !userId || !/^\S+@\S+\.\S+$/.test(email)) {
      return html('Lien de verification invalide.', false);
    }
    await withDatabaseTransaction(async (client) => {
      const duplicate = await queryDatabase<{ exists: boolean }>(`
        SELECT EXISTS (
          SELECT 1 FROM auth.users WHERE lower(email) = $2 AND id <> $1::uuid AND deleted_at IS NULL
        ) AS exists
      `, [userId, email], client);
      if (duplicate.rows[0]?.exists) throw new Error('EMAIL_EXISTS');
      await queryDatabase(`
        UPDATE auth.users
        SET email = $2, email_confirmed_at = now(), updated_at = now()
        WHERE id = $1::uuid AND deleted_at IS NULL
      `, [userId, email], client);
      await queryDatabase(`
        UPDATE public.profiles SET email = $2, updated_at = now() WHERE id = $1::uuid
      `, [userId, email], client);
      await queryDatabase(`
        UPDATE auth.identities
        SET identity_data = COALESCE(identity_data, '{}'::jsonb) || $2::jsonb, updated_at = now()
        WHERE user_id = $1::uuid AND provider = 'email'
      `, [userId, JSON.stringify({ email, email_verified: true })], client);
      await upsertMobilePrivateAccount(userId, { email }, client);
    });
    return html('Adresse email confirmee.', true);
  } catch (error) {
    return html(error instanceof Error && error.message === 'EMAIL_EXISTS'
      ? 'Cette adresse email est deja utilisee.'
      : 'Ce lien a expire ou est invalide.', false);
  }
}
