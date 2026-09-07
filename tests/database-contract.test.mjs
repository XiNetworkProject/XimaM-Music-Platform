import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const baselinePath = path.join(root, 'database', 'baseline', '010_production_schema.sql');
const baseline = await readFile(baselinePath, 'utf8');

function occurrences(pattern, value = baseline) {
  return [...value.matchAll(pattern)].length;
}

function csvRows(text) {
  const records = [];
  let record = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      record += character;
      if (quoted && text[index + 1] === '"') {
        record += text[index + 1];
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === '\n' && !quoted) {
      if (record.endsWith('\r')) record = record.slice(0, -1);
      if (record) records.push(record);
      record = '';
    } else {
      record += character;
    }
  }
  if (record.trim()) records.push(record);
  return records.slice(1);
}

test('la baseline est structure-only et ne contient pas de secret manifeste', () => {
  assert.doesNotMatch(baseline, /^COPY\s/mi);
  assert.doesNotMatch(baseline, /^INSERT\s+INTO\s/mi);
  assert.doesNotMatch(baseline, /^CREATE\s+DATABASE\s/mi);
  assert.doesNotMatch(baseline, /\b(?:CREATE|ALTER)\s+ROLE\b[^;]*\bPASSWORD\b/i);
  assert.doesNotMatch(baseline, /postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/i);
  assert.doesNotMatch(baseline, /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/);
  assert.doesNotMatch(baseline, /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/);
});

test('la baseline contient les objets explicites et les policies constates', () => {
  assert.equal(occurrences(/^CREATE TABLE\s/gm), 137);
  assert.equal(occurrences(/^CREATE VIEW\s/gm), 3);
  assert.equal(occurrences(/^CREATE SEQUENCE\s/gm), 10);
  assert.equal(occurrences(/^CREATE FUNCTION\s/gm), 91);
  assert.equal(occurrences(/^CREATE POLICY\s/gm), 157);
  assert.equal(occurrences(/^CREATE TYPE [^\n]+ AS ENUM \(/gm), 13);
});

test('les objets et contraintes critiques sont presents', () => {
  for (const table of [
    'profiles', 'tracks', 'track_waveforms', 'track_likes', 'comments',
    'playlists', 'messages', 'notifications', 'ai_generations', 'ai_tracks',
    'user_follows',
  ]) {
    assert.match(baseline, new RegExp(`CREATE TABLE public\\.${table} \\(`));
  }
  assert.match(baseline, /CREATE TABLE auth\.users \(/);
  assert.match(baseline, /CREATE TABLE auth\.identities \(/);
  assert.match(baseline, /ADD CONSTRAINT profiles_id_fkey FOREIGN KEY \(id\) REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
  assert.match(baseline, /ADD CONSTRAINT user_follows_follower_id_following_id_key UNIQUE \(follower_id, following_id\)/);
  assert.match(baseline, /ALTER TABLE public\.tracks ENABLE ROW LEVEL SECURITY/);
});

test('les catalogues versionnes couvrent index, contraintes et policies', async () => {
  const catalog = path.join(root, 'database', 'reference', 'catalog');
  const indexes = csvRows(await readFile(path.join(catalog, 'indexes.csv'), 'utf8'));
  const constraints = csvRows(await readFile(path.join(catalog, 'constraints.csv'), 'utf8'));
  const policies = csvRows(await readFile(path.join(catalog, 'policies.csv'), 'utf8'));
  const relations = csvRows(await readFile(path.join(catalog, 'relations.csv'), 'utf8'));
  const routines = csvRows(await readFile(path.join(catalog, 'routines.csv'), 'utf8'));
  assert.equal(indexes.length, 458);
  assert.equal(constraints.length, 471);
  assert.equal(policies.length, 157);
  assert.equal(relations.filter((row) => row.includes(',view,')).length, 5);
  assert.equal(relations.filter((row) => row.includes(',sequence,')).length, 11);
  assert.equal(routines.length, 171);
});

test('les 84 anciens SQL ont tous une classification explicite', async () => {
  const classification = await readFile(path.join(root, 'database', 'reference', 'legacy-sql-classification.csv'), 'utf8');
  const rows = csvRows(classification);
  assert.equal(rows.length, 84);
  for (const row of rows) assert.match(row, /,(?:A|B|C|D|E|F|G|H),/);
});

test('les migrations futures ont un nom ordonnable et posterieur a la baseline', async () => {
  const directory = path.join(root, 'database', 'migrations');
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  const versions = files.map((file) => {
    const match = file.match(/^(\d{14})_[a-z0-9_]+\.sql$/);
    assert.ok(match, `nom de migration invalide: ${file}`);
    assert.ok(match[1] > '20260907000000', `migration non posterieure a la baseline: ${file}`);
    return match[1];
  });
  assert.equal(new Set(versions).size, versions.length);
});

test('la cartographie couvre les tables critiques et expose les contrats casses', async () => {
  const map = await readFile(path.join(root, 'database', 'reference', 'code-database-map.csv'), 'utf8');
  for (const object of ['profiles', 'tracks', 'messages', 'notifications', 'ai_generations', 'user_follows']) {
    assert.match(map, new RegExp(`public,${object},(?:table|view),[^\\n]+utilise par le runtime`));
  }
  const absent = await readFile(path.join(root, 'database', 'reference', 'referenced-objects-absent.csv'), 'utf8');
  assert.match(absent, /^public\.follows,/m);
  assert.match(absent, /^public\.user_statuses,/m);
  assert.match(absent, /^public\.user_subscriptions,/m);
  const upserts = await readFile(path.join(root, 'database', 'reference', 'upsert-contracts.csv'), 'utf8');
  assert.match(upserts, /comment_moderation,id,absent\/indetermine/);
});
