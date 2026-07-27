import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getMobileMfaFactors } from '@/lib/mobileAuth';
import { supabaseAdmin } from '@/lib/supabase';
import {
  WEB_MFA_COOKIE,
  WEB_MFA_MAX_AGE_SECONDS,
  createWebMfaMarker,
} from '@/lib/webMfaMarker';
import {
  createWebSupabaseSession,
  getWebAuthUser,
  syncWebMfaState,
} from '@/lib/webSupabaseAuth';

export const dynamic = 'force-dynamic';

async function webIdentity(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  const token = await getToken({
    req: request,
    secret,
    secureCookie: process.env.NODE_ENV === 'production',
  });
  const userId = typeof token?.id === 'string' ? token.id : '';
  const sessionId = typeof token?.authSessionId === 'string'
    ? token.authSessionId
    : `${typeof token?.sub === 'string' ? token.sub : userId}:${typeof token?.iat === 'number' ? token.iat : 0}`;
  return userId && sessionId ? { userId, sessionId, secret } : null;
}

function privateResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

function setVerifiedMarker(
  response: NextResponse,
  marker: string,
) {
  response.cookies.set(WEB_MFA_COOKIE, marker, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: WEB_MFA_MAX_AGE_SECONDS,
  });
}

function clearVerifiedMarker(response: NextResponse) {
  response.cookies.set(WEB_MFA_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function GET(request: NextRequest) {
  try {
    const identity = await webIdentity(request);
    if (!identity) return privateResponse({ error: 'Non authentifié' }, 401);

    const user = await getWebAuthUser(identity.userId);
    const { enabled, factors } = await syncWebMfaState(user);
    return privateResponse({
      success: true,
      data: {
        required: enabled,
        factors,
      },
    });
  } catch (error) {
    console.error('[web mfa get]', error);
    return privateResponse({ error: 'État 2FA indisponible' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = await webIdentity(request);
    if (!identity) return privateResponse({ error: 'Non authentifié' }, 401);

    const body = await request.json().catch(() => null);
    const action = typeof body?.action === 'string' ? body.action : '';
    const factorId = typeof body?.factorId === 'string' ? body.factorId : '';
    const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : '';

    if (action === 'enroll-totp') {
      const { authClient, user } = await createWebSupabaseSession(identity.userId);
      const staleFactors = (user.factors || []).filter(
        (factor) => factor.factor_type === 'totp' && factor.status === 'unverified',
      );
      await Promise.all(
        staleFactors.map((factor) => authClient.auth.mfa.unenroll({ factorId: factor.id })),
      );

      const { data: factor, error } = await authClient.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Synaura',
        friendlyName: 'Synaura Authenticator',
      });
      if (error || !factor) {
        return privateResponse({ error: error?.message || 'Activation 2FA impossible' }, 400);
      }
      return privateResponse({
        success: true,
        data: {
          factorId: factor.id,
          qrCode: factor.totp.qr_code,
          secret: factor.totp.secret,
          uri: factor.totp.uri,
        },
      });
    }

    if (!factorId) return privateResponse({ error: 'Facteur 2FA introuvable' }, 400);
    const authUser = await getWebAuthUser(identity.userId);
    const factor = authUser.factors?.find((candidate) => candidate.id === factorId);
    if (!factor || factor.factor_type !== 'totp') {
      return privateResponse({ error: 'Facteur TOTP introuvable' }, 404);
    }

    if (action === 'cancel-enrollment') {
      if (factor.status !== 'unverified') {
        return privateResponse({ error: 'Ce facteur est déjà actif' }, 400);
      }
      const { authClient } = await createWebSupabaseSession(identity.userId);
      const { error } = await authClient.auth.mfa.unenroll({ factorId });
      if (error) return privateResponse({ error: error.message }, 400);
      return privateResponse({ success: true });
    }

    if (code.length !== 6) {
      return privateResponse({ error: 'Entre le code à 6 chiffres' }, 400);
    }

    const { authClient } = await createWebSupabaseSession(identity.userId);
    const { data: verified, error: verifyError } = await authClient.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (verifyError || !verified) {
      return privateResponse({ error: 'Code expiré ou incorrect' }, 401);
    }

    if (action === 'unenroll') {
      const { error } = await authClient.auth.mfa.unenroll({ factorId });
      if (error) return privateResponse({ error: error.message || 'Désactivation impossible' }, 400);
      const refreshed = await getWebAuthUser(identity.userId);
      const state = await syncWebMfaState(refreshed);
      const response = privateResponse({
        success: true,
        data: { required: state.enabled, factors: state.factors },
      });
      clearVerifiedMarker(response);
      return response;
    }

    if (action !== 'verify') {
      return privateResponse({ error: 'Action 2FA inconnue' }, 400);
    }

    const { error: stateError } = await supabaseAdmin
      .from('account_private')
      .update({ mfa_enabled: true })
      .eq('user_id', identity.userId);
    if (stateError) throw stateError;

    const marker = await createWebMfaMarker(
      identity.userId,
      identity.sessionId,
      identity.secret,
    );
    const response = privateResponse({
      success: true,
      data: {
        required: true,
        factors: getMobileMfaFactors(verified.user),
      },
    });
    setVerifiedMarker(response, marker);
    return response;
  } catch (error) {
    console.error('[web mfa post]', error);
    return privateResponse({ error: 'Opération 2FA impossible' }, 500);
  }
}
