import { NextRequest, NextResponse } from 'next/server';
import { getMobileAuthUser, verifyMobileAccessToken } from '@/lib/mobileAuth';
import { listMobileMfaFactors } from '@/lib/mobileAuthSecurity';

/** GET /api/auth/mobile/me — Vérifie que le token Bearer est valide et retourne le profil (pour debug / sync). */
export async function GET(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const verified = token ? await verifyMobileAccessToken(token).catch(() => null) : null;
  if (!verified?.userId) {
    return NextResponse.json(
      { error: 'Non authentifié', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }
  const [user, mfaFactors] = await Promise.all([
    getMobileAuthUser(verified.userId),
    listMobileMfaFactors(verified.userId),
  ]);
  if (!user) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
  return NextResponse.json({
    success: true,
    user,
    mfaFactors,
    mfaRequired: verified.mfaRequired,
    assuranceLevel: verified.assuranceLevel,
  });
}

export const dynamic = 'force-dynamic';
