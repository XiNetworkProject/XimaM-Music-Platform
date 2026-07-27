import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  isValidUsername,
  normalizeUsername,
  validateBirthDate,
} from '@/lib/accountIdentity';
import { getMobileMfaFactors } from '@/lib/mobileAuth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const TERMS_VERSION = '2026-07-27';
const PRIVACY_VERSION = '2026-07-27';
const VISIBILITIES = new Set(['private', 'friends', 'public']);

async function userIdFromRequest(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return '';
  const token = await getToken({
    req: request,
    secret,
    secureCookie: process.env.NODE_ENV === 'production',
  });
  return typeof token?.id === 'string' ? token.id : '';
}

function privateResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

async function accountPayload(userId: string) {
  const [{ data: authData, error: authError }, profileResult, privateResult] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(userId),
    supabaseAdmin
      .from('profiles')
      .select('id, name, username')
      .eq('id', userId)
      .single(),
    supabaseAdmin
      .from('account_private')
      .select('email, first_name, last_name, birth_date, birthday_visibility, discoverable_by_email, profile_completed_at, terms_version, privacy_version, mfa_enabled')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  if (authError || !authData.user || profileResult.error || !profileResult.data) return null;

  const authUser = authData.user;
  const privateAccount = privateResult.data;
  const providers = Array.from(new Set([
    ...(Array.isArray(authUser.app_metadata?.providers) ? authUser.app_metadata.providers : []),
    ...(authUser.identities || []).map((identity) => identity.provider),
  ].filter((provider): provider is string => typeof provider === 'string' && provider.length > 0)));

  return {
    user: {
      id: profileResult.data.id,
      name: profileResult.data.name || '',
      username: profileResult.data.username || '',
      email: authUser.email || privateAccount?.email || '',
      emailVerified: Boolean(authUser.email_confirmed_at),
      providers,
    },
    private: {
      firstName: privateAccount?.first_name || '',
      lastName: privateAccount?.last_name || '',
      birthDate: privateAccount?.birth_date || '',
      birthdayVisibility: privateAccount?.birthday_visibility || 'private',
      discoverableByEmail: Boolean(privateAccount?.discoverable_by_email),
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
    mfaEnabled: Boolean(privateAccount?.mfa_enabled),
    currentTermsVersion: TERMS_VERSION,
    currentPrivacyVersion: PRIVACY_VERSION,
  };
}

export async function GET(request: NextRequest) {
  const userId = await userIdFromRequest(request);
  if (!userId) return privateResponse({ error: 'Non authentifié' }, 401);
  const data = await accountPayload(userId);
  if (!data) return privateResponse({ error: 'Compte introuvable' }, 404);
  return privateResponse({ success: true, data });
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await userIdFromRequest(request);
    if (!userId) return privateResponse({ error: 'Non authentifié' }, 401);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return privateResponse({ error: 'Données invalides' }, 400);
    }

    const completing = body.completeProfile === true;
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : undefined;
    const username = typeof body.username === 'string' ? normalizeUsername(body.username) : undefined;
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim().slice(0, 80) : undefined;
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim().slice(0, 80) : undefined;
    const visibility = typeof body.birthdayVisibility === 'string' ? body.birthdayVisibility : undefined;
    const birthValidation = body.birthDate === undefined ? null : validateBirthDate(body.birthDate);

    if (name !== undefined && name.length < 2) {
      return privateResponse({ error: 'Le nom public doit contenir au moins 2 caractères' }, 400);
    }
    if (username !== undefined && !isValidUsername(username)) {
      return privateResponse({ error: 'Le pseudo doit contenir 3 a 30 lettres, chiffres ou underscores' }, 400);
    }
    if (firstName !== undefined && firstName.length < 1) {
      return privateResponse({ error: 'Le prénom est requis' }, 400);
    }
    if (lastName !== undefined && lastName.length < 1) {
      return privateResponse({ error: 'Le nom de famille est requis' }, 400);
    }
    if (visibility !== undefined && !VISIBILITIES.has(visibility)) {
      return privateResponse({ error: 'Visibilité anniversaire invalide' }, 400);
    }
    if (birthValidation && !birthValidation.valid) {
      return privateResponse({ error: birthValidation.error }, 400);
    }
    if (completing) {
      if (!name || !username || !firstName || !lastName || !birthValidation?.valid) {
        return privateResponse({ error: 'Complete tous les champs obligatoires' }, 400);
      }
      if (body.acceptTerms !== true || body.acceptPrivacy !== true) {
        return privateResponse({ error: 'Accepte les conditions et la politique de confidentialité' }, 400);
      }
    }

    const profileUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) profileUpdate.name = name;
    if (username !== undefined) profileUpdate.username = username;
    if (Object.keys(profileUpdate).length > 1) {
      const { error } = await supabaseAdmin.from('profiles').update(profileUpdate).eq('id', userId);
      if (error?.code === '23505') return privateResponse({ error: 'Ce pseudo est déjà pris' }, 409);
      if (error) throw error;
    }

    const privateUpdate: Record<string, unknown> = { user_id: userId };
    if (firstName !== undefined) privateUpdate.first_name = firstName;
    if (lastName !== undefined) privateUpdate.last_name = lastName;
    if (birthValidation?.valid) privateUpdate.birth_date = birthValidation.value;
    if (visibility !== undefined) privateUpdate.birthday_visibility = visibility;
    if (typeof body.discoverableByEmail === 'boolean') {
      privateUpdate.discoverable_by_email = body.discoverableByEmail;
    }
    if (completing) {
      const now = new Date().toISOString();
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

    const data = await accountPayload(userId);
    return privateResponse({ success: true, data });
  } catch (error) {
    console.error('[web account]', error);
    return privateResponse({ error: 'Mise à jour du compte impossible' }, 500);
  }
}
