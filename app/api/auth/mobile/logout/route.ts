import { NextRequest, NextResponse } from 'next/server';
import { revokeMobileSession, revokeOtherMobileSessions } from '@/lib/mobileAuth';
import { enforceRequestRateLimit, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const originError = rejectUntrustedMutationOrigin(request);
  if (originError) return originError;
  const limited = enforceRequestRateLimit(request, 'auth-mobile-logout-ip', 30, 10 * 60_000);
  if (limited) return limited;
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const parsed = await readLimitedJson<any>(request, 4 * 1024, true);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;
  const scope = body?.scope === 'others' ? 'others' : 'local';
  if (token && scope === 'others') {
    const revoked = await revokeOtherMobileSessions(token).catch(() => false);
    if (!revoked) return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
  } else if (token) {
    await revokeMobileSession(token).catch(() => false);
  }
  return NextResponse.json({ success: true, data: { message: 'Deconnexion reussie' } }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
