import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/auth/mobile/debug
 * Diagnostic : indique si le token est reçu et s'il est valide (pour débug "Non authentifié").
 * À appeler avec le même Bearer / X-Auth-Token que les autres routes.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const xAuth = req.headers.get('x-auth-token');
  const queryToken = req.nextUrl.searchParams.get('access_token');

  let token: string | null = null;
  if (auth?.startsWith('Bearer ')) token = auth.slice(7).trim();
  if (!token && xAuth) token = xAuth;
  if (!token && queryToken) token = queryToken;

  const authPresent = !!(auth?.startsWith('Bearer '));
  const xAuthPresent = !!xAuth;

  if (!token) {
    return NextResponse.json({
      received: { authorization: authPresent, xAuthToken: xAuthPresent, query: !!queryToken },
      tokenLength: 0,
      verify: 'no_token',
      error: 'Aucun token reçu. Envoie Authorization: Bearer <token> ou X-Auth-Token ou ?access_token=',
    });
  }

  const secret = process.env.NEXTAUTH_SECRET || 'your-secret-key';
  let payload: { id?: string } | null = null;
  let verifyError: string | null = null;

  try {
    payload = jwt.verify(token, secret) as { id?: string };
  } catch (e: any) {
    verifyError = e?.message || 'invalid';
  }

  if (verifyError) {
    return NextResponse.json({
      received: { authorization: authPresent, xAuthToken: xAuthPresent, query: !!queryToken },
      tokenLength: token.length,
      verify: 'invalid',
      error: verifyError,
    });
  }

  const userId = payload?.id;
  if (!userId) {
    return NextResponse.json({
      received: { authorization: authPresent, xAuthToken: xAuthPresent, query: !!queryToken },
      tokenLength: token.length,
      verify: 'no_id',
      error: 'Le JWT ne contient pas d’id',
    });
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return NextResponse.json({
      received: { authorization: authPresent, xAuthToken: xAuthPresent, query: !!queryToken },
      tokenLength: token.length,
      verify: 'profile_not_found',
      error: error?.message || 'Profil non trouvé pour cet id',
    });
  }

  return NextResponse.json({
    received: { authorization: authPresent, xAuthToken: xAuthPresent, query: !!queryToken },
    tokenLength: token.length,
    verify: 'ok',
    userId,
  });
}
