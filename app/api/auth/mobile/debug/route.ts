import { NextRequest, NextResponse } from 'next/server';
import { diagnosticsEnabled } from '@/lib/diagnostics';
import { getMobileAuthUser, verifyMobileAccessToken } from '@/lib/mobileAuth';

export async function GET(req: NextRequest) {
  if (!diagnosticsEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const authorization = req.headers.get('authorization');
  const xAuth = req.headers.get('x-auth-token');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : xAuth?.trim() || '';
  const received = { authorization: Boolean(authorization?.startsWith('Bearer ')), xAuthToken: Boolean(xAuth) };
  if (!token) {
    return NextResponse.json({ received, tokenLength: 0, verify: 'no_token', error: 'Aucun token recu' });
  }
  const verified = await verifyMobileAccessToken(token).catch(() => null);
  if (!verified) {
    return NextResponse.json({ received, tokenLength: token.length, verify: 'invalid', error: 'Jeton ou session invalide' });
  }
  const profile = await getMobileAuthUser(verified.userId);
  if (!profile) {
    return NextResponse.json({ received, tokenLength: token.length, verify: 'profile_not_found', error: 'Profil introuvable' });
  }
  return NextResponse.json({
    received,
    tokenLength: token.length,
    verify: 'ok',
    userId: verified.userId,
    assuranceLevel: verified.assuranceLevel,
    mfaRequired: verified.mfaRequired,
  });
}

export const dynamic = 'force-dynamic';
