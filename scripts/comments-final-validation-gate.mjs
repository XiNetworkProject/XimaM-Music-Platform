// Candidate-only UI validation. Never deploys; social mutations are disabled.
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import readline from 'node:readline';
import path from 'node:path';
import { downsamplePeaks } from '../lib/waveform.ts';
dotenv.config({ path: '.env.local', quiet: true });
const output = 'docs/comments-moments-phase4b4-captures/final-validation';
await fs.mkdir(output, { recursive: true });
const result = { checks: [], errors: [], consoleErrors: [], httpErrors: [], delayed: [], failures: [], captures: [] };
const browser = await puppeteer.launch({ headless: false, pipe: true, enableExtensions: true, defaultViewport: null, args: ['--window-size=1440,1000', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const nativeWindow = await page.createCDPSession();
const { windowId } = await nativeWindow.send('Browser.getWindowForTarget');
await nativeWindow.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
await nativeWindow.send('Browser.setWindowBounds', { windowId, bounds: { width: 1440, height: 1000 } });
page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(90000);
const wait = ms => new Promise(r => setTimeout(r, ms));
const ready = async s => { const h = await page.waitForSelector(s); await h?.dispose(); };
const save = () => fs.writeFile(output + '/results.json', JSON.stringify(result, null, 2));
const check = (name, ok, detail) => { result.checks.push({ name, ok: Boolean(ok), detail }); console.log(name + ': ' + (ok ? 'PASS' : 'FAIL')); assert(ok, name); };
const capture = async name => { await page.screenshot({ path: output + '/' + name + '.png' }); result.captures.push(name + '.png'); };
let delay = 0;
const waveformPayloads = new Map();
page.on('pageerror', e => result.errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') result.consoleErrors.push(m.text().slice(0, 250)); });
page.on('response', async r => { if (r.status() >= 400) result.httpErrors.push({ path: new URL(r.url()).pathname, method: r.request().method(), status: r.status(), ...(/\/waveform$/.test(r.url()) ? { body: await r.text().catch(() => '') } : {}) }); });
// Real published records, deterministic ordering only in this isolated browser.
const seedIds = ['track_1758481606741_trwopq702', 'track_1773789112971_0egfpy0i2', 'track_1782517870229_4_vjgv7x3'];
const seedTracks = await Promise.all(seedIds.map(async id => { const r = await fetch('http://localhost:3000/api/tracks/' + id); assert(r.ok); return r.json(); }));
result.feedFixture = { kind: 'real public records, test-only ordering', ids: seedIds };
await page.evaluateOnNewDocument(() => {
  const calls = { play: 0, pause: 0, seek: 0, load: 0 };
  window.__finalMediaCalls = calls;
  for (const name of ['play', 'pause', 'load']) {
    const original = HTMLMediaElement.prototype[name];
    HTMLMediaElement.prototype[name] = function (...args) { if (this.tagName === 'AUDIO') calls[name]++; return original.apply(this, args); };
  }
  const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
  Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', { ...descriptor, set(value) { if (this.tagName === 'AUDIO') calls.seek++; descriptor.set.call(this, value); } });
});
await page.setRequestInterception(true);
page.on('request', async request => {
  try {
    const url = new URL(request.url());
    if (/\/waveform$/.test(url.pathname) && request.method() === 'POST') waveformPayloads.set(url.pathname.split('/')[3], JSON.parse(request.postData()));
    if (url.pathname === '/api/ranking/feed') return await request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ tracks: seedTracks, hasMore: false, nextCursor: 3 }) });
    if (/\/api\/tracks\/[^/]+\/(events|plays)$/.test(url.pathname) && request.method() === 'POST') return await request.respond({ status: 200, contentType: 'application/json', body: '{"accepted":true}' });
    if (request.method() !== 'GET' && /\/(comments|reactions)(\/|$)/.test(url.pathname)) return await request.abort();
    if (delay && /\/(comments|reactions|waveform)(\/|$)/.test(url.pathname)) {
      result.delayed.push({ path: url.pathname, delay }); await wait(delay);
    }
    if (!request.isInterceptResolutionHandled()) await request.continue();
  } catch (e) { result.failures.push({ path: new URL(request.url()).pathname, error: String(e).slice(0, 120) }); }
});
page.on('requestfailed', request => { if (/\/(comments|reactions|waveform)(\/|$)/.test(request.url())) result.failures.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText }); });
const trigger = '[data-active="true"] button[aria-label^="Commentaires de "]';
const active = () => page.$eval('[data-feed-item-id][data-active="true"]', e => e.dataset.feedItemId);
const open = async (loaded = true) => { await page.$eval(trigger, e => e.click()); await ready('[data-comments-entity]'); if (loaded) await ready('[data-comments-state="loaded"]'); };
const close = async () => { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('[data-comments-entity]')); await wait(450); };
const next = async () => { const old = await active(); await page.$eval('[aria-label="Item suivant"]', e => e.click()); await page.waitForFunction(old => document.querySelector('[data-feed-item-id][data-active="true"]')?.getAttribute('data-feed-item-id') !== old, { polling: 100 }, old); await ready(trigger); await wait(400); };
const previous = async () => { const old = await active(); await page.$eval('[aria-label="Item précédent"]', e => e.click()); await page.waitForFunction(old => document.querySelector('[data-feed-item-id][data-active="true"]')?.getAttribute('data-feed-item-id') !== old, { polling: 100 }, old); await ready(trigger); await wait(400); };
const snapshot = () => page.evaluate(() => ({ core: window.__synauraAudioCore?.(), calls: { ...window.__finalMediaCalls }, entity: document.querySelector('[data-comments-entity]')?.getAttribute('data-comments-entity'), draft: document.querySelector('textarea')?.value, mode: document.querySelector('[role="tab"][aria-selected="true"]')?.id, selection: document.querySelector('[data-moment-cluster-detail]')?.textContent, focus: document.activeElement?.getAttribute('data-context-surface-trigger-key') }));
const geometry = () => page.evaluate(() => { const s = document.querySelector('.comments-surface'), p = document.querySelector('#comments-panel'), f = s?.querySelector('footer'); return { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, viewport: visualViewport?.height, surface: s && { width: s.clientWidth, scrollWidth: s.scrollWidth, height: s.clientHeight }, panel: p && { height: p.clientHeight, scrollHeight: p.scrollHeight }, footer: f && { top: f.getBoundingClientRect().top, bottom: f.getBoundingClientRect().bottom } }; } );
const sameAudio = (a, b) => JSON.stringify(a.calls) === JSON.stringify(b.calls) && ['instanceId','trackId','generation','playbackState'].every(k => a.core?.[k] === b.core?.[k]) && JSON.stringify(a.core?.queueIds) === JSON.stringify(b.core?.queueIds);
async function rapid() {
  await page.goto('http://localhost:3000/dev/live', { waitUntil: 'networkidle2' }); await ready(trigger);
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Ouvrir le Flow')?.click());
  await page.waitForFunction(() => !!window.__synauraAudioCore?.().trackId); await wait(2000);
  delay = 3500;
  const a = await active(); console.log('A', a); await open(false); await close();
  await next(); const b = await active(); console.log('B', b); await open(false); await close();
  await next(); const c = await active(); await open(false); await ready('[data-comments-state="loaded"]'); await wait(4500);
  const cState = await snapshot();
  check('rapid A/B/C entity remains C after delayed responses', cState.entity === c.replace(/^track-/, 'track:'), { a, b, c, final: cState.entity });
  check('rapid C receives no draft', cState.draft === '');
  result.rapidDom = await page.evaluate(() => ({ entity: document.querySelector('[data-comments-entity]').dataset.commentsEntity, ids: [...document.querySelectorAll('[data-comment-id]')].map(e => e.dataset.commentId), waveform: document.querySelector('[data-musical-waveform]')?.textContent }));
  const cComments = await (await fetch('http://localhost:3000/api/tracks/' + seedIds[2] + '/comments?limit=100')).json();
  const allowedIds = cComments.comments.flatMap(c => [c.id, ...c.replies.map(r => r.id)]);
  check('C contains no comments from A/B', result.rapidDom.ids.every(id => allowedIds.includes(id)), result.rapidDom.ids);
  const cWaveform = await (await fetch('http://localhost:3000/api/tracks/' + seedIds[2] + '/waveform')).json();
  const expectedPeaks = cWaveform.cached ? cWaveform.peaks : waveformPayloads.get(seedIds[2])?.peaks;
  assert(expectedPeaks?.length, 'C waveform must finish decoding or load real cache');
  const expectedHeights = downsamplePeaks(expectedPeaks, 90).map(v => Math.max(3, Math.min(100, v * 100)));
  const actualHeights = await page.$$eval('[data-musical-waveform] span[style*="height"]', els => els.map(e => parseFloat(e.style.height)));
  check('C waveform matches C real peaks only', actualHeights.length === expectedHeights.length && actualHeights.every((v,i) => Math.abs(v - expectedHeights[i]) < .001), { bars: actualHeights.length, source: cWaveform.cached ? 'real persisted cache' : 'real C audio decode' });
  await page.type('textarea', 'Draft C — never submitted'); await close();
  delay = 0; await previous(); await previous(); check('returned to A', await active() === a);
  await open(); await page.type('textarea', 'Draft A — never submitted'); await close();
  await next(); await open(); check('B does not inherit A draft', (await snapshot()).draft === ''); await close(); await previous(); await open();
  check('warm A retains its own draft', (await snapshot()).draft === 'Draft A — never submitted');
  await close();
  await page.waitForFunction(() => !!window.__synauraAudioCore?.().trackId);
  const before = await snapshot(); await open(); const opened = await snapshot();
  check('open has zero native play/pause/seek/load and unchanged queue', sameAudio(before, opened), { before, after: opened });
  await close(); const closed = await snapshot();
  check('close has zero native audio mutation and unchanged queue', sameAudio(opened, closed), { before: opened, after: closed });
  await open();
  const beforeMarker = await snapshot(); await page.$eval('[data-musical-waveform] button', e => e.click()); await wait(200);
  const afterMarker = await snapshot();
  check('marker has exactly one explicit seek only', afterMarker.calls.seek - beforeMarker.calls.seek === 1 && ['play','pause','load'].every(k => afterMarker.calls[k] === beforeMarker.calls[k]), { before: beforeMarker.calls, after: afterMarker.calls });
  await nested('desktop');
  result.zoomBefore = await geometry(); await capture('desktop-before-native-zoom');
}
async function nested(label) {
  const author = '[data-comment-id] button[aria-label^="Aperçu de "]';
  const authorKey = await page.$eval(author, e => e.dataset.contextSurfaceTriggerKey);
  const before = await snapshot(); await page.$eval(author, e => e.click()); await ready('[data-profile-peek-state="loaded"]');
  check(label + ' Profile Peek no horizontal overflow', await page.$eval('[data-profile-peek-state="loaded"]', e => e.scrollWidth <= e.clientWidth + 1));
  await capture(label + '-nested-profile'); await page.goBack(); await ready('[data-comments-state="loaded"]'); await wait(200);
  const after = await snapshot();
  check(label + ' nested Back preserves draft/tab/moment/focus/audio', before.draft === after.draft && before.mode === after.mode && before.selection === after.selection && after.focus === authorKey && sameAudio(before, after), { before, after });
}
async function zoom() {
  const g = await geometry(); result.zoom200 = g;
  check('native browser zoom doubles DPR and halves CSS width', Math.abs(g.dpr / result.zoomBefore.dpr - 2) < .05 && Math.abs(g.width / result.zoomBefore.width - .5) < .05, { before: result.zoomBefore, after: g });
  await capture('desktop-conversation-native-200');
  check('200% no horizontal surface overflow', g.surface.scrollWidth <= g.surface.width + 1, g);
  check('200% conversation has usable scroll area', g.panel.height >= 80, g);
  await page.$eval('#comments-tab-moments', e => { e.scrollIntoView({ block: 'center' }); e.click(); }); await capture('desktop-moments-native-200');
  await page.$eval('[data-musical-waveform] button', e => { e.scrollIntoView({ block: 'center' }); e.click(); }); await ready('[data-moment-cluster-detail]'); await capture('desktop-cluster-native-200');
  await nested('native-200');
  await page.focus('textarea'); await page.keyboard.type('\nSecond line\nThird line');
  result.composer200 = await geometry();
  const composerRect = await page.$eval('textarea', e => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
  check('200% composer is reachable inside viewport', composerRect.top >= 0 && composerRect.bottom <= g.height + 1, composerRect);
  await page.$eval('.comments-surface footer button:last-child', e => e.scrollIntoView({ block: 'end' }));
  check('200% footer fully reachable by scroll', (await geometry()).footer.bottom <= g.height + 1, await geometry());
  await capture('desktop-composer-native-200');
}
async function mobileAndReturn() {
  await page.goBack(); await page.waitForFunction(() => !document.querySelector('[data-comments-entity]')); await wait(450);
  check('Back returns to Live with comments-trigger focus', new URL(page.url()).pathname === '/dev/live' && (await snapshot()).focus === 'live-track-comments-' + seedIds[0]);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 }); await open();
  await page.$eval('#comments-tab-conversation', e => e.click()); await capture('mobile-conversation-390');
  await page.$eval('#comments-tab-moments', e => e.click()); await capture('mobile-moments-390');
  const beforeScroll = await page.$eval('[data-testid="synaura-scroll-feed"]', e => e.scrollTop);
  await page.mouse.move(100, 100); await page.mouse.wheel({ deltaY: 500 }); await wait(200);
  check('Live does not scroll behind comments', await page.$eval('[data-testid="synaura-scroll-feed"]', e => e.scrollTop) === beforeScroll);
  await page.focus('textarea'); await page.keyboard.type('\nMobile multiline draft');
  await page.evaluate(() => [...document.querySelectorAll('.comments-surface button')].find(b => b.textContent.startsWith('Commenter à '))?.click());
  await ready('[aria-label="Revenir à un commentaire général"]');
  await page.$eval('[aria-label="Revenir à un commentaire général"]', e => e.click());
  check('mobile timestamp removable without draft loss', (await snapshot()).draft.includes('Mobile multiline draft') && !(await page.$('[aria-label="Revenir à un commentaire général"]')));
  result.mobile = await geometry(); result.realMobileKeyboard = 'NOT AVAILABLE: desktop viewport emulation only';
  check('390x844 composer fits, conversation scrolls', result.mobile.panel.height >= 80 && result.mobile.footer.bottom <= 845 && result.mobile.surface.scrollWidth <= result.mobile.surface.width);
  await capture('mobile-composer-focused-no-os-keyboard');
  await close(); await open();
  await page.evaluate(() => [...document.querySelectorAll('.comments-surface button')].find(b => b.textContent.trim() === 'Ouvrir le morceau').click());
  await page.waitForFunction(id => location.pathname === '/track/' + id, {}, seedIds[0]); await wait(500);
  check('Track route has one musical element only', (await snapshot()).core.musicalAudioElements === 1 && await page.$$eval('audio[controls]', els => els.length) === 0);
}
try {
  await page.goto('http://localhost:3000/auth/signin'); await ready('input[type="email"]');
  assert(process.env.SYNAURA_E2E_EMAIL && process.env.SYNAURA_E2E_PASSWORD);
  await page.type('input[type="email"]', process.env.SYNAURA_E2E_EMAIL); await page.type('input[type="password"]', process.env.SYNAURA_E2E_PASSWORD); await page.click('button[type="submit"]');
  await page.waitForFunction(() => !location.pathname.startsWith('/auth/signin'));
  await page.waitForFunction(() => location.pathname === '/live'); await wait(800);
  if (process.env.COMMENTS_FINAL_ZOOM_ONLY === '1') {
    await page.goto('http://localhost:3000/dev/live', { waitUntil: 'networkidle2' }); await ready(trigger); await wait(2000); await open(); result.zoomBefore = await geometry();
  } else await rapid();
  await save();
  const zoomExtension = await browser.installExtension(path.resolve('scripts/fixtures/comments-browser-zoom'));
  const workerTarget = await browser.waitForTarget(t => t.type() === 'service_worker' && t.url().includes(zoomExtension));
  const worker = await workerTarget.worker();
  result.nativeZoomAPI = await worker.evaluate(async () => { const tabs = await chrome.tabs.query({ url: 'http://localhost/*' }); for (const tab of tabs) await chrome.tabs.setZoom(tab.id, 2); return await chrome.tabs.getZoom(tabs[0].id); });
  await wait(500); await zoom(); await save(); console.log('NATIVE_ZOOM_DONE');
  await worker.evaluate(async () => { for (const tab of await chrome.tabs.query({ url: 'http://localhost/*' })) await chrome.tabs.setZoom(tab.id, 1); }); await wait(500);
  if (process.env.COMMENTS_FINAL_ZOOM_ONLY !== '1') await mobileAndReturn();
  check('no pageerror', result.errors.length === 0, result.errors);
  check('no console error', result.consoleErrors.length === 0, [...new Set(result.consoleErrors)]);
  check('no HTTP failure', result.httpErrors.length === 0, result.httpErrors);
  result.status = 'PASS'; await save();
  const lines = readline.createInterface({ input: process.stdin });
  for await (const line of lines) {
    try { if (line.trim() === 'zoom') await zoom(); else if (line.trim() === 'inspect') console.log(JSON.stringify({ geometry: await geometry(), snapshot: await snapshot() })); else if (line.trim() === 'finish') break; }
    catch (error) { result.checks.push({ name: 'interactive stage', ok: false, error: String(error) }); console.log(String(error)); }
    await save(); console.log('WAITING');
  }
} catch (error) { result.status = 'FAIL'; result.error = String(error.stack || error); await capture('failure-state').catch(() => {}); console.log(result.error); process.exitCode = 1; }
finally { await save(); await browser.close(); }
