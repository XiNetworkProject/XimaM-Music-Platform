import { createClient, type Session, type User } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeUsername, usernameSeed } from '@/lib/accountIdentity';

export type MobileAuthUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
  role?: string | null;
  isVerified?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  profileComplete?: boolean;
  providers?: string[];
};

export type MobileMfaFactor = {
  id: string;
  type: string;
  status: string;
  friendlyName?: string | null;
  createdAt?: string | null;
};

type EnsureProfileOptions = {
  name?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profileComplete?: boolean;
};

export function createMobileAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Configuration Supabase manquante');

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function profileTableUnavailable(error: { code?: string; message?: string } | null) {
  return Boolean(
    error
    && (error.code === '42P01' || error.message?.toLowerCase().includes('account_private')),
  );
}

function userProviders(user?: User | null) {
  const providers = [
    ...(Array.isArray(user?.app_metadata?.providers) ? user.app_metadata.providers : []),
    ...(user?.identities || []).map((identity) => identity.provider),
  ].filter((provider): provider is string => typeof provider === 'string' && provider.length > 0);
  return Array.from(new Set(providers));
}

export function getMobileMfaFactors(user?: User | null): MobileMfaFactor[] {
  return (user?.factors || []).map((factor) => ({
    id: factor.id,
    type: factor.factor_type,
    status: factor.status,
    friendlyName: factor.friendly_name || null,
    createdAt: factor.created_at || null,
  }));
}

export function hasVerifiedMobileMfaFactor(user?: User | null) {
  return getMobileMfaFactors(user).some((factor) => factor.status === 'verified');
}

export function mobileSessionRequiresMfa(token: string, user?: User | null) {
  return hasVerifiedMobileMfaFactor(user)
    && readAuthenticatorAssuranceLevel(token) !== 'aal2';
}

function authDisplayName(user: User) {
  const metadata = user.user_metadata || {};
  const combined = [metadata.first_name, metadata.last_name]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(' ')
    .trim();
  const candidate = metadata.full_name || metadata.name || combined || user.email?.split('@')[0];
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().slice(0, 80);
  return user.phone ? `Membre ${user.phone.slice(-4)}` : 'Nouveau membre';
}

function authAvatar(user: User) {
  const value = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  return typeof value === 'string' && value.startsWith('http') ? value : null;
}

async function availableUsername(seed: string, userId: string) {
  const base = usernameSeed(seed);
  const suffix = userId.replace(/-/g, '').slice(0, 6);
  const candidates = [
    base,
    normalizeUsername(`${base}_${suffix}`),
    normalizeUsername(`${base}_${suffix}1`),
    normalizeUsername(`${base}_${suffix}2`),
  ];
  for (const candidate of candidates) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `membre_${userId.replace(/-/g, '').slice(0, 12)}`;
}

export async function ensureMobileAuthProfile(
  authUser: User,
  options: EnsureProfileOptions = {},
): Promise<MobileAuthUser> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, name, username, avatar, role, is_verified')
    .eq('id', authUser.id)
    .maybeSingle();
  if (existingError) throw existingError;

  if (!existing) {
    const metadataSeed = authUser.user_metadata?.preferred_username
      || authUser.user_metadata?.user_name
      || authUser.user_metadata?.full_name
      || authUser.user_metadata?.name
      || authUser.email?.split('@')[0]
      || 'membre';
    const requestedUsername = options.username ? normalizeUsername(options.username) : '';
    const username = await availableUsername(requestedUsername || String(metadataSeed), authUser.id);
    const name = options.name?.trim().slice(0, 80) || authDisplayName(authUser);
    const { error: insertError } = await supabaseAdmin.from('profiles').insert({
      id: authUser.id,
      email: null,
      name,
      username,
      avatar: authAvatar(authUser),
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (insertError) throw insertError;
  }

  const metadata = authUser.user_metadata || {};
  const { error: privateError } = await supabaseAdmin.from('account_private').upsert({
    user_id: authUser.id,
    first_name: options.firstName?.trim() || metadata.first_name || null,
    last_name: options.lastName?.trim() || metadata.last_name || null,
    ...(options.profileComplete ? { profile_completed_at: new Date().toISOString() } : {}),
  }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (privateError && !profileTableUnavailable(privateError)) throw privateError;
  if (!profileTableUnavailable(privateError)) {
    const privatePatch: Record<string, unknown> = {
      mfa_enabled: hasVerifiedMobileMfaFactor(authUser),
    };
    if (authUser.email) privatePatch.email = authUser.email.toLowerCase();
    const { error: privateSyncError } = await supabaseAdmin
      .from('account_private')
      .update(privatePatch)
      .eq('user_id', authUser.id);
    if (privateSyncError) throw privateSyncError;
  }

  const profile = await getMobileAuthUser(authUser.id, authUser);
  if (!profile) throw new Error('Profil utilisateur introuvable');
  return profile;
}

export async function getMobileAuthUser(
  userId: string,
  suppliedAuthUser?: User | null,
): Promise<MobileAuthUser | null> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, name, username, avatar, role, is_verified')
    .eq('id', userId)
    .single();

  if (error || !profile) return null;
  const authUser = suppliedAuthUser
    || (await supabaseAdmin.auth.admin.getUserById(userId)).data.user
    || null;
  const { data: privateAccount, error: privateError } = await supabaseAdmin
    .from('account_private')
    .select('profile_completed_at')
    .eq('user_id', userId)
    .maybeSingle();
  return {
    id: profile.id,
    email: authUser?.email || profile.email,
    phone: authUser?.phone || null,
    name: profile.name,
    username: profile.username,
    avatar: profile.avatar,
    role: profile.role,
    isVerified: Boolean(profile.is_verified),
    emailVerified: Boolean(authUser?.email_confirmed_at),
    phoneVerified: Boolean(authUser?.phone_confirmed_at),
    profileComplete: profileTableUnavailable(privateError)
      ? true
      : Boolean(privateAccount?.profile_completed_at),
    providers: userProviders(authUser),
  };
}

export function mobileSessionPayload(session: Session, user: MobileAuthUser) {
  const factors = getMobileMfaFactors(session.user);
  const assuranceLevel = readAuthenticatorAssuranceLevel(session.access_token);
  return {
    user,
    token: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at || Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600),
    assuranceLevel,
    mfaRequired: mobileSessionRequiresMfa(session.access_token, session.user),
    mfaFactors: factors,
  };
}

export function sessionFromMfaVerification(data: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: User;
}): Session {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    token_type: 'bearer',
    user: data.user,
  };
}

export function readAuthenticatorAssuranceLevel(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return payload?.aal === 'aal2' ? 'aal2' : 'aal1';
  } catch {
    return 'aal1';
  }
}
