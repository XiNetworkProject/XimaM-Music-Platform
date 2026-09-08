import puppeteer from 'puppeteer';

const baseUrl = String(process.env.SYNAURA_E2E_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const email = String(process.env.SYNAURA_E2E_EMAIL || '');
const password = String(process.env.SYNAURA_E2E_PASSWORD || '');

if (!email || !password) {
  console.error('SYNAURA_E2E_EMAIL et SYNAURA_E2E_PASSWORD sont requis. Aucun secret ne doit être écrit dans le dépôt.');
  process.exit(2);
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
});
const page = await browser.newPage();
page.setDefaultNavigationTimeout(120_000);
page.setDefaultTimeout(60_000);
const results = [];
const browserDiagnostics = [];
let identity = '';
let expectedTrackId = '';

page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warn') browserDiagnostics.push(`${message.type()}: ${message.text().slice(0, 300)}`);
});
page.on('pageerror', (error) => browserDiagnostics.push(`pageerror: ${String(error?.message || error).slice(0, 300)}`));
page.on('requestfailed', (request) => {
  let pathname = '/';
  try { pathname = new URL(request.url()).pathname; } catch {}
  browserDiagnostics.push(`requestfailed: ${pathname} ${request.failure()?.errorText || ''}`.slice(0, 300));
});

async function coreState() {
  return page.evaluate(() => {
    const diagnostic = window.__synauraAudioCore?.();
    if (!diagnostic) throw new Error('Diagnostic Audio Core indisponible : exécuter la matrice sur un environnement development/test.');
    return diagnostic;
  });
}

async function navigate(pathname) {
  const targetPath = pathname.split('?')[0];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await page.evaluate((path) => {
      if (!window.__synauraAudioNavigate) throw new Error('Pont de navigation Audio E2E indisponible');
      window.__synauraAudioNavigate(path);
    }, pathname);
    try {
      await page.waitForFunction((path) => window.location.pathname === path, { timeout: 30_000 }, targetPath);
      await new Promise((resolve) => setTimeout(resolve, 2_500));
      return;
    } catch {
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        continue;
      }
    }
  }
  const state = await coreState().catch(() => null);
  throw new Error(`Navigation vers ${pathname} en échec: ${JSON.stringify({ currentUrl: page.url(), state, browser: browserDiagnostics.slice(-8) })}`);
}

async function verifyRoute(pathname, identity, trackId) {
  const before = await coreState();
  await navigate(pathname);
  const landed = new URL(page.url()).pathname;
  if (landed.startsWith('/auth/signin')) throw new Error(`Session perdue vers ${pathname}`);
  const first = await coreState();
  await new Promise((resolve) => setTimeout(resolve, 900));
  const second = await coreState();
  const passed = first.instanceId === identity
    && first.trackId === trackId
    && second.trackId === trackId
    && second.playbackState === 'playing'
    && second.position > first.position;
  results.push({ pathname, passed, before: before.position, after: second.position, playing: second.playbackState, instanceId: second.instanceId, trackId: second.trackId });
  if (!passed) throw new Error(`Continuité Audio Core rompue sur ${pathname}`);
}

function skip(pathname, reason) {
  results.push({ pathname, passed: null, reason });
}

async function clickNamedButton(name) {
  const clicked = await page.evaluate((label) => {
    const player = document.querySelector('[role="slider"][aria-label="Position dans le morceau"]')?.closest('.synaura-player-surface');
    const candidates = label === 'Pause' || label === 'Play'
      ? [...(player?.querySelectorAll(`button[aria-label="${label}"]`) || [])]
      : [...document.querySelectorAll('button')];
    const button = candidates.find((candidate) => {
      const accessibleName = `${candidate.getAttribute('aria-label') || ''} ${candidate.textContent || ''}`.trim();
      return accessibleName.includes(label) && !candidate.disabled && candidate.getClientRects().length > 0;
    });
    if (!(button instanceof HTMLButtonElement)) return false;
    button.click();
    return true;
  }, name);
  if (!clicked) throw new Error(`Bouton ${name} introuvable ou désactivé`);
}

try {
  await page.goto(`${baseUrl}/auth/signin`, { waitUntil: 'networkidle2' });
  try {
    await page.waitForSelector('input[type="email"]', { timeout: 60_000 });
  } catch {
    const pageState = await page.evaluate(() => ({
      pathname: window.location.pathname,
      title: document.title,
      text: document.body.innerText.slice(0, 240),
    }));
    throw new Error(`Formulaire de connexion indisponible: ${JSON.stringify({ ...pageState, diagnostics: browserDiagnostics.slice(-8) })}`);
  }
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.startsWith('/auth/signin'), { timeout: 20_000 });
  if (new URL(page.url()).pathname.startsWith('/auth/signin')) throw new Error('Authentification refusée');

  await page.goto(`${baseUrl}/discover`, { waitUntil: 'networkidle2' });
  const playbackCandidates = await page.$$('button[aria-label^="Lire "]');
  let startedPlayback = false;
  for (const candidate of playbackCandidates) {
    if (await candidate.evaluate((button) => button.disabled)) continue;
    await candidate.click();
    try {
      await page.waitForFunction(() => window.__synauraAudioCore?.().playbackState === 'playing', { timeout: 5_000 });
      startedPlayback = true;
      break;
    } catch {}
  }
  if (!startedPlayback) {
    const diagnostic = await coreState().catch(() => null);
    throw new Error(`Aucune piste lisible sur Discover: ${JSON.stringify({ candidates: playbackCandidates.length, diagnostic, browser: browserDiagnostics.slice(-8) })}`);
  }
  const started = await coreState();
  identity = started.instanceId;
  expectedTrackId = started.trackId;
  if (!identity || !expectedTrackId || started.musicalAudioElements !== 1) throw new Error('Autorité musicale initiale invalide');

  const trackHref = `/track/${encodeURIComponent(expectedTrackId)}`;
  const artistUsername = await page.evaluate(async (trackId) => {
    const response = await fetch(`/api/tracks/${encodeURIComponent(trackId)}`, { cache: 'no-store' });
    if (!response.ok) return '';
    const track = await response.json();
    return String(track?.artist?.username || '');
  }, expectedTrackId);
  const profileHref = artistUsername ? `/profile/${encodeURIComponent(artistUsername)}` : null;
  if (!profileHref) skip('/profile/[username]', 'la piste jouée ne fournit aucun profil artiste');

  // A. Accueil → track → profil → retour track → accueil.
  for (const route of ['/', trackHref, profileHref, trackHref, '/'].filter(Boolean)) {
    await verifyRoute(route, identity, expectedTrackId);
  }

  // B. Accueil → bibliothèque → playlist → piste suivante.
  await verifyRoute('/library', identity, expectedTrackId);
  const playlistHref = await page.evaluate(async () => {
    const owned = document.querySelector('a[href^="/playlists/"]')?.getAttribute('href');
    if (owned) return owned;
    const response = await fetch('/api/playlists/popular?limit=1', { cache: 'no-store' });
    if (!response.ok) return null;
    const playlist = (await response.json())?.playlists?.[0];
    return playlist?.publicUrl || (playlist?._id || playlist?.id ? `/playlists/${playlist._id || playlist.id}` : null);
  });
  if (playlistHref) {
    await verifyRoute(playlistHref, identity, expectedTrackId);
    const beforeNext = await coreState();
    const canAdvance = beforeNext.queueIds.length > 1 && beforeNext.currentIndex < beforeNext.queueIds.length - 1;
    if (canAdvance) {
      await page.click('button[aria-label="Suivant"]');
      await page.waitForFunction((trackId) => window.__synauraAudioCore?.().trackId !== trackId, { timeout: 15_000 }, expectedTrackId);
      await page.waitForFunction(() => window.__synauraAudioCore?.().playbackState === 'playing', { timeout: 15_000 });
      const afterNext = await coreState();
      const passed = afterNext.instanceId === identity && afterNext.playbackState === 'playing' && Boolean(afterNext.trackId);
      results.push({ pathname: `${playlistHref}#next`, passed, instanceId: afterNext.instanceId, trackId: afterNext.trackId });
      if (!passed) throw new Error(`Piste suivante rompue depuis la playlist: ${JSON.stringify(afterNext)}`);
      expectedTrackId = afterNext.trackId;
    } else skip(`${playlistHref}#next`, 'queue du compte sans piste suivante');
  } else skip('/playlists/[id]', 'aucune playlist disponible pour le compte ni publiquement');

  // C. Accueil → messages → vocal → retour musique.
  await verifyRoute('/', identity, expectedTrackId);
  await verifyRoute('/messages', identity, expectedTrackId);
  const conversationHref = process.env.SYNAURA_E2E_CONVERSATION_PATH || await page.evaluate(() => document.querySelector('a[href^="/messages/"]')?.getAttribute('href') || null);
  if (conversationHref) {
    await verifyRoute(conversationHref, identity, expectedTrackId);
    const voiceAvailable = await page.evaluate(() => [...document.querySelectorAll('button')].some((button) => button.textContent?.includes('Message audio')));
    if (voiceAvailable) {
      await clickNamedButton('Message audio');
      await page.waitForFunction(() => window.__synauraAudioCore?.().activeSecondaryPlayers === 1, { timeout: 5_000 });
      const duringVoice = await coreState();
      if (duringVoice.playbackState === 'playing') throw new Error('Double lecture globale + vocal détectée');
      await clickNamedButton('Message audio');
      await page.waitForFunction(() => window.__synauraAudioCore?.().activeSecondaryPlayers === 0, { timeout: 5_000 });
      await page.waitForFunction(() => window.__synauraAudioCore?.().playbackState === 'playing', { timeout: 10_000 });
      const afterVoice = await coreState();
      const passed = afterVoice.instanceId === identity && afterVoice.trackId === expectedTrackId;
      results.push({ pathname: `${conversationHref}#voice`, passed, during: duringVoice.playbackState, after: afterVoice.playbackState });
      if (!passed) throw new Error('Reprise musique rompue après le vocal');
    } else skip(`${conversationHref}#voice`, 'aucun message vocal disponible pour le compte');
  } else skip('/messages/[conversationId]', 'aucune conversation disponible pour le compte');
  await verifyRoute('/', identity, expectedTrackId);

  // D/E. AI Generator et Studio ne prennent pas l’autorité musicale.
  for (const route of ['/ai-generator', '/', '/studio', '/']) await verifyRoute(route, identity, expectedTrackId);

  // Commandes principales et seek clavier.
  await navigate('/discover');
  const beforeSeek = await coreState();
  await page.evaluate(() => {
    const slider = document.querySelector('[role="slider"][aria-label="Position dans le morceau"]');
    if (!(slider instanceof HTMLElement)) throw new Error('Slider audio introuvable');
    slider.focus();
    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  });
  await new Promise((resolve) => setTimeout(resolve, 400));
  const afterSeek = await coreState();
  if (afterSeek.position < beforeSeek.position + 4) throw new Error('Seek clavier non appliqué');
  results.push({ pathname: '/discover#seek', passed: true, before: beforeSeek.position, after: afterSeek.position });

  await clickNamedButton('Pause');
  await page.waitForFunction(() => window.__synauraAudioCore?.().playbackState === 'paused', { timeout: 5_000 });
  const pausedAt = (await coreState()).position;
  await new Promise((resolve) => setTimeout(resolve, 700));
  if ((await coreState()).position > pausedAt + 0.1) throw new Error('Progression détectée pendant la pause');
  await clickNamedButton('Play');
  await page.waitForFunction(() => window.__synauraAudioCore?.().playbackState === 'playing', { timeout: 10_000 });
  results.push({ pathname: '/discover#pause-resume', passed: true });

  const mediaSession = await page.evaluate(() => ({
    supported: 'mediaSession' in navigator,
    title: navigator.mediaSession?.metadata?.title || null,
    playbackState: navigator.mediaSession?.playbackState || null,
  }));
  results.push({ pathname: 'media-session', passed: mediaSession.supported ? Boolean(mediaSession.title) : null, ...mediaSession });

  // Le refresh crée une nouvelle instance de page, restaure piste + queue, sans autoplay.
  const beforeRefresh = await coreState();
  const refreshTrackId = beforeRefresh.trackId;
  if (!refreshTrackId) throw new Error('Aucune piste active avant le test de restauration');
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForFunction((trackId) => window.__synauraAudioCore?.().trackId === trackId, { timeout: 30_000 }, refreshTrackId);
  const afterRefresh = await coreState();
  const refreshPassed = afterRefresh.trackId === refreshTrackId
    && afterRefresh.playbackState === 'paused'
    && JSON.stringify(afterRefresh.queueIds) === JSON.stringify(beforeRefresh.queueIds);
  results.push({ pathname: '/discover#refresh', passed: refreshPassed, instanceBefore: identity, instanceAfter: afterRefresh.instanceId, trackId: afterRefresh.trackId });
  if (!refreshPassed) throw new Error('Restauration après refresh invalide');

  console.log(JSON.stringify({ ok: true, identity, trackId: expectedTrackId, results }, null, 2));
} finally {
  await browser.close();
}
