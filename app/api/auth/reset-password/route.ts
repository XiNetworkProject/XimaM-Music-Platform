import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function digest(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sameDigest(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (password.length < 10) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 10 caracteres' }, { status: 400 });
    }
    if (!token && (!email || code.length !== 6)) {
      return NextResponse.json({ error: 'Lien ou code invalide' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('password_resets')
      .select('id, user_id, code, expires_at, used_at, attempt_count')
      .is('used_at', null);
    query = token
      ? query.eq('token', digest(token))
      : query.eq('email', email);
    const { data: reset, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !reset || !reset.user_id || new Date(reset.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Lien ou code invalide ou expire' }, { status: 400 });
    }
    if (!token) {
      if (Number(reset.attempt_count || 0) >= 5) {
        return NextResponse.json({ error: 'Trop de tentatives. Demande un nouveau code.' }, { status: 429 });
      }
      if (!sameDigest(digest(code), String(reset.code || ''))) {
        await supabaseAdmin
          .from('password_resets')
          .update({
            attempt_count: Number(reset.attempt_count || 0) + 1,
            last_attempt_at: new Date().toISOString(),
          })
          .eq('id', reset.id);
        return NextResponse.json({ error: 'Lien ou code invalide ou expire' }, { status: 400 });
      }
    }

    const usedAt = new Date().toISOString();
    const { data: claimed } = await supabaseAdmin
      .from('password_resets')
      .update({ used_at: usedAt })
      .eq('id', reset.id)
      .is('used_at', null)
      .select('id')
      .maybeSingle();
    if (!claimed) {
      return NextResponse.json({ error: 'Lien deja utilise' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      reset.user_id,
      { password },
    );
    if (updateError) {
      console.error('[password reset update]', updateError);
      return NextResponse.json({ error: 'Mise a jour impossible. Demande un nouveau lien.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[reset password]', error);
    return NextResponse.json({ error: 'Lien ou code invalide' }, { status: 400 });
  }
}
