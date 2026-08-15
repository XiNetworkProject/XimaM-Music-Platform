import { NextRequest, NextResponse } from 'next/server';
import { createLocalUser } from '@/lib/localAuth';
import { createMobileSession } from '@/lib/mobileAuth';
import { isValidUsername, normalizeUsername, validateBirthDate } from '@/lib/accountIdentity';
import { upsertMobilePrivateAccount } from '@/lib/mobileAuthSecurity';
import { sendEmail, welcomeEmailTemplate } from '@/lib/email';
import { withDatabaseTransaction } from '@/lib/postgres';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const referralCode = typeof body?.referralCode === 'string' ? body.referralCode.trim() : '';
    const mobile = body?.source === 'mobile';
    const firstName = typeof body?.firstName === 'string' ? body.firstName.trim().slice(0, 80) : '';
    const lastName = typeof body?.lastName === 'string' ? body.lastName.trim().slice(0, 80) : '';
    const birthValidation = mobile ? validateBirthDate(body?.birthDate) : null;

    if (!name || !username || !email || !password) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
    }
    if (name.length < 2) {
      return NextResponse.json({ error: 'Le nom doit contenir au moins 2 caracteres' }, { status: 400 });
    }
    const normalizedUsername = normalizeUsername(username);
    if (!isValidUsername(normalizedUsername)) {
      return NextResponse.json({ error: 'Le nom utilisateur doit contenir entre 3 et 30 lettres, chiffres ou underscores' }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Format email invalide' }, { status: 400 });
    }
    if (password.length < (mobile ? 10 : 8)) {
      return NextResponse.json({ error: `Le mot de passe doit contenir au moins ${mobile ? 10 : 8} caracteres` }, { status: 400 });
    }
    if (mobile) {
      if (!firstName || !lastName || !birthValidation?.valid) {
        return NextResponse.json({ error: birthValidation?.valid === false ? birthValidation.error : 'Complete ton identite privee' }, { status: 400 });
      }
      if (body?.acceptTerms !== true || body?.acceptPrivacy !== true) {
        return NextResponse.json({ error: 'Les conditions et la confidentialite doivent etre acceptees' }, { status: 400 });
      }
    }

    const profile = await withDatabaseTransaction(async (client) => {
      const created = await createLocalUser({ name, username: normalizedUsername, email, password }, client);
      if (mobile && birthValidation?.valid) {
        const now = new Date().toISOString();
        await upsertMobilePrivateAccount(created.id, {
          email,
          firstName,
          lastName,
          birthDate: birthValidation.value,
          birthdayVisibility: 'private',
          profileCompletedAt: now,
          termsVersion: '2026-07-27',
          termsAcceptedAt: now,
          privacyVersion: '2026-07-27',
          privacyAcceptedAt: now,
        }, client);
      }
      return created;
    });
    let referrerName: string | null = null;
    if (referralCode) {
      try {
        const referralUrl = new URL('/api/referral', request.url);
        const response = await fetch(referralUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralCode, newUserId: profile.id }),
        });
        if (response.ok) {
          const referral = await response.json();
          referrerName = referral.referrerUsername || null;
        }
      } catch (error) {
        console.warn('[auth] parrainage non applique:', error);
      }
    }

    void sendEmail({
      to: email,
      subject: 'Bienvenue sur Synaura !',
      html: welcomeEmailTemplate({ name, username, referrerName }),
    }).catch((error: unknown) => console.warn('[auth] email de bienvenue non envoye:', error));

    const mobileSession = mobile ? await createMobileSession(profile, {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    }) : null;
    return NextResponse.json({
      message: 'Compte cree avec succes',
      user: { id: profile.id, name: profile.name, username: profile.username, email: profile.email },
      ...(mobileSession ? { data: mobileSession } : {}),
    }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'EMAIL_EXISTS') {
      return NextResponse.json({ error: 'Un compte avec cet email existe deja' }, { status: 409 });
    }
    if (error?.code === 'USERNAME_EXISTS') {
      return NextResponse.json({ error: 'Ce nom utilisateur est deja pris' }, { status: 409 });
    }
    console.error('[auth] creation du compte impossible:', error);
    return NextResponse.json({ error: 'Erreur lors de la creation du compte' }, { status: 500 });
  }
}
