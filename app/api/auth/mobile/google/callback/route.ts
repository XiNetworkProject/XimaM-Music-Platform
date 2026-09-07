import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getLocalProfileById } from '@/lib/localAuth';
import { createMobileSession } from '@/lib/mobileAuth';
import { MOBILE_AUTH_CALLBACK_URL } from '@/lib/accountIdentity';
import { enforceRequestRateLimit } from '@/lib/security/requestSecurity';

export const dynamic = 'force-dynamic';

function mobileRedirect(parameters: Record<string, string>) {
  const query = new URLSearchParams(parameters).toString();
  const separator = parameters.access_token || parameters.refresh_token ? '#' : '?';
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${MOBILE_AUTH_CALLBACK_URL}${separator}${query}`,
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function GET(request: Request) {
  try {
    const limited = enforceRequestRateLimit(request, 'auth-mobile-google-callback-ip', 20, 10 * 60_000);
    if (limited) return limited;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return mobileRedirect({ error: 'google_session_missing' });
    const profile = await getLocalProfileById(userId);
    if (!profile) return mobileRedirect({ error: 'google_profile_missing' });
    const data = await createMobileSession(profile, {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    });
    return mobileRedirect({
      access_token: data.token,
      refresh_token: data.refreshToken || '',
    });
  } catch {
    console.error('[mobile google callback] finalisation impossible');
    return mobileRedirect({ error: 'google_callback_failed' });
  }
}
