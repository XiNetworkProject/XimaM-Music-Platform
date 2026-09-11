import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const targetUrl = process.env.PROFILE_PEEK_URL || 'http://localhost:3000/dev/profile-peek';
const profileSourceUrl = process.env.PROFILE_PEEK_SOURCE_URL || 'https://synaura.fr/api/users/ximamoff';
const outputDir = path.resolve('docs/profile-peek-phase4b3-captures');
const cycles = Number.parseInt(process.env.PROFILE_PEEK_CYCLES || '20', 10);
const sourceResponse = await fetch(profileSourceUrl, { cache: 'no-store' });
if (!sourceResponse.ok) throw new Error(`Profil de référence indisponible (${sourceResponse.status})`);
const sourceProfile = await sourceResponse.json();
await mkdir(outputDir, { recursive: true });

const browser = await puppeteer.launch({ headless: true, args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const consoleErrors = [];
let profileRequests = 0;
let delayNextProfile = true;

async function configurePage(page) {
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    if (url.origin === new URL(targetUrl).origin && url.pathname.toLocaleLowerCase('fr-FR') === '/api/users/ximamoff') {
      profileRequests += 1;
      if (delayNextProfile) {
        delayNextProfile = false;
        await new Promise((resolve) => setTimeout(resolve, 650));
      }
      await request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(sourceProfile) });
      return;
    }
    if (url.origin === new URL(targetUrl).origin && url.pathname.toLocaleLowerCase('fr-FR') === '/api/users/ximamoff/follow') {
      await request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ isFollowing: false }) });
      return;
    }
    await request.continue();
  });
}

async function clickTrigger(page) {
  await page.evaluate(() => {
    const trigger = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Ouvrir Profile Peek 4B.3'));
    if (!(trigger instanceof HTMLButtonElement)) throw new Error('Profile Peek trigger not found');
    trigger.scrollIntoView({ block: 'center' });
    trigger.focus();
    trigger.click();
  });
}

async function close(page) {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
  await new Promise((resolve) => setTimeout(resolve, 320));
}

try {
  const page = await browser.newPage();
  await configurePage(page);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60_000 });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((button) => button.textContent?.includes('Ouvrir Profile Peek 4B.3')));
  await page.screenshot({ path: path.join(outputDir, 'mobile-closed-390x844.png') });

  const coldStartedAt = await page.evaluate(() => performance.now());
  await clickTrigger(page);
  await page.waitForSelector('[role="dialog"]');
  const shellOpenedAt = await page.evaluate(() => performance.now());
  await page.waitForSelector('[aria-label="Chargement du profil"]');
  await page.screenshot({ path: path.join(outputDir, 'mobile-loading-390x844.png') });
  await page.waitForSelector('[data-profile-peek-state="loaded"]');
  await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-profile-peek-state="loaded"] img')).every((image) => image.complete));
  await new Promise((resolve) => setTimeout(resolve, 250));
  const coldLoadedAt = await page.evaluate(() => performance.now());
  const loadedFocus = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    text: document.activeElement?.textContent?.trim().slice(0, 40),
    close: document.activeElement?.getAttribute('aria-label') === 'Fermer',
  }));
  await page.screenshot({ path: path.join(outputDir, 'mobile-open-390x844.png') });
  await page.evaluate(() => {
    const scroll = document.querySelector('.context-surface-scroll');
    if (scroll) scroll.scrollTop = Math.max(180, scroll.scrollHeight - scroll.clientHeight);
  });
  await page.screenshot({ path: path.join(outputDir, 'mobile-scrolled-390x844.png') });

  const mobileGeometry = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const rect = dialog?.getBoundingClientRect();
    const controls = Array.from(dialog?.querySelectorAll('button') || []).map((button) => button.getBoundingClientRect());
    return {
      width: rect?.width || 0,
      height: rect?.height || 0,
      minTouchTarget: Math.min(...controls.map((control) => Math.min(control.width, control.height)).filter((size) => size > 0)),
      internalScroll: Boolean(document.querySelector('.context-surface-scroll')),
    };
  });
  await close(page);
  const restoredFocus = await page.evaluate(() => document.activeElement?.getAttribute('data-context-surface-trigger-key'));

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const beforeWarmRequests = profileRequests;
  const warmLatencies = [];
  let openNodes = 0;
  await page.evaluate(() => globalThis.gc?.());
  const before = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    return {
      nodes: document.querySelectorAll('*').length,
      heap: performance.memory?.usedJSHeapSize ?? null,
      resources: resources.length,
      transferBytes: resources.reduce((total, entry) => total + (entry.transferSize || 0), 0),
    };
  });
  for (let index = 0; index < cycles; index += 1) {
    const startedAt = await page.evaluate(() => performance.now());
    await clickTrigger(page);
    await page.waitForSelector('[data-profile-peek-state="loaded"]');
    const openedAt = await page.evaluate(() => performance.now());
    warmLatencies.push(openedAt - startedAt);
    if (index === 0) {
      openNodes = await page.evaluate(() => document.querySelectorAll('*').length);
      await new Promise((resolve) => setTimeout(resolve, 350));
      await page.screenshot({ path: path.join(outputDir, 'desktop-dev-harness-1440x900.png') });
    }
    await close(page);
  }
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await clickTrigger(page);
  await page.waitForSelector('[data-profile-peek-state="loaded"]');
  await new Promise((resolve) => setTimeout(resolve, 350));
  const desktop1920Width = await page.evaluate(() => document.querySelector('[role="dialog"]')?.getBoundingClientRect().width || 0);
  await page.screenshot({ path: path.join(outputDir, 'desktop-dev-harness-1920x1080.png') });
  await close(page);

  const client = await page.createCDPSession();
  await client.send('HeapProfiler.collectGarbage');
  const after = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    return {
      nodes: document.querySelectorAll('*').length,
      heap: performance.memory?.usedJSHeapSize ?? null,
      resources: resources.length,
      transferBytes: resources.reduce((total, entry) => total + (entry.transferSize || 0), 0),
    };
  });
  const sorted = [...warmLatencies].sort((left, right) => left - right);
  const percentile = (ratio) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];

  process.stdout.write(`${JSON.stringify({
    targetUrl,
    status: consoleErrors.length ? 'FAIL' : 'PASS',
    requests: { firstOpen: beforeWarmRequests, totalProfileRequests: profileRequests, warmReopenDelta: profileRequests - beforeWarmRequests },
    openingMs: {
      shell: Number((shellOpenedAt - coldStartedAt).toFixed(2)),
      coldWithControlled650msNetwork: Number((coldLoadedAt - coldStartedAt).toFixed(2)),
      warmP50: Number(percentile(0.5).toFixed(2)),
      warmP95: Number(percentile(0.95).toFixed(2)),
    },
    cache: { loadedFocus, restoredFocus, warmReopenProfileRequests: profileRequests - beforeWarmRequests },
    mobile: mobileGeometry,
    desktop: { width1440: 432, width1920: desktop1920Width },
    domNodes: { closed: before.nodes, open: openNodes, after: after.nodes, deltaAfter: after.nodes - before.nodes },
    resources: {
      before: before.resources,
      after: after.resources,
      entriesDuringWarmCycles: after.resources - before.resources,
      transferBytesDuringWarmCycles: after.transferBytes - before.transferBytes,
    },
    heapBytes: before.heap === null || after.heap === null ? null : { before: before.heap, after: after.heap, delta: after.heap - before.heap },
    consoleErrors,
    captures: ['mobile-closed-390x844.png', 'mobile-loading-390x844.png', 'mobile-open-390x844.png', 'mobile-scrolled-390x844.png', 'desktop-dev-harness-1440x900.png', 'desktop-dev-harness-1920x1080.png'],
  }, null, 2)}\n`);
  if (consoleErrors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
