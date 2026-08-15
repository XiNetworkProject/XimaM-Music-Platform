/**
 * Session pour les routes API : cookie (web) ou Bearer JWT (mobile).
 * Utilisé par /api/ai/* et /api/suno/* pour accepter le token mobile.
 */
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getLocalProfileById } from '@/lib/localAuth';
import { verifyMobileAccessToken } from '@/lib/mobileAuth';

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
    const verified = await verifyMobileAccessToken(t);
    const userId = verified?.authorized ? verified.userId : '';
    if (!userId) return null;
    const profile = await getLocalProfileById(userId);
    if (!profile) return null;
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
  // Tokens in URLs leak through logs and browser history; only headers are accepted.
  let token: string | null = null;
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) token = auth.slice(7).trim();
  if (!token) token = req.headers.get('x-auth-token');
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
