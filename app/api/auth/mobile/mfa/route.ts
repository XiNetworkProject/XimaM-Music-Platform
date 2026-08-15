import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneNumber } from '@/lib/accountIdentity';
import {
  elevateMobileSession,
  getMobileSessionPayload,
  readAuthenticatorAssuranceLevel,
  verifyMobileAccessToken,
} from '@/lib/mobileAuth';
import {
  challengeLocalPhoneFactor,
  createMfaChallenge,
  enrollLocalPhoneFactor,
  enrollLocalTotpFactor,
  getMobileMfaFactor,
  listMobileMfaFactors,
  removeMobileMfaFactor,
  upsertMobilePrivateAccount,
  verifyLocalPhoneFactor,
  verifyMfaChallenge,
} from '@/lib/mobileAuthSecurity';

export const dynamic = 'force-dynamic';

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  return authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
}

export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  const verified = token ? await verifyMobileAccessToken(token).catch(() => null) : null;
  if (!verified) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  const factors = await listMobileMfaFactors(verified.userId);
  const currentLevel = readAuthenticatorAssuranceLevel(token);
  return NextResponse.json({
    success: true,
    data: {
      currentLevel,
      nextLevel: currentLevel === 'aal2' || factors.some((factor) => factor.status === 'verified') ? 'aal2' : 'aal1',
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
    const [verified, session] = await Promise.all([
      verifyMobileAccessToken(token).catch(() => null),
      getMobileSessionPayload(token, refreshToken).catch(() => null),
    ]);
    if (!verified || !session) return NextResponse.json({ error: 'Session invalide' }, { status: 401 });

    if (action === 'enroll-totp') {
      if (!verified.authorized) {
        return NextResponse.json({ error: 'Verification 2FA requise', code: 'MFA_REQUIRED' }, { status: 403 });
      }
      const factor = await enrollLocalTotpFactor(verified.userId);
      const challenge = await createMfaChallenge(verified.userId, verified.sessionId, factor.factorId);
      if (!challenge) throw new Error('Challenge TOTP non cree');
      return NextResponse.json({
        success: true,
        data: {
          factorId: factor.factorId,
          factorType: 'totp',
          challengeId: challenge.challengeId,
          expiresAt: challenge.expiresAt,
          qrCode: factor.qrCode,
          secret: factor.secret,
          uri: factor.uri,
          session,
        },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    if (action === 'enroll') {
      if (!verified.authorized) {
        return NextResponse.json({ error: 'Verification 2FA requise', code: 'MFA_REQUIRED' }, { status: 403 });
      }
      const phone = normalizePhoneNumber(body?.phone);
      if (!phone) return NextResponse.json({ error: 'Numero de telephone invalide' }, { status: 400 });
      const enrollment = await enrollLocalPhoneFactor(verified.userId, phone);
      return NextResponse.json({
        success: true,
        data: { ...enrollment, factorType: 'phone', session },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const factorId = typeof body?.factorId === 'string' ? body.factorId : '';
    const factor = factorId ? await getMobileMfaFactor(verified.userId, factorId) : null;
    if (!factor) return NextResponse.json({ error: 'Facteur 2FA introuvable' }, { status: 404 });

    if (action === 'challenge') {
      if (factor.factor_type === 'phone') {
        const challenge = await challengeLocalPhoneFactor(verified.userId, factorId);
        if (!challenge) return NextResponse.json({ error: 'SMS 2FA impossible' }, { status: 400 });
        return NextResponse.json({
          success: true,
          data: { factorId, factorType: 'phone', ...challenge, session },
        }, { headers: { 'Cache-Control': 'private, no-store' } });
      }
      const challenge = await createMfaChallenge(verified.userId, verified.sessionId, factorId);
      if (!challenge) return NextResponse.json({ error: 'Verification 2FA impossible' }, { status: 400 });
      return NextResponse.json({
        success: true,
        data: {
          factorId,
          factorType: 'totp',
          challengeId: challenge.challengeId,
          expiresAt: challenge.expiresAt,
          session,
        },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    if (action === 'verify') {
      const challengeId = typeof body?.challengeId === 'string' ? body.challengeId : '';
      const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : '';
      if (!challengeId || code.length !== 6) {
        return NextResponse.json({ error: 'Code 2FA invalide' }, { status: 400 });
      }
      const valid = factor.factor_type === 'phone'
        ? await verifyLocalPhoneFactor(verified.userId, factorId, challengeId, code)
        : await verifyMfaChallenge({
          userId: verified.userId,
          sessionId: verified.sessionId,
          factorId,
          challengeId,
          code,
        });
      if (!valid) return NextResponse.json({ error: 'Code 2FA expire ou incorrect' }, { status: 401 });
      await upsertMobilePrivateAccount(verified.userId, { mfaEnabled: true });
      const elevated = await elevateMobileSession(token);
      if (!elevated) return NextResponse.json({ error: 'Session MFA invalide' }, { status: 401 });
      return NextResponse.json({ success: true, data: { session: elevated } }, {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    if (action === 'unenroll') {
      if (!verified.authorized) {
        return NextResponse.json({ error: 'Verification 2FA requise', code: 'MFA_REQUIRED' }, { status: 403 });
      }
      const removed = await removeMobileMfaFactor(verified.userId, factorId);
      if (!removed) return NextResponse.json({ error: 'Facteur 2FA introuvable' }, { status: 404 });
      return NextResponse.json({
        success: true,
        data: { factors: await listMobileMfaFactors(verified.userId), session },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    return NextResponse.json({ error: 'Action 2FA inconnue' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('UNAVAILABLE') || message.includes('SMS_')) {
      return NextResponse.json({ error: 'Cette methode 2FA n’est pas configuree' }, { status: 503 });
    }
    console.error('[mobile mfa]', error);
    return NextResponse.json({ error: 'Operation 2FA impossible' }, { status: 500 });
  }
}
