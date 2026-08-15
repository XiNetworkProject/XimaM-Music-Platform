import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'crypto';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { queryDatabase, type DatabaseExecutor } from './postgres.ts';

export type MobileMfaFactor = {
  id: string;
  type: 'totp' | 'phone' | string;
  status: 'verified' | 'unverified' | string;
  friendlyName?: string | null;
  createdAt?: string | null;
  phone?: string | null;
};

export type MobilePrivateAccount = {
  firstName: string;
  lastName: string;
  birthDate: string;
  birthdayVisibility: 'private' | 'friends' | 'public';
  discoverableByEmail: boolean;
  discoverableByPhone: boolean;
  profileComplete: boolean;
  termsVersion: string | null;
  privacyVersion: string | null;
};

export type PrivateAccountPatch = {
  email?: string | null;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  birthdayVisibility?: 'private' | 'friends' | 'public';
  discoverableByEmail?: boolean;
  discoverableByPhone?: boolean;
  profileCompletedAt?: string;
  termsVersion?: string;
  termsAcceptedAt?: string;
  privacyVersion?: string;
  privacyAcceptedAt?: string;
  mfaEnabled?: boolean;
};

type FactorSecretRow = {
  id: string;
  user_id: string;
  factor_type: string;
  status: string;
  secret: string | null;
  phone: string | null;
};

type PhoneOtpPurpose = 'phone-login' | 'phone-link' | 'mfa-phone';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const FACTOR_SECRET_PREFIX = 'local:v1';
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;

function authSecret() {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) throw new Error('NEXTAUTH_SECRET est requis pour la securite mobile');
  return secret;
}

function booleanEnv(name: string, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value);
}

async function relationExists(relation: string, executor?: DatabaseExecutor) {
  const result = await queryDatabase<{ relation: string | null }>(
    'SELECT to_regclass($1)::text AS relation',
    [relation],
    executor,
  );
  return Boolean(result.rows[0]?.relation);
}

async function columnExists(schema: string, table: string, column: string, executor?: DatabaseExecutor) {
  const result = await queryDatabase<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
    ) AS exists
  `, [schema, table, column], executor);
  return Boolean(result.rows[0]?.exists);
}

export async function getMobileAuthCapabilities(executor?: DatabaseExecutor) {
  const [mfaFactors, phoneColumn, profileEmail] = await Promise.all([
    relationExists('auth.mfa_factors', executor),
    columnExists('auth', 'users', 'phone', executor),
    queryDatabase<{ is_nullable: string }>(`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
      LIMIT 1
    `, [], executor),
  ]);
  const smsConfigured = booleanEnv('MOBILE_PHONE_AUTH_ENABLED')
    && Boolean(process.env.SMS_GATEWAY_URL?.trim());
  const phone = smsConfigured && phoneColumn && profileEmail.rows[0]?.is_nullable === 'YES';
  return {
    email: true,
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    phone,
    phoneMfa: phone && mfaFactors,
    totpMfa: mfaFactors && process.env.MOBILE_TOTP_MFA_ENABLED !== 'false',
  };
}

export async function listMobileMfaFactors(userId: string, executor?: DatabaseExecutor): Promise<MobileMfaFactor[]> {
  if (!await relationExists('auth.mfa_factors', executor)) return [];
  const hasPhone = await columnExists('auth', 'mfa_factors', 'phone', executor);
  const phoneSelection = hasPhone ? 'phone' : 'NULL::text AS phone';
  const result = await queryDatabase<{
    id: string;
    type: string;
    status: string;
    friendly_name: string | null;
    created_at: string | null;
    phone: string | null;
  }>(`
    SELECT id::text, factor_type::text AS type, status::text AS status,
           friendly_name, created_at, ${phoneSelection}
    FROM auth.mfa_factors
    WHERE user_id = $1::uuid
    ORDER BY created_at ASC
  `, [userId], executor);
  return result.rows.map((factor) => ({
    id: factor.id,
    type: factor.type,
    status: factor.status,
    friendlyName: factor.friendly_name,
    createdAt: factor.created_at,
    phone: factor.phone,
  }));
}

export async function hasVerifiedMobileMfaFactor(userId: string, executor?: DatabaseExecutor) {
  const factors = await listMobileMfaFactors(userId, executor);
  return factors.some((factor) => factor.status === 'verified');
}

export async function getMobileIdentities(userId: string, executor?: DatabaseExecutor) {
  const result = await queryDatabase<{
    id: string;
    provider: string;
    created_at: string | null;
    last_sign_in_at: string | null;
  }>(`
    SELECT id::text, provider, created_at, last_sign_in_at
    FROM auth.identities
    WHERE user_id = $1::uuid
    ORDER BY created_at ASC
  `, [userId], executor);
  return result.rows.map((identity) => ({
    id: identity.id,
    provider: identity.provider,
    createdAt: identity.created_at || undefined,
    lastSignInAt: identity.last_sign_in_at || undefined,
  }));
}

function privateAccountFromMetadata(metadata: Record<string, unknown>, tableAvailable: boolean): MobilePrivateAccount {
  const visibility = metadata.birthday_visibility;
  return {
    firstName: typeof metadata.first_name === 'string' ? metadata.first_name : '',
    lastName: typeof metadata.last_name === 'string' ? metadata.last_name : '',
    birthDate: typeof metadata.birth_date === 'string' ? metadata.birth_date : '',
    birthdayVisibility: visibility === 'friends' || visibility === 'public' ? visibility : 'private',
    discoverableByEmail: metadata.discoverable_by_email === true,
    discoverableByPhone: metadata.discoverable_by_phone === true,
    profileComplete: tableAvailable ? Boolean(metadata.profile_completed_at) : true,
    termsVersion: typeof metadata.terms_version === 'string' ? metadata.terms_version : null,
    privacyVersion: typeof metadata.privacy_version === 'string' ? metadata.privacy_version : null,
  };
}

export async function getMobilePrivateAccount(userId: string, executor?: DatabaseExecutor) {
  const tableAvailable = await relationExists('public.account_private', executor);
  if (tableAvailable) {
    const result = await queryDatabase<{
      first_name: string | null;
      last_name: string | null;
      birth_date: string | null;
      birthday_visibility: string | null;
      discoverable_by_email: boolean | null;
      discoverable_by_phone: boolean | null;
      profile_completed_at: string | null;
      terms_version: string | null;
      privacy_version: string | null;
    }>(`
      SELECT first_name, last_name, birth_date, birthday_visibility,
             discoverable_by_email, discoverable_by_phone, profile_completed_at,
             terms_version, privacy_version
      FROM public.account_private
      WHERE user_id = $1::uuid
      LIMIT 1
    `, [userId], executor);
    const row = result.rows[0];
    if (row) {
      return privateAccountFromMetadata({
        first_name: row.first_name,
        last_name: row.last_name,
        birth_date: row.birth_date,
        birthday_visibility: row.birthday_visibility,
        discoverable_by_email: row.discoverable_by_email,
        discoverable_by_phone: row.discoverable_by_phone,
        profile_completed_at: row.profile_completed_at,
        terms_version: row.terms_version,
        privacy_version: row.privacy_version,
      }, true);
    }
    return privateAccountFromMetadata({}, true);
  }

  const fallback = await queryDatabase<{ metadata: Record<string, unknown> | null }>(`
    SELECT raw_user_meta_data AS metadata
    FROM auth.users
    WHERE id = $1::uuid
    LIMIT 1
  `, [userId], executor);
  return privateAccountFromMetadata(fallback.rows[0]?.metadata || {}, false);
}

export async function upsertMobilePrivateAccount(
  userId: string,
  patch: PrivateAccountPatch,
  executor?: DatabaseExecutor,
) {
  if (await relationExists('public.account_private', executor)) {
    await queryDatabase(`
      INSERT INTO public.account_private (
        user_id, email, first_name, last_name, birth_date, birthday_visibility,
        discoverable_by_email, discoverable_by_phone, profile_completed_at,
        terms_version, terms_accepted_at, privacy_version, privacy_accepted_at,
        mfa_enabled, created_at, updated_at
      ) VALUES (
        $1::uuid, $2, $3, $4, $5::date, COALESCE($6, 'private'),
        COALESCE($7, false), COALESCE($8, false), $9::timestamptz,
        $10, $11::timestamptz, $12, $13::timestamptz,
        COALESCE($14, false), now(), now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public.account_private.email),
        first_name = COALESCE(EXCLUDED.first_name, public.account_private.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.account_private.last_name),
        birth_date = COALESCE(EXCLUDED.birth_date, public.account_private.birth_date),
        birthday_visibility = COALESCE($6, public.account_private.birthday_visibility),
        discoverable_by_email = COALESCE($7, public.account_private.discoverable_by_email),
        discoverable_by_phone = COALESCE($8, public.account_private.discoverable_by_phone),
        profile_completed_at = COALESCE(EXCLUDED.profile_completed_at, public.account_private.profile_completed_at),
        terms_version = COALESCE(EXCLUDED.terms_version, public.account_private.terms_version),
        terms_accepted_at = COALESCE(EXCLUDED.terms_accepted_at, public.account_private.terms_accepted_at),
        privacy_version = COALESCE(EXCLUDED.privacy_version, public.account_private.privacy_version),
        privacy_accepted_at = COALESCE(EXCLUDED.privacy_accepted_at, public.account_private.privacy_accepted_at),
        mfa_enabled = COALESCE($14, public.account_private.mfa_enabled),
        updated_at = now()
    `, [
      userId,
      patch.email ?? null,
      patch.firstName ?? null,
      patch.lastName ?? null,
      patch.birthDate ?? null,
      patch.birthdayVisibility ?? null,
      patch.discoverableByEmail ?? null,
      patch.discoverableByPhone ?? null,
      patch.profileCompletedAt ?? null,
      patch.termsVersion ?? null,
      patch.termsAcceptedAt ?? null,
      patch.privacyVersion ?? null,
      patch.privacyAcceptedAt ?? null,
      patch.mfaEnabled ?? null,
    ], executor);
    return;
  }

  const metadata: Record<string, unknown> = {};
  if (patch.firstName !== undefined) metadata.first_name = patch.firstName;
  if (patch.lastName !== undefined) metadata.last_name = patch.lastName;
  if (patch.birthDate !== undefined) metadata.birth_date = patch.birthDate;
  if (patch.birthdayVisibility !== undefined) metadata.birthday_visibility = patch.birthdayVisibility;
  if (patch.discoverableByEmail !== undefined) metadata.discoverable_by_email = patch.discoverableByEmail;
  if (patch.discoverableByPhone !== undefined) metadata.discoverable_by_phone = patch.discoverableByPhone;
  if (patch.profileCompletedAt !== undefined) metadata.profile_completed_at = patch.profileCompletedAt;
  if (patch.termsVersion !== undefined) metadata.terms_version = patch.termsVersion;
  if (patch.privacyVersion !== undefined) metadata.privacy_version = patch.privacyVersion;
  await queryDatabase(`
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || $2::jsonb,
        updated_at = now()
    WHERE id = $1::uuid
  `, [userId, JSON.stringify(metadata)], executor);
}

export async function updateMobilePublicProfile(
  userId: string,
  patch: { name?: string; username?: string },
  executor?: DatabaseExecutor,
) {
  const assignments: string[] = [];
  const values: unknown[] = [userId];
  if (patch.name !== undefined) {
    values.push(patch.name);
    assignments.push(`name = $${values.length}`);
  }
  if (patch.username !== undefined) {
    values.push(patch.username);
    assignments.push(`username = $${values.length}`);
  }
  if (!assignments.length) return;
  await queryDatabase(`
    UPDATE public.profiles
    SET ${assignments.join(', ')}, updated_at = now()
    WHERE id = $1::uuid
  `, values, executor);
}

function base32Encode(value: Buffer) {
  let bits = 0;
  let accumulator = 0;
  let output = '';
  for (let byteIndex = 0; byteIndex < value.length; byteIndex += 1) {
    const byte = value[byteIndex];
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(accumulator >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(accumulator << (5 - bits)) & 31];
  return output;
}

function base32Decode(value: string) {
  const normalized = value.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let accumulator = 0;
  const bytes: number[] = [];
  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) continue;
    accumulator = (accumulator << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((accumulator >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

export function totpCodeAt(secret: string, timestampMs = Date.now()) {
  const counter = BigInt(Math.floor(timestampMs / 1000 / TOTP_PERIOD_SECONDS));
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  const digest = createHmac('sha1', base32Decode(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(binary % (10 ** TOTP_DIGITS)).padStart(TOTP_DIGITS, '0');
}

export function verifyTotpCode(secret: string, code: string, timestampMs = Date.now()) {
  const normalized = code.replace(/\D/g, '');
  if (normalized.length !== TOTP_DIGITS) return false;
  const supplied = Buffer.from(normalized);
  return [-1, 0, 1].some((window) => {
    const expected = Buffer.from(totpCodeAt(secret, timestampMs + window * TOTP_PERIOD_SECONDS * 1000));
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
  });
}

function factorEncryptionKey() {
  return createHash('sha256').update(`synaura-mobile-totp:${authSecret()}`).digest();
}

function sealFactorSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', factorEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [FACTOR_SECRET_PREFIX, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join(':');
}

function openFactorSecret(value: string) {
  if (!value.startsWith(`${FACTOR_SECRET_PREFIX}:`)) return value;
  const [, , ivValue, tagValue, ciphertextValue] = value.split(':');
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error('Secret TOTP local invalide');
  const decipher = createDecipheriv('aes-256-gcm', factorEncryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export async function enrollLocalTotpFactor(userId: string, executor?: DatabaseExecutor) {
  if (!await relationExists('auth.mfa_factors', executor)) throw new Error('MFA_TOTP_UNAVAILABLE');
  await queryDatabase(`
    DELETE FROM auth.mfa_factors
    WHERE user_id = $1::uuid AND factor_type::text = 'totp' AND status::text = 'unverified'
  `, [userId], executor);
  const factorId = randomUUID();
  const secret = generateTotpSecret();
  await queryDatabase(`
    INSERT INTO auth.mfa_factors (
      id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret
    ) VALUES ($1::uuid, $2::uuid, 'Synaura Authenticator', 'totp', 'unverified', now(), now(), $3)
  `, [factorId, userId, sealFactorSecret(secret)], executor);
  const label = encodeURIComponent('Synaura');
  const uri = `otpauth://totp/${label}?secret=${encodeURIComponent(secret)}&issuer=${label}&algorithm=SHA1&digits=6&period=30`;
  return {
    factorId,
    secret,
    uri,
    qrCode: await QRCode.toDataURL(uri, { errorCorrectionLevel: 'M', margin: 1, width: 360 }),
  };
}

export async function getMobileMfaFactor(userId: string, factorId: string, executor?: DatabaseExecutor) {
  const hasPhone = await columnExists('auth', 'mfa_factors', 'phone', executor);
  const result = await queryDatabase<FactorSecretRow>(`
    SELECT id::text, user_id::text, factor_type::text, status::text, secret,
           ${hasPhone ? 'phone' : 'NULL::text AS phone'}
    FROM auth.mfa_factors
    WHERE id = $2::uuid AND user_id = $1::uuid
    LIMIT 1
  `, [userId, factorId], executor);
  return result.rows[0] || null;
}

export async function createMfaChallenge(
  userId: string,
  sessionId: string,
  factorId: string,
  executor?: DatabaseExecutor,
) {
  const factor = await getMobileMfaFactor(userId, factorId, executor);
  if (!factor) return null;
  const challengeId = jwt.sign({
    sub: userId,
    sid: sessionId,
    factorId,
    factorType: factor.factor_type,
    type: 'mfa-challenge',
  }, authSecret(), { algorithm: 'HS256', expiresIn: '5m', issuer: 'synaura', audience: 'synaura-mobile-mfa' });
  return { factor, challengeId, expiresAt: Math.floor(Date.now() / 1000) + 300 };
}

export async function verifyMfaChallenge(
  input: { userId: string; sessionId: string; factorId: string; challengeId: string; code: string },
  executor?: DatabaseExecutor,
) {
  let claims: jwt.JwtPayload;
  try {
    claims = jwt.verify(input.challengeId, authSecret(), {
      algorithms: ['HS256'],
      issuer: 'synaura',
      audience: 'synaura-mobile-mfa',
    }) as jwt.JwtPayload;
  } catch {
    return false;
  }
  if (claims.type !== 'mfa-challenge' || claims.sub !== input.userId || claims.sid !== input.sessionId
    || claims.factorId !== input.factorId) return false;
  const factor = await getMobileMfaFactor(input.userId, input.factorId, executor);
  if (!factor) return false;
  if (factor.factor_type !== 'totp' || !factor.secret) return false;
  const valid = verifyTotpCode(openFactorSecret(factor.secret), input.code);
  if (!valid) return false;
  if (factor.status !== 'verified') {
    await queryDatabase(`
      UPDATE auth.mfa_factors SET status = 'verified', updated_at = now()
      WHERE id = $1::uuid AND user_id = $2::uuid
    `, [input.factorId, input.userId], executor);
  }
  return true;
}

export async function removeMobileMfaFactor(userId: string, factorId: string, executor?: DatabaseExecutor) {
  const result = await queryDatabase(`
    DELETE FROM auth.mfa_factors WHERE id = $2::uuid AND user_id = $1::uuid
  `, [userId, factorId], executor);
  await upsertMobilePrivateAccount(userId, {
    mfaEnabled: await hasVerifiedMobileMfaFactor(userId, executor),
  }, executor);
  return Number(result.rowCount || 0) === 1;
}

export async function markSessionMfaVerified(sessionId: string, executor?: DatabaseExecutor) {
  if (!await relationExists('auth.mfa_amr_claims', executor)) return;
  await queryDatabase(`
    INSERT INTO auth.mfa_amr_claims (
      id, session_id, created_at, updated_at, authentication_method
    ) VALUES ($1::uuid, $2::uuid, now(), now(), 'totp')
    ON CONFLICT (session_id, authentication_method) DO UPDATE SET updated_at = now()
  `, [randomUUID(), sessionId], executor);
}

export async function sessionHasMfaVerification(sessionId: string, executor?: DatabaseExecutor) {
  if (!await relationExists('auth.mfa_amr_claims', executor)) return false;
  const result = await queryDatabase<{ verified: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM auth.mfa_amr_claims
      WHERE session_id = $1::uuid AND authentication_method IN ('totp', 'phone')
    ) AS verified
  `, [sessionId], executor);
  return Boolean(result.rows[0]?.verified);
}

function phoneOtpDigest(phone: string, code: string, nonce: string, purpose: PhoneOtpPurpose) {
  return createHmac('sha256', authSecret()).update(`${purpose}:${phone}:${nonce}:${code}`).digest('base64url');
}

export function createPhoneOtpChallenge(phone: string, purpose: PhoneOtpPurpose) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const nonce = randomBytes(18).toString('base64url');
  const challengeToken = jwt.sign({
    phone,
    purpose,
    nonce,
    codeDigest: phoneOtpDigest(phone, code, nonce, purpose),
    type: 'phone-otp',
  }, authSecret(), { algorithm: 'HS256', expiresIn: '5m', issuer: 'synaura', audience: 'synaura-mobile-phone' });
  return { code, challengeToken, expiresAt: Math.floor(Date.now() / 1000) + 300 };
}

export function verifyPhoneOtpChallenge(
  phone: string,
  code: string,
  challengeToken: string,
  purpose: PhoneOtpPurpose,
) {
  let claims: jwt.JwtPayload;
  try {
    claims = jwt.verify(challengeToken, authSecret(), {
      algorithms: ['HS256'],
      issuer: 'synaura',
      audience: 'synaura-mobile-phone',
    }) as jwt.JwtPayload;
  } catch {
    return false;
  }
  if (claims.type !== 'phone-otp' || claims.phone !== phone || claims.purpose !== purpose
    || typeof claims.nonce !== 'string' || typeof claims.codeDigest !== 'string') return false;
  const expected = Buffer.from(phoneOtpDigest(phone, code, claims.nonce, purpose));
  const supplied = Buffer.from(claims.codeDigest);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export async function sendPhoneOtp(phone: string, code: string, purpose: PhoneOtpPurpose) {
  const url = process.env.SMS_GATEWAY_URL?.trim();
  if (!booleanEnv('MOBILE_PHONE_AUTH_ENABLED') || !url) throw new Error('SMS_UNAVAILABLE');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.SMS_GATEWAY_TOKEN ? { Authorization: `Bearer ${process.env.SMS_GATEWAY_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      to: phone,
      code,
      purpose,
      message: `Synaura : ton code de verification est ${code}. Il expire dans 5 minutes.`,
    }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('SMS_DELIVERY_FAILED');
}

export async function enrollLocalPhoneFactor(userId: string, phone: string, executor?: DatabaseExecutor) {
  if (!await columnExists('auth', 'mfa_factors', 'phone', executor)) throw new Error('MFA_PHONE_UNAVAILABLE');
  await queryDatabase(`
    DELETE FROM auth.mfa_factors
    WHERE user_id = $1::uuid AND factor_type::text = 'phone' AND status::text = 'unverified'
  `, [userId], executor);
  const factorId = randomUUID();
  await queryDatabase(`
    INSERT INTO auth.mfa_factors (
      id, user_id, friendly_name, factor_type, status, created_at, updated_at, phone
    ) VALUES ($1::uuid, $2::uuid, 'Synaura SMS', 'phone', 'unverified', now(), now(), $3)
  `, [factorId, userId, phone], executor);
  const challenge = createPhoneOtpChallenge(phone, 'mfa-phone');
  try {
    await sendPhoneOtp(phone, challenge.code, 'mfa-phone');
  } catch (error) {
    await queryDatabase('DELETE FROM auth.mfa_factors WHERE id = $1::uuid', [factorId], executor).catch(() => undefined);
    throw error;
  }
  return { factorId, challengeId: challenge.challengeToken, expiresAt: challenge.expiresAt, phone };
}

export async function challengeLocalPhoneFactor(userId: string, factorId: string, executor?: DatabaseExecutor) {
  const factor = await getMobileMfaFactor(userId, factorId, executor);
  if (!factor?.phone || factor.factor_type !== 'phone') return null;
  const challenge = createPhoneOtpChallenge(factor.phone, 'mfa-phone');
  await sendPhoneOtp(factor.phone, challenge.code, 'mfa-phone');
  return { challengeId: challenge.challengeToken, expiresAt: challenge.expiresAt, phone: factor.phone };
}

export async function verifyLocalPhoneFactor(
  userId: string,
  factorId: string,
  challengeId: string,
  code: string,
  executor?: DatabaseExecutor,
) {
  const factor = await getMobileMfaFactor(userId, factorId, executor);
  if (!factor?.phone || factor.factor_type !== 'phone') return false;
  if (!verifyPhoneOtpChallenge(factor.phone, code, challengeId, 'mfa-phone')) return false;
  if (factor.status !== 'verified') {
    await queryDatabase(`
      UPDATE auth.mfa_factors SET status = 'verified', updated_at = now()
      WHERE id = $1::uuid AND user_id = $2::uuid
    `, [factorId, userId], executor);
  }
  return true;
}
