import test from 'node:test';
import assert from 'node:assert/strict';

const { createDatabaseClient } = await import('../lib/database.ts');

test('compile les lectures API en SQL parametre avec tri et limite', async () => {
  const calls = [];
  const executor = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      return { rows: [{ id: 'track-1', title: 'Titre' }], rowCount: 1 };
    },
  };
  const db = createDatabaseClient(executor);
  const malicious = "x' OR true --";
  const { data, error } = await db.from('tracks')
    .select('id, title')
    .eq('creator_id', malicious)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(20);
  assert.equal(error, null);
  assert.deepEqual(data, [{ id: 'track-1', title: 'Titre' }]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].sql.includes(malicious), false);
  assert.deepEqual(calls[0].values, [malicious, true, 20]);
  assert.match(calls[0].sql, /WHERE .*creator_id.*\$1.*is_public.*\$2/s);
});

test('compile les upserts API avec cible de conflit explicite', async () => {
  const calls = [];
  const executor = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      return { rows: [{ user_id: 'user-1', theme: 'dark' }], rowCount: 1 };
    },
  };
  const db = createDatabaseClient(executor);
  const response = await db.from('user_preferences')
    .upsert({ user_id: 'user-1', theme: 'dark' }, { onConflict: 'user_id' })
    .select('*')
    .single();
  assert.equal(response.error, null);
  assert.equal(response.data.user_id, 'user-1');
  assert.match(calls[0].sql, /ON CONFLICT \("user_id"\) DO UPDATE SET/);
  assert.deepEqual(calls[0].values, ['user-1', 'dark']);
});

test('normalise les colonnes FK avant les parcours sourceColumns.forEach', async () => {
  const calls = [];
  const executor = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (sql.includes('FROM pg_constraint')) {
        return {
          rows: [{
            constraint_name: 'tracks_creator_id_fkey',
            source_table: 'tracks',
            source_columns: '{creator_id}',
            target_table: 'profiles',
            target_columns: '{id}',
          }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM "public"."tracks"')) {
        return { rows: [{ id: 'track-1', creator_id: 'user-1' }], rowCount: 1 };
      }
      if (sql.includes('FROM "public"."profiles"')) {
        return { rows: [{ id: 'user-1', username: 'artiste' }], rowCount: 1 };
      }
      throw new Error(`Requete inattendue: ${sql}`);
    },
  };

  const db = createDatabaseClient(executor);
  const response = await db.from('tracks')
    .select('id, creator:profiles!inner(id, username)');

  assert.equal(response.error, null);
  assert.deepEqual(response.data, [{
    id: 'track-1',
    creator: { id: 'user-1', username: 'artiste' },
  }]);
  const metadataQuery = calls.find((call) => call.sql.includes('FROM pg_constraint'));
  assert.ok(metadataQuery);
  assert.match(metadataQuery.sql, /source_attribute\.attname::text/);
  assert.match(metadataQuery.sql, /target_attribute\.attname::text/);
});
