import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

const auth = await import('../lib/localAuth.ts');

function result(rows = [], rowCount = rows.length) {
  return { rows, rowCount };
}

test('retrouve un profil migre par username normalise quand id et email sont obsoletes', async () => {
  const profile = {
    id: 'f64a1b7a-c261-4ad5-955b-c0ad06a1d0bb',
    email: null,
    name: 'XimaMOff',
    username: 'ximamoff',
    avatar: null,
    role: 'user',
    is_verified: true,
    bio: null,
    location: null,
    website: null,
    is_artist: true,
    artist_name: 'XimaM',
    genre: [],
    total_plays: 0,
    total_likes: 0,
    last_seen: null,
  };
  const executor = {
    async query(sql, values = []) {
      assert.match(sql, /lower\(username\) = \$1/i);
      assert.deepEqual(values, ['ximamoff']);
      return result([profile]);
    },
  };

  const matched = await auth.getLocalProfileByUsername('  XimaMOff  ', executor);
  assert.equal(matched?.id, profile.id);
  assert.equal(matched?.username, 'ximamoff');
});

test('authentifie un hash bcrypt $2a$ restaure sans le reencoder ni l exposer', async () => {
  const existingHash = bcrypt.hashSync('mot-de-passe-existant', 10).replace(/^\$2[by]\$/, '$2a$');
  const calls = [];
  const profile = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'membre@synaura.fr',
    name: 'Membre',
    username: 'membre',
    avatar: null,
    role: 'user',
    is_verified: true,
    bio: null,
    location: null,
    website: null,
    is_artist: false,
    artist_name: null,
    genre: [],
    total_plays: 0,
    total_likes: 0,
    last_seen: null,
  };
  const executor = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (sql.includes('encrypted_password')) {
        return result([{ id: profile.id, email: profile.email, encrypted_password: existingHash, banned_until: null, deleted_at: null }]);
      }
      if (sql.includes('FROM public.profiles')) return result([profile]);
      if (sql.includes('UPDATE auth.users SET last_sign_in_at')) return result([], 1);
      throw new Error(`Requete inattendue: ${sql}`);
    },
  };

  const authenticated = await auth.authenticateLocalPassword(profile.email, 'mot-de-passe-existant', executor);
  assert.equal(authenticated?.id, profile.id);
  assert.equal(Object.hasOwn(authenticated || {}, 'encrypted_password'), false);
  assert.equal(existingHash.startsWith('$2a$'), true);
  assert.equal(calls.some(({ sql }) => /SET\s+encrypted_password/i.test(sql)), false);
});

test('cree auth.users, identite email et profil avec le meme UUID et un nouveau hash bcrypt', async () => {
  const calls = [];
  let createdProfile = null;
  const executor = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (sql.includes('AS email_exists')) return result([{ email_exists: false, username_exists: false }]);
      if (sql.includes('INSERT INTO auth.users')) return result([], 1);
      if (sql.includes('INSERT INTO auth.identities')) return result([], 1);
      if (sql.includes('INSERT INTO public.profiles')) {
        createdProfile = {
          id: values[0], email: values[1], name: values[2], username: values[3], avatar: null,
          role: 'user', is_verified: true, bio: null, location: null, website: null,
          is_artist: false, artist_name: null, genre: [], total_plays: 0, total_likes: 0, last_seen: null,
        };
        return result([], 1);
      }
      if (sql.includes('FROM public.profiles')) return result(createdProfile ? [createdProfile] : []);
      throw new Error(`Requete inattendue: ${sql}`);
    },
  };

  const profile = await auth.createLocalUser({
    email: 'Nouveau@Synaura.fr',
    password: 'nouveau-mot-de-passe',
    name: 'Nouveau',
    username: 'Nouveau_User',
  }, executor);
  const authInsert = calls.find(({ sql }) => sql.includes('INSERT INTO auth.users'));
  const identityInsert = calls.find(({ sql }) => sql.includes('INSERT INTO auth.identities'));
  const profileInsert = calls.find(({ sql }) => sql.includes('INSERT INTO public.profiles'));
  assert.ok(authInsert && identityInsert && profileInsert);
  assert.equal(profile.id, authInsert.values[0]);
  assert.equal(identityInsert.values[2], profile.id);
  assert.equal(profileInsert.values[0], profile.id);
  assert.equal(profile.email, 'nouveau@synaura.fr');
  assert.equal(profile.username, 'nouveau_user');
  assert.equal(await bcrypt.compare('nouveau-mot-de-passe', authInsert.values[2]), true);
  assert.equal(Object.hasOwn(profile, 'encrypted_password'), false);
});

test('associe Google au compte existant et conserve son UUID', async () => {
  const existingId = '22222222-2222-4222-8222-222222222222';
  const calls = [];
  const profile = {
    id: existingId,
    email: 'google@synaura.fr',
    name: 'Compte existant',
    username: 'google_existant',
    avatar: null,
    role: 'user',
    is_verified: true,
    bio: null,
    location: null,
    website: null,
    is_artist: false,
    artist_name: null,
    genre: [],
    total_plays: 0,
    total_likes: 0,
    last_seen: null,
  };
  const executor = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (sql.includes('SELECT matched.id')) return result([{ id: existingId }]);
      if (sql.includes('INSERT INTO auth.identities')) return result([], 1);
      if (sql.includes('FROM public.profiles')) return result([profile]);
      if (sql.includes('UPDATE auth.users SET last_sign_in_at')) return result([], 1);
      if (sql.includes('INSERT INTO auth.users')) throw new Error('Un nouvel utilisateur ne doit pas etre cree');
      throw new Error(`Requete inattendue: ${sql}`);
    },
  };

  const matched = await auth.matchOrCreateGoogleAccount({
    email: 'Google@Synaura.fr',
    providerAccountId: 'google-provider-subject',
    name: 'Compte Google',
    emailVerified: true,
  }, executor);
  const identity = calls.find(({ sql }) => sql.includes('INSERT INTO auth.identities'));
  assert.equal(matched.id, existingId);
  assert.equal(identity.values[2], existingId);
  assert.equal(calls.some(({ sql }) => sql.includes('INSERT INTO auth.users')), false);
});

test('cree un compte telephone local avec le meme UUID sans inventer d email', async () => {
  const calls = [];
  let createdProfile = null;
  const executor = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (sql.includes('SELECT matched.id')) return result([]);
      if (sql.includes('INSERT INTO auth.users')) return result([], 1);
      if (sql.includes('INSERT INTO auth.identities')) return result([], 1);
      if (sql.includes('AS exists') && sql.includes('public.profiles')) return result([{ exists: false }]);
      if (sql.includes('INSERT INTO public.profiles')) {
        createdProfile = {
          id: values[0], email: values[1], name: values[2], username: values[3], avatar: null,
          role: 'user', is_verified: false, bio: null, location: null, website: null,
          is_artist: false, artist_name: null, genre: [], total_plays: 0, total_likes: 0, last_seen: null,
        };
        return result([], 1);
      }
      if (sql.includes('FROM public.profiles')) return result(createdProfile ? [createdProfile] : []);
      throw new Error(`Requete inattendue: ${sql}`);
    },
  };

  const profile = await auth.matchOrCreatePhoneAccount({ phone: '+33612345678' }, executor);
  const authInsert = calls.find(({ sql }) => sql.includes('INSERT INTO auth.users'));
  const identityInsert = calls.find(({ sql }) => sql.includes('INSERT INTO auth.identities'));
  const profileInsert = calls.find(({ sql }) => sql.includes('INSERT INTO public.profiles'));
  assert.ok(authInsert && identityInsert && profileInsert);
  assert.equal(profile.id, authInsert.values[0]);
  assert.equal(identityInsert.values[2], profile.id);
  assert.equal(profileInsert.values[0], profile.id);
  assert.equal(profile.email, null);
  assert.equal(authInsert.values[6], '+33612345678');
  assert.equal(Object.hasOwn(profile, 'encrypted_password'), false);
});
