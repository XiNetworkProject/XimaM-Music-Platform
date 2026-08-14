import { NextRequest, NextResponse } from 'next/server';
import { createLocalUser } from '@/lib/localAuth';
import { sendEmail, welcomeEmailTemplate } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const referralCode = typeof body?.referralCode === 'string' ? body.referralCode.trim() : '';

    if (!name || !username || !email || !password) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
    }
    if (name.length < 2) {
      return NextResponse.json({ error: 'Le nom doit contenir au moins 2 caracteres' }, { status: 400 });
    }
    if (username.length < 3 || username.length > 24) {
      return NextResponse.json({ error: 'Le nom utilisateur doit contenir entre 3 et 24 caracteres' }, { status: 400 });
    }
    if (!/^[a-z0-9_]+$/i.test(username)) {
      return NextResponse.json({ error: 'Le nom utilisateur ne peut contenir que des lettres, chiffres et underscores' }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Format email invalide' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caracteres' }, { status: 400 });
    }

    const profile = await createLocalUser({ name, username, email, password });
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

    return NextResponse.json({
      message: 'Compte cree avec succes',
      user: { id: profile.id, name: profile.name, username: profile.username, email: profile.email },
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
