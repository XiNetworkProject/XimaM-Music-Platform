import { NextRequest, NextResponse } from 'next/server';
import {
  MOBILE_AUTH_CALLBACK_URL,
  normalizeEmail,
  normalizePhoneNumber,
} from '@/lib/accountIdentity';
import {
  createMobileAuthClient,
  ensureMobileAuthProfile,
  mobileSessionRequiresMfa,
  mobileSessionPayload,
} from '@/lib/mobileAuth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  return authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
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

    const authClient = createMobileAuthClient();
    const { data: current, error: sessionError } = await authClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError || !current.session || !current.user) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }
    if (mobileSessionRequiresMfa(current.session.access_token, current.user)) {
      return NextResponse.json(
        { error: 'Verification 2FA requise', code: 'MFA_REQUIRED' },
        { status: 403 },
      );
    }

    if (action === 'phone-start') {
      const phone = normalizePhoneNumber(body?.phone);
      if (!phone) return NextResponse.json({ error: 'Numero de telephone invalide' }, { status: 400 });
      const { error } = await authClient.auth.updateUser({ phone });
      if (error) return NextResponse.json({ error: error.message || 'SMS impossible a envoyer' }, { status: 400 });
      const user = await ensureMobileAuthProfile(current.user);
      return NextResponse.json({
        success: true,
        data: {
          phone,
          session: mobileSessionPayload(current.session, user),
          message: 'Un code de verification vient de partir par SMS.',
        },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    if (action === 'phone-verify') {
      const phone = normalizePhoneNumber(body?.phone);
      const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : '';
      if (!phone || code.length !== 6) {
        return NextResponse.json({ error: 'Numero ou code invalide' }, { status: 400 });
      }
      const { data, error } = await authClient.auth.verifyOtp({
        phone,
        token: code,
        type: 'phone_change',
      });
      if (error || !data.user) {
        return NextResponse.json({ error: 'Code expire ou incorrect' }, { status: 401 });
      }
      const session = data.session || current.session;
      const user = await ensureMobileAuthProfile(data.user);
      return NextResponse.json({
        success: true,
        data: {
          session: mobileSessionPayload(session, user),
          message: 'Telephone verifie. Tu peux maintenant te connecter avec ce numero.',
        },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    if (action === 'email-start') {
      const email = normalizeEmail(body?.email);
      if (!/\S+@\S+\.\S+/.test(email)) {
        return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });
      }
      const { data: existing } = await supabaseAdmin
        .from('account_private')
        .select('user_id')
        .eq('email', email)
        .neq('user_id', current.user.id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'Cette adresse est deja utilisee' }, { status: 409 });
      }
      const { error } = await authClient.auth.updateUser(
        { email },
        { emailRedirectTo: MOBILE_AUTH_CALLBACK_URL },
      );
      if (error) {
        return NextResponse.json({ error: error.message || 'Email impossible a ajouter' }, { status: 400 });
      }
      const user = await ensureMobileAuthProfile(current.user);
      return NextResponse.json({
        success: true,
        data: {
          email,
          session: mobileSessionPayload(current.session, user),
          message: 'Un lien de verification vient de partir par email.',
        },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    return NextResponse.json({ error: 'Action de contact inconnue' }, { status: 400 });
  } catch (error) {
    console.error('[mobile contact]', error);
    return NextResponse.json({ error: 'Mise a jour du contact impossible' }, { status: 500 });
  }
}
