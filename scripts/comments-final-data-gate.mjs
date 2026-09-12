// Explicit opt-in, bounded E2E records only. Run against the localhost candidate.
// The parent is seeded directly to avoid notifying an unrelated creator.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import pg from 'pg';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
assert.equal(process.env.COMMENTS_FINAL_DATA_GATE, '1', 'Explicit test-data opt-in required');
assert(new URL(process.env.DATABASE_URL).hostname === '127.0.0.1', 'Use the audited local tunnel');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
const browser = await puppeteer.launch({ headless: true }); const page = await browser.newPage();
page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(90000);
const track = 'track_1758481606741_trwopq702', parent = randomUUID();
const prefix = '[TEST PHASE 4B.4 FINAL ' + parent + ']';
const result = { checks: [], errors: [], cleanup: [] }; let viewer, reply, reaction;
const output = 'docs/comments-moments-phase4b4-captures/final-validation';
const ready = async s => { const h = await page.waitForSelector(s); await h?.dispose(); };
const check = (name, ok, detail) => { result.checks.push({ name, ok: Boolean(ok), detail }); assert(ok, name); };
const api = (suffix, method = 'GET', body) => page.evaluate(async (url, method, body) => { const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, body: await r.json() }; }, '/api/tracks/' + track + suffix, method, body);
const anonymous = async suffix => { const r = await fetch('http://localhost:3000/api/tracks/' + track + suffix); return { status: r.status, body: await r.json() }; };
const publicIncludes = async id => { const r = await anonymous('/comments?limit=100'); assert.equal(r.status, 200); return JSON.stringify(r.body.comments).includes(id); };
page.on('pageerror', e => result.errors.push(e.message));
try {
  await page.goto('http://localhost:3000/auth/signin'); await ready('input[type="email"]');
  await page.type('input[type="email"]', process.env.SYNAURA_E2E_EMAIL); await page.type('input[type="password"]', process.env.SYNAURA_E2E_PASSWORD); await page.click('button[type="submit"]');
  await page.waitForFunction(() => !location.pathname.startsWith('/auth/signin'));
  viewer = await page.evaluate(async () => (await (await fetch('/api/auth/session')).json()).user.id);
  assert.equal(viewer, '54b3f066-6255-474b-b62c-654d1640a79c');
  const target = (await db.query('SELECT creator_id,is_public FROM tracks WHERE id=$1', [track])).rows[0]; assert(target?.is_public);
  await db.query('INSERT INTO comments(id,track_id,user_id,content,timestamp_seconds) VALUES ($1,$2,$3,$4,12)', [parent, track, viewer, prefix + ' Repère temporaire']);
  check('timestamped fixture is publicly readable', await publicIncludes(parent));
  const liked = await api('/comments/' + parent + '/like', 'POST'); check('real like', liked.status === 200 && liked.body.isLiked === true);
  const unliked = await api('/comments/' + parent + '/like', 'POST'); check('real unlike', unliked.status === 200 && unliked.body.isLiked === false);
  const response = await api('/comments/' + parent + '/replies', 'POST', { content: prefix + ' Réponse temporaire' });
  reply = response.body.reply?.id; check('real reply POST', response.status === 200 && Boolean(reply));
  check('reply publicly readable', await publicIncludes(reply));
  const forbidden = await api('/comments/' + parent + '/moderation', 'POST', { action: 'filter' }); check('non-creator moderation denied', forbidden.status === 403);
  // Seed moderation state on this fixture only; this is not an authorized-creator UI test.
  await db.query('INSERT INTO comment_moderation(comment_id,track_id,creator_id,is_filtered) VALUES($1,$2,$3,true)', [parent, track, target.creator_id]);
  check('creator-filtered fixture absent from anonymous endpoint', !(await publicIncludes(parent)) && !(await publicIncludes(reply)));
  await db.query('DELETE FROM comment_moderation WHERE comment_id=$1 AND creator_id=$2', [parent, target.creator_id]);
  check('fixture restored for author deletion test', await publicIncludes(parent));
  const existingReaction = await db.query('SELECT id FROM track_moment_reactions WHERE track_id=$1 AND user_id=$2 AND reaction_type=$3 AND timestamp_seconds=$4', [track, viewer, 'production', 137]);
  assert.equal(existingReaction.rowCount, 0, 'Never overwrite an existing reaction');
  const reacted = await api('/reactions', 'POST', { reactionType: 'production', timestampSeconds: 137 }); reaction = reacted.body.reaction?.id;
  check('real timestamp reaction POST', reacted.status === 200 && Boolean(reaction));
  check('real reaction readable', JSON.stringify((await anonymous('/reactions')).body).includes(reaction));
  const delReply = await api('/comments/' + reply, 'DELETE'); check('author reply deletion', delReply.status === 200);
  check('deleted reply never returned publicly', !(await publicIncludes(reply)));
  const delParent = await api('/comments/' + parent, 'DELETE'); check('author parent deletion', delParent.status === 200);
  check('deleted parent never returned publicly', !(await publicIncludes(parent)));
  for (const suffix of ['/comments/moderation?view=public&limit=100', '/comments/moderation?timestampedOnly=1&limit=100', '/comments?view=creator&includeDeleted=true&includeFiltered=true&limit=100']) {
    const read = await anonymous(suffix); check('anonymous hidden records excluded: ' + suffix, read.status === 200 && !JSON.stringify(read.body.comments).includes(parent) && !JSON.stringify(read.body.comments).includes(reply));
  }
  result.status = 'PASS';
} catch (e) { result.status = 'FAIL'; result.error = String(e.stack || e); process.exitCode = 1; }
finally {
  try {
    await db.query('BEGIN');
    const ids = [parent, reply].filter(Boolean);
    const owned = (await db.query('SELECT id FROM comments WHERE id=ANY($1::uuid[]) AND user_id=$2 AND content LIKE $3', [ids, viewer, prefix + '%'])).rows.map(r => r.id);
    if (owned.length) {
      await db.query('DELETE FROM comment_moderation WHERE comment_id=ANY($1::uuid[])', [owned]);
      const removed = await db.query('DELETE FROM comments WHERE id=ANY($1::uuid[]) AND user_id=$2 AND content LIKE $3 RETURNING id', [owned, viewer, prefix + '%']); result.cleanup.push({ commentsRemoved: removed.rowCount });
    }
    if (reaction) { const removed = await db.query('DELETE FROM track_moment_reactions WHERE id=$1 AND track_id=$2 AND user_id=$3 AND reaction_type=$4 AND timestamp_seconds=137 RETURNING id', [reaction, track, viewer, 'production']); assert.equal(removed.rowCount, 1); result.cleanup.push({ reactionRemoved: removed.rowCount }); }
    await db.query('COMMIT');
    const remaining = await db.query('SELECT count(*)::int AS n FROM comments WHERE id=ANY($1::uuid[])', [ids]); check('no test comment remains', remaining.rows[0].n === 0);
    if (reaction) check('no test reaction remains', (await db.query('SELECT id FROM track_moment_reactions WHERE id=$1', [reaction])).rowCount === 0);
  } catch (e) { await db.query('ROLLBACK').catch(() => {}); result.cleanupError = String(e); result.fixtureIds = { parent, reply, reaction }; process.exitCode = 1; }
  await fs.mkdir(output, { recursive: true }); await fs.writeFile(output + '/data-results.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2)); await db.end(); await browser.close();
}
