import { createHash, randomBytes, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import {
  authenticateLocalPassword,
  getLocalProfileById,
  type LocalProfile,
} from '@/lib/localAuth';
import { queryDatabase, withDatabaseTransaction } from '@/lib/postgres';
import {
  getMobileIdentities,
  getMobilePrivateAccount,
  hasVerifiedMobileMfaFactor,
  listMobileMfaFactors,
  markSessionMfaVerified,
  sessionHasMfaVerification,
  type MobileMfaFactor,
} from '@/lib/mobileAuthSecurity';

export type MobileAuthUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
  role?: string | null;
  isVerified?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  profileComplete?: boolean;
  providers?: string[];
};

export type { MobileMfaFactor } from '@/lib/mobileAuthSecurity';

type AccessClaims = {
  sub: string;
  sid: string;
  type: 'access';
  aal?: 'aal1' | 'aal2';
  exp: number;
};

const ACCESS_TTL_SECONDS = 60 * 60;
const TOKEN_ISSUER = 'synaura';
const TOKEN_AUDIENCE = 'synaura-mobile';

function jwtSecret() {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) throw new Error('NEXTAUTH_SECRET est requis pour les sessions mobiles');
  return secret;
}

function refreshDigest(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function issueMobileAccessToken(
  userId: string,
  sessionId: string,
  assuranceLevel: 'aal1' | 'aal2' = 'aal1',
) {
  return jwt.sign(
    { sid: sessionId, type: 'access', aal: assuranceLevel },
    jwtSecret(),
    {
      algorithm: 'HS256',
      subject: userId,
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      expiresIn: ACCESS_TTL_SECONDS,
    },
  );
}

async function mobileSessionPayload(
  profile: LocalProfile,
  sessionId: string,
  refreshToken: string | null,
  assuranceLevel: 'aal1' | 'aal2',
) {
  const [user, mfaFactors] = await Promise.all([
    getMobileAuthUser(profile.id),
    listMobileMfaFactors(profile.id),
  ]);
  if (!user) throw new Error('Profil mobile introuvable');
  return {
    user,
    token: issueMobileAccessToken(profile.id, sessionId, assuranceLevel),
    refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS,
    assuranceLevel,
    mfaRequired: mfaFactors.some((factor) => factor.status === 'verified') && assuranceLevel !== 'aal2',
    mfaFactors,
  };
}

export async function createMobileSession(
  profile: LocalProfile,
  context: { userAgent?: string | null; ip?: string | null } = {},
) {
  const sessionId = randomUUID();
  const refreshToken = randomBytes(48).toString('base64url');
  await withDatabaseTransaction(async (client) => {
    await queryDatabase(`
      INSERT INTO auth.sessions (
        id, user_id, created_at, updated_at, not_after, refreshed_at, user_agent, ip
      ) VALUES (
        $1::uuid, $2::uuid, now(), now(), now() + interval '30 days', now(), $3, $4::inet
      )
    `, [sessionId, profile.id, context.userAgent || null, context.ip || null], client);
    await queryDatabase(`
      INSERT INTO auth.refresh_tokens (
        token, user_id, revoked, created_at, updated_at, session_id
      ) VALUES ($1, $2, false, now(), now(), $3::uuid)
    `, [refreshDigest(refreshToken), profile.id, sessionId], client);
  });
  return mobileSessionPayload(profile, sessionId, refreshToken, 'aal1');
}

export async function signInMobilePassword(
  email: string,
  password: string,
  context: { userAgent?: string | null; ip?: string | null } = {},
) {
  const profile = await authenticateLocalPassword(email, password);
  if (!profile) return null;
  return createMobileSession(profile, context);
}

export async function refreshMobileSession(refreshToken: string) {
  const oldDigest = refreshDigest(refreshToken);
  return withDatabaseTransaction(async (client) => {
    const current = await queryDatabase<{ session_id: string; user_id: string }>(`
      SELECT refresh.session_id, refresh.user_id
      FROM auth.refresh_tokens refresh
      JOIN auth.sessions session ON session.id = refresh.session_id
      JOIN auth.users users ON users.id::text = refresh.user_id
      WHERE refresh.token = $1
        AND refresh.revoked = false
        AND users.deleted_at IS NULL
        AND (session.not_after IS NULL OR session.not_after > now())
      LIMIT 1
      FOR UPDATE OF refresh
    `, [oldDigest], client);
    const row = current.rows[0];
    if (!row) return null;
    const profile = await getLocalProfileById(row.user_id, client);
    if (!profile) return null;

    const nextRefreshToken = randomBytes(48).toString('base64url');
    await queryDatabase(
      'UPDATE auth.refresh_tokens SET revoked = true, updated_at = now() WHERE token = $1',
      [oldDigest],
      client,
    );
    await queryDatabase(`
      INSERT INTO auth.refresh_tokens (
        token, user_id, revoked, created_at, updated_at, parent, session_id
      ) VALUES ($1, $2, false, now(), now(), $3, $4::uuid)
    `, [refreshDigest(nextRefreshToken), row.user_id, oldDigest, row.session_id], client);
    await queryDatabase(
      'UPDATE auth.sessions SET refreshed_at = now(), updated_at = now() WHERE id = $1::uuid',
      [row.session_id],
      client,
    );
    const assuranceLevel = await sessionHasMfaVerification(row.session_id, client) ? 'aal2' : 'aal1';
    return mobileSessionPayload(profile, row.session_id, nextRefreshToken, assuranceLevel);
  });
}

export async function verifyMobileAccessToken(token: string) {
  const claims = jwt.verify(token, jwtSecret(), {
    algorithms: ['HS256'],
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  }) as AccessClaims;
  if (claims.type !== 'access' || !claims.sub || !claims.sid) return null;
  const active = await queryDatabase<{ active: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM auth.sessions session
      JOIN auth.users users ON users.id = session.user_id
      WHERE session.id = $1::uuid
        AND session.user_id = $2::uuid
        AND users.deleted_at IS NULL
        AND (session.not_after IS NULL OR session.not_after > now())
    ) AS active
  `, [claims.sid, claims.sub]);
  if (!active.rows[0]?.active) return null;
  const assuranceLevel: 'aal1' | 'aal2' = claims.aal === 'aal2' ? 'aal2' : 'aal1';
  const mfaRequired = await hasVerifiedMobileMfaFactor(claims.sub) && assuranceLevel !== 'aal2';
  return {
    userId: claims.sub,
    sessionId: claims.sid,
    assuranceLevel,
    mfaRequired,
    authorized: !mfaRequired,
    expiresAt: claims.exp,
  };
}

export async function revokeMobileSession(token: string) {
  let claims: AccessClaims;
  try {
    claims = jwt.verify(token, jwtSecret(), {
      algorithms: ['HS256'],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      ignoreExpiration: true,
    }) as AccessClaims;
  } catch {
    return false;
  }
  if (claims.type !== 'access' || !claims.sid || !claims.sub) return false;
  await withDatabaseTransaction(async (client) => {
    await queryDatabase(
      'UPDATE auth.refresh_tokens SET revoked = true, updated_at = now() WHERE session_id = $1::uuid',
      [claims.sid],
      client,
    );
    await queryDatabase(
      'UPDATE auth.sessions SET not_after = now(), updated_at = now() WHERE id = $1::uuid AND user_id = $2::uuid',
      [claims.sid, claims.sub],
      client,
    );
  });
  return true;
}

export async function getMobileAuthUser(userId: string): Promise<MobileAuthUser | null> {
  const profile = await getLocalProfileById(userId);
  if (!profile) return null;
  const [authResult, privateAccount, identities] = await Promise.all([
    queryDatabase<{
      email: string | null;
      phone: string | null;
      email_confirmed_at: string | null;
      phone_confirmed_at: string | null;
    }>(`
      SELECT email, phone, email_confirmed_at, phone_confirmed_at
      FROM auth.users
      WHERE id = $1::uuid AND deleted_at IS NULL
      LIMIT 1
    `, [userId]),
    getMobilePrivateAccount(userId),
    getMobileIdentities(userId),
  ]);
  const authUser = authResult.rows[0];
  return {
    id: profile.id,
    email: authUser?.email || profile.email,
    phone: authUser?.phone || null,
    name: profile.name,
    username: profile.username,
    avatar: profile.avatar,
    role: profile.role,
    isVerified: Boolean(profile.is_verified),
    emailVerified: Boolean(authUser?.email_confirmed_at),
    phoneVerified: Boolean(authUser?.phone_confirmed_at),
    profileComplete: privateAccount.profileComplete,
    providers: Array.from(new Set(identities.map((identity) => identity.provider))),
  };
}

export function readAuthenticatorAssuranceLevel(token: string) {
  try {
    const payload = jwt.decode(token) as AccessClaims | null;
    return payload?.aal === 'aal2' ? 'aal2' : 'aal1';
  } catch {
    return 'aal1';
  }
}

export async function elevateMobileSession(token: string) {
  const verified = await verifyMobileAccessToken(token);
  if (!verified) return null;
  await markSessionMfaVerified(verified.sessionId);
  const profile = await getLocalProfileById(verified.userId);
  if (!profile) return null;
  return mobileSessionPayload(profile, verified.sessionId, null, 'aal2');
}

export async function getMobileSessionPayload(accessTokenValue: string, refreshTokenValue: string) {
  const verified = await verifyMobileAccessToken(accessTokenValue);
  if (!verified) return null;
  const refresh = await queryDatabase<{ valid: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM auth.refresh_tokens
      WHERE token = $1 AND session_id = $2::uuid AND user_id = $3 AND revoked = false
    ) AS valid
  `, [refreshDigest(refreshTokenValue), verified.sessionId, verified.userId]);
  if (!refresh.rows[0]?.valid) return null;
  const profile = await getLocalProfileById(verified.userId);
  if (!profile) return null;
  const payload = await mobileSessionPayload(
    profile,
    verified.sessionId,
    refreshTokenValue,
    verified.assuranceLevel,
  );
  return { ...payload, token: accessTokenValue, expiresAt: verified.expiresAt };
}

export async function revokeOtherMobileSessions(token: string) {
  const verified = await verifyMobileAccessToken(token);
  if (!verified?.authorized) return false;
  await withDatabaseTransaction(async (client) => {
    await queryDatabase(`
      UPDATE auth.refresh_tokens
      SET revoked = true, updated_at = now()
      WHERE user_id = $1 AND session_id <> $2::uuid
    `, [verified.userId, verified.sessionId], client);
    await queryDatabase(`
      UPDATE auth.sessions
      SET not_after = now(), updated_at = now()
      WHERE user_id = $1::uuid AND id <> $2::uuid
    `, [verified.userId, verified.sessionId], client);
  });
  return true;
}
