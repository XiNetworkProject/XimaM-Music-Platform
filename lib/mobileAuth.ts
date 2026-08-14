import { createHash, randomBytes, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import {
  authenticateLocalPassword,
  getLocalProfileById,
  type LocalProfile,
} from '@/lib/localAuth';
import { queryDatabase, withDatabaseTransaction } from '@/lib/postgres';

export type MobileAuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
  role?: string | null;
  isVerified?: boolean;
};

type AccessClaims = {
  sub: string;
  sid: string;
  type: 'access';
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

function mobileUser(profile: LocalProfile): MobileAuthUser {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    username: profile.username,
    avatar: profile.avatar,
    role: profile.role,
    isVerified: Boolean(profile.is_verified),
  };
}

function accessToken(userId: string, sessionId: string) {
  return jwt.sign(
    { sid: sessionId, type: 'access' },
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

export async function createMobileSession(
  profile: LocalProfile,
  context: { userAgent?: string | null; ip?: string | null } = {},
) {
  const sessionId = randomUUID();
  const refreshToken = randomBytes(48).toString('base64url');
  const expiresAt = Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS;
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
  return {
    user: mobileUser(profile),
    token: accessToken(profile.id, sessionId),
    refreshToken,
    expiresAt,
  };
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
    return {
      user: mobileUser(profile),
      token: accessToken(profile.id, row.session_id),
      refreshToken: nextRefreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS,
    };
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
  return active.rows[0]?.active ? { userId: claims.sub, sessionId: claims.sid } : null;
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
  return profile ? mobileUser(profile) : null;
}
