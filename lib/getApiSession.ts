/**
 * Session pour les routes API : cookie (web) ou Bearer JWT (mobile).
 * Utilisé par /api/ai/* et /api/suno/* pour accepter le token mobile.
 */
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase';

export type ApiSessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  [key: string]: any;
};

export type ApiSession = { user: ApiSessionUser } | null;

/** Session à partir d’un token JWT (pour POST body depuis le mobile). */
export async function getSessionFromToken(token: string | null | undefined): Promise<ApiSession> {
  if (!token || typeof token !== 'string') return null;
  const t = token.trim();
  if (!t) return null;
  try {
    const secret = process.env.NEXTAUTH_SECRET || 'your-secret-key';
    const payload = jwt.verify(t, secret) as { id?: string; email?: string };
    const userId = payload?.id;
    if (!userId) return null;
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, name, username, avatar, role')
      .eq('id', userId)
      .single();
    if (error || !profile) return null;
    return {
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        username: profile.username,
        avatar: profile.avatar,
        role: profile.role,
      },
    };
  } catch {
    return null;
  }
}

export async function getApiSession(req: NextRequest): Promise<ApiSession> {
  // Token : Authorization > X-Auth-Token > query access_token (fallback)
  let token: string | null = null;
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) token = auth.slice(7).trim();
  if (!token) token = req.headers.get('x-auth-token');
  if (!token && req.nextUrl?.searchParams) token = req.nextUrl.searchParams.get('access_token');
  if (token) {
    const session = await getSessionFromToken(token);
    if (session && process.env.NODE_ENV === 'development') {
      console.log('[getApiSession] Bearer OK, userId=', session.user.id);
    }
    if (session) return session;
  }

  const cookieSession = await getServerSession(authOptions);
  if (cookieSession?.user?.id) return cookieSession as ApiSession;
  if (process.env.NODE_ENV === 'development') {
    const hasAuth = !!req.headers.get('authorization');
    const hasXAuth = !!req.headers.get('x-auth-token');
    console.log('[getApiSession] no session. has Authorization:', hasAuth, 'has X-Auth-Token:', hasXAuth);
  }
  return null;
}
