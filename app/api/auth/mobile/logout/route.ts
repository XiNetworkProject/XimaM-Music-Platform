import { NextRequest, NextResponse } from 'next/server';
import { revokeMobileSession, revokeOtherMobileSessions } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const body = await request.json().catch(() => null);
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
