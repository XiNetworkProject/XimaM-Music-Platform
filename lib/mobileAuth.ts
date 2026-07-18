import { createClient, type Session } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

export type MobileAuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
  role?: string | null;
  isVerified?: boolean;
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

export async function getMobileAuthUser(userId: string): Promise<MobileAuthUser | null> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, name, username, avatar, role, is_verified')
    .eq('id', userId)
    .single();

  if (error || !profile) return null;
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    username: profile.username,
    avatar: profile.avatar,
    role: profile.role,
    isVerified: Boolean(profile.is_verified),
  };
}

export function mobileSessionPayload(session: Session, user: MobileAuthUser) {
  return {
    user,
    token: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at || Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600),
  };
}
