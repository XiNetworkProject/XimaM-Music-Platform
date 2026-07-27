import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeUsername,
  isValidUsername,
  validateBirthDate,
} from '@/lib/accountIdentity';
import {
  getMobileAuthUser,
  getMobileMfaFactors,
  mobileSessionRequiresMfa,
} from '@/lib/mobileAuth';
import { supabaseAdmin } from '@/lib/supabase';

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
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error || !data.user ? null : { token, user: data.user };
}

async function accountPayload(userId: string) {
  const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
  const authUser = authData.user;
  if (!authUser) return null;
  const [mobileUser, privateResult] = await Promise.all([
    getMobileAuthUser(userId, authUser),
    supabaseAdmin
      .from('account_private')
      .select('first_name, last_name, birth_date, birthday_visibility, discoverable_by_email, discoverable_by_phone, profile_completed_at, terms_version, privacy_version')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  if (!mobileUser) return null;
  const privateAccount = privateResult.data;
  return {
    user: mobileUser,
    private: {
      firstName: privateAccount?.first_name || '',
      lastName: privateAccount?.last_name || '',
      birthDate: privateAccount?.birth_date || '',
      birthdayVisibility: privateAccount?.birthday_visibility || 'private',
      discoverableByEmail: Boolean(privateAccount?.discoverable_by_email),
      discoverableByPhone: Boolean(privateAccount?.discoverable_by_phone),
      profileComplete: Boolean(privateAccount?.profile_completed_at),
      termsVersion: privateAccount?.terms_version || null,
      privacyVersion: privateAccount?.privacy_version || null,
    },
    identities: (authUser.identities || []).map((identity) => ({
      id: identity.identity_id,
      provider: identity.provider,
      createdAt: identity.created_at,
      lastSignInAt: identity.last_sign_in_at,
    })),
    mfaFactors: getMobileMfaFactors(authUser),
    currentTermsVersion: TERMS_VERSION,
    currentPrivacyVersion: PRIVACY_VERSION,
  };
}

export async function GET(request: NextRequest) {
  const auth = await authenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  if (mobileSessionRequiresMfa(auth.token, auth.user)) {
    return NextResponse.json({ error: 'Verification 2FA requise', code: 'MFA_REQUIRED' }, { status: 403 });
  }
  const data = await accountPayload(auth.user.id);
  if (!data) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
  return NextResponse.json({ success: true, data }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticatedUser(request);
    if (!auth) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    if (mobileSessionRequiresMfa(auth.token, auth.user)) {
      return NextResponse.json({ error: 'Verification 2FA requise', code: 'MFA_REQUIRED' }, { status: 403 });
    }
    const authUser = auth.user;
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
    if (firstName !== undefined && firstName.length < 1) {
      return NextResponse.json({ error: 'Le prenom est requis' }, { status: 400 });
    }
    if (lastName !== undefined && lastName.length < 1) {
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

    const profileUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) profileUpdate.name = name;
    if (username !== undefined) profileUpdate.username = username;
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', authUser.id);
    if (profileError) {
      if (profileError.code === '23505') {
        return NextResponse.json({ error: 'Ce pseudo est deja pris' }, { status: 409 });
      }
      throw profileError;
    }

    const now = new Date().toISOString();
    const privateUpdate: Record<string, unknown> = { user_id: authUser.id };
    if (firstName !== undefined) privateUpdate.first_name = firstName;
    if (lastName !== undefined) privateUpdate.last_name = lastName;
    if (birthValidation?.valid) privateUpdate.birth_date = birthValidation.value;
    if (visibility !== undefined) privateUpdate.birthday_visibility = visibility;
    if (typeof body.discoverableByEmail === 'boolean') {
      privateUpdate.discoverable_by_email = body.discoverableByEmail;
    }
    if (typeof body.discoverableByPhone === 'boolean') {
      privateUpdate.discoverable_by_phone = body.discoverableByPhone;
    }
    if (completing) {
      privateUpdate.profile_completed_at = now;
      privateUpdate.terms_version = TERMS_VERSION;
      privateUpdate.terms_accepted_at = now;
      privateUpdate.privacy_version = PRIVACY_VERSION;
      privateUpdate.privacy_accepted_at = now;
    }
    const { error: privateError } = await supabaseAdmin
      .from('account_private')
      .upsert(privateUpdate, { onConflict: 'user_id' });
    if (privateError) throw privateError;

    const data = await accountPayload(authUser.id);
    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[mobile account update]', error);
    return NextResponse.json({ error: 'Mise a jour du compte impossible' }, { status: 500 });
  }
}
