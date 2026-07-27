import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, resetEmailTemplate } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase';

const GENERIC_MESSAGE = 'Si un compte existe avec cet email, vous recevrez un lien de reinitialisation';

function digest(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 });
    }
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || request.ip
      || null;

    if (ip) {
      const ipSince = new Date(Date.now() - 10 * 60_000).toISOString();
      const { count: ipCount } = await supabaseAdmin
        .from('password_resets')
        .select('id', { count: 'exact', head: true })
        .eq('ip', ip)
        .gte('created_at', ipSince);
      if ((ipCount || 0) >= 20) {
        return NextResponse.json({ message: GENERIC_MESSAGE });
      }
    }

    const { data: privateAccount } = await supabaseAdmin
      .from('account_private')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();
    if (!privateAccount?.user_id) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from('password_resets')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', since);
    if ((count || 0) >= 5) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const { error: insertError } = await supabaseAdmin.from('password_resets').insert({
      user_id: privateAccount.user_id,
      email,
      token: digest(token),
      code: digest(code),
      expires_at: expiresAt,
      ip,
      user_agent: request.headers.get('user-agent') || null,
    });
    if (insertError) throw insertError;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const link = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
    await sendEmail({
      to: email,
      subject: 'Reinitialisez votre mot de passe - Synaura',
      html: resetEmailTemplate({ code, link }),
    }).catch((error: unknown) => console.error('[password reset email]', error));

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error('[forgot password]', error);
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }
}
