// Isolated regression runner. No deployment and no production credentials in artifacts.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
const base = process.env.SYNAURA_E2E_BASE_URL || 'http://localhost:3000';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Run candidate tests locally only');
const writes = process.env.COMMENTS_E2E_MUTATIONS === '1';
const output = path.resolve(process.env.COMMENTS_E2E_OUTPUT || 'docs/comments-moments-phase4b4-captures');
await fs.mkdir(output, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(90000);
const result = { status: 'RUNNING', mutationsEnabled: writes, checks: [], captures: [], requests: [], errors: [], cleanup: [] };
const created = [];
let trackId;
page.on('pageerror', e => result.errors.push(String(e.message).slice(0, 300)));
await page.setRequestInterception(true);
page.on('request', request => {
  const url = new URL(request.url());
  if (/\/api\/tracks\/[^/]+\/(events|plays)$/.test(url.pathname) && request.method() === 'POST') {
    void request.respond({ status: 200, contentType: 'application/json', body: '{"accepted":true}' });
  } else { if (/\/(comments|reactions|waveform)(\/|$)/.test(url.pathname)) result.requests.push({ method: request.method(), path: url.pathname + url.search }); void request.continue(); }
});
const ready = async selector => { const handle = await page.waitForSelector(selector); await handle?.dispose(); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const check = (name, ok, detail) => { result.checks.push({ name, ok: Boolean(ok), detail }); assert(ok, name + ': ' + JSON.stringify(detail)); };
const api = (url, method = 'GET', data) => page.evaluate(async (url, method, data) => {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
  return { status: response.status, body: await response.json() };
}, url, method, data);
const state = () => page.evaluate(() => ({
  core: window.__synauraAudioCore?.(),
  item: document.querySelector('[data-feed-item-id][data-active="true"]')?.getAttribute('data-feed-item-id'),
  scroll: document.querySelector('[data-testid="synaura-scroll-feed"]')?.scrollTop,
  slides: document.querySelectorAll('section[data-feed-item-id]').length,
  focus: document.activeElement?.getAttribute('data-context-surface-trigger-key'),
}));
function invariant(a, b, name) {
  const fields = ['instanceId', 'trackId', 'playbackState', 'activeSecondaryPlayers'];
  check(name, a.item === b.item && a.scroll === b.scroll && fields.every(k => a.core[k] === b.core[k]) && JSON.stringify(a.core.queueIds) === JSON.stringify(b.core.queueIds), { before: a, after: b });
}
const capture = async name => { await wait(250); await page.screenshot({ path: path.join(output, name + '.png') }); result.captures.push(name + '.png'); };
const trigger = '[data-feed-item-id][data-active="true"] button[aria-label^="Commentaires de "]';
const open = async () => { const start = performance.now(); await page.click(trigger); await ready('[data-comments-state="loaded"]'); return performance.now() - start; };
const close = async () => { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('[data-context-surface="comments"]')); await wait(150); };
const button = async text => {
  const clicked = await page.evaluate(text => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.trim() === text); if (b && !b.disabled) { b.click(); return true; } return false; }, text);
  assert(clicked, `Button unavailable: ${text}`);
};
try {
  await page.setViewport({ width: 1440, height: 900 });
  assert(process.env.SYNAURA_E2E_EMAIL && process.env.SYNAURA_E2E_PASSWORD, 'Test account required');
  await page.goto(base + '/auth/signin', { waitUntil: 'networkidle2' });
  await ready('input[type="email"]');
  await page.type('input[type="email"]', process.env.SYNAURA_E2E_EMAIL);
  await page.type('input[type="password"]', process.env.SYNAURA_E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !location.pathname.startsWith('/auth/signin'));
  await page.goto(base + '/dev/live', { waitUntil: 'networkidle2' });
  await ready(trigger);
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Ouvrir le Flow')?.click());
  await page.waitForFunction(() => Boolean(window.__synauraAudioCore?.().trackId));
  // Explicit playback only; opening the surface must not create this action.
  await page.evaluate(() => document.querySelector('button[aria-label="Play"]')?.click());
  await page.waitForFunction(() => window.__synauraAudioCore?.().playbackState === 'playing');
  const before = await state(); trackId = before.core.trackId;
  const endpoint = `/api/tracks/${encodeURIComponent(trackId)}/comments`;
  const inactiveFetches = result.requests.filter(r => r.method === 'GET' && /\/comments/.test(r.path) && !r.path.includes(encodeURIComponent(trackId)));
  check('no inactive comments fetch', inactiveFetches.length === 0, inactiveFetches);
  result.firstOpenMs = await open();
  invariant(before, await state(), 'open preserves Live and audio');
  await capture('desktop-conversation-1440');
  await page.click('[role="tab"]#comments-tab-moments');
  await capture('desktop-moments-1440');
  await page.click('[aria-label="Position dans le morceau"][type="range"]');
  const sought = await state();
  check('explicit waveform seek', Math.abs(sought.core.position - before.core.position) > 1);
  const captureButton = '[data-context-surface="comments"] button';
  await page.evaluate(() => [...document.querySelectorAll('[data-context-surface="comments"] button')].find(b => b.textContent.startsWith('Commenter à '))?.click());
  const frozen = await page.$eval('[data-context-surface="comments"] footer', e => e.innerText.match(/Commentaire à \d+:\d+/)?.[0]);
  await page.type('textarea[aria-label="Votre commentaire"]', writes ? '[TEST PHASE 4B.4] Repère musical temporaire — suppression après contrôle.' : 'Brouillon de validation, non envoyé');
  await wait(1100);
  check('timestamp frozen while typing', frozen === await page.$eval('[data-context-surface="comments"] footer', e => e.innerText.match(/Commentaire à \d+:\d+/)?.[0]), frozen);
  if (writes) {
    const response = page.waitForResponse(r => r.url().endsWith(endpoint) && r.request().method() === 'POST');
    await page.click('button[aria-label="Envoyer le commentaire"]');
    const posted = await response; const body = await posted.json();
    assert(posted.ok(), JSON.stringify(body)); created.push(body.comment.id); result.createdCommentIds = [...created];
    await ready(`[data-comment-id="${created[0]}"]`);
    await page.click(`[data-comment-id="${created[0]}"] button[aria-label^="Aimer "]`);
    await ready(`[data-comment-id="${created[0]}"] button[aria-pressed="true"]`);
    await page.click(`[data-comment-id="${created[0]}"] button[aria-label^="Aimer "]`);
    await ready(`[data-comment-id="${created[0]}"] button[aria-pressed="false"]`);
    check('like toggles and restores', true);
    await button('Répondre');
    await page.type('textarea', '[TEST PHASE 4B.4] Réponse temporaire.');
    const replied = page.waitForResponse(r => r.url().endsWith('/replies') && r.request().method() === 'POST');
    await page.click('button[aria-label="Envoyer le commentaire"]');
    const replyResponse = await replied; const reply = await replyResponse.json();
    assert(replyResponse.ok()); created.push(reply.reply.id); result.createdCommentIds = [...created];
    await ready(`[data-comment-id="${created[1]}"]`);
    check('timestamped creation and reply', true);
    await page.click('[data-musical-waveform] button');
    await ready('[data-moment-cluster-detail]');
    await capture('desktop-cluster-1440');
    const author = `[data-comment-id="${created[0]}"] button[aria-label^="Aperçu de "]`;
    const authorKey = await page.$eval(author, e => e.dataset.contextSurfaceTriggerKey);
    await page.click(author);
    await ready('[data-profile-peek-state="loaded"]');
    await capture('desktop-nested-profile-1440');
    await page.goBack(); await ready('[data-comments-state="loaded"]'); await wait(200);
    check('nested Back restores author focus', (await state()).focus === authorKey, await state());
  }
  await page.setViewport({ width: 1920, height: 1080 }); await capture('desktop-comments-1920');
  await page.setViewport({ width: 390, height: 844 });
  await page.click('#comments-tab-conversation'); await capture('mobile-conversation-390');
  await page.click('#comments-tab-moments'); await capture('mobile-moments-390');
  if (writes) {
    await page.click('[data-musical-waveform] button'); await capture('mobile-marker-390');
    await page.click(`[data-comment-id="${created[0]}"] button[aria-label^="Aperçu de "]`);
    await ready('[data-profile-peek-state="loaded"]'); await capture('mobile-nested-profile-390');
    await page.goBack(); await ready('[data-comments-state="loaded"]');
  }
  await page.focus('textarea'); await capture('mobile-composer-focused-390');
  result.virtualKeyboard = 'NOT TESTED: desktop Chromium does not display an OS mobile keyboard';
  result.mobileGeometry = await page.evaluate(() => { const s = document.querySelector('.comments-surface'); const p = document.querySelector('#comments-panel'); const f = s.querySelector('footer'); return { height: s.clientHeight, viewport: innerHeight, scrollHeight: p.clientHeight, footerBottom: f.getBoundingClientRect().bottom, horizontalOverflow: s.scrollWidth > s.clientWidth }; });
  check('mobile sheet bounded and composer visible', result.mobileGeometry.height <= 844 && result.mobileGeometry.footerBottom <= 845 && result.mobileGeometry.scrollHeight > 80 && !result.mobileGeometry.horizontalOverflow, result.mobileGeometry);
  await close();
  const preCycles = await state();
  await page.setViewport({ width: 1440, height: 900 }); await wait(200);
  const cdp = await page.createCDPSession();
  await cdp.send('HeapProfiler.collectGarbage'); result.metricsBefore = { ...(await page.metrics()), ...(await cdp.send('Memory.getDOMCounters')) };
  const warm = []; const requestStart = result.requests.length;
  for (let i = 0; i < 20; i++) { warm.push(await open()); await close(); }
  await wait(500); await cdp.send('HeapProfiler.collectGarbage'); result.metricsAfter = { ...(await page.metrics()), ...(await cdp.send('Memory.getDOMCounters')) };
  warm.sort((a, b) => a - b); result.warm = { samples: warm.length, p50: warm[9], p95: warm[18], requests: result.requests.slice(requestStart) };
  check('warm cache reopen has no fetch', result.warm.requests.length === 0, result.warm);
  check('bounded Live slides', (await state()).slides <= 11, await state());
  check('same audio instance after 20 cycles', (await state()).core.instanceId === preCycles.core.instanceId);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await open(); await page.keyboard.press('Tab');
  check('keyboard focus within dialog', await page.evaluate(() => Boolean(document.activeElement.closest('[role="dialog"]'))));
  await close();
  const missing = await api('/api/tracks/phase4b4-nonexistent/comments'); check('missing entity 404', missing.status === 404);
  if (process.env.COMMENTS_E2E_EXTENDED === '1') {
    // Shared Track route, without a second musical element.
    await open(); await button('Ouvrir le morceau');
    await page.waitForFunction(id => location.pathname === '/track/' + id, {}, trackId);
    await wait(700);
    check('canonical Track has no secondary audio', await page.evaluate(() => document.querySelectorAll('audio[controls]').length === 0));
    const trackCommentButton = await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Commentaires'))?.textContent);
    check('canonical Track shares comments entry', Boolean(trackCommentButton));
    await page.goBack(); await ready(trigger);
    check('canonical Back restores same Live item', (await state()).item === before.item, await state());
    const postButton = 'section[data-feed-item-type="post"] button[aria-label="Commentaires du post"]';
    if (await page.$eval(postButton, e => Boolean(e)).catch(() => false)) {
      await page.click(postButton); await ready('[data-comments-state="loaded"]');
      const postEntity = await page.$eval('[data-comments-entity]', e => e.dataset.commentsEntity);
      check('Post identity without invented moments', postEntity.startsWith('post:') && !(await page.$('#comments-tab-moments')));
      await close();
    } else result.checks.push({ name: 'Post UI', ok: null, detail: 'No post in current rendered window' });
    await page.goto(base + '/dev/live?filter=clips', { waitUntil: 'networkidle2' });
    await ready('section[data-feed-item-type="clip"]');
    const clipButton = 'section[data-feed-item-type="clip"][data-active="true"] button[aria-label^="Commentaires"]';
    await ready(clipButton); await page.click(clipButton); await ready('[data-comments-state="loaded"]');
    check('Clip uses own social identity', (await page.$eval('[data-comments-entity]', e => e.dataset.commentsEntity)).startsWith('clip:'));
    await close();
    const cold = [];
    for (let i = 0; i < 5; i++) {
      await page.goto(base + '/dev/live', { waitUntil: 'networkidle2' }); await ready(trigger);
      await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Ouvrir le Flow')?.click());
      cold.push(await open()); await close();
    }
    cold.sort((a,b) => a-b); result.cold = { n: cold.length, p50: cold[2], p95: cold[4], samples: cold, environment: 'Next development; fresh document/cache, warmed server compiler' };
    await open();
    result.frames = await page.evaluate(() => new Promise(resolve => {
      const gaps = []; let previous; const start = performance.now();
      const tick = now => { if (previous != null) gaps.push(now - previous); previous = now; if (now - start < 3000) requestAnimationFrame(tick); else { const sorted = [...gaps].sort((a,b)=>a-b); const baseline = sorted[Math.floor(sorted.length/2)] || 16.67; resolve({ frames: gaps.length, baselineMs: baseline, gapsOver1_5Frames: gaps.filter(g=>g>baseline*1.5).length, maxGapMs: Math.max(...gaps), method: 'rAF gaps; proxy, not compositor dropped-frame telemetry' }); } }; requestAnimationFrame(tick);
    }));
    await close();
  }
  result.status = 'PASS';
} catch (e) { result.status = 'FAIL'; result.failure = String(e.stack || e); process.exitCode = 1; }
finally {
  for (const id of [...created].reverse()) {
    try { const r = await api(`/api/tracks/${encodeURIComponent(trackId)}/comments/${encodeURIComponent(id)}`, 'DELETE'); result.cleanup.push({ id, status: r.status }); if (r.status !== 200) process.exitCode = 1; } catch (e) { result.cleanup.push({ id, error: String(e) }); process.exitCode = 1; }
  }
  await fs.writeFile(path.join(output, 'gate-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ status: result.status, failure: result.failure, checks: result.checks.map(({ name, ok }) => ({ name, ok })), cleanup: result.cleanup, captures: result.captures, warm: result.warm }, null, 2));
  await browser.close();
}
