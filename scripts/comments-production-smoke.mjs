// Opt-in production smoke: only the newly created E2E Clip comment is deleted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
assert(process.env.COMMENTS_PRODUCTION_SMOKE === '1', 'Explicit production smoke opt-in required');
assert(process.env.SYNAURA_E2E_EMAIL && process.env.SYNAURA_E2E_PASSWORD, 'Existing E2E account required');
const base = 'https://synaura.fr';
const output = path.resolve('artifacts/comments-production-smoke');
await fs.mkdir(output, { recursive: true });
const result = { startedAt: new Date().toISOString(), status: 'RUNNING', checks: [], pageErrors: [], httpErrors: [], cleanup: [], limitations: ['Android OS keyboard untested', 'Real NVDA untested', 'Test analytics events/plays suppressed'] };
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(45000);
page.setDefaultNavigationTimeout(90000);
let fixture;
const ready = async s => { const h = await page.waitForSelector(s, { visible: true }); await h?.dispose(); };
const api = (url, method = 'GET', body) => page.evaluate(async (url, method, body) => {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}, url, method, body);
const check = (name, ok) => { result.checks.push({ name, ok: Boolean(ok) }); assert(ok, name); };
const capture = name => page.screenshot({ path: path.join(output, name + '.png') });
const close = async () => { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('[data-comments-entity]')); };
const sshFileExists = (clipId, commentId) => {
  assert(/^[a-zA-Z0-9_-]+$/.test(clipId) && /^[a-zA-Z0-9_-]+$/.test(commentId));
  const target = `/mnt/Synaura-SSD/apps/synaura/data/music-clip-interactions/comments/${clipId}/${commentId}.json`;
  const value = execFileSync('ssh', ['-i', path.join(os.homedir(), '.ssh/id_ed25519_weyra'), '-o', 'BatchMode=yes', 'synaura@192.168.1.43', `if test -s '${target}'; then echo PRESENT; else echo ABSENT; fi`], { encoding: 'utf8', timeout: 15000 }).trim();
  assert(['PRESENT', 'ABSENT'].includes(value));
  return value === 'PRESENT';
};
page.on('pageerror', e => result.pageErrors.push(e.message));
page.on('response', r => {
  if (r.status() >= 400) { const u = new URL(r.url()); result.httpErrors.push({ status: r.status(), host: u.host, path: u.pathname }); }
});
await page.setRequestInterception(true);
page.on('request', r => {
  if (r.method() === 'POST' && /\/api\/(?:tracks|music-clips)\/[^/]+\/(?:events|plays)$/.test(new URL(r.url()).pathname)) void r.respond({ status: 200, contentType: 'application/json', body: '{"accepted":true}' });
  else void r.continue();
});
await page.evaluateOnNewDocument(() => {
  window.__commentsAudioCalls = [];
  for (const name of ['play', 'pause', 'load']) {
    const original = HTMLMediaElement.prototype[name];
    HTMLMediaElement.prototype[name] = function (...args) { if (this.tagName === 'AUDIO') window.__commentsAudioCalls.push(name); return original.apply(this, args); };
  }
  const time = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
  Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', { ...time, set(value) { if (this.tagName === 'AUDIO') window.__commentsAudioCalls.push('seek'); return time.set.call(this, value); } });
});
try {
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(base + '/auth/signin'); await ready('input[type="email"]');
  await page.type('input[type="email"]', process.env.SYNAURA_E2E_EMAIL);
  await page.type('input[type="password"]', process.env.SYNAURA_E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !location.pathname.startsWith('/auth/signin'));
  const session = await api('/api/auth/session');
  check('Authenticated existing E2E account', Boolean(session.body.user?.id));
  await page.goto(base + '/live', { waitUntil: 'networkidle2' });
  const trigger = '[data-active="true"] button[aria-label^="Commentaires de "]';
  await ready(trigger);
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Ouvrir le Flow')?.click());
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => { window.__commentsAudioCalls = []; });
  await page.click(trigger); await ready('[data-comments-state="loaded"]');
  const entity = await page.$eval('[data-comments-entity]', e => e.dataset.commentsEntity);
  check('Live opens Track Comments', entity.startsWith('track:'));
  result.trackId = entity.slice(6);
  check('Opening Comments makes no audio mutation', await page.evaluate(() => window.__commentsAudioCalls.length === 0));
  await capture('production-conversation');
  await page.click('#comments-tab-moments'); await ready('[data-musical-waveform]');
  check('Moments selected', await page.$eval('#comments-tab-moments', e => e.getAttribute('aria-selected') === 'true'));
  await capture('production-moments');
  await page.evaluate(() => { window.__commentsAudioCalls = []; }); await close();
  check('Closing Comments makes no audio mutation', await page.evaluate(() => window.__commentsAudioCalls.length === 0));
  const trackRead = await api(`/api/tracks/${result.trackId}/comments`);
  check('Public Track comments read', trackRead.status === 200);
  await page.goto(base + '/track/' + result.trackId, { waitUntil: 'networkidle2' });
  await ready(`[data-context-surface-trigger-key="track-comments-${result.trackId}"]`);
  await page.click(`[data-context-surface-trigger-key="track-comments-${result.trackId}"]`);
  await ready('[data-comments-state="loaded"]');
  check('Track route keeps canonical entity', await page.$eval('[data-comments-entity]', (e, id) => e.dataset.commentsEntity === 'track:' + id, result.trackId));
  check('No second controlled musical element on Track route', await page.$$eval('audio[controls]', rows => rows.length === 0));
  const posts = await api('/api/posts?limit=5'); result.postId = posts.body.posts?.[0]?.id; assert(result.postId);
  await page.goto(base + '/posts/' + result.postId, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Commentaires')));
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Commentaires')).click());
  await ready('[data-comments-state="loaded"]');
  check('Post entity and contract', await page.$eval('[data-comments-entity]', (e, id) => e.dataset.commentsEntity === 'post:' + id, result.postId) && await page.$('#comments-tab-moments') === null);
  await capture('production-post');
  await page.goto(base + '/live?filter=clips', { waitUntil: 'networkidle2' });
  const clipTrigger = '[data-active="true"] button[aria-label="Commentaires du clip"]';
  await ready(clipTrigger); await page.click(clipTrigger); await ready('[data-comments-state="loaded"]');
  const clipEntity = await page.$eval('[data-comments-entity]', e => e.dataset.commentsEntity);
  check('Clip entity is not source Track', clipEntity.startsWith('clip:') && new URL(page.url()).pathname === '/live');
  const clipId = clipEntity.slice(5); result.clipId = clipId;
  const endpoint = `/api/music-clips/${clipId}/comments`;
  const before = await api(endpoint + '?limit=30'); assert.equal(before.status, 200);
  const content = `Validation technique temporaire 4B.4 ${Date.now()} — suppression après contrôle.`;
  const created = await api(endpoint, 'POST', { content });
  if (created.body.comment?.id) fixture = { clipId, id: created.body.comment.id, endpoint, beforeCount: before.body.commentsCount };
  assert.equal(created.status, 201); assert(fixture);
  check('Clip comment belongs to E2E account', created.body.comment.user.id === session.body.user.id);
  check('Clip comment persisted on real SSD', sshFileExists(clipId, fixture.id));
  const after = await api(endpoint + '?limit=30');
  check('Clip SSD API read returns exact fixture', after.status === 200 && after.body.comments.some(c => c.id === fixture.id && c.content === content));
  await page.goto(base + '/live?filter=clips&clipId=' + encodeURIComponent(clipId), { waitUntil: 'networkidle2' });
  await ready(clipTrigger); await page.click(clipTrigger); await ready('[data-comments-state="loaded"]');
  await ready(`[data-comment-id="${fixture.id}"]`);
  check('Clip fixture rendered in its own UI', new URL(page.url()).pathname === '/live');
  await capture('production-clip-ssd');
  check('No JavaScript page errors', result.pageErrors.length === 0);
  result.status = 'PASS';
} catch (error) { result.status = 'FAIL'; result.error = String(error.stack || error); process.exitCode = 1; }
finally {
  if (fixture) {
    try {
      const deleted = await api(`${fixture.endpoint}/${fixture.id}`, 'DELETE');
      assert.equal(deleted.status, 200);
      const after = await api(fixture.endpoint + '?limit=30');
      assert.equal(after.status, 200);
      assert(!after.body.comments.some(c => c.id === fixture.id));
      assert(!sshFileExists(fixture.clipId, fixture.id));
      result.cleanup.push({ clipId: fixture.clipId, commentId: fixture.id, deletedOnlyOwnFixture: true, fileAbsent: true, beforeCount: fixture.beforeCount, afterCount: after.body.commentsCount });
      assert.equal(after.body.commentsCount, fixture.beforeCount, 'Count changed: inspect concurrent activity, do not delete other content');
    } catch (error) { result.status = 'FAIL'; result.cleanupError = String(error); process.exitCode = 1; }
  }
  result.completedAt = new Date().toISOString();
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}
