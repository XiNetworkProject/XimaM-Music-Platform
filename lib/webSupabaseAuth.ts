import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createMobileAuthClient, getMobileMfaFactors } from '@/lib/mobileAuth';
import { supabaseAdmin } from '@/lib/supabase';

export type WebSupabaseSession = {
  authClient: SupabaseClient;
  user: User;
};

export async function createWebSupabaseSession(userId: string): Promise<WebSupabaseSession> {
  const { data: authData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
  const authUser = authData.user;
  if (userError || !authUser?.email) {
    throw new Error('Compte Supabase ou adresse email introuvable');
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: authUser.email,
  });
  const tokenHash = linkData.properties?.hashed_token;
  if (linkError || !tokenHash) {
    throw new Error(linkError?.message || 'Session de securite impossible');
  }

  const authClient = createMobileAuthClient();
  const { data: verified, error: verifyError } = await authClient.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  });
  if (verifyError || !verified.user || !verified.session || verified.user.id !== userId) {
    throw new Error(verifyError?.message || 'Session de securite invalide');
  }

  return { authClient, user: verified.user };
}

export async function getWebAuthUser(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error('Compte Supabase introuvable');
  return data.user;
}

export async function syncWebMfaState(user: User) {
  const factors = getMobileMfaFactors(user);
  const enabled = factors.some((factor) => factor.status === 'verified');
  const { error } = await supabaseAdmin
    .from('account_private')
    .upsert({
      user_id: user.id,
      ...(user.email ? { email: user.email.toLowerCase() } : {}),
      mfa_enabled: enabled,
    }, { onConflict: 'user_id' });
  if (error) throw error;
  return { enabled, factors };
}
