import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hashLocalPassword, updateLocalPasswordHash } from '@/lib/localAuth';
import { queryDatabase, withDatabaseTransaction } from '@/lib/postgres';

export const dynamic = 'force-dynamic';

function tokenDigest(token: string) {
  return `sha256:${createHash('sha256').update(token).digest('hex')}`;
}

type ResetRow = {
  id: string;
  user_id: string | null;
  email: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (password.length < 8) {
      return NextResponse.json({ error: 'Mot de passe trop court' }, { status: 400 });
    }
    if (!token && (!code || !email)) {
      return NextResponse.json({ error: 'Lien ou code invalide' }, { status: 400 });
    }

    // Le calcul bcrypt est volontairement effectue avant le verrou de transaction.
    const encryptedPassword = await hashLocalPassword(password);
    const updated = await withDatabaseTransaction(async (client) => {
      const reset = token
        ? await queryDatabase<ResetRow>(`
            SELECT id, user_id, email
            FROM public.password_resets
            WHERE token IN ($1, $2) AND used_at IS NULL AND expires_at > now()
            ORDER BY created_at DESC
            LIMIT 1
            FOR UPDATE
          `, [tokenDigest(token), token], client)
        : await queryDatabase<ResetRow>(`
            SELECT id, user_id, email
            FROM public.password_resets
            WHERE lower(email) = $1 AND code = $2 AND used_at IS NULL AND expires_at > now()
            ORDER BY created_at DESC
            LIMIT 1
            FOR UPDATE
          `, [email, code], client);
      const row = reset.rows[0];
      if (!row) return false;
      let userId = row.user_id;
      if (!userId) {
        const user = await queryDatabase<{ id: string }>(`
          SELECT id FROM auth.users WHERE lower(email) = lower($1) AND deleted_at IS NULL LIMIT 1
        `, [row.email], client);
        userId = user.rows[0]?.id || null;
      }
      if (!userId || !await updateLocalPasswordHash(userId, encryptedPassword, client)) return false;
      await queryDatabase(
        'UPDATE public.password_resets SET used_at = now() WHERE id = $1',
        [row.id],
        client,
      );
      return true;
    });
    if (!updated) return NextResponse.json({ error: 'Lien ou code invalide' }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[auth] reinitialisation impossible:', error);
    return NextResponse.json({ error: 'Erreur de reinitialisation' }, { status: 500 });
  }
}

