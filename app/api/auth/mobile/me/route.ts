import { NextRequest, NextResponse } from 'next/server';
import {
  getMobileAuthUser,
  getMobileMfaFactors,
  readAuthenticatorAssuranceLevel,
} from '@/lib/mobileAuth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const { data, error } = token
    ? await supabaseAdmin.auth.getUser(token)
    : { data: { user: null }, error: new Error('Missing token') };
  if (error || !data.user) {
    return NextResponse.json(
      { error: 'Non authentifie', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }
  const user = await getMobileAuthUser(data.user.id, data.user);
  if (!user) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
  const factors = getMobileMfaFactors(data.user);
  const assuranceLevel = readAuthenticatorAssuranceLevel(token);
  return NextResponse.json({
    success: true,
    user,
    mfaFactors: factors,
    mfaRequired: assuranceLevel === 'aal1'
      && factors.some((factor) => factor.status === 'verified'),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
