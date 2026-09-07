import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => readFile(path.join(root, relative), 'utf8');

test('les deux upserts comment_moderation utilisent la cle primaire reelle', async () => {
  for (const file of [
    'app/api/tracks/[id]/comments/[commentId]/moderation/route.ts',
    'app/api/tracks/[id]/comments/[commentId]/route.ts',
  ]) {
    assert.match(await read(file), /onConflict:\s*['"]comment_id,creator_id['"]/);
  }
});

test('la migration runtime cree uniquement la table A avec RLS et grants limites', async () => {
  const sql = await read('database/migrations/20260907211500_add_admin_email_campaigns.sql');
  assert.match(sql, /CREATE TABLE public\.admin_email_campaigns/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON TABLE public\.admin_email_campaigns FROM PUBLIC, anon, authenticated/);
  for (const absent of ['ai_generated_tracks', 'creator_filters', 'follows', 'moderation_actions', 'user_statuses', 'user_subscriptions']) {
    assert.doesNotMatch(sql, new RegExp(`CREATE (?:TABLE|VIEW) public\\.${absent}`));
  }
});

test('les 11 SECURITY DEFINER ont un search_path fixe et perdent leur execution publique', async () => {
  const sql = await read('database/migrations/20260907212000_harden_security_definer_functions.sql');
  assert.equal([...sql.matchAll(/^ALTER FUNCTION public\./gm)].length, 11);
  assert.equal([...sql.matchAll(/SET search_path TO pg_catalog, public;/g)].length, 11);
  assert.equal([...sql.matchAll(/^REVOKE EXECUTE ON FUNCTION public\./gm)].length, 11);
  assert.equal([...sql.matchAll(/^GRANT EXECUTE ON FUNCTION public\./gm)].length, 11);
});

test('seuls les quatre index FK demontres sont ajoutes', async () => {
  const sql = await read('database/migrations/20260907212500_add_critical_fk_indexes.sql');
  assert.equal([...sql.matchAll(/^CREATE INDEX /gm)].length, 4);
  assert.match(sql, /active_artist_boosts \(user_id, expires_at DESC\)/);
  assert.match(sql, /active_track_boosts \(user_id, expires_at DESC\)/);
  assert.match(sql, /playlist_tracks \(track_id\)/);
  assert.match(sql, /playlists \(creator_id, created_at DESC\)/);
});

test('les 34 FK et les 7 objets absents ont une decision explicite', async () => {
  const fk = (await read('database/reference/foreign-key-index-audit-phase1b.csv')).trim().split(/\r?\n/);
  const objects = (await read('database/reference/runtime-objects-phase1b.csv')).trim().split(/\r?\n/);
  assert.equal(fk.length - 1, 34);
  assert.equal(objects.length - 1, 7);
  assert.equal(fk.filter((line) => /,A,/.test(line)).length, 4);
  assert.equal(objects.filter((line) => /,A,/.test(line)).length, 1);
});

test('la classification dbAdmin couvre exactement les 934 appels Phase 1A', async () => {
  const rows = (await read('database/reference/dbadmin-usage.csv')).trim().split(/\r?\n/).slice(1);
  assert.equal(rows.length, 934);
  const counts = Object.fromEntries('ABCDEFGHI'.split('').map((category) => [
    category,
    rows.filter((row) => row.startsWith(`${category},`)).length,
  ]));
  assert.deepEqual(counts, { A: 590, B: 260, C: 61, D: 4, E: 18, F: 1, G: 0, H: 0, I: 0 });
});

test('les grants du role test sont specifiques et sans BYPASSRLS', async () => {
  const sql = await read('database/reference/restricted-role-grants.sql');
  const harness = await read('database/scripts/rebuild-phase1b-isolated.sh');
  assert.doesNotMatch(sql, /GRANT ALL|ON ALL TABLES|ON ALL SEQUENCES/);
  assert.match(sql, /GRANT INSERT, SELECT ON TABLE public\.admin_email_campaigns/);
  assert.match(harness, /NOBYPASSRLS/);
  assert.match(harness, /RESTRICTED_ROLE_RLS_DENIAL=confirmed/);
});

test('le diagnostic production est force en transaction read-only', async () => {
  const sql = await read('database/reference/phase1b-production-audit.sql');
  assert.match(sql, /BEGIN TRANSACTION READ ONLY;/);
  assert.match(sql, /COMMIT;/);
  assert.doesNotMatch(sql, /^\s*(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE)\b/im);
});
