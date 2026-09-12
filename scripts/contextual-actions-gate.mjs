// Disposable authenticated browser. Only its newly created private playlists are mutated.
// Social favorites are simulated at the network boundary: no notifications/mission signal in production.
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
dotenv.config({ path: '.env.local', quiet: true });
const base = 'http://localhost:3000';
const zoomOnly = process.env.ORGANIZATION_E2E_ZOOM_ONLY === '1';
const output = process.env.ORGANIZATION_E2E_OUTPUT || 'docs/contextual-actions-phase4b5-captures';
await fs.mkdir(output, { recursive: true });
const result = { checks: [], errors: [], consoleErrors: [], httpErrors: [], requests: [], captures: [], cleanup: [], limitations: ['Android/Gboard réel non testé', 'NVDA réel non testé', 'Favorite mutations intercepted to avoid persistent missions/notifications on existing content'] };
const browser = await puppeteer.launch({ headless: false, pipe: true, enableExtensions: true, args: ['--window-size=1440,1000','--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage(); page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(90000);
const created = []; let fakeFavorite = false;
let keyboardNavigation = false;
const ids = ['track_1773789112971_0egfpy0i2', 'track_1758481606741_trwopq702', 'track_1782517870229_4_vjgv7x3'];
const tracks = await Promise.all(ids.map(async id => { const r = await fetch(base + '/api/tracks/' + id); assert(r.ok); return r.json(); }));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const ready = async s => { const h = await page.waitForSelector(s); await h?.dispose(); if (/data-organization|data-comments-state|data-profile-peek-state/.test(s)) await wait(240); };
const check = (name, ok, detail) => { result.checks.push({ name, ok: Boolean(ok), detail }); console.log(name + ': ' + (ok ? 'PASS' : 'FAIL')); assert(ok, name); };
const active = '[data-feed-item-id][data-active="true"]';
const options = active + ' button[aria-label^="Options de "]';
const surface = name => `[data-organization-surface="${name}"][data-organization-state="loaded"]`;
const api = (url, method = 'GET', body) => page.evaluate(async (url, method, body) => {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: r.status, body: await r.json() };
}, url, method, body);
const snapshot = () => page.evaluate(() => ({ core: window.__synauraAudioCore?.(), calls: { ...window.__actionsCalls }, item: document.querySelector('[data-active="true"][data-feed-item-id]')?.dataset.feedItemId, scroll: document.querySelector('[data-testid="synaura-scroll-feed"]')?.scrollTop, slides: document.querySelectorAll('section[data-feed-item-id]').length, focus: document.activeElement?.getAttribute('data-context-surface-trigger-key') }));
const noAudio = (a, b) => JSON.stringify(a.calls) === JSON.stringify(b.calls) && ['instanceId', 'trackId', 'generation', 'playbackState'].every(k => a.core?.[k] === b.core?.[k]);
const unchanged = (a, b) => noAudio(a, b) && a.item === b.item && a.scroll === b.scroll && JSON.stringify(a.core.queueIds) === JSON.stringify(b.core.queueIds);
const capture = async name => { await page.$$eval('[aria-label="Notifications temporaires"] button[aria-label="Fermer"]', buttons=>buttons.forEach(b=>b.click())); await wait(180); await page.screenshot({ path: `${output}/${name}.png` }); result.captures.push(name + '.png'); };
const activate = async selector => { if (keyboardNavigation) { await page.focus(selector); await page.keyboard.press('Enter'); } else await page.click(selector); };
const open = async () => { const start = performance.now(); await activate(options); await ready(surface('track-options')); return performance.now() - start; };
const action = async id => { await activate(`[data-track-action="${id}"]`); if (!id.startsWith('queue-')) await ready(surface(id === 'share' ? 'track-share' : id)); };
const close = async () => { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('[data-organization-surface]')); await wait(180); };
const clickText = async text => { const ok = await page.evaluate(text => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.trim() === text); if (!b || b.disabled) return false; b.click(); return true; }, text); assert(ok, text); };
page.on('pageerror', e => result.errors.push(e.message));
page.on('console', message => { if (message.type()==='error') result.consoleErrors.push(message.text().replace(/https?:\/\/\S+/g,'[URL]').slice(0,240)); });
page.on('response', response => { if(response.status()>=400)result.httpErrors.push({host:new URL(response.url()).hostname,path:new URL(response.url()).pathname,status:response.status()}); });
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  const calls = window.__actionsCalls = { play: 0, pause: 0, seek: 0, load: 0 };
  window.__actionClicks = [];
  document.addEventListener('click', e => window.__actionClicks.push({ label: e.target.closest('button')?.getAttribute('aria-label'), text:e.target.closest('button')?.textContent?.slice(0,100) }), true);
  for (const name of ['play','pause','load']) { const original = HTMLMediaElement.prototype[name]; HTMLMediaElement.prototype[name] = function(...args) { if (this.tagName === 'AUDIO') calls[name]++; return original.apply(this,args); }; }
  const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
  Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {...d, set(value) { if (this.tagName === 'AUDIO') calls.seek++; d.set.call(this,value); }});
});
await page.setRequestInterception(true);
page.on('request', async request => {
  try {
    const url = new URL(request.url()); const method = request.method();
    if (url.origin === base && url.pathname.startsWith('/api/')) result.requests.push({ method, path: url.pathname + url.search });
    if (url.pathname === '/api/ranking/feed') return await request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ tracks, hasMore: false, nextCursor: tracks.length }) });
    if (/\/api\/tracks\/[^/]+\/(events|plays)$/.test(url.pathname) && method === 'POST') return await request.respond({ status: 200, contentType: 'application/json', body: '{"accepted":true}' });
    if (url.pathname === '/api/recommendations/impressions' && method === 'POST') return await request.respond({ status: 200, contentType: 'application/json', body: '{}' });
    if (url.pathname === `/api/tracks/${ids[0]}/like`) {
      if (method !== 'GET') fakeFavorite = method === 'POST';
      return await request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ liked: fakeFavorite, isLiked: fakeFavorite, likesCount: fakeFavorite ? 1 : 0 }) });
    }
    await request.continue();
  } catch { if (!request.isInterceptResolutionHandled()) await request.abort(); }
});
try {
  await page.setViewport({ width: 1440, height: 900 });
  assert(process.env.SYNAURA_E2E_EMAIL && process.env.SYNAURA_E2E_PASSWORD);
  await browser.defaultBrowserContext().overridePermissions(base, ['clipboard-read','clipboard-write','clipboard-sanitized-write']);
  await page.goto(base + '/auth/signin', { waitUntil: 'networkidle2' });
  await ready('input[type="email"]');
  await page.type('input[type="email"]', process.env.SYNAURA_E2E_EMAIL); await page.type('input[type="password"]', process.env.SYNAURA_E2E_PASSWORD);
  await page.click('button[type="submit"]'); await page.waitForFunction(() => !location.pathname.startsWith('/auth/signin'));
  await page.goto(base + '/live', { waitUntil: 'networkidle2' }); await ready(options);
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Ouvrir le Flow')?.click());
  await page.waitForFunction(() => window.__synauraAudioCore?.().playbackState === 'playing'); await wait(500);
  const initial = await snapshot();
  if (!zoomOnly) {
  check('no inactive playlist or track-details query', result.requests.filter(r => r.path === '/api/playlists' || ids.some(id => r.path === '/api/tracks/' + id)).length === 0);
  result.coldOpenMs = await open(); check('options opens with zero audio mutation', unchanged(initial, await snapshot())); await capture('desktop-options-1440');
  await page.focus('[role="menuitem"]'); await page.keyboard.press('End');
  check('menu End reaches last action', await page.$eval('[role="menu"]', e => document.activeElement === [...e.querySelectorAll('[role="menuitem"]:not(:disabled)')].at(-1)));
  await page.keyboard.press('Home'); check('menu Home reaches first action', await page.$eval('[role="menu"]', e => document.activeElement === e.querySelector('[role="menuitem"]')));
  await page.click('[data-organization-surface] button[aria-label^="Ajouter "][aria-pressed]');
  await ready('[data-organization-surface] button[aria-pressed="true"]');
  check('favorite syncs mounted Live and options (intercepted API)', await page.$eval(active + ' button[aria-pressed][aria-label*="favoris"]', b => b.getAttribute('aria-pressed') === 'true'));
  await page.click('[data-organization-surface] button[aria-pressed="true"]'); await ready('[data-organization-surface] button[aria-pressed="false"]');
  await action('playlist-picker'); await ready('input[type="search"]');
  const playlistName = `[E2E 4B.5] ${Date.now()}`;
  await page.type('[data-organization-surface] form input', playlistName);
  const creation = page.waitForResponse(r => new URL(r.url()).pathname === '/api/playlists' && r.request().method() === 'POST');
  await page.click('[data-organization-surface] form button[type="submit"]');
  const response = await creation; const playlist = await response.json(); assert(response.ok()); assert(playlist._id); created.push(playlist._id);
  check('quick creation uses actual private playlist', playlist.name === playlistName && !playlist.isPublic);
  const member = `[data-playlist-id="${playlist._id}"]`;
  await page.click(member); await ready(member + '[aria-pressed="true"]');
  const added = await api('/api/playlists/' + playlist._id);
  check('add confirmed by real playlist API', added.body.tracks.some(t => t._id === ids[0])); await capture('desktop-playlist-1440');
  await close(); check('playlist success keeps Live and audio', unchanged(initial, await snapshot()));
  check('focus restored to original options trigger', (await snapshot()).focus === 'track-actions-live-' + ids[0]);
  await open(); await action('playlist-picker'); await ready(member + '[aria-pressed="true"]');
  await page.click(member); await ready(member + '[aria-pressed="false"]');
  const removed = await api('/api/playlists/' + playlist._id); check('remove confirmed by real playlist API', !removed.body.tracks.some(t => t._id === ids[0])); await close();
  for (const id of ['queue','lyrics','share','track-details']) {
    const before = await snapshot(); await open(); await action(id); check(id + ' open has zero audio mutation', unchanged(before, await snapshot()));
    await capture(`desktop-${id}-1440`);
    if (id === 'queue') { await page.setViewport({width:1920,height:1080}); await capture('desktop-live-queue-1920'); await page.setViewport({width:1440,height:900}); }
    if (id === 'lyrics') check('lyrics are actual persisted text', await page.$eval('[data-track-lyrics]', e => e.textContent) === tracks[0].lyrics.trim());
    if (id === 'share') {
      check('share fallback has canonical URL', await page.$eval('input[aria-label="Lien partageable du morceau"]', e => e.value) === 'https://synaura.fr/track/' + ids[0]);
      await page.bringToFront(); await clickText('Copier le lien'); await page.waitForFunction(()=>document.querySelector('[data-organization-surface] [role="status"]')?.textContent==='Lien copié.');
      check('copy writes canonical URL to real clipboard', await page.evaluate(()=>navigator.clipboard.readText()) === 'https://synaura.fr/track/' + ids[0]);
    }
    await close(); check(id + ' close has zero audio mutation', unchanged(before, await snapshot()));
  }
  // Parent Comments remains mounted logically; sibling actions replace, not stack.
  await page.click(active + ' button[aria-label^="Commentaires de "]'); await ready('[data-comments-state="loaded"]');
  await page.type('textarea', 'Draft 4B.5 — never submitted'); await page.click('[data-context-surface="comments"] button[aria-label^="Options de "]'); await ready(surface('track-options')); await action('playlist-picker'); await close();
  await ready('[data-comments-state="loaded"]'); check('Comments parent and draft survive sibling replace and Back', await page.$eval('textarea', e => e.value) === 'Draft 4B.5 — never submitted');
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('[data-context-surface="comments"]')); await wait(200);
  await page.click(active + ' [data-context-surface-trigger-key^="live-track-profile-"]'); await ready('[data-profile-peek-state="loaded"]');
  const otherTrigger = await page.$$eval('[data-profile-peek-state="loaded"] [data-context-surface-trigger-key^="track-actions-"]', (buttons, currentId) => buttons.find(b => !b.dataset.contextSurfaceTriggerKey.endsWith(currentId))?.dataset.contextSurfaceTriggerKey, ids[0]);
  assert(otherTrigger, 'A real recent track from Profile Peek is required for queue mutation');
  await page.click(`[data-context-surface-trigger-key="${otherTrigger}"]`); await ready(surface('track-options'));
  const queueTarget = await page.$eval('[data-organization-track]', e=>e.dataset.organizationTrack); const queueBefore = await snapshot();
  await action('queue-next'); await wait(300); const nextState = await snapshot();
  check('queue next from nested Profile Peek preserves playing track', noAudio(queueBefore,nextState) && nextState.core.queueIds[nextState.core.queueIds.indexOf(ids[0])+1] === queueTarget, {id:queueTarget,queue:nextState.core.queueIds});
  await action('queue-end'); await wait(300); const endState=await snapshot();
  check('queue end is actual last position with no duplicate', noAudio(nextState,endState) && endState.core.queueIds.at(-1)===queueTarget && endState.core.queueIds.filter(id=>id===queueTarget).length===1);
  await action('queue'); await ready(`[data-queue-track="${queueTarget}"]`);
  await page.click(`[data-queue-track="${queueTarget}"] button[aria-label^="Retirer "]`); await wait(300);
  check('explicit remove updates canonical queue', !(await snapshot()).core.queueIds.includes(queueTarget));
  await clickText('Vider la suite'); await wait(300); const cleared=await snapshot();
  check('clear remaining preserves current track and playback', noAudio(queueBefore,cleared) && cleared.core.queueIds.at(-1)===ids[0]);
  await close(); await ready('[data-profile-peek-state="loaded"]');
  check('nested queue Back restores Profile Peek action focus', (await snapshot()).focus===otherTrigger);
  await page.keyboard.press('Escape'); await page.waitForFunction(()=>!document.querySelector('[data-profile-peek-state]')); await wait(200);
  // Queue mutations for another track while A continues, using the canonical Track entry.
  await open(); await action('track-details'); await clickText('Ouvrir le morceau'); await page.waitForFunction(id => location.pathname === '/track/' + id, {}, ids[0]);
  check('Track details handoff has no second musical element', await page.evaluate(() => document.querySelectorAll('audio[controls]').length === 0));
  await page.goBack(); await ready(options); check('Track handoff Back restores Live item', (await snapshot()).item === initial.item);
  await page.setViewport({width:390,height:844});
  for (const id of ['track-options','playlist-picker','queue','lyrics']) {
    await open(); if (id !== 'track-options') await action(id);
    const geometry = await page.$eval('[data-organization-surface]', e => ({w:e.clientWidth,scroll:e.scrollWidth,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,height:innerHeight}));
    check('mobile ' + id + ' fits viewport', geometry.scroll <= geometry.w + 1 && geometry.top >= -1 && geometry.bottom <= geometry.height + 1, geometry);
    if (id === 'playlist-picker') { await page.focus('[data-organization-surface] form input'); check('playlist input visible on emulated mobile', await page.$eval('[data-organization-surface] form input', e => e.getBoundingClientRect().bottom <= innerHeight)); }
    await capture(`mobile-${id}-390`); await close();
  }
  await open(); await action('track-details'); await clickText('Ouvrir le morceau'); await page.waitForFunction(id => location.pathname === '/track/' + id, {}, ids[0]); await wait(400);
  check('Track mobile actions no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await capture('mobile-track-actions-390'); await page.goBack(); await ready(options);
  await page.setViewport({width:1440,height:900}); await open(); await close();
  const cdp = await page.createCDPSession(); await cdp.send('HeapProfiler.collectGarbage'); result.before20 = {...await page.metrics(),...await cdp.send('Memory.getDOMCounters'), core:(await snapshot()).core};
  const requestIndex = result.requests.length; const times = [];
  for (let i=0;i<20;i++) { times.push(await open()); if (i%2) await action('lyrics'); await close(); }
  await cdp.send('HeapProfiler.collectGarbage'); result.after20 = {...await page.metrics(),...await cdp.send('Memory.getDOMCounters'),core:(await snapshot()).core};
  times.sort((a,b)=>a-b); result.warmOpenMs = {p50:times[9],p95:times[18]};
  result.warmOrganizationRequests = result.requests.slice(requestIndex).filter(r => r.path === '/api/playlists' || r.path.startsWith('/api/tracks/') && !r.path.includes('/events') && !r.path.includes('/plays'));
  check('20 warm cycles without organization refetch', result.warmOrganizationRequests.length === 0, result.warmOrganizationRequests);
  check('Live mounted slides bounded at +/-5', (await snapshot()).slides <= 11);
  check('AudioCore instance stable after 20 cycles', result.before20.core.instanceId === result.after20.core.instanceId);
  check('AudioCore listeners and subscriptions do not accumulate', ['listeners','stateSubscribers','timeSubscribers'].every(k=>result.before20.core[k]===result.after20.core[k]), {before:result.before20.core,after:result.after20.core});
  }
  await page.setViewport(null);
  const zoomCdp = await page.createCDPSession();
  const { windowId } = await zoomCdp.send('Browser.getWindowForTarget');
  await zoomCdp.send('Browser.setWindowBounds', { windowId, bounds: { width:1440,height:1000 } });
  const zoomExtension=await browser.installExtension(path.resolve('scripts/fixtures/comments-browser-zoom'));
  const worker=await (await browser.waitForTarget(t=>t.type()==='service_worker'&&t.url().includes(zoomExtension))).worker();
  const nativeZoom=await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({url:'http://localhost/*'});for(const t of tabs)await chrome.tabs.setZoom(t.id,2);return chrome.tabs.getZoom(tabs[0].id);});
  check('desktop native browser zoom is 200 percent', nativeZoom===2);
  await wait(700); keyboardNavigation = true;
  await page.$eval(options,e=>e.scrollIntoView({block:'nearest',inline:'nearest'})); await wait(250);
  await page.focus(options);
  result.zoomGeometry = await page.$eval(options,e=>{const r=e.getBoundingClientRect();const a=e.closest('aside');const ar=a.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {viewport:{w:innerWidth,h:innerHeight,dpr:devicePixelRatio},button:{x:r.x,y:r.y,w:r.width,h:r.height},aside:{x:ar.x,y:ar.y,w:ar.width,h:ar.height,scroll:a.scrollTop,scrollHeight:a.scrollHeight,css:getComputedStyle(a).cssText,top:getComputedStyle(a).top,bottom:getComputedStyle(a).bottom,transform:getComputedStyle(a).transform},hit:hit?.outerHTML.slice(0,300),uncovered:hit?.closest('button')===e};});
  check('zoomed Live Options is not covered by another control', result.zoomGeometry.uncovered, result.zoomGeometry);
  for(const id of ['track-options','playlist-picker','queue','lyrics','track-details']) { await open();if(id!=='track-options')await action(id);check('zoom 200 '+id+' no horizontal overflow',await page.$eval('[data-organization-surface]',e=>e.scrollWidth<=e.clientWidth+1));await capture('zoom200-'+id);await close(); }
  await worker.evaluate(async()=>{for(const t of await chrome.tabs.query({url:'http://localhost/*'}))await chrome.tabs.setZoom(t.id,1);});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]); await open(); await page.keyboard.press('Tab'); await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
  check('Tab and Shift+Tab remain within dialog', await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]'))); await close();
  check('no uncaught UI errors', result.errors.length === 0, result.errors);
  check('no local API HTTP failures before fixture cleanup', result.httpErrors.filter(e=>e.host==='localhost').length===0, result.httpErrors);
  result.status = 'PASS';
} catch (error) { result.status = 'FAIL'; result.failure = error.message; result.clicks = await page.evaluate(() => window.__actionClicks); console.error(error.message, result.clicks); await capture('failure-state').catch(()=>{}); process.exitCode=1; }
finally {
  for (const id of created) { const r=await api('/api/playlists/'+id,'DELETE').catch(e=>({status:0})); const verify=await api('/api/playlists/'+id); result.cleanup.push({id,status:r.status,readStatus:verify.status}); if(r.status!==200||verify.status!==404) {result.status='FAIL';process.exitCode=1;} }
  await fs.writeFile(output+(zoomOnly?'/results-zoom.json':'/results.json'),JSON.stringify(result,null,2)); await browser.close();
}
