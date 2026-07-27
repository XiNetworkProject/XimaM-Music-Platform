import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneNumber } from '@/lib/accountIdentity';
import {
  createMobileAuthClient,
  getMobileAuthUser,
  getMobileMfaFactors,
  hasVerifiedMobileMfaFactor,
  mobileSessionPayload,
  readAuthenticatorAssuranceLevel,
  sessionFromMfaVerification,
} from '@/lib/mobileAuth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  return authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
}

export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: 'Session invalide' }, { status: 401 });

  const factors = getMobileMfaFactors(data.user);
  const currentLevel = readAuthenticatorAssuranceLevel(token);
  return NextResponse.json({
    success: true,
    data: {
      currentLevel,
      nextLevel: currentLevel === 'aal2' || factors.some((factor) => factor.status === 'verified')
        ? 'aal2'
        : 'aal1',
      factors,
    },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest) {
  try {
    const token = bearerToken(request);
    const body = await request.json().catch(() => null);
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken.trim() : '';
    const action = typeof body?.action === 'string' ? body.action : '';
    if (!token || !refreshToken) {
      return NextResponse.json({ error: 'Session incomplete' }, { status: 401 });
    }

    const authClient = createMobileAuthClient();
    const { data: sessionData, error: sessionError } = await authClient.auth.setSession({
      access_token: token,
      refresh_token: refreshToken,
    });
    if (sessionError || !sessionData.session || !sessionData.user) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }
    const user = await getMobileAuthUser(sessionData.user.id, sessionData.user);
    if (!user) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });

    if (action === 'enroll-totp') {
      const staleFactors = (sessionData.user.factors || []).filter(
        (factor) => factor.factor_type === 'totp' && factor.status === 'unverified',
      );
      await Promise.all(
        staleFactors.map((factor) => authClient.auth.mfa.unenroll({ factorId: factor.id })),
      );

      const { data: factor, error: enrollError } = await authClient.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Synaura',
        friendlyName: 'Synaura Authenticator',
      });
      if (enrollError || !factor) {
        return NextResponse.json(
          { error: enrollError?.message || 'Activation 2FA impossible' },
          { status: 400 },
        );
      }
      const { data: challenge, error: challengeError } = await authClient.auth.mfa.challenge({
        factorId: factor.id,
      });
      if (challengeError || !challenge) {
        await authClient.auth.mfa.unenroll({ factorId: factor.id }).catch(() => undefined);
        return NextResponse.json(
          { error: challengeError?.message || 'Initialisation 2FA impossible' },
          { status: 400 },
        );
      }
      return NextResponse.json({
        success: true,
        data: {
          factorId: factor.id,
          factorType: 'totp',
          challengeId: challenge.id,
          expiresAt: challenge.expires_at,
          qrCode: factor.totp.qr_code,
          secret: factor.totp.secret,
          uri: factor.totp.uri,
          session: mobileSessionPayload(sessionData.session, user),
        },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    if (action === 'enroll') {
      const phone = normalizePhoneNumber(body?.phone);
      if (!phone) return NextResponse.json({ error: 'Numero de telephone invalide' }, { status: 400 });
      const { data: factor, error: enrollError } = await authClient.auth.mfa.enroll({
        factorType: 'phone',
        phone,
        friendlyName: 'Synaura SMS',
      });
      if (enrollError || !factor) {
        return NextResponse.json({ error: enrollError?.message || 'Activation 2FA impossible' }, { status: 400 });
      }
      const { data: challenge, error: challengeError } = await authClient.auth.mfa.challenge({
        factorId: factor.id,
        channel: 'sms',
      });
      if (challengeError || !challenge) {
        await authClient.auth.mfa.unenroll({ factorId: factor.id }).catch(() => undefined);
        return NextResponse.json({ error: challengeError?.message || 'SMS 2FA impossible' }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        data: {
          factorId: factor.id,
          factorType: 'phone',
          challengeId: challenge.id,
          expiresAt: challenge.expires_at,
          phone,
          session: mobileSessionPayload(sessionData.session, user),
        },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const factorId = typeof body?.factorId === 'string' ? body.factorId : '';
    const factor = sessionData.user.factors?.find((candidate) => candidate.id === factorId);
    if (!factor) return NextResponse.json({ error: 'Facteur 2FA introuvable' }, { status: 404 });

    if (action === 'challenge') {
      const factorType = factor.factor_type === 'phone' ? 'phone' : 'totp';
      const { data: challenge, error } = await authClient.auth.mfa.challenge(
        factorType === 'phone'
          ? { factorId, channel: 'sms' }
          : { factorId },
      );
      if (error || !challenge) {
        return NextResponse.json(
          { error: error?.message || 'Verification 2FA impossible' },
          { status: 400 },
        );
      }
      return NextResponse.json({
        success: true,
        data: {
          factorId,
          factorType,
          challengeId: challenge.id,
          expiresAt: challenge.expires_at,
          session: mobileSessionPayload(sessionData.session, user),
        },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    if (action === 'verify') {
      const challengeId = typeof body?.challengeId === 'string' ? body.challengeId : '';
      const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : '';
      if (!challengeId || code.length !== 6) {
        return NextResponse.json({ error: 'Code 2FA invalide' }, { status: 400 });
      }
      const { data: verified, error } = await authClient.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });
      if (error || !verified) {
        return NextResponse.json({ error: 'Code 2FA expire ou incorrect' }, { status: 401 });
      }
      const verifiedSession = sessionFromMfaVerification(verified);
      const { error: mfaStateError } = await supabaseAdmin
        .from('account_private')
        .update({ mfa_enabled: true })
        .eq('user_id', verified.user.id);
      if (mfaStateError) throw mfaStateError;
      const verifiedUser = await getMobileAuthUser(verified.user.id, verified.user);
      if (!verifiedUser) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
      return NextResponse.json({
        success: true,
        data: { session: mobileSessionPayload(verifiedSession, verifiedUser) },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    if (action === 'unenroll') {
      const { error } = await authClient.auth.mfa.unenroll({ factorId });
      if (error) {
        return NextResponse.json({ error: error.message || 'Desactivation 2FA impossible' }, { status: 400 });
      }
      const { data: refreshedUser } = await authClient.auth.getUser();
      const { error: mfaStateError } = await supabaseAdmin
        .from('account_private')
        .update({ mfa_enabled: hasVerifiedMobileMfaFactor(refreshedUser.user) })
        .eq('user_id', sessionData.user.id);
      if (mfaStateError) throw mfaStateError;
      return NextResponse.json({
        success: true,
        data: {
          factors: getMobileMfaFactors(refreshedUser.user),
          session: mobileSessionPayload(sessionData.session, user),
        },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    return NextResponse.json({ error: 'Action 2FA inconnue' }, { status: 400 });
  } catch (error) {
    console.error('[mobile mfa]', error);
    return NextResponse.json({ error: 'Operation 2FA impossible' }, { status: 500 });
  }
}
