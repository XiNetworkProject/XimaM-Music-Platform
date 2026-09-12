// Phase 4B.8: disposable repository E2E browser, never attaches to the user's browser.
// Read-only published data. Social writes and analytics are not sent by this runner.
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
dotenv.config({ path: '.env.local', quiet: true });
const base = process.env.FINAL_BASE || 'http://localhost:3000';
const mode = process.env.FINAL_MODE || 'metrics';
const out = process.env.FINAL_OUTPUT || `artifacts/final-phase4b8/${mode}`;
const width = Number(process.env.FINAL_WIDTH || 1440);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const result = { mode, base, width, startedAt: new Date().toISOString(), checks: [], requests: [], errors: [], http: [], console: [], samples: [], measures: [], accessibility: [], limitations: ['Android/Gboard réel non testé', 'NVDA réel non testé', 'Production AudioCore subscribers/provider renders are not exposed; native instrumentation is distinguished from dev diagnostics'] };
await fs.mkdir(out, { recursive: true });
const browser = await puppeteer.launch({ headless: false, pipe: true, enableExtensions: true, args: ['--window-size=1440,1000', '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info'] });
const page = await browser.newPage();
page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(90000);
const cdp = await page.createCDPSession();
let phase = 'setup', fault = '';
const active = '[data-feed-item-id][data-active="true"]';
const options = active + ' button[aria-label^="Options de "]';
const comments = active + ' button[aria-label^="Commentaires de "]';
const peek = active + ' [data-context-surface-trigger-key^="live-track-profile-"]';
const surface = '[data-profile-peek-state],[data-comments-state],[data-organization-surface]';
const seedIds = ['track_1773789112971_0egfpy0i2', 'track_1758481606741_trwopq702', 'track_1782517870229_4_vjgv7x3'];
const seeds = mode === 'long' ? null : await Promise.all(seedIds.map(async id => { const r = await fetch(base + '/api/tracks/' + id); assert(r.ok); return r.json(); }));
result.fixture = seeds ? { kind: 'real published records; deterministic ordering in disposable browser only', ids: seedIds } : 'unmodified live feed';
const check = (name, ok, detail) => { result.checks.push({ name, ok: !!ok, detail }); console.log(`${name}: ${ok ? 'PASS' : 'FAIL'}`); assert(ok, name); };
const ready = async selector => { const h = await page.waitForFunction(selector => [...document.querySelectorAll(selector)].some(e => { const r = e.getBoundingClientRect(); const closed = e.closest('details:not([open])'); if (closed && !closed.querySelector(':scope > summary')?.contains(e)) return false; for (let n = e; n; n = n.parentElement) if (Number(getComputedStyle(n).opacity) === 0) return false; return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).pointerEvents !== 'none' && !e.closest('[inert],[aria-hidden="true"]'); }), {}, selector); await h.dispose(); };
const click = async selector => { await ready(selector); const h = await page.evaluateHandle(selector => [...document.querySelectorAll(selector)].find(e => { const r = e.getBoundingClientRect(), closed=e.closest('details:not([open])'); if (closed && !closed.querySelector(':scope > summary')?.contains(e)) return false; if (!r.width || !r.height || getComputedStyle(e).visibility === 'hidden' || getComputedStyle(e).pointerEvents === 'none' || e.closest('[inert],[aria-hidden="true"]')) return false; for (let n=e;n;n=n.parentElement) if(Number(getComputedStyle(n).opacity)===0)return false; return true; }), selector); if (width < 600) { result.lastClick = await h.evaluate(e=>{const r=e.getBoundingClientRect(), hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {target:e.outerHTML.slice(0,350),hit:hit?.outerHTML.slice(0,700),rect:{x:r.x,y:r.y,w:r.width,h:r.height},inert:!!e.closest('[inert]')};}); await h.asElement().tap(); } else await h.asElement().click(); await h.dispose(); };
const textClick = async text => { const ok = await page.evaluate(text => { const e = [...document.querySelectorAll('a,button')].find(e => e.getBoundingClientRect().width && (e.textContent.trim() === text || e.querySelector('strong')?.textContent.trim() === text)); e?.click(); return !!e; }, text); assert(ok, text); };
const enterIfNeeded = async () => { const label = await page.evaluate(() => [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width).map(e=>e.textContent.trim()).find(t=>t==='Ouvrir le Flow'||t==='Voir en plein écran')); if (label) await textClick(label); await wait(1300); };
const capture = async name => { if (!name.startsWith('failure')) { await page.$$eval('[role="status"] button[aria-label="Fermer"]', es => es.forEach(e=>e.click())); } await wait(300); await page.screenshot({ path: `${out}/${name}.png` }); };
const goto = async route => { await page.goto(base + route, { waitUntil: 'networkidle2' }); await wait(700); };
page.on('pageerror', e => result.errors.push({ phase, message: e.message, stack: e.stack }));
page.on('console', m => { if (m.type() === 'error') result.console.push({ phase, source: m.location().url?.replace(/\?.*$/, ''), text: m.text().replace(/https?:\/\/\S+/g, '[URL]').slice(0, 240) }); });
page.on('response', r => { if (r.status() >= 400) { const u = new URL(r.url()); result.http.push({ phase, host: u.hostname, path: u.pathname, status: r.status() }); } });
await page.setRequestInterception(true);
page.on('request', async r => {
  try {
    const u = new URL(r.url()), p = u.pathname;
    if (u.origin === base && p.startsWith('/api/')) result.requests.push({ phase, path: p, method: r.method(), at: Date.now() });
    if (seeds && p === '/api/ranking/feed') return void await r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ tracks: seeds, hasMore: false, nextCursor: seeds.length }) });
    if (fault && ((fault === 'comments' && /\/comments(?:\/moderation)?$/.test(p)) || (fault === 'profile' && /^\/api\/users\/[^/]+$/.test(p)) || (fault === 'playlist' && p === '/api/playlists'))) return void await r.respond({ status: fault === 'profile' ? 404 : 500, contentType: 'application/json', body: JSON.stringify({ error: 'Controlled isolated validation error' }) });
    if (r.method() === 'POST' && (/\/api\/(tracks|music-clips)\/[^/]+\/(events|plays)$/.test(p) || p === '/api/recommendations/impressions')) return void await r.respond({ status: 200, contentType: 'application/json', body: '{}' });
    if (['PUT', 'PATCH'].includes(r.method()) && p === '/api/notifications') return void await r.respond({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method()) && /\/(comments|reactions|follow|like|playlists)(\/|$)/.test(p)) return void await r.abort();
    await r.continue();
  } catch { if (!r.isInterceptResolutionHandled()) await r.abort(); }
});
await page.evaluateOnNewDocument(() => {
  const data = window.__final8 = { documentId: `${performance.timeOrigin}-${Math.random()}`, vitals: { lcp: null, cls: 0 }, tasks: [], media: [], calls: [], intervals: new Set(), timeouts: new Set(), seen: [] };
  const registry = new WeakMap(), ids = new WeakMap();
  const id = e => { if (!ids.has(e)) { ids.set(e, data.media.length); data.media.push(new WeakRef(e)); } return ids.get(e); };
  const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function(type, fn, opts) { if (this instanceof HTMLAudioElement) { id(this); let list = registry.get(this); if (!list) registry.set(this, list = []); if (!list.some(x => x.type === type && x.fn === fn && x.capture === !!(typeof opts === 'boolean' ? opts : opts?.capture))) list.push({ type, fn, capture: !!(typeof opts === 'boolean' ? opts : opts?.capture) }); } return add.call(this, type, fn, opts); };
  EventTarget.prototype.removeEventListener = function(type, fn, opts) { if (this instanceof HTMLAudioElement) { const list = registry.get(this) || [], capture = !!(typeof opts === 'boolean' ? opts : opts?.capture); registry.set(this, list.filter(x => !(x.type === type && x.fn === fn && x.capture === capture))); } return remove.call(this, type, fn, opts); };
  data.audio = () => data.media.flatMap((ref, id) => { const e = ref.deref(); return e ? [{ id, src: e.currentSrc || e.src, paused: e.paused, time: e.currentTime, listeners: registry.get(e)?.length || 0 }] : []; });
  for (const name of ['play', 'pause', 'load']) { const orig = HTMLMediaElement.prototype[name]; HTMLMediaElement.prototype[name] = function(...args) { if (this.tagName === 'AUDIO') data.calls.push({ id: id(this), name }); return orig.apply(this, args); }; }
  const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
  Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', { ...d, set(value) { if (this.tagName === 'AUDIO') data.calls.push({ id: id(this), name: 'seek' }); d.set.call(this, value); } });
  const si = window.setInterval, ci = window.clearInterval, st = window.setTimeout, ct = window.clearTimeout;
  window.setInterval = (fn, ms, ...args) => { const id = si(fn, ms, ...args); data.intervals.add(id); return id; };
  window.clearInterval = id => { data.intervals.delete(id); return ci(id); };
  window.setTimeout = (fn, ms, ...args) => { const id = st(() => { data.timeouts.delete(id); if (typeof fn === 'function') fn(...args); else (0, eval)(fn); }, ms); data.timeouts.add(id); return id; };
  window.clearTimeout = id => { data.timeouts.delete(id); return ct(id); };
  new PerformanceObserver(list => { for (const e of list.getEntries()) data.vitals.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) data.vitals.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver(list => { data.tasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration }))); }).observe({ type: 'longtask', buffered: true });
  addEventListener('DOMContentLoaded', () => new MutationObserver(() => { if (data.observe) { const e = document.querySelector('[data-feed-item-id][data-active="true"]'); if (e) data.seen.push(e.dataset.feedItemId); } }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-active'] }));
});
const snap = () => page.evaluate(() => ({ documentId: window.__final8.documentId, item: document.querySelector('[data-feed-item-id][data-active="true"]')?.dataset.feedItemId, index: document.querySelector('[data-feed-item-id][data-active="true"]')?.dataset.index, filter: [...document.querySelectorAll('button[aria-pressed="true"]')].map(e => e.textContent.trim()), audio: window.__final8.audio(), calls: [...window.__final8.calls], core: window.__synauraAudioCore?.(), focus: document.activeElement?.getAttribute('data-context-surface-trigger-key') || document.activeElement?.getAttribute('data-testid') || document.activeElement?.tagName }));
const collect = async label => { await cdp.send('HeapProfiler.collectGarbage'); const data = { label, at: Date.now(), ...await page.metrics(), ...await cdp.send('Memory.getDOMCounters'), ...await page.evaluate(() => ({ dom: document.querySelectorAll('*').length, slides: document.querySelectorAll('section[data-feed-item-id][data-index]').length, placeholders: document.querySelectorAll('div[data-feed-item-id]:not([data-index])').length, surfaces: document.querySelectorAll('[data-profile-peek-state],[data-comments-state],[data-organization-surface]').length, audio: window.__final8.audio().map(({ src, ...e }) => e), core: window.__synauraAudioCore?.(), intervals: window.__final8.intervals.size, timeouts: window.__final8.timeouts.size, vitals: window.__final8.vitals, longTasks: window.__final8.tasks })) }; result.samples.push(data); return data; };
const close = async () => { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('[data-profile-peek-state],[data-comments-state],[data-organization-surface],[data-synaura-overlay-backdrop]')); await wait(280); };
async function open(kind, measure = false) {
  // Mobile daily-information toasts may cover the rail. Dismiss via their real close controls.
  if (width < 600 && await page.$('[role="status"] button[aria-label="Fermer"]')) { await page.$$eval('[role="status"] button[aria-label="Fermer"]', es=>es.forEach(e=>e.click())); await wait(350); }
  let selector, loaded;
  if (kind === 'peek') { selector = peek; loaded = '[data-profile-peek-state="loaded"]'; }
  else if (kind === 'comments') { selector = comments; loaded = '[data-comments-state="loaded"]'; }
  else { if (kind !== 'options') { await click(options); await ready('[data-organization-state="loaded"]'); await wait(220); } selector = kind === 'options' ? options : `[data-track-action="${kind}"]`; loaded = `[data-organization-surface][data-organization-state="loaded"]`; }
  const before = await snap(); const start = await page.evaluate(() => performance.now());
  await click(selector);
  if (!['metrics','long'].includes(mode)) result.lastOpen = { kind, target: await page.evaluate(selector => { const e=[...document.querySelectorAll(selector)].find(e=>e.getBoundingClientRect().width); if(!e)return null; const r=e.getBoundingClientRect(), hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return { rect:{x:r.x,y:r.y,width:r.width,height:r.height}, hit:hit?.closest('button')?.getAttribute('aria-label'), hitTag:hit?.tagName, hitHtml:hit?.outerHTML.slice(0,700), viewport:{width:innerWidth,height:innerHeight,top:visualViewport?.offsetTop}, dialog:!!document.querySelector('[role="dialog"]') }; }, selector) };
  await ready(loaded); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const ms = await page.evaluate(start => performance.now() - start, start);
  const after = await snap(), primary = before.audio.find(e => e.src);
  if (primary) assert.deepEqual(after.calls.slice(before.calls.length).filter(e => e.id === primary.id), [], 'surface open must not mutate primary audio');
  if (measure) result.measures.push({ phase, kind, ms, metric: 'driver start to loaded + two frames; differs from trusted-click Actions benchmark' });
}
async function queue() { await open('queue'); const ids = await page.$$eval('[data-queue-track]', es => es.map(e => e.dataset.queueTrack)); await close(); return ids; }
async function continuity(label, fn) {
  const before = await snap(), ids = await queue(); await page.evaluate(() => { window.__final8.seen = []; window.__final8.observe = true; });
  const start = Date.now(); await fn(); await ready(active); await wait(650); const after = await snap(), endIds = await queue();
  const seen = await page.evaluate(() => { window.__final8.observe = false; return [...new Set(window.__final8.seen)]; });
  const primary = before.audio.find(e => e.src), end = after.audio.find(e => e.id === primary?.id);
  check(label + ' context/filter/queue/zero transient item', before.item === after.item && JSON.stringify(before.filter) === JSON.stringify(after.filter) && JSON.stringify(ids) === JSON.stringify(endIds) && seen.every(id => id === before.item), { before: before.item, after: after.item, seen, queue: ids.length });
  check(label + ' audio invariant', before.documentId === after.documentId && !!primary && !!end && primary.src === end.src && primary.paused === end.paused && after.calls.slice(before.calls.length).filter(c => c.id === primary.id).length === 0, { sameDocument: before.documentId === after.documentId, sameSource: primary?.src === end?.src, pausedBefore: primary?.paused, pausedAfter: end?.paused, calls: after.calls.slice(before.calls.length), beforeAudio: before.audio.map(({src,...e})=>e), afterAudio: after.audio.map(({src,...e})=>e) });
  result.measures.push({ phase, kind: label, roundTripMs: Date.now() - start, focus: after.focus });
}
async function setup() {
  await page.setViewport({ width, height: width < 600 ? 844 : 900, isMobile: width < 600, hasTouch: width < 600 });
  await goto('/auth/signin'); await ready('input[type="email"]');
  await page.type('input[type="email"]', process.env.SYNAURA_E2E_EMAIL); await page.type('input[type="password"]', process.env.SYNAURA_E2E_PASSWORD); await page.click('button[type="submit"]');
  await page.waitForFunction(() => !location.pathname.startsWith('/auth/signin')); await goto('/live'); await ready(active); await textClick(width < 600 ? 'Voir en plein écran' : 'Ouvrir le Flow'); await wait(1300);
  if (seeds) { await next(); await ready(comments); await wait(700); }
  await page.waitForFunction(() => window.__final8.audio().some(e => e.src && !e.paused && e.time > .1)); await wait(500);
}
async function pause() { const state = await snap(); if (state.audio.some(e => e.src && !e.paused)) { await click(active + ' .live-track-artwork button'); await wait(200); } }
async function next() { const old = (await snap()).item; await page.focus('[data-testid="synaura-scroll-feed"]'); await page.keyboard.press('ArrowDown'); await page.waitForFunction(old => document.querySelector('[data-feed-item-id][data-active="true"]')?.dataset.feedItemId !== old, {}, old); await wait(450); }
async function createAI() { await click('button[aria-label="Ouvrir le menu Créer"]'); await textClick('Tous les outils de création'); await page.waitForFunction(() => location.pathname === '/create'); await page.waitForFunction(() => !document.querySelector('[data-synaura-overlay-backdrop]')); await wait(700); await click('a[href="/ai-generator"]'); await page.waitForFunction(() => location.pathname === '/ai-generator'); await ready('[data-handoff-return]'); await wait(350); await click('[data-handoff-return]'); }
async function trackReturn() { await open('track-details'); await click('[data-live-route-intent]'); await page.waitForFunction(() => location.pathname.startsWith('/track/')); await wait(400); await page.goBack(); }
async function productionSmoke() {
  await capture('live');
  for (const kind of ['peek', 'comments', 'options', 'playlist-picker', 'queue', 'lyrics', 'track-details', 'share']) {
    phase = 'production:' + kind;
    await continuity(kind, async () => {
      await open(kind); await a11y(kind);
      if (kind === 'comments') { await click('#comments-tab-moments'); await a11y('Moments'); }
      await close();
    });
  }
  await continuity('Track Back', trackReturn);
  await continuity('AI Retour Live', createAI);
  await goto('/notifications'); await a11y('notifications');
}
async function messagesReturn() { await click('a[href="/messages"]'); await page.waitForFunction(() => location.pathname === '/messages'); await ready('[data-handoff-return]'); await click('[data-handoff-return]'); }
async function a11y(label) {
  await wait(260);
  const ax = await cdp.send('Accessibility.getFullAXTree');
  const data = await page.evaluate(() => {
    const visible = e => { const closed=e.closest('details:not([open])'); if(closed && !closed.querySelector(':scope > summary')?.contains(e))return false; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && !e.closest('[inert],[aria-hidden="true"]'); };
    const name = e => (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 80);
    const colors = value => { const m = value.match(/[\d.]+/g)?.map(Number); const scale = value.startsWith('color(srgb ') ? 255 : 1; return m?.length >= 3 ? [m[0] * scale, m[1] * scale, m[2] * scale, m[3] ?? 1] : null; };
    const mix = (fg, bg) => fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
    const contrast = { checked: 0, manual: 0, low: [], corrected: [] };
    const scope = document.querySelector('[role="dialog"]') || document.body;
    for (const e of scope.querySelectorAll('p,span,a,button,h1,h2,h3,label,dt,dd')) {
      if (!visible(e) || ![...e.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())) continue;
      const css = getComputedStyle(e), fg = colors(css.color), chain = []; let uncertain = false;
      for (let n = e; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.backgroundImage !== 'none' || Number(s.opacity) < 1) uncertain = true; const bg = colors(s.backgroundColor); if (bg) chain.unshift(bg); }
      if (!fg || uncertain) { contrast.manual++; continue; }
      let bg = [255,255,255]; for (const c of chain) bg = mix(c, bg);
      const a = luminance(mix(fg, bg)), b = luminance(bg), ratio = (Math.max(a,b) + .05) / (Math.min(a,b) + .05);
      const large = parseFloat(css.fontSize) >= 24 || (parseFloat(css.fontSize) >= 18.66 && Number(css.fontWeight) >= 700), target = large ? 3 : 4.5;
      contrast.checked++; if (e.className?.includes?.('color-mix(in_srgb,var(--syn-accent)_65%')) contrast.corrected.push({ text: name(e), ratio: Math.round(ratio * 100) / 100, target });
      if (ratio < target && !e.closest(':disabled')) contrast.low.push({ text: name(e), ratio: Math.round(ratio * 100) / 100, target });
    }
    return { path: location.pathname, title: document.title, width: innerWidth, scrollWidth: document.documentElement.scrollWidth, contrast, headings: [...document.querySelectorAll('h1,h2')].filter(visible).map(name), dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(visible).map(e => ({ labelledby: e.getAttribute('aria-labelledby'), label: document.getElementById(e.getAttribute('aria-labelledby'))?.textContent, modal: e.getAttribute('aria-modal') })), tabs: [...document.querySelectorAll('[role="tab"]')].filter(visible).map(e => ({ name: name(e), selected: e.getAttribute('aria-selected'), controls: !!document.getElementById(e.getAttribute('aria-controls')), tabIndex: e.tabIndex })), smallTargets: [...document.querySelectorAll('a,button,input,textarea,summary')].filter(visible).filter(e => { const r = e.getBoundingClientRect(); return r.width < 24 || r.height < 24; }).map(e => ({ name: name(e), width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })).slice(0, 20), animations: document.getAnimations().filter(a => a.playState === 'running').map(a => ({ name: a.animationName || '', duration: a.effect?.getTiming().duration })), reduced: matchMedia('(prefers-reduced-motion: reduce)').matches };
  });
  data.axUnnamed = ax.nodes.filter(n => !n.ignored && ['button','textbox','slider','tab','dialog'].includes(n.role?.value) && !n.name?.value).map(n => ({ role: n.role.value, backendDOMNodeId: n.backendDOMNodeId }));
  for (const node of data.axUnnamed.slice(0, 8)) { const resolved = await cdp.send('DOM.resolveNode', { backendNodeId: node.backendDOMNodeId }); const info = await cdp.send('Runtime.callFunctionOn', { objectId: resolved.object.objectId, functionDeclaration: 'function() { return this.outerHTML.slice(0, 900); }', returnByValue: true }); node.html = info.result.value; await cdp.send('Runtime.releaseObject', { objectId: resolved.object.objectId }); }
  const focused = [];
  for (const key of ['Tab','Tab','Tab','Tab','Tab','Shift+Tab','Shift+Tab']) { if (key === 'Shift+Tab') { await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift'); } else await page.keyboard.press(key); focused.push(await page.evaluate(() => ({ tag: document.activeElement?.tagName, name: (document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || '').trim().slice(0, 60), visible: document.activeElement?.matches(':focus-visible'), inDialog: !!document.activeElement?.closest('[role="dialog"]'), outline: document.activeElement ? getComputedStyle(document.activeElement).outlineStyle : '' }))); }
  data.keyboard = focused; result.accessibility.push({ label, ...data });
  check(label + ' corrected accent texts AA', data.contrast.corrected.every(c => c.ratio >= c.target), data.contrast.corrected);
  if (label === 'notifications') {
    check('Notifications controls named in AX tree', data.axUnnamed.length === 0, data.axUnnamed);
    check('Tout lire accessible name', ax.nodes.some(n => !n.ignored && n.role?.value === 'button' && n.name?.value === 'Tout lire'));
    await capture('notifications');
  }
  if (data.dialogs.length) check(label + ' dialog label and keyboard containment', data.dialogs.every(d => d.label) && focused.every(f => f.inDialog));
  check(label + ' horizontal document fits', data.scrollWidth <= data.width + 1, { width: data.width, scrollWidth: data.scrollWidth });
}
async function metrics() {
  await pause(); phase = 'idle-before'; await collect('cold'); await wait(12000); await collect('idle-12s');
  for (const kind of ['peek','comments','options']) { phase = 'warmup:' + kind; await open(kind, true); await close(); }
  await collect('warm-baseline');
  for (let i = 1; i <= 30; i++) { for (const kind of ['peek','comments','options']) { phase = `warm:${kind}:${i}`; await open(kind, true); await close(); } if (i % 5 === 0) { await collect('cycle-' + i); console.log('metrics cycle ' + i); } }
  phase = 'closed-idle'; await wait(12000); await collect('closed-idle-12s');
  check('30 cycles leave no business surface mounted', result.samples.at(-1).surfaces === 0);
  check('Live mounted slides <=11', result.samples.every(s => s.slides <= 11));
}
async function golden() {
  await capture('live'); const keyboardBefore = await snap(); await a11y('Live'); await wait(1000); const keyboardAfter = await snap();
  check('Tab through Live does not activate an inactive card', keyboardBefore.item === keyboardAfter.item && keyboardBefore.audio.find(a=>a.src)?.src === keyboardAfter.audio.find(a=>a.src)?.src);
  check('Inactive Live slides are inert and hidden from AX', await page.$$eval('section[data-feed-item-id][data-active="false"]', es => es.every(e => e.inert && e.getAttribute('aria-hidden') === 'true')));
  await continuity('Profile Peek', async () => { await open('peek'); await capture('profile-peek'); await a11y('Profile Peek'); await close(); });
  await open('comments'); await capture('comments'); await a11y('Conversation');
  await page.focus('#comments-tab-conversation'); await page.keyboard.press('ArrowRight');
  check('ARIA tabs respond to arrows', await page.$eval('#comments-tab-moments', e => e.getAttribute('aria-selected') === 'true' && document.activeElement === e));
  await capture('moments');
  const before = await snap(); const marker = '[data-musical-waveform] button';
  if (await page.$(marker)) { await click(marker); const after = await snap(); check('marker = one explicit seek', after.calls.slice(before.calls.length).filter(c => c.name === 'seek').length === 1 && after.calls.slice(before.calls.length).every(c => c.name === 'seek')); await capture('cluster'); }
  else result.limitations.push('No real marker on selected record; marker journey not validated');
  const range = '[data-musical-waveform] input[type="range"]'; await page.focus(range); const kb = await snap(); await page.keyboard.press('ArrowRight'); const ka = await snap(); check('waveform keyboard issues explicit seek', ka.calls.slice(kb.calls.length).filter(c => c.name === 'seek').length === 1);
  await click('#comments-tab-conversation'); await page.type('textarea', 'Validation locale\nBrouillon non envoyé\nTroisième ligne');
  const author = '[data-comment-id] button[aria-label^="Aperçu de "]';
  if (await page.$(author)) { const draft = await page.$eval('textarea', e => e.value); await click(author); await ready('[data-profile-peek-state="loaded"]'); await page.goBack(); await ready('[data-comments-state="loaded"]'); check('nested author Back restores draft', await page.$eval('textarea', e => e.value) === draft); } else result.limitations.push('No readable comment author fixture for nested journey');
  await close();
  for (const kind of ['options','playlist-picker','queue','lyrics']) { await open(kind); await a11y(kind); if (kind === 'options') await capture('actions'); await close(); }
  await continuity('Track Back', trackReturn); await continuity('Create AI return', createAI); await continuity('Messages return', messagesReturn);
  // Canonical Search and Discover edges, no synthetic router or alternate path.
  await goto('/search?q=mix'); await ready('button[aria-label^="Options de "]');
  const searchUrl = page.url(), searchAudio = await snap(); const sp = '[data-context-surface-trigger-key^="search-result-profile-"]'; await click(sp); await ready('[data-profile-peek-state="loaded"]'); await close();
  await click('button[aria-label^="Options de "]'); await ready('[data-organization-state="loaded"]'); await click('[data-track-action="track-details"]'); await ready('[data-organization-state="loaded"]'); await click('[data-live-route-intent]'); await page.waitForFunction(() => location.pathname.startsWith('/track/')); await wait(700);
  const tc = '[data-context-surface-trigger-key^="track-comments-"]'; if (await page.$(tc)) { await click(tc); await ready('[data-comments-state="loaded"]'); await close(); } else result.limitations.push('Track comments trigger not found in second golden journey');
  await page.goBack(); await ready('button[aria-label^="Options de "]'); check('Search restored query after Track Back', page.url() === searchUrl); const searchEnd = await snap(); check('Search golden audio/document unchanged', searchAudio.documentId === searchEnd.documentId && JSON.stringify(searchAudio.calls) === JSON.stringify(searchEnd.calls)); await capture('search-return');
  await goto('/discover'); const discoverAudio = await snap(); const dp = '[data-context-surface-trigger-key^="discover-profile-"]'; await click(dp); await ready('[data-profile-peek-state="loaded"]'); await click('[data-profile-peek-state="loaded"] button[aria-label^="Options de "]'); await ready('[data-organization-state="loaded"]'); await click('[data-track-action="playlist-picker"]'); await ready('[data-organization-state="loaded"]'); await page.keyboard.press('Escape'); await ready('[data-profile-peek-state="loaded"]'); await close(); check('Discover nested journey returns without ghost surface', new URL(page.url()).pathname === '/discover' && !await page.$(surface)); const discoverEnd = await snap(); check('Discover golden audio/document unchanged', discoverAudio.documentId === discoverEnd.documentId && JSON.stringify(discoverAudio.calls) === JSON.stringify(discoverEnd.calls)); await capture('discover');
}
async function long() {
  const start = Date.now(); result.longVisited = [];
  for (let i = 0; i < 35; i++) { result.longVisited.push((await snap()).item); await next(); }
  check('30+ real items traversed', new Set(result.longVisited).size >= 30, { unique: new Set(result.longVisited).size });
  for (let n = 0; n < 15 && !await page.$(options); n++) await next();
  await pause(); await collect('long-start');
  for (let i = 1; i <= 30; i++) {
    phase = 'long-cycle-' + i;
    for (const kind of ['peek','comments','options','queue','lyrics','playlist-picker']) { await open(kind); if (kind === 'comments') { await click('#comments-tab-moments'); await click('#comments-tab-conversation'); } await close(); }
    if (i % 5 === 0) { await continuity('long Track', trackReturn); await continuity('long AI', createAI); await continuity('long Messages', messagesReturn); }
    await collect('long-' + i); console.log('long cycle ' + i + ', elapsed ' + Math.round((Date.now() - start) / 1000) + 's');
    // Wall-clock pacing, not a fake duration multiplier. Audio pause is intentional to keep entity stable across EOF.
    const due = start + i * 20500; if (Date.now() < due) await wait(due - Date.now());
  }
  result.durationMs = Date.now() - start; await collect('long-end'); check('long session >=10min', result.durationMs >= 600000); check('long slides <=11 and no ghost surfaces', result.samples.every(s => s.slides <= 11 && s.surfaces === 0));
}
async function auditRoutes() {
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (process.env.FINAL_ZOOM === '1') { await page.setViewport(null); const { windowId } = await cdp.send('Browser.getWindowForTarget'); await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width: 1440, height: 1000 } }); const extension = await browser.installExtension(path.resolve('scripts/fixtures/comments-browser-zoom')); const worker = await (await browser.waitForTarget(t => t.type() === 'service_worker' && t.url().includes(extension))).worker(); check('native zoom 200%', await worker.evaluate(async () => { const tabs = await chrome.tabs.query({ url: 'http://localhost/*' }); for (const t of tabs) await chrome.tabs.setZoom(t.id, 2); return chrome.tabs.getZoom(tabs[0].id); }) === 2); }
  for (const [name, route] of Object.entries({ track: '/track/' + seedIds[0], profile: '/profile/mixxparty', discover: '/discover', library: '/library', search: '/search?q=mix', create: '/create', ai: '/ai-generator', studio: '/studio', messages: '/messages', notifications: '/notifications' })) { phase = name; try { await goto(route); await a11y(name); await page.keyboard.press('Escape'); if (!process.env.FINAL_ZOOM && ['track','profile','discover','library','create','ai'].includes(name)) await capture(name); } catch (e) { (result.auditFailures ||= []).push({ name, message: e.message }); } }
  await goto('/live'); await ready(active); await enterIfNeeded(); await pause();
  for (const kind of ['peek','comments','options','queue','lyrics','playlist-picker']) { phase = kind; await open(kind); await a11y(kind); if (kind === 'comments') { await click('#comments-tab-moments'); await a11y('Moments'); } await close(); }
}
async function devAudio() {
  await page.waitForFunction(() => !!window.__synauraAudioCore?.()); await pause();
  for (const kind of ['peek','comments','options']) { await open(kind); await close(); }
  const before = (await snap()).core; check('dev AudioCore native 14 listeners / one musical element', before.listeners === 14 && before.musicalAudioElements === 1, before);
  for (let i = 0; i < 10; i++) { for (const kind of ['peek','comments','options']) { await open(kind); await close(); } }
  const after = (await snap()).core;
  check('dev AudioCore subscribers and instance stable after cycles', ['instanceId','listeners','stateSubscribers','timeSubscribers','musicalAudioElements','activeSecondaryPlayers'].every(k => before[k] === after[k]), { before, after });
  const quiet = (await snap()).core; await wait(10000); const end = (await snap()).core;
  check('dev no continuous provider rerender at paused idle', quiet.providerRenders === end.providerRenders, { before: quiet.providerRenders, after: end.providerRenders });
}
async function failures() {
  for (const kind of ['profile','comments','playlist']) {
    phase = 'controlled-fault:' + kind; fault = kind; await goto('/live'); await ready(active); await enterIfNeeded();
    if (kind === 'profile') { await click(peek); await page.waitForFunction(() => /Profil introuvable|Profil indisponible/.test(document.querySelector('[role="dialog"]')?.textContent || '')); }
    if (kind === 'comments') { await click(comments); await ready('[data-comments-state="error"]'); }
    if (kind === 'playlist') { await click(options); await ready('[data-organization-state="loaded"]'); await click('[data-track-action="playlist-picker"]'); await ready('[role="alert"]'); }
    check(kind + ' fault has usable dialog not white screen', await page.$eval('[role="dialog"]', e => e.textContent.trim().length > 20)); await capture('failure-' + kind); await close(); fault = '';
  }
  phase = 'clipboard-denied'; await goto('/live'); await ready(active); await enterIfNeeded();
  await page.evaluate(() => { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); Object.defineProperty(navigator.clipboard, 'writeText', { value: async () => { throw new DOMException('Denied for isolated validation', 'NotAllowedError'); }, configurable: true }); });
  await open('share'); await textClick('Copier le lien'); await ready('[role="alert"]'); check('clipboard denied reports error, not copied success', !await page.evaluate(() => document.querySelector('[role="dialog"]').textContent.includes('Lien copié.'))); await close();
  phase = 'expired-snapshot'; await click('button[aria-label="Ouvrir le menu Créer"]'); await textClick('Tous les outils de création'); await ready('[data-handoff-return]');
  await page.evaluate(() => { const now = Date.now; Date.now = () => now() + 31 * 60 * 1000; });
  await click('[data-handoff-return]'); await ready(active); check('expired snapshot returns to readable fresh Live', new URL(page.url()).pathname === '/live');
  phase = 'unknown-token'; await goto('/studio?liveReturn=live-unknown'); check('unknown token has no false return', !await page.$('[data-handoff-return]')); await goto('/live?liveReturn=live-unknown'); await ready(active); check('unknown token falls back without white screen', !new URL(page.url()).searchParams.has('liveReturn'));
  phase = 'track-404'; await goto('/track/phase4b8-nonexistent'); check('track 404 readable fallback', await page.evaluate(() => document.body.innerText.length > 50 && /introuvable|indisponible|erreur|existe pas/i.test(document.body.innerText))); await capture('track-404');
  phase = 'media-fallback'; await goto('/live'); await ready(active); const prelude = await page.evaluate(() => [...document.querySelectorAll('button')].some(e => e.textContent.trim() === 'Ouvrir le Flow')); if (prelude) await textClick('Ouvrir le Flow'); await wait(1000);
  await page.$eval('[data-active="true"] .live-track-artwork img', e => { e.src = '/phase4b8-confirmed-missing-cover.png'; });
  await page.waitForFunction(() => { const e = document.querySelector('[data-active="true"] .live-track-artwork img'); return e.complete && e.naturalWidth > 0 && !e.src.includes('confirmed-missing-cover'); }); check('missing cover has readable fallback', true); await capture('media-fallback');
}
try {
  result.browser = await browser.version(); result.buildId = mode === 'dev-audio' ? 'development-only-not-performance' : process.env.FINAL_SERVED_SHA || (await fs.readFile('.next/BUILD_ID', 'utf8')).trim(); await setup();
  if (mode === 'final-desktop') { await golden(); await auditRoutes(); }
  else if (mode === 'production-smoke') await productionSmoke();
  else if (mode === 'accent-desktop') {
    for (const [name, route] of [['profile', '/profile/mixxparty'], ['ai', '/ai-generator']]) {
      await goto(route); await a11y(name); await capture(name);
    }
    const texts = result.accessibility.flatMap(a => a.contrast.corrected.map(c => c.text));
    check('confirmed desktop profile and AI accents actually measured', texts.includes('À écouter maintenant') && texts.includes('1 · Idee musicale'));
  }
  else if (mode === 'mobile-create-diagnostic') { await createAI(); }
  else if (mode === 'diagnostic') { await a11y('Live'); await wait(3000); await collect('keyboard-settled'); await continuity('Profile Peek isolated', async () => { await open('peek'); await close(); }); for (const route of ['/profile/mixxparty','/discover']) { await goto(route); await a11y(route); } }
  else if (mode === 'metrics') await metrics(); else if (mode === 'golden') await golden(); else if (mode === 'long') await long(); else if (mode === 'a11y') await auditRoutes(); else if (mode === 'failures') await failures(); else if (mode === 'dev-audio') await devAudio(); else throw new Error('Unknown mode');
  check('no JavaScript exception', result.errors.length === 0, result.errors); check('all executed checks passed', result.checks.every(c => c.ok) && !result.auditFailures?.length); result.status = 'PASS';
} catch (e) { result.status = 'FAIL'; result.failure = e.stack; result.failedPhase = phase; console.error(e); process.exitCode = 1; await capture('failure').catch(() => {}); }
finally { result.completedAt = new Date().toISOString(); await fs.writeFile(out + '/results.json', JSON.stringify(result, null, 2)); await browser.close(); }
