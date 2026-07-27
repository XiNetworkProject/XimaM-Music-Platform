import { NextRequest, NextResponse } from 'next/server';
import {
  MOBILE_AUTH_CALLBACK_URL,
  isValidUsername,
  normalizeEmail,
  normalizeUsername,
  validateBirthDate,
} from '@/lib/accountIdentity';
import {
  createMobileAuthClient,
  ensureMobileAuthProfile,
  mobileSessionPayload,
} from '@/lib/mobileAuth';
import { sendEmail, welcomeEmailTemplate } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const username = normalizeUsername(body?.username);
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === 'string' ? body.password : '';
    const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
    const referralCode = typeof body?.referralCode === 'string' ? body.referralCode.trim() : '';
    const isMobile = body?.source === 'mobile';
    const birthValidation = body?.birthDate ? validateBirthDate(body.birthDate) : null;

    if (!name || !username || !email || !password) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
    }
    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: 'Le nom doit contenir entre 2 et 80 caracteres' }, { status: 400 });
    }
    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: 'Le pseudo doit contenir 3 a 30 lettres, chiffres ou underscores' },
        { status: 400 },
      );
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 });
    }
    if (password.length < 10) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 10 caracteres' },
        { status: 400 },
      );
    }
    if (isMobile) {
      if (!firstName || !lastName || !birthValidation?.valid) {
        return NextResponse.json(
          { error: birthValidation && !birthValidation.valid ? birthValidation.error : 'Identite incomplete' },
          { status: 400 },
        );
      }
      if (body.acceptTerms !== true || body.acceptPrivacy !== true) {
        return NextResponse.json(
          { error: 'Accepte les conditions et la politique de confidentialite' },
          { status: 400 },
        );
      }
    }

    const [{ data: existingEmail }, { data: existingUsername }] = await Promise.all([
      supabaseAdmin.from('account_private').select('user_id').eq('email', email).maybeSingle(),
      supabaseAdmin.from('profiles').select('id').eq('username', username).maybeSingle(),
    ]);
    if (existingEmail) {
      return NextResponse.json({ error: 'Un compte avec cet email existe deja' }, { status: 409 });
    }
    if (existingUsername) {
      return NextResponse.json({ error: 'Ce pseudo est deja pris' }, { status: 409 });
    }

    const authClient = createMobileAuthClient();
    const webRedirect = `${process.env.NEXTAUTH_URL || request.nextUrl.origin}/auth/signin?confirmed=1`;
    const { data: authData, error: authError } = await authClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: isMobile ? MOBILE_AUTH_CALLBACK_URL : webRedirect,
        data: {
          name,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          preferred_username: username,
          source: isMobile ? 'synaura-mobile' : 'synaura-web',
        },
      },
    });
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Erreur lors de la creation du compte' },
        { status: authError?.status || 400 },
      );
    }
    if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
      return NextResponse.json({ error: 'Un compte avec cet email existe deja' }, { status: 409 });
    }

    let user;
    try {
      user = await ensureMobileAuthProfile(authData.user, {
        name,
        username,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        profileComplete: false,
      });
      if (isMobile && birthValidation?.valid) {
        const now = new Date().toISOString();
        const { error: privateError } = await supabaseAdmin.from('account_private').upsert({
          user_id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          birth_date: birthValidation.value,
          birthday_visibility: 'private',
          profile_completed_at: now,
          terms_version: '2026-07-27',
          terms_accepted_at: now,
          privacy_version: '2026-07-27',
          privacy_accepted_at: now,
        }, { onConflict: 'user_id' });
        if (privateError) throw privateError;
        user = { ...user, profileComplete: true };
      }
    } catch (profileError) {
      console.error('[signup profile]', profileError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => undefined);
      return NextResponse.json({ error: 'Erreur lors de la creation du profil' }, { status: 500 });
    }

    let referrerName: string | null = null;
    if (referralCode) {
      try {
        const refRes = await fetch(`${process.env.NEXTAUTH_URL || request.nextUrl.origin}/api/referral`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralCode, newUserId: authData.user.id }),
        });
        if (refRes.ok) {
          const refData = await refRes.json();
          referrerName = refData.referrerUsername || null;
        }
      } catch (referralError) {
        console.warn('[signup referral]', referralError);
      }
    }

    void sendEmail({
      to: email,
      subject: 'Bienvenue sur Synaura',
      html: welcomeEmailTemplate({ name, username, referrerName }),
    }).catch((emailError: unknown) => console.warn('[signup welcome email]', emailError));

    return NextResponse.json({
      success: true,
      message: authData.session
        ? 'Compte cree avec succes.'
        : 'Compte cree. Confirme ton adresse email depuis le message recu.',
      requiresEmailConfirmation: !authData.session,
      user,
      data: authData.session ? mobileSessionPayload(authData.session, user) : null,
    }, { status: 201 });
  } catch (error) {
    console.error('[signup]', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
