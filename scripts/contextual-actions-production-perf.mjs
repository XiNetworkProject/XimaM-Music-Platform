// Isolated repository E2E runner, never attaches to the user's browser.
// Read-only social data; analytics writes intercepted. No application instrumentation.
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
dotenv.config({ path: '.env.local', quiet: true });
const base = process.env.ACTIONS_PERF_BASE || 'http://localhost:3000';
const output = process.env.ACTIONS_PERF_OUTPUT || 'docs/contextual-actions-phase4b5-captures/production-perf.json';
const count = Number(process.env.ACTIONS_PERF_COUNT || 20);
const ids = ['track_1773789112971_0egfpy0i2','track_1758481606741_trwopq702','track_1782517870229_4_vjgv7x3'];
const names = ['track-options','playlist-picker','queue','lyrics','track-details','track-share'];
const options = '[data-feed-item-id][data-active="true"] button[aria-label^="Options de "]';
const loaded = name => `[data-organization-surface="${name}"][data-organization-state="loaded"]`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const result = { base, count, methodology: 'Trusted click capture to loaded content and to two painted frames with opacity=1 and no panel transform. No fixed sleep included. Secondary surfaces measured from their Options row, not from the preparatory Options opening. One warm-up per surface; nearest-rank percentiles. CDP GC trace + resource timings + long tasks; no CPU/network throttling. Audio initially paused to retain one entity throughout all 120 openings.', warmups: [], samples: [], summaries: {}, requests: [], pageErrors: [], consoleErrors: [], httpErrors: [] };
const browser = await puppeteer.launch({ headless: false, pipe: true, args: ['--window-size=1440,1000','--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(90000);
const cdp = await page.createCDPSession();
let trace = []; let tracing = false; let phase = 'setup'; let sequence = 0;
const tracks = await Promise.all(ids.map(async id => { const r = await fetch(base + '/api/tracks/' + id); assert(r.ok); return r.json(); }));
const pathOnly = url => { try { const u = new URL(url); return u.origin === base ? u.pathname : u.hostname + u.pathname; } catch { return '[invalid URL]'; } };
page.on('pageerror', e => result.pageErrors.push({ phase, message: e.message }));
page.on('console', m => { if (m.type() === 'error') result.consoleErrors.push({ phase, message: m.text().replace(/https?:\/\/\S+/g, '[URL]').slice(0,240) }); });
page.on('response', r => { if (r.status() >= 400) result.httpErrors.push({ phase, path: pathOnly(r.url()), status: r.status() }); });
await page.setRequestInterception(true);
page.on('request', async r => {
  try {
    const u = new URL(r.url());
    if (u.origin === base && u.pathname.startsWith('/api/')) result.requests.push({ phase, method: r.method(), path: u.pathname, at: Date.now() });
    if (u.pathname === '/api/ranking/feed') return await r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ tracks, hasMore: false, nextCursor: tracks.length }) });
    if (r.method() === 'POST' && (/\/api\/tracks\/[^/]+\/(events|plays)$/.test(u.pathname) || u.pathname === '/api/recommendations/impressions')) return await r.respond({ status: 200, contentType: 'application/json', body: '{}' });
    await r.continue();
  } catch { if (!r.isInterceptResolutionHandled()) await r.abort(); }
});
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  window.__actionsPerf = { tasks: [], audio: { play: 0, pause: 0, seek: 0, load: 0 } };
  new PerformanceObserver(list => window.__actionsPerf.tasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration })))).observe({ type: 'longtask', buffered: true });
  for (const name of ['play','pause','load']) { const original = HTMLMediaElement.prototype[name]; HTMLMediaElement.prototype[name] = function(...args) { if (this.tagName === 'AUDIO') window.__actionsPerf.audio[name]++; return original.apply(this,args); }; }
  const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
  Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', { ...descriptor, set(value) { if (this.tagName === 'AUDIO') window.__actionsPerf.audio.seek++; descriptor.set.call(this,value); } });
  document.addEventListener('click', e => {
    const p = window.__actionsPerf; const arm = p.arm;
    if (!arm || !e.target.closest(arm.selector)) return;
    p.arm = null;
    const start = performance.now(); performance.mark(arm.id);
    const sample = { id: arm.id, name: arm.name, start, eventDelayMs: start - e.timeStamp, trusted: e.isTrusted };
    let frames = 0;
    const poll = () => {
      const now = performance.now(); const root = document.querySelector(arm.loaded);
      const dataReady = root && !root.querySelector('[role="status"], [role="alert"]');
      if (dataReady && sample.loadedMs === undefined) sample.loadedMs = now - start;
      if (dataReady) {
        const panel = root.closest('[role="dialog"]'); const style = getComputedStyle(panel);
        const transform = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform);
        const parentOpacity = Number(getComputedStyle(panel.parentElement).opacity);
        if (Number(style.opacity) >= 0.999 && parentOpacity >= 0.999 && Math.abs(transform.m41) < 0.1 && Math.abs(transform.m42) < 0.1) frames++; else frames = 0;
      }
      if (frames >= 2) {
        sample.settledMs = now - start; sample.end = now;
        sample.resources = performance.getEntriesByType('resource').filter(r => r.startTime >= start && r.startTime <= now).map(r => ({ path: new URL(r.name).pathname, start: r.startTime, duration: r.duration, type: r.initiatorType }));
        p.completed = sample;
      } else if (now - start > 15000) p.completed = { ...sample, error: '15s surface timeout' };
      else requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  }, true);
});
const close = async () => { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('[data-organization-surface]')); await wait(250); };
const measure = async (name, selector, label) => {
  phase = label;
  const id = 'actions-perf-' + (++sequence);
  await page.evaluate((arm) => { window.__actionsPerf.completed = null; window.__actionsPerf.arm = arm; }, { name, selector, loaded: loaded(name), id });
  const before = await page.evaluate(() => ({ ...window.__actionsPerf.audio }));
  await page.click(selector);
  await page.waitForFunction(() => Boolean(window.__actionsPerf.completed), { polling: 'raf' });
  const sample = await page.evaluate(() => window.__actionsPerf.completed);
  assert(!sample.error, JSON.stringify(sample)); assert(sample.trusted);
  assert.deepEqual(await page.evaluate(() => window.__actionsPerf.audio), before, 'Opening must not mutate audio');
  sample.phase = label;
  return sample;
};
const prepare = async name => { if (name !== 'track-options') await measure('track-options', options, 'prepare:' + name); };
const selectorFor = name => name === 'track-options' ? options : `[data-track-action="${name === 'track-share' ? 'share' : name}"]`;
const quantile = (sorted, p) => sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)];
try {
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(base + '/auth/signin', { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', process.env.SYNAURA_E2E_EMAIL);
  await page.type('input[type="password"]', process.env.SYNAURA_E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !location.pathname.startsWith('/auth/signin'));
  await page.goto(base + '/live', { waitUntil: 'networkidle2' });
  await page.waitForSelector(options);
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Ouvrir le Flow')?.click());
  await wait(1500);
  // AudioCore's musical element is detached. Pause through the visible cover only if playing.
  const pauseCover = await page.$('[data-feed-item-id][data-active="true"] button:has(img):has(.lucide-pause)');
  if (pauseCover) { await pauseCover.click(); await wait(300); }
  result.initialUI = await page.evaluate(() => ({ item: document.querySelector('[data-feed-item-id][data-active="true"]')?.dataset.feedItemId, prelude: Boolean(document.querySelector('.synaura-home-prelude')), audioCalls: window.__actionsPerf.audio, buttons: [...document.querySelectorAll('[data-feed-item-id][data-active="true"] button')].map(b=>({ label:b.getAttribute('aria-label'), text:b.textContent.slice(0,40) })) }));
  console.log('Live ready: ' + JSON.stringify(result.initialUI));
  assert.equal(await page.evaluate(() => typeof window.__synauraAudioCore), 'undefined', 'Production must not expose dev AudioCore debug');
  result.buildId = base.startsWith('http://localhost') ? (await fs.readFile('.next/BUILD_ID','utf8')).trim() : 'remote';
  result.browser = await browser.version();
  result.inactiveBeforeOpen = result.requests.filter(r => r.path === '/api/playlists' || ids.slice(1).some(id => r.path.startsWith('/api/tracks/' + id)) || ids.some(id => r.path === '/api/tracks/' + id));
  assert.equal(result.inactiveBeforeOpen.length, 0, 'Inactive cards must not query organization data');
  cdp.on('Tracing.dataCollected', e => { trace.push(...e.value.filter(t => t.cat?.includes('user_timing') || /GC|Scavenge|MarkCompact/.test(t.name))); });
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,v8,blink.user_timing,disabled-by-default-v8.gc', transferMode: 'ReportEvents' }); tracing = true;
  for (const name of names) {
    await prepare(name);
    result.warmups.push(await measure(name, selectorFor(name), 'warmup:' + name));
    await close();
    for (let i = 1; i <= count; i++) {
      await prepare(name);
      result.samples.push({ ...await measure(name, selectorFor(name), `warm:${name}:${i}`), iteration: i });
      await close();
    }
    const samples = result.samples.filter(s => s.name === name);
    const stats = key => { const a = samples.map(s => s[key]).sort((a,b) => a-b); return { p50: quantile(a,.5), p95: quantile(a,.95), max: a.at(-1) }; };
    result.summaries[name] = { loadedMs: stats('loadedMs'), settledMs: stats('settledMs'), over750: samples.filter(s => s.settledMs > 750).map(s => s.id) };
    console.log(name + ': ' + JSON.stringify(result.summaries[name]));
  }
  result.longTasks = await page.evaluate(() => window.__actionsPerf.tasks);
  const completed = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve));
  await cdp.send('Tracing.end'); await completed; tracing = false;
  for (const sample of [...result.warmups,...result.samples]) {
    const marker = trace.find(t => t.name === sample.id); const start = marker?.ts;
    sample.gc = start === undefined ? null : trace.filter(t => t.ph === 'X' && /GC|Scavenge|MarkCompact/.test(t.name) && t.ts <= start + sample.settledMs * 1000 && t.ts + (t.dur || 0) >= start).map(t => ({ name: t.name, offsetMs: (t.ts-start)/1000, durationMs: (t.dur || 0)/1000, thread: t.tid }));
    sample.longTasks = result.longTasks.filter(t => t.start < sample.end && t.start + t.duration > sample.start);
  }
  result.warmRequests = result.requests.filter(r => r.phase.startsWith('warm:'));
  result.warmOrganizationRequests = result.requests.filter(r => /^(warm:|prepare:)/.test(r.phase) && (r.path === '/api/playlists' || r.path === '/api/subscriptions/my-subscription' || ids.some(id => r.path === '/api/tracks/' + id || r.path === '/api/tracks/' + id + '/like')));
  assert.equal(result.warmOrganizationRequests.length, 0, 'Warm organization data must remain cached');
  result.inactiveQueries = result.requests.filter(r => ids.slice(1).some(id => r.path.startsWith('/api/tracks/' + id)));
  assert.equal(result.inactiveQueries.length, 0);
  result.over750 = result.samples.filter(s => s.settledMs > 750);
  result.pass = result.pageErrors.length === 0 && result.over750.length === 0;
  assert(result.pass, 'Warm opening gate');
} catch (error) { result.failure = error.message; result.failedPhase = phase; result.failureDOM = await page.evaluate(() => ({ url: location.pathname, dialogs: [...document.querySelectorAll('[role="dialog"]')].map(e=>e.textContent.slice(0,300)), perf: window.__actionsPerf?.completed })); console.error(error); process.exitCode = 1; }
finally {
  if (tracing) await cdp.send('Tracing.end').catch(() => {});
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(result,null,2) + '\n');
  await browser.close();
}
