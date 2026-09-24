import { voiceAccessPolicy, voiceUserAllowed } from './access.ts';

// Additional gate for the temporary HTTPS preview, never for the public site.
export function voicePreviewDecision(env: Record<string, string | undefined>, pathname: string, method: string, userId: string): 'allow' | 'login' | 'unauthorized' | 'forbidden' | 'unavailable' {
  if (env.SYNAURA_VOICE_PREVIEW !== 'true') return 'allow';
  const policy = voiceAccessPolicy(env);
  if (!policy || policy.mode !== 'private' || !env.NEXTAUTH_SECRET) return 'unavailable';
  // Only the credential sign-in flow is public. No signup, OAuth or API prefix bypass.
  const read = method === 'GET' || method === 'HEAD';
  const authRead = ['/auth/signin', '/auth/error', '/api/auth/csrf', '/api/auth/session', '/api/auth/providers', '/api/auth/signin', '/api/auth/error'];
  const authWrite = ['/api/auth/callback/credentials', '/api/auth/signout'];
  if ((read && authRead.includes(pathname)) || (method === 'POST' && authWrite.includes(pathname))) return 'allow';
  if (read && (/^\/(?:brand|images)\/[a-zA-Z0-9_./-]+\.(?:svg|png|jpg|jpeg|webp|avif)$/.test(pathname) || pathname === '/_next/image')) return 'allow';
  if (userId) return voiceUserAllowed(policy, userId) ? 'allow' : 'forbidden';
  return pathname.startsWith('/api/') || !read ? 'unauthorized' : 'login';
}
