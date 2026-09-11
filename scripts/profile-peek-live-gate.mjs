import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const localOrigin = String(process.env.SYNAURA_E2E_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const productionOrigin = String(process.env.SYNAURA_E2E_PRODUCTION_URL || 'https://synaura.fr').replace(/\/$/, '');
const visualPolishOnly = process.env.PROFILE_PEEK_CAPTURE_MODE === 'visual-polish';
const captureDirectory = path.resolve('docs/profile-peek-phase4b3-captures');
await fs.mkdir(captureDirectory, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
});
const page = await browser.newPage();
page.setDefaultTimeout(60_000);
page.setDefaultNavigationTimeout(120_000);
const consoleErrors = [];
const requestFailures = [];
const proxyErrors = [];
const profileRequests = [];

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 300));
});
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${String(error?.message || error).slice(0, 300)}`));
page.on('requestfailed', (request) => requestFailures.push(`${new URL(request.url()).pathname} ${request.failure()?.errorText || ''}`));

await page.setRequestInterception(true);
page.on('request', async (request) => {
  const url = new URL(request.url());
  if (
    url.origin === localOrigin
    && /^\/api\/tracks\/[^/]+\/(?:events|plays)$/.test(url.pathname)
    && request.method() === 'POST'
  ) {
    request.respond({ status: 200, contentType: 'application/json', body: '{"accepted":true}' }).catch(() => {});
    return;
  }
  if (
    url.origin !== localOrigin
    || !url.pathname.startsWith('/api/')
    || url.pathname.startsWith('/api/auth/')
    || request.method() !== 'GET'
  ) {
    request.continue().catch(() => {});
    return;
  }

  try {
    if (/^\/api\/users\/[^/]+$/.test(url.pathname) && url.pathname !== '/api/users/popular') {
      profileRequests.push(url.pathname);
    }
    const upstream = await fetch(`${productionOrigin}${url.pathname}${url.search}`, {
      headers: { accept: request.headers().accept || 'application/json' },
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    request.respond({
      status: upstream.status,
      contentType: upstream.headers.get('content-type') || 'application/json',
      body,
    }).catch(() => {});
  } catch (error) {
    proxyErrors.push(`${url.pathname} ${String(error?.message || error).slice(0, 180)}`);
    request.abort().catch(() => {});
  }
});

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function liveState() {
  return page.evaluate(() => {
    const active = document.querySelector('[data-feed-item-id][data-active="true"]');
    const feed = document.querySelector('[data-testid="synaura-scroll-feed"]');
    const selectedFilter = [...document.querySelectorAll('button[aria-pressed="true"]')]
      .map((button) => button.textContent?.trim())
      .find(Boolean) || null;
    const audio = window.__synauraAudioCore?.() || null;
    return {
      activeItemId: active?.getAttribute('data-feed-item-id') || null,
      activeItemType: active?.getAttribute('data-feed-item-type') || null,
      scrollTop: feed?.scrollTop || 0,
      filter: selectedFilter,
      audio: audio ? {
        instanceId: audio.instanceId,
        trackId: audio.trackId,
        currentTrackIndex: audio.currentTrackIndex,
        queueLength: audio.queueLength,
        playbackState: audio.playbackState,
        position: audio.position,
        activeSecondaryPlayers: audio.activeSecondaryPlayers,
      } : null,
    };
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sameAudioContract(before, after) {
  if (!before && !after) return true;
  if (!before || !after) return false;
  return before.instanceId === after.instanceId
    && before.trackId === after.trackId
    && before.currentTrackIndex === after.currentTrackIndex
    && before.queueLength === after.queueLength
    && before.playbackState === after.playbackState
    && before.activeSecondaryPlayers === after.activeSecondaryPlayers;
}

try {
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${localOrigin}/dev/live?filter=clips`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="synaura-scroll-feed"]');
  await page.waitForFunction(() => Boolean(document.querySelector('[data-feed-item-id][data-active="true"]')));
  await page.waitForFunction(() => Boolean(document.querySelector('[data-feed-item-id][data-active="true"] [data-context-surface-trigger-key^="live-"]')));
  await delay(1_000);
  const liveDiagnosticStart = { console: consoleErrors.length, requests: requestFailures.length, proxy: proxyErrors.length };

  const triggerKey = await page.evaluate(() => {
    const trigger = document.querySelector('[data-feed-item-id][data-active="true"] [data-context-surface-trigger-key^="live-"]');
    if (!(trigger instanceof HTMLElement)) return null;
    trigger.focus();
    trigger.click();
    return trigger.dataset.contextSurfaceTriggerKey || null;
  });
  assert(triggerKey, 'Aucun déclencheur Profile Peek visible dans l’item Live actif');

  const before = await liveState();
  await page.waitForSelector('[data-profile-peek-state="loaded"]');
  await delay(600);
  const open = await liveState();
  const focusedHeading = await page.evaluate(() => ({
    tag: document.activeElement?.tagName || null,
    text: document.activeElement?.textContent?.trim() || null,
  }));

  assert(before.activeItemId === open.activeItemId, 'L’item Live actif a changé à l’ouverture');
  assert(before.filter === open.filter, 'Le filtre Live a changé à l’ouverture');
  assert(Math.abs(before.scrollTop - open.scrollTop) < 2, 'La position Live a changé à l’ouverture');
  assert(sameAudioContract(before.audio, open.audio), 'Le contrat Audio Core a changé à l’ouverture');
  assert(focusedHeading.tag === 'HEADER', 'Le focus initial chargé n’est pas placé sur la région d’identité du profil');

  await page.screenshot({ path: path.join(captureDirectory, 'desktop-live-context-1440x900.png') });
  if (visualPolishOnly) {
    const desktopVisual = await page.evaluate(() => {
      const backdrop = document.querySelector('[data-synaura-overlay-backdrop]');
      const desktopCta = document.querySelector('[data-profile-peek-full-profile="desktop"]');
      const mobileCta = document.querySelector('[data-profile-peek-full-profile="mobile"]');
      const focused = document.activeElement;
      const visible = (element) => element instanceof HTMLElement && element.getClientRects().length > 0;
      return {
        backdropFilter: backdrop ? getComputedStyle(backdrop).backdropFilter : null,
        backdropColor: backdrop ? getComputedStyle(backdrop).backgroundColor : null,
        desktopCtaVisible: visible(desktopCta),
        mobileCtaVisible: visible(mobileCta),
        focusTag: focused?.tagName || null,
        focusOutline: focused instanceof HTMLElement ? getComputedStyle(focused).outlineStyle : null,
      };
    });
    assert(desktopVisual.backdropFilter === 'blur(1px)', `Blur backdrop inattendu: ${desktopVisual.backdropFilter}`);
    assert(desktopVisual.desktopCtaVisible && !desktopVisual.mobileCtaVisible, 'Le CTA desktop doit être unique et placé en haut');
    assert(desktopVisual.focusTag === 'HEADER' && desktopVisual.focusOutline === 'none', 'Le focus initial ne doit pas dessiner de ring sur le nom');

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await delay(400);
    const mobileVisual = await page.evaluate(() => {
      const sheet = document.querySelector('[data-profile-peek-state="loaded"]');
      const scroller = document.querySelector('.context-surface-scroll');
      const desktopCta = document.querySelector('[data-profile-peek-full-profile="desktop"]');
      const mobileCta = document.querySelector('[data-profile-peek-full-profile="mobile"]');
      const visible = (element) => element instanceof HTMLElement && element.getClientRects().length > 0;
      return {
        sheetHeight: sheet?.getBoundingClientRect().height || 0,
        viewportHeight: window.innerHeight,
        internalScroll: scroller instanceof HTMLElement && scroller.scrollHeight > scroller.clientHeight,
        desktopCtaVisible: visible(desktopCta),
        mobileCtaVisible: visible(mobileCta),
      };
    });
    const sheetRatio = mobileVisual.sheetHeight / mobileVisual.viewportHeight;
    assert(sheetRatio >= 0.78 && sheetRatio <= 0.84, `Hauteur mobile hors plage: ${sheetRatio}`);
    assert(mobileVisual.internalScroll, 'La sheet mobile doit conserver son scroll interne');
    assert(!mobileVisual.desktopCtaVisible && mobileVisual.mobileCtaVisible, 'Le CTA mobile sticky doit être l’unique CTA Profil complet');
    const footerClearance = await page.evaluate(() => {
      const scroller = document.querySelector('.context-surface-scroll');
      if (!(scroller instanceof HTMLElement)) return null;
      scroller.scrollTop = scroller.scrollHeight;
      const footer = document.querySelector('[data-profile-peek-full-profile="mobile"]')?.closest('footer');
      const tracks = [...scroller.querySelectorAll('section [aria-label^="Écouter "]')];
      const lastTrack = tracks.at(-1)?.closest('.min-h-\\[72px\\]');
      if (!(footer instanceof HTMLElement) || !(lastTrack instanceof HTMLElement)) return null;
      return {
        pixels: footer.getBoundingClientRect().top - lastTrack.getBoundingClientRect().bottom,
        paddingBottom: getComputedStyle(scroller).paddingBottom,
        scrollTop: scroller.scrollTop,
      };
    });
    await delay(250);
    assert(footerClearance && footerClearance.pixels >= 16, `Le dernier morceau reste sous le CTA: ${JSON.stringify(footerClearance)}`);
    await page.screenshot({ path: path.join(captureDirectory, 'mobile-live-context-390x844.png') });
    await page.keyboard.press('Tab');
    const keyboardFocus = await page.evaluate(() => {
      const focused = document.activeElement;
      return {
        tag: focused?.tagName || null,
        focusVisible: focused instanceof HTMLElement && focused.matches(':focus-visible'),
        outlineStyle: focused instanceof HTMLElement ? getComputedStyle(focused).outlineStyle : null,
      };
    });
    assert(keyboardFocus.tag === 'BUTTON' && keyboardFocus.focusVisible && keyboardFocus.outlineStyle !== 'none', 'Le vrai focus clavier doit rester visible');
    console.log(JSON.stringify({ status: 'PASS', mode: 'visual-polish', desktopVisual, mobileVisual, footerClearance, keyboardFocus, sheetRatio, captures: ['desktop-live-context-1440x900.png', 'mobile-live-context-390x844.png'] }, null, 2));
    await browser.close();
    process.exit(0);
  }
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await delay(400);
  await page.screenshot({ path: path.join(captureDirectory, 'desktop-live-context-1920x1080.png') });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await delay(250);

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[data-context-surface="profile-peek"]'));

  await delay(700);
  const closed = await liveState();
  const restoredFocusDetails = await page.evaluate(() => ({
    key: document.activeElement?.getAttribute('data-context-surface-trigger-key') || null,
    tag: document.activeElement?.tagName || null,
    text: document.activeElement?.textContent?.trim().slice(0, 80) || null,
    activeItem: document.querySelector('[data-feed-item-id][data-active="true"]')?.getAttribute('data-feed-item-id') || null,
  }));
  const restoredFocus = restoredFocusDetails.key;
  assert(restoredFocus === triggerKey, `Le focus n’est pas restitué au déclencheur Live exact: ${JSON.stringify(restoredFocusDetails)}`);
  assert(before.activeItemId === closed.activeItemId, 'L’item Live actif a changé à la fermeture');
  assert(before.filter === closed.filter, 'Le filtre Live a changé à la fermeture');
  assert(Math.abs(before.scrollTop - closed.scrollTop) < 2, 'La position Live a changé à la fermeture');
  assert(sameAudioContract(before.audio, closed.audio), 'Le contrat Audio Core a changé à la fermeture');
  const peekConsoleErrors = consoleErrors.slice(liveDiagnosticStart.console);
  const peekRequestFailures = requestFailures.slice(liveDiagnosticStart.requests);
  const peekProxyErrors = proxyErrors.slice(liveDiagnosticStart.proxy);
  assert(peekConsoleErrors.length === 0, `Erreur console pendant le Peek Live: ${peekConsoleErrors.join(' | ')}`);
  assert(peekProxyErrors.length === 0, `Erreur proxy pendant le Peek Live: ${peekProxyErrors.join(' | ')}`);

  await page.evaluate((key) => {
    const trigger = document.querySelector(`[data-context-surface-trigger-key="${CSS.escape(key)}"]`);
    if (trigger instanceof HTMLElement) trigger.click();
  }, triggerKey);
  await page.waitForSelector('[data-profile-peek-state="loaded"]');
  const profileHref = await page.$eval('[data-profile-peek-full-profile="desktop"]', (button) => {
    button.click();
    return true;
  });
  assert(profileHref, 'CTA profil complet indisponible');
  await page.waitForFunction(() => window.location.pathname.startsWith('/profile/'));
  await page.waitForFunction(() => !document.querySelector('[data-context-surface="profile-peek"]'));
  const canonicalPath = new URL(page.url()).pathname;
  const markerAfterCanonicalNavigation = await page.evaluate(() => window.history.state?.__synauraContextSurfaces || null);
  assert(/^\/profile\/[^/]+$/.test(canonicalPath), 'Le CTA ne mène pas à la route profil canonique');
  assert(!markerAfterCanonicalNavigation?.stack?.length, 'Un état contextuel résiduel reste dans l’historique après le CTA');

  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.location.pathname === '/dev/live');
  await page.waitForSelector('[data-testid="synaura-scroll-feed"]');
  await page.waitForFunction((id) => document.querySelector('[data-feed-item-id][data-active="true"]')?.getAttribute('data-feed-item-id') === id, {}, before.activeItemId);
  await delay(700);
  const restored = await liveState();
  assert(before.activeItemId === restored.activeItemId, 'L’item Live n’est pas restauré après retour canonique');
  assert(before.filter === restored.filter, 'Le filtre Live n’est pas restauré après retour canonique');

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await delay(400);
  await page.evaluate((key) => {
    const trigger = document.querySelector(`[data-context-surface-trigger-key="${CSS.escape(key)}"]`);
    if (trigger instanceof HTMLElement) trigger.click();
  }, triggerKey);
  await page.waitForSelector('[data-profile-peek-state="loaded"]');
  await delay(400);
  await page.screenshot({ path: path.join(captureDirectory, 'mobile-live-context-390x844.png') });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[data-context-surface="profile-peek"]'));

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${localOrigin}/search`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-context-surface-trigger-key^="search-suggestion-profile-"]');
  const searchTriggerKey = await page.$eval('[data-context-surface-trigger-key^="search-suggestion-profile-"]', (trigger) => {
    trigger.click();
    return trigger.getAttribute('data-context-surface-trigger-key');
  });
  await page.waitForSelector('[data-profile-peek-state="loaded"]');
  await delay(500);
  const searchFocusedHeading = await page.evaluate(() => document.activeElement?.tagName || null);
  assert(searchFocusedHeading === 'HEADER', 'Le focus Search n’est pas placé sur la région d’identité du profil');
  const beforeExplicitPlay = (await liveState()).audio;
  await page.click('[data-context-surface="profile-peek"] button[aria-label^="Écouter "]');
  await page.waitForFunction(
    (trackId) => Boolean(window.__synauraAudioCore?.().trackId) && window.__synauraAudioCore?.().trackId !== trackId,
    {},
    beforeExplicitPlay?.trackId || null,
  );
  await delay(500);
  const duringExplicitPlay = (await liveState()).audio;
  assert(duringExplicitPlay?.playbackState === 'playing', 'L’action Écouter explicite n’utilise pas la lecture Audio Core normale');
  await page.screenshot({ path: path.join(captureDirectory, 'desktop-search-context-1440x900.png') });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[data-context-surface="profile-peek"]'));
  await delay(400);
  const afterExplicitPlayClose = (await liveState()).audio;
  assert(afterExplicitPlayClose?.trackId === duringExplicitPlay.trackId, 'Fermer le Peek a annulé la piste explicitement lancée');
  assert(afterExplicitPlayClose?.playbackState === 'playing', 'Fermer le Peek a interrompu la lecture explicitement lancée');

  const profileRequestsBeforeDiscoverMount = profileRequests.length;
  await page.goto(`${localOrigin}/dev/discover-profile-peek`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-context-surface-trigger-key^="discover-profile-"]');
  const profileRequestsBeforeDiscoverOpen = profileRequests.length;
  assert(profileRequestsBeforeDiscoverOpen === profileRequestsBeforeDiscoverMount, 'Une card Discover inactive a déclenché une query profil');
  const discoverTriggerKey = await page.$eval('[data-context-surface-trigger-key^="discover-profile-"]', (trigger) => {
    trigger.click();
    return trigger.getAttribute('data-context-surface-trigger-key');
  });
  await page.waitForSelector('[data-profile-peek-state="loaded"]');
  await delay(500);
  assert(profileRequests.length === profileRequestsBeforeDiscoverOpen + 1, 'Discover doit déclencher exactement une query profil à l’ouverture');
  await page.screenshot({ path: path.join(captureDirectory, 'desktop-discover-context-1440x900.png') });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[data-context-surface="profile-peek"]'));

  const result = {
    status: 'PASS',
    live: {
      triggerKey,
      before,
      open,
      closed,
      restored,
      focusedHeading,
      restoredFocus,
    },
    navigation: {
      canonicalPath,
      contextHistoryCleared: !markerAfterCanonicalNavigation?.stack?.length,
      liveRestoredAfterBack: before.activeItemId === restored.activeItemId,
    },
    audioCore: {
      unchangedOnOpen: sameAudioContract(before.audio, open.audio),
      unchangedOnClose: sameAudioContract(before.audio, closed.audio),
      implicitProfilePlayback: false,
      explicitPlay: {
        beforeTrackId: beforeExplicitPlay?.trackId || null,
        selectedTrackId: duringExplicitPlay?.trackId || null,
        stillPlayingAfterClose: afterExplicitPlayClose?.playbackState === 'playing',
      },
    },
    search: { triggerKey: searchTriggerKey, focusedHeading: searchFocusedHeading },
    discover: {
      triggerKey: discoverTriggerKey,
      profileQueriesWhileInactive: profileRequestsBeforeDiscoverOpen - profileRequestsBeforeDiscoverMount,
      profileQueriesTriggeredByOpen: profileRequests.length - profileRequestsBeforeDiscoverOpen,
    },
    diagnostics: {
      peekConsoleErrors,
      peekProxyErrors,
      peekRequestFailures,
      navigationHarnessConsoleErrors: consoleErrors.slice(liveDiagnosticStart.console + peekConsoleErrors.length),
    },
    captures: [
      'desktop-live-context-1440x900.png',
      'desktop-live-context-1920x1080.png',
      'mobile-live-context-390x844.png',
      'desktop-search-context-1440x900.png',
      'desktop-discover-context-1440x900.png',
    ],
  };
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
