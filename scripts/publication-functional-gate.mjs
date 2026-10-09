import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
import load from '../tests/helpers/load-typescript.cjs';
const url = new URL(process.env.PUBLICATION_TEST_DATABASE_URL || 'http://invalid');
if (!/^\/synaura_publication_test_\d+$/.test(url.pathname)) throw new Error('Disposable publication database required');
const pool = new pg.Pool({ connectionString: url.toString(), max: 8 });
const tx = async fn => { const client = await pool.connect(); try { await client.query('BEGIN'); const value = await fn(client); await client.query('COMMIT'); return value; } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); } };
const storage = load('lib/localMediaStorage.ts');
const { publishRelease } = load('lib/publication/service.ts', { '../postgres': { queryDatabase: (...args) => pool.query(...args), withDatabaseTransaction: tx } });
const user = crypto.randomUUID(), other = crypto.randomUUID();
const ownerTag = id => crypto.createHmac('sha256', process.env.MEDIA_STORAGE_SECRET || process.env.NEXTAUTH_SECRET || 'synaura-local-development-only').update(id).digest('hex').slice(0, 20);
const reference = (id = user) => { const name = `audio_u${ownerTag(id)}_${crypto.randomUUID()}.mp3`; return { publicId: `local/audio/tracks/${name}`, url: `https://media.synaura.fr/audio/tracks/${name}`, title: 'Fixture' }; };
const input = extra => ({ requestKey: crypto.randomUUID(), title: 'Fixture', releaseType: 'single', visibility: 'public', rightsConfirmed: true, genres: ['Néoclassique'], credits: { author: 'Auteur de test' }, language: 'fr', mood: 'dreamy', isExplicit: true, tracks: [reference()], ...extra });
const inspect = async (id, owner, kind) => { if (!storage.isLocalMediaOwnedBy(id, owner)) throw new Error('Fichier étranger'); return { bytes: 1024, duration: 123.4, posterUrl: kind === 'cover-video' ? 'https://media.synaura.fr/covers/videos/posters/test.jpg' : null }; };
const count = async table => (await pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n;
const run = async (label, fn) => { await fn(); console.log('PASS ' + label); };
try {
  const baseline = fs.readFileSync('database/baseline/010_production_schema.sql', 'utf8');
  await pool.query('CREATE TABLE public.profiles(id uuid PRIMARY KEY, plan text)');
  for (const table of ['tracks', 'playlists', 'playlist_tracks']) {
    const match = baseline.match(new RegExp(`CREATE TABLE public\\.${table} \\([\\s\\S]+?\\n\\);`)); assert.ok(match); await pool.query(match[0]);
  }
  await pool.query('CREATE SEQUENCE playlist_tracks_id_seq; ALTER TABLE playlist_tracks ALTER COLUMN id SET DEFAULT nextval(\'playlist_tracks_id_seq\'); ALTER TABLE tracks ADD PRIMARY KEY(id); ALTER TABLE playlists ADD PRIMARY KEY(id)');
  await tx(client => client.query(fs.readFileSync('database/migrations/20261009103122_publication_workspace.sql', 'utf8')));
  await pool.query("INSERT INTO profiles VALUES($1,'pro'),($2,'free')", [user, other]);
  const first = input();
  await run('eight concurrent retries produce one track and one durable receipt', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => publishRelease(user, first, inspect)));
    assert.equal(new Set(results.map(r => r.result.trackIds[0])).size, 1); assert.equal(results.filter(r => !r.replayed).length, 1); assert.equal(await count('tracks'), 1); assert.equal(await count('publication_requests'), 1);
    const row = (await pool.query('SELECT * FROM tracks')).rows[0]; assert.equal(row.duration, 123); assert.equal(row.data.credits.author, 'Auteur de test'); assert.equal(row.data.language, 'fr'); assert.equal(row.data.mood, 'dreamy'); assert.equal(row.data.isExplicit, true);
  });
  await run('conflicting retry and duplicate media under a new key rejected', async () => {
    await assert.rejects(publishRelease(user, { ...first, title: 'Changed' }, inspect), e => e.status === 409);
    await assert.rejects(publishRelease(user, { ...first, requestKey: crypto.randomUUID() }, inspect), e => e.status === 409);
    assert.equal(await count('tracks'), 1);
  });
  await run('foreign media and invalid references rejected before any write', async () => {
    await assert.rejects(publishRelease(user, input({ tracks: [reference(other)] }), inspect));
    const raw = input(); raw.tracks[0].url = 'https://evil.invalid/file.mp3'; await assert.rejects(publishRelease(user, raw, inspect)); assert.equal(await count('tracks'), 1);
  });
  await run('private EP stores ordered tracks and per-track overrides atomically', async () => {
    const raw = input({ releaseType: 'ep', visibility: 'private', tracks: [reference(), { ...reference(), genres: ['Jazz'], isExplicit: false, lyrics: 'Texte' }] });
    const result = await publishRelease(user, raw, inspect); assert.ok(result.result.albumId);
    const rows = (await pool.query('SELECT * FROM tracks WHERE album_id=$1 ORDER BY track_number', [result.result.albumId])).rows;
    assert.equal(rows.length, 2); assert.ok(rows.every(t => !t.is_public)); assert.equal(rows[1].data.isExplicit, false); assert.deepEqual(rows[1].genre, ['Jazz']); assert.equal(rows[1].lyrics, 'Texte'); assert.equal(await count('playlist_tracks'), 2);
  });
  await run('database failure on a later album track rolls back the entire release and receipt', async () => {
    const before = await count('tracks'), lists = await count('playlists'), receipts = await count('publication_requests');
    await pool.query("ALTER TABLE tracks ADD CONSTRAINT fixture_fail CHECK(title <> 'FAIL_TEST')");
    await assert.rejects(publishRelease(user, input({ releaseType: 'ep', tracks: [reference(), { ...reference(), title: 'FAIL_TEST' }] }), inspect));
    assert.equal(await count('tracks'), before); assert.equal(await count('playlists'), lists); assert.equal(await count('publication_requests'), receipts);
  });
  await run('file-size quota uses server measurements, not client-supplied size', async () => {
    await assert.rejects(publishRelease(other, input({ tracks: [reference(other)] }), async () => ({ bytes: 2 * 1024 ** 3, duration: 10, posterUrl: null })), e => e.status === 413);
  });
  await run('publication receipts have RLS and no anonymous/authenticated grants', async () => {
    const row = (await pool.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.publication_requests'::regclass")).rows[0]; assert.equal(row.relrowsecurity, true);
    for (const role of ['anon','authenticated']) { const permissions = (await pool.query("SELECT has_table_privilege($1,'public.publication_requests','SELECT,INSERT,UPDATE,DELETE') AS allowed", [role])).rows[0]; assert.equal(permissions.allowed, false); }
  });
  console.log('Publication functional gate passed; no real publication or provider request.');
} finally { await pool.end(); }
