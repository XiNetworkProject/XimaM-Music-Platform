import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import {
  queryDatabase,
  withDatabaseTransaction,
  type DatabaseExecutor,
} from './postgres.ts';

export type LocalProfile = {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
  avatar: string | null;
  role: string | null;
  is_verified: boolean | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  is_artist: boolean | null;
  artist_name: string | null;
  genre: unknown;
  total_plays: number | null;
  total_likes: number | null;
  last_seen: string | null;
};

type AuthUserSecret = {
  id: string;
  email: string | null;
  encrypted_password: string | null;
  banned_until: string | null;
  deleted_at: string | null;
};

export type CreateLocalUserInput = {
  email: string;
  password: string;
  name: string;
  username: string;
};

export type GoogleAccountInput = {
  email: string;
  providerAccountId: string;
  name?: string | null;
  avatar?: string | null;
  emailVerified?: boolean;
};

export type PhoneAccountInput = {
  phone: string;
};

type LocalAuthProvider = 'email' | 'google' | 'phone';

const PROFILE_COLUMNS = `
  id, email, name, username, avatar, role, is_verified, bio, location,
  website, is_artist, artist_name, genre, total_plays, total_likes, last_seen
`;

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizedUsername(value: string) {
  return value.trim().toLowerCase();
}

function passwordRounds() {
  const parsed = Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  return Math.min(14, Math.max(10, Number.isFinite(parsed) ? parsed : 12));
}

export function hashLocalPassword(password: string) {
  return bcrypt.hash(password, passwordRounds());
}

function authMetadata(provider: LocalAuthProvider) {
  return { provider, providers: [provider] };
}

async function inAuthTransaction<T>(
  executor: DatabaseExecutor | undefined,
  callback: (target: DatabaseExecutor) => Promise<T>,
) {
  if (executor) return callback(executor);
  return withDatabaseTransaction((client) => callback(client));
}

export async function getLocalProfileById(id: string, executor?: DatabaseExecutor) {
  const result = await queryDatabase<LocalProfile>(`
    SELECT ${PROFILE_COLUMNS}
    FROM public.profiles
    WHERE id = $1::uuid
    LIMIT 1
  `, [id], executor);
  return result.rows[0] || null;
}

export async function getLocalProfileByEmail(email: string, executor?: DatabaseExecutor) {
  const result = await queryDatabase<LocalProfile>(`
    SELECT ${PROFILE_COLUMNS}
    FROM public.profiles
    WHERE lower(email) = $1
    LIMIT 1
  `, [normalizedEmail(email)], executor);
  return result.rows[0] || null;
}

export async function getLocalProfileByUsername(username: string, executor?: DatabaseExecutor) {
  const result = await queryDatabase<LocalProfile>(`
    SELECT ${PROFILE_COLUMNS}
    FROM public.profiles
    WHERE lower(username) = $1
    LIMIT 1
  `, [normalizedUsername(username)], executor);
  return result.rows[0] || null;
}

export async function authenticateLocalPassword(
  email: string,
  password: string,
  executor?: DatabaseExecutor,
) {
  const normalized = normalizedEmail(email);
  const result = await queryDatabase<AuthUserSecret>(`
    SELECT id, email, encrypted_password, banned_until, deleted_at
    FROM auth.users
    WHERE lower(email) = $1
    LIMIT 1
  `, [normalized], executor);
  const authUser = result.rows[0];
  if (!authUser?.encrypted_password || authUser.deleted_at) return null;
  if (authUser.banned_until && new Date(authUser.banned_until).getTime() > Date.now()) return null;

  // bcrypt.compare accepte directement les hash bcrypt $2a$ restaurés. Le hash
  // n'est jamais recalcule ni reecrit lors d'une connexion.
  const valid = await bcrypt.compare(password, authUser.encrypted_password);
  if (!valid) return null;

  const profile = await getLocalProfileById(authUser.id, executor);
  if (!profile) return null;
  await queryDatabase(
    'UPDATE auth.users SET last_sign_in_at = now(), updated_at = now() WHERE id = $1::uuid',
    [authUser.id],
    executor,
  );
  return profile;
}

async function uniqueUsername(baseValue: string, executor: DatabaseExecutor) {
  const cleaned = normalizedUsername(baseValue)
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24) || 'utilisateur';
  for (let suffix = 0; suffix < 10_000; suffix += 1) {
    const suffixText = suffix ? String(suffix) : '';
    const candidate = `${cleaned.slice(0, Math.max(1, 24 - suffixText.length))}${suffixText}`;
    const result = await queryDatabase<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE lower(username) = $1
      ) AS exists
    `, [candidate], executor);
    if (!result.rows[0]?.exists) return candidate;
  }
  throw new Error('Impossible de generer un nom utilisateur unique');
}

async function insertAuthUser(
  executor: DatabaseExecutor,
  input: {
    id: string;
    email: string | null;
    encryptedPassword: string | null;
    provider: LocalAuthProvider;
    name?: string | null;
    avatar?: string | null;
    phone?: string | null;
  },
) {
  await queryDatabase(`
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, is_sso_user, is_anonymous, phone, phone_confirmed_at
    ) VALUES (
      (SELECT instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1),
      $1::uuid, 'authenticated', 'authenticated', $2, $3, now(), $4::jsonb,
      $5::jsonb, now(), now(), $6, false, $7, CASE WHEN $7 IS NULL THEN NULL ELSE now() END
    )
  `, [
    input.id,
    input.email,
    input.encryptedPassword,
    JSON.stringify(authMetadata(input.provider)),
    JSON.stringify({ name: input.name || null, avatar_url: input.avatar || null }),
    input.provider === 'google',
    input.phone || null,
  ], executor);
}

async function upsertIdentity(
  executor: DatabaseExecutor,
  input: {
    userId: string;
    provider: LocalAuthProvider;
    providerAccountId: string;
    email?: string | null;
    phone?: string | null;
    name?: string | null;
    avatar?: string | null;
  },
) {
  const identityData = {
    sub: input.providerAccountId,
    email: input.email || null,
    phone: input.phone || null,
    email_verified: true,
    full_name: input.name || null,
    avatar_url: input.avatar || null,
  };
  await queryDatabase(`
    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES ($1::uuid, $2, $3::uuid, $4::jsonb, $5, now(), now(), now())
    ON CONFLICT (provider_id, provider) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      identity_data = EXCLUDED.identity_data,
      last_sign_in_at = now(),
      updated_at = now()
  `, [randomUUID(), input.providerAccountId, input.userId, JSON.stringify(identityData), input.provider], executor);
}

async function upsertProfile(
  executor: DatabaseExecutor,
  input: {
    id: string;
    email: string | null;
    name: string;
    username: string;
    avatar?: string | null;
    verified?: boolean;
  },
) {
  await queryDatabase(`
    INSERT INTO public.profiles (
      id, email, name, username, avatar, is_verified, created_at, updated_at
    ) VALUES ($1::uuid, $2, $3, $4, $5, $6, now(), now())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = COALESCE(NULLIF(public.profiles.name, ''), EXCLUDED.name),
      username = COALESCE(NULLIF(public.profiles.username, ''), EXCLUDED.username),
      avatar = COALESCE(public.profiles.avatar, EXCLUDED.avatar),
      is_verified = COALESCE(public.profiles.is_verified, EXCLUDED.is_verified),
      updated_at = now()
  `, [
    input.id,
    input.email,
    input.name,
    input.username,
    input.avatar || null,
    input.verified !== false,
  ], executor);
}

export async function createLocalUser(input: CreateLocalUserInput, executor?: DatabaseExecutor) {
  const email = normalizedEmail(input.email);
  const username = normalizedUsername(input.username);
  const id = randomUUID();
  const encryptedPassword = await hashLocalPassword(input.password);

  return inAuthTransaction(executor, async (target) => {
    const duplicate = await queryDatabase<{ email_exists: boolean; username_exists: boolean }>(`
      SELECT
        EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = $1) AS email_exists,
        EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = $2) AS username_exists
    `, [email, username], target);
    if (duplicate.rows[0]?.email_exists) throw Object.assign(new Error('EMAIL_EXISTS'), { code: 'EMAIL_EXISTS' });
    if (duplicate.rows[0]?.username_exists) throw Object.assign(new Error('USERNAME_EXISTS'), { code: 'USERNAME_EXISTS' });

    await insertAuthUser(target, {
      id,
      email,
      encryptedPassword,
      provider: 'email',
      name: input.name.trim(),
    });
    await upsertIdentity(target, {
      userId: id,
      provider: 'email',
      providerAccountId: id,
      email,
      name: input.name.trim(),
    });
    await upsertProfile(target, {
      id,
      email,
      name: input.name.trim(),
      username,
      verified: true,
    });
    const profile = await getLocalProfileById(id, target);
    if (!profile) throw new Error('Profil local non cree');
    return profile;
  });
}

export async function matchOrCreateGoogleAccount(input: GoogleAccountInput, executor?: DatabaseExecutor) {
  if (input.emailVerified === false) throw new Error('Adresse Google non verifiee');
  const email = normalizedEmail(input.email);
  return inAuthTransaction(executor, async (target) => {
    const matched = await queryDatabase<{ id: string }>(`
      SELECT matched.id
      FROM (
        SELECT users.id, 0 AS priority
        FROM auth.identities identity
        JOIN auth.users users ON users.id = identity.user_id
        WHERE identity.provider = 'google' AND identity.provider_id = $1
        UNION ALL
        SELECT users.id, 1 AS priority
        FROM auth.users users
        WHERE lower(users.email) = $2
        UNION ALL
        SELECT identity.user_id AS id, 2 AS priority
        FROM auth.identities identity
        WHERE lower(identity.identity_data ->> 'email') = $2
      ) matched
      ORDER BY matched.priority
      LIMIT 1
    `, [input.providerAccountId, email], target);

    const id = matched.rows[0]?.id || randomUUID();
    if (!matched.rows[0]) {
      await insertAuthUser(target, {
        id,
        email,
        encryptedPassword: null,
        provider: 'google',
        name: input.name,
        avatar: input.avatar,
      });
    }
    await upsertIdentity(target, {
      userId: id,
      provider: 'google',
      providerAccountId: input.providerAccountId,
      email,
      name: input.name,
      avatar: input.avatar,
    });

    let profile = await getLocalProfileById(id, target);
    if (!profile) {
      const username = await uniqueUsername(email.split('@')[0] || 'utilisateur', target);
      await upsertProfile(target, {
        id,
        email,
        name: input.name?.trim() || username,
        username,
        avatar: input.avatar,
        verified: true,
      });
      profile = await getLocalProfileById(id, target);
    }
    if (!profile) throw new Error('Profil Google local introuvable');
    await queryDatabase(
      'UPDATE auth.users SET last_sign_in_at = now(), updated_at = now() WHERE id = $1::uuid',
      [id],
      target,
    );
    return profile;
  });
}

export async function matchOrCreatePhoneAccount(input: PhoneAccountInput, executor?: DatabaseExecutor) {
  const phone = input.phone.trim();
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Numero de telephone invalide');

  return inAuthTransaction(executor, async (target) => {
    const matched = await queryDatabase<{ id: string }>(`
      SELECT matched.id
      FROM (
        SELECT users.id, 0 AS priority
        FROM auth.users users
        WHERE users.phone = $1 AND users.deleted_at IS NULL
        UNION ALL
        SELECT identity.user_id AS id, 1 AS priority
        FROM auth.identities identity
        WHERE identity.provider = 'phone'
          AND (identity.provider_id = $1 OR identity.identity_data ->> 'phone' = $1)
      ) matched
      ORDER BY matched.priority
      LIMIT 1
    `, [phone], target);

    const id = matched.rows[0]?.id || randomUUID();
    if (!matched.rows[0]) {
      await insertAuthUser(target, {
        id,
        email: null,
        encryptedPassword: null,
        provider: 'phone',
        name: `Membre ${phone.slice(-4)}`,
        phone,
      });
    } else {
      await queryDatabase(`
        UPDATE auth.users
        SET phone = $2, phone_confirmed_at = COALESCE(phone_confirmed_at, now()),
            last_sign_in_at = now(), updated_at = now()
        WHERE id = $1::uuid
      `, [id, phone], target);
    }

    await upsertIdentity(target, {
      userId: id,
      provider: 'phone',
      providerAccountId: phone,
      phone,
    });

    let profile = await getLocalProfileById(id, target);
    if (!profile) {
      const username = await uniqueUsername(`membre_${phone.slice(-4)}`, target);
      await upsertProfile(target, {
        id,
        email: null,
        name: `Membre ${phone.slice(-4)}`,
        username,
        verified: false,
      });
      profile = await getLocalProfileById(id, target);
    }
    if (!profile) throw new Error('Profil telephone local introuvable');
    return profile;
  });
}

export async function updateLocalPassword(userId: string, password: string, executor?: DatabaseExecutor) {
  const encryptedPassword = await hashLocalPassword(password);
  return updateLocalPasswordHash(userId, encryptedPassword, executor);
}

export async function updateLocalPasswordHash(
  userId: string,
  encryptedPassword: string,
  executor?: DatabaseExecutor,
) {
  const result = await queryDatabase(`
    UPDATE auth.users
    SET encrypted_password = $2, recovery_token = '', recovery_sent_at = NULL, updated_at = now()
    WHERE id = $1::uuid AND deleted_at IS NULL
  `, [userId, encryptedPassword], executor);
  return Number(result.rowCount || 0) === 1;
}

export async function findLocalAuthUserIdByEmail(email: string, executor?: DatabaseExecutor) {
  const result = await queryDatabase<{ id: string }>(`
    SELECT id FROM auth.users WHERE lower(email) = $1 AND deleted_at IS NULL LIMIT 1
  `, [normalizedEmail(email)], executor);
  return result.rows[0]?.id || null;
}

export async function deleteLocalAuthUser(userId: string, executor?: DatabaseExecutor) {
  const result = await queryDatabase(
    'DELETE FROM auth.users WHERE id = $1::uuid',
    [userId],
    executor,
  );
  return Number(result.rowCount || 0) === 1;
}
