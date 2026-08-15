import { NextRequest, NextResponse } from 'next/server';
import { isValidUsername, normalizeUsername, validateBirthDate } from '@/lib/accountIdentity';
import { getMobileAuthUser, verifyMobileAccessToken } from '@/lib/mobileAuth';
import {
  getMobileIdentities,
  getMobilePrivateAccount,
  listMobileMfaFactors,
  updateMobilePublicProfile,
  upsertMobilePrivateAccount,
} from '@/lib/mobileAuthSecurity';
import { withDatabaseTransaction } from '@/lib/postgres';

export const dynamic = 'force-dynamic';

const TERMS_VERSION = '2026-07-27';
const PRIVACY_VERSION = '2026-07-27';
const VISIBILITIES = new Set(['private', 'friends', 'public']);

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  return authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
}

async function authenticatedUser(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) return null;
  const verified = await verifyMobileAccessToken(token).catch(() => null);
  return verified ? { token, ...verified } : null;
}

async function accountPayload(userId: string) {
  const [user, privateAccount, identities, mfaFactors] = await Promise.all([
    getMobileAuthUser(userId),
    getMobilePrivateAccount(userId),
    getMobileIdentities(userId),
    listMobileMfaFactors(userId),
  ]);
  if (!user) return null;
  return {
    user,
    private: privateAccount,
    identities,
    mfaFactors,
    currentTermsVersion: TERMS_VERSION,
    currentPrivacyVersion: PRIVACY_VERSION,
  };
}

export async function GET(request: NextRequest) {
  const auth = await authenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Verification 2FA requise', code: 'MFA_REQUIRED' }, { status: 403 });
  }
  const data = await accountPayload(auth.userId);
  if (!data) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
  return NextResponse.json({ success: true, data }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticatedUser(request);
    if (!auth) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Verification 2FA requise', code: 'MFA_REQUIRED' }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Donnees invalides' }, { status: 400 });
    }

    const completing = body.completeProfile === true;
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : undefined;
    const username = typeof body.username === 'string' ? normalizeUsername(body.username) : undefined;
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim().slice(0, 80) : undefined;
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim().slice(0, 80) : undefined;
    const visibility = typeof body.birthdayVisibility === 'string' ? body.birthdayVisibility : undefined;
    const birthValidation = body.birthDate === undefined ? null : validateBirthDate(body.birthDate);

    if (name !== undefined && name.length < 2) {
      return NextResponse.json({ error: 'Le nom doit contenir au moins 2 caracteres' }, { status: 400 });
    }
    if (username !== undefined && !isValidUsername(username)) {
      return NextResponse.json({ error: 'Le pseudo doit contenir 3 a 30 lettres, chiffres ou underscores' }, { status: 400 });
    }
    if (firstName !== undefined && !firstName) {
      return NextResponse.json({ error: 'Le prenom est requis' }, { status: 400 });
    }
    if (lastName !== undefined && !lastName) {
      return NextResponse.json({ error: 'Le nom de famille est requis' }, { status: 400 });
    }
    if (visibility !== undefined && !VISIBILITIES.has(visibility)) {
      return NextResponse.json({ error: 'Visibilite anniversaire invalide' }, { status: 400 });
    }
    if (birthValidation && !birthValidation.valid) {
      return NextResponse.json({ error: birthValidation.error }, { status: 400 });
    }
    if (completing) {
      if (!name || !username || !firstName || !lastName || !birthValidation?.valid) {
        return NextResponse.json({ error: 'Complete tous les champs obligatoires' }, { status: 400 });
      }
      if (body.acceptTerms !== true || body.acceptPrivacy !== true) {
        return NextResponse.json({ error: 'Les conditions et la confidentialite doivent etre acceptees' }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    await withDatabaseTransaction(async (client) => {
      await updateMobilePublicProfile(auth.userId, { name, username }, client);
      await upsertMobilePrivateAccount(auth.userId, {
        firstName,
        lastName,
        birthDate: birthValidation?.valid ? birthValidation.value : undefined,
        birthdayVisibility: visibility as 'private' | 'friends' | 'public' | undefined,
        discoverableByEmail: typeof body.discoverableByEmail === 'boolean' ? body.discoverableByEmail : undefined,
        discoverableByPhone: typeof body.discoverableByPhone === 'boolean' ? body.discoverableByPhone : undefined,
        profileCompletedAt: completing ? now : undefined,
        termsVersion: completing ? TERMS_VERSION : undefined,
        termsAcceptedAt: completing ? now : undefined,
        privacyVersion: completing ? PRIVACY_VERSION : undefined,
        privacyAcceptedAt: completing ? now : undefined,
      }, client);
    });

    const data = await accountPayload(auth.userId);
    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === '23505') {
      return NextResponse.json({ error: 'Ce pseudo est deja pris' }, { status: 409 });
    }
    console.error('[mobile account update]', error);
    return NextResponse.json({ error: 'Mise a jour du compte impossible' }, { status: 500 });
  }
}
