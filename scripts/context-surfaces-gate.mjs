import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const targetUrl = process.env.CONTEXT_SURFACE_URL || 'http://localhost:3000/dev/ui';
const errors = [];
const results = {};

const browser = await puppeteer.launch({ headless: true });

async function openDemo(page) {
  await page.evaluate(() => {
    const trigger = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Ouvrir la surface 4B.2'));
    if (!(trigger instanceof HTMLButtonElement)) throw new Error('Context surface trigger not found');
    trigger.click();
  });
  await page.waitForSelector('[role="dialog"]');
  await new Promise((resolve) => setTimeout(resolve, 80));
}

async function clickByText(page, text) {
  await page.evaluate((label) => {
    const button = Array.from(document.querySelectorAll('button')).find((candidate) => candidate.textContent?.includes(label));
    if (!(button instanceof HTMLButtonElement)) throw new Error(`Button not found: ${label}`);
    button.click();
  }, text);
}

async function waitClosed(page) {
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
  await new Promise((resolve) => setTimeout(resolve, 80));
}

try {
  const page = await browser.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  await page.evaluateOnNewDocument(() => {
    const audit = { play: 0, pause: 0 };
    Object.defineProperty(window, '__contextSurfaceMediaAudit', { value: audit });
    const play = HTMLMediaElement.prototype.play;
    const pause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.play = function auditedPlay(...args) {
      audit.play += 1;
      return play.apply(this, args);
    };
    HTMLMediaElement.prototype.pause = function auditedPause(...args) {
      audit.pause += 1;
      return pause.apply(this, args);
    };
  });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60_000 });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((button) => button.textContent?.includes('Ouvrir la surface 4B.2')));

  await page.evaluate(() => {
    const trigger = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Ouvrir la surface 4B.2'));
    trigger?.scrollIntoView({ block: 'center' });
    trigger?.focus();
  });

  const baseline = await page.evaluate(() => ({
    url: location.href,
    bodyY: window.scrollY,
    appY: document.querySelector('.app-scroll-container')?.scrollTop ?? null,
    media: { ...window.__contextSurfaceMediaAudit },
  }));

  await openDemo(page);
  const opened = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const rect = dialog?.getBoundingClientRect();
    return {
      active: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim().slice(0, 40),
      bodyOverflow: document.body.style.overflow,
      appOverflow: document.querySelector('.app-scroll-container')?.style.overflow ?? null,
      dialog: rect ? { width: rect.width, height: rect.height, right: innerWidth - rect.right } : null,
    };
  });
  assert.equal(opened.bodyOverflow, 'hidden');
  assert.notEqual(opened.active, null);
  assert.ok(opened.dialog && opened.dialog.width >= 400 && opened.dialog.width <= 440);

  await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const focusable = Array.from(dialog?.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') || []);
    focusable.at(-1)?.focus();
  });
  await page.keyboard.press('Tab');
  const tabWrap = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  assert.equal(tabWrap, 'Fermer');
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  const shiftTabWrap = await page.evaluate(() => document.activeElement?.textContent?.includes('Fermer la surface'));
  assert.equal(shiftTabWrap, true);
  results.keyboard = { tabWrap, shiftTabWrap };

  await clickByText(page, 'Remplacer sans nouvelle entrée Back');
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(await page.evaluate(() => document.querySelector('[role="dialog"]')?.textContent?.includes('demo:replacement')), true);
  await page.keyboard.press('Escape');
  await waitClosed(page);
  const replaceFocus = await page.evaluate(() => document.activeElement?.getAttribute('data-context-surface-trigger-key'));
  assert.equal(replaceFocus, 'ui-lab-context-surface');
  results.replaceEscapeFocus = replaceFocus;

  await openDemo(page);
  await clickByText(page, 'Ouvrir une surface justifiée');
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent?.includes('demo-child:nested'));
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent?.includes('demo:primary'));
  await new Promise((resolve) => setTimeout(resolve, 80));
  const nestedFocus = await page.evaluate(() => document.activeElement?.getAttribute('data-context-surface-trigger-key'));
  assert.equal(nestedFocus, 'demo-nested');
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await waitClosed(page);
  const backFocus = await page.evaluate(() => document.activeElement?.getAttribute('data-context-surface-trigger-key'));
  assert.equal(backFocus, 'ui-lab-context-surface');
  results.history = { nestedFocus, backFocus, url: page.url() };

  const motionPage = await browser.newPage();
  motionPage.on('console', (message) => {
    if (message.type() === 'error') errors.push(`reduced-motion console: ${message.text()}`);
  });
  motionPage.on('pageerror', (error) => errors.push(`reduced-motion page: ${error.message}`));
  await motionPage.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await motionPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await motionPage.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60_000 });
  await motionPage.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((button) => button.textContent?.includes('Ouvrir la surface 4B.2')));
  await openDemo(motionPage);
  results.reducedMotion = await motionPage.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return {
      matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      transform: dialog ? getComputedStyle(dialog).transform : null,
      opacity: dialog ? getComputedStyle(dialog).opacity : null,
    };
  });
  assert.equal(results.reducedMotion.matches, true);
  assert.equal(results.reducedMotion.transform, 'none');
  await motionPage.keyboard.press('Escape');
  await waitClosed(motionPage);
  await motionPage.close();

  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  await openDemo(page);
  results.zoom200 = await page.evaluate(() => {
    const rect = document.querySelector('[role="dialog"]')?.getBoundingClientRect();
    return {
      visualScale: visualViewport?.scale ?? null,
      visible: Boolean(rect && rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  assert.ok((results.zoom200.visualScale ?? 0) >= 2);
  assert.equal(results.zoom200.visible, true);
  assert.equal(results.zoom200.horizontalOverflow, false);
  await page.keyboard.press('Escape');
  await waitClosed(page);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.evaluate(() => {
    const trigger = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Ouvrir la surface 4B.2'));
    trigger?.scrollIntoView({ block: 'center' });
    trigger?.focus();
  });
  const mobileBaseline = await page.evaluate(() => ({
    bodyY: window.scrollY,
    appY: document.querySelector('.app-scroll-container')?.scrollTop ?? null,
  }));
  await openDemo(page);
  results.mobile = await page.evaluate(() => {
    const rect = document.querySelector('[role="dialog"]')?.getBoundingClientRect();
    return rect ? { width: rect.width, height: rect.height, bottom: innerHeight - rect.bottom } : null;
  });
  assert.ok(results.mobile && results.mobile.width === 390 && results.mobile.height <= 844);
  await page.setViewport({ width: 390, height: 520, deviceScaleFactor: 1 });
  results.virtualKeyboardSimulation = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const close = dialog?.querySelector('button[aria-label="Fermer"]');
    const rect = dialog?.getBoundingClientRect();
    return { dialogVisible: Boolean(rect && rect.bottom > 0), closeVisible: Boolean(close && close.getBoundingClientRect().bottom <= innerHeight) };
  });
  assert.equal(results.virtualKeyboardSimulation.dialogVisible, true);
  assert.equal(results.virtualKeyboardSimulation.closeVisible, true);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.keyboard.press('Escape');
  await waitClosed(page);

  const finalState = await page.evaluate(() => ({
    bodyY: window.scrollY,
    appY: document.querySelector('.app-scroll-container')?.scrollTop ?? null,
    bodyOverflow: document.body.style.overflow,
    focusInBody: document.activeElement === document.body,
    media: { ...window.__contextSurfaceMediaAudit },
  }));
  assert.equal(finalState.bodyY, mobileBaseline.bodyY);
  assert.equal(finalState.appY, mobileBaseline.appY);
  assert.equal(finalState.bodyOverflow, '');
  assert.equal(finalState.focusInBody, false);
  assert.deepEqual(finalState.media, baseline.media);
  assert.equal(page.url(), baseline.url);
  assert.deepEqual(errors, []);
  results.invariants = { background: 'stable', bodyScroll: 'stable', focus: 'restored', audioCoreMediaCalls: finalState.media, consoleErrors: errors };

  process.stdout.write(`${JSON.stringify({ targetUrl, status: 'PASS', ...results }, null, 2)}\n`);
} finally {
  await browser.close();
}
