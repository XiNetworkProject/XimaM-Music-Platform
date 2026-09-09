import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildMemberContinueUrl, safeEntryTarget } from '../lib/entryRouting.ts';
import { getRouteChrome, shouldRenderGlobalMiniPlayer } from '../lib/routeChrome.ts';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('la racine décide Discover ou Live côté serveur sans flash de session client', async () => {
  const source = await read('app/page.tsx');
  assert.match(source, /getServerSession/);
  assert.match(source, /if \(!userId\) return <DiscoverSynaura/);
  assert.match(source, /redirect\('\/live'\)/);
  assert.doesNotMatch(source, /useSession/);
});

test('Discover public ne détourne jamais la route musicale /discover', async () => {
  const publicSource = await read('components/discover/DiscoverSynaura.tsx');
  const musicDiscover = await read('app/discover/page.tsx');
  assert.match(publicSource, /href="#experience"/);
  assert.match(musicDiscover, /Discover/);
  assert.doesNotMatch(publicSource, /router\.push\('\/discover'\)/);
});

test('les destinations internes refusent les open redirects et backslashes', () => {
  assert.equal(safeEntryTarget('/track/abc?from=share'), '/track/abc?from=share');
  assert.equal(safeEntryTarget('//evil.example'), '/');
  assert.equal(safeEntryTarget('/\\evil.example'), '/');
  assert.equal(safeEntryTarget('https://evil.example'), '/');
  assert.equal(buildMemberContinueUrl('/library'), '/enter/continue?callbackUrl=%2Flibrary');
  assert.equal(buildMemberContinueUrl(null), '/enter/continue?callbackUrl=%2Flive');
});

test('le retour membre centralise onboarding puis destination', async () => {
  const source = await read('app/enter/continue/page.tsx');
  assert.match(source, /memberHasCompletedOnboarding/);
  assert.match(source, /redirect\(`\/onboarding\?callbackUrl=/);
  assert.match(source, /redirect\(target\)/);
});

test('la signature sonore exige un geste et ne crée pas de lecteur Audio Core concurrent', async () => {
  const discover = await read('components/discover/DiscoverSynaura.tsx');
  const sound = await read('lib/ui/entrySound.ts');
  assert.match(discover, /onClick=\{\(\) => void enter\(\)\}/);
  assert.match(sound, /new Context\(\)/);
  assert.match(sound, /context\.close/);
  assert.doesNotMatch(sound, /new Audio\(/);
  assert.doesNotMatch(discover, /autoPlay|autoplay/);
});

test('Discover a une narration réelle et des données de démonstration isolées', async () => {
  const source = await read('components/discover/DiscoverSynaura.tsx');
  assert.match(source, /DISCOVER_DEMO/);
  assert.match(source, /Écouter devient un lieu/);
  assert.match(source, /Quelqu’un écoute avec toi/);
  assert.match(source, /Elle peut devenir un son/);
  assert.match(source, /Ton monde prend une couleur/);
});

test('première visite, retour et reduced motion ont des contrats explicites', async () => {
  const source = await read('components/discover/DiscoverSynaura.tsx');
  const css = await read('components/discover/DiscoverSynaura.module.css');
  assert.match(source, /synaura\.discover\.seen\.v1/);
  assert.match(source, /useReducedMotion/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /prefers-reduced-data/);
});

test('Enter, auth et onboarding sont des surfaces plein écran sans mini-player', () => {
  for (const route of ['/enter', '/enter/continue', '/landing', '/auth/signin', '/onboarding']) {
    assert.equal(getRouteChrome(route).kind, 'auth-public');
    assert.equal(getRouteChrome(route).useFullScreenLayout, true);
    assert.equal(shouldRenderGlobalMiniPlayer(route), false);
  }
});

test('login Credentials et Google préservent le deep link via le retour membre', async () => {
  const source = await read('app/auth/signin/page.tsx');
  assert.match(source, /signIn\('credentials'/);
  assert.match(source, /signIn\('google', \{ callbackUrl: continueUrl \}\)/);
  assert.match(source, /buildMemberContinueUrl/);
  assert.match(source, /router\.replace\(continueUrl\)/);
});

test('un refus OAuth reste dans la continuité visuelle Enter', async () => {
  const source = await read('app/auth/error/page.tsx');
  assert.match(source, /EntryFrame/);
  assert.match(source, /role="alert"/);
  assert.match(source, /AccessDenied/);
  assert.doesNotMatch(source, /synaura-brand-lockup/);
});

test('signup conserve validations, limite, referral et providers', async () => {
  const source = await read('app/auth/signup/page.tsx');
  assert.match(source, /password\.length < 6/);
  assert.match(source, /count-users/);
  assert.match(source, /synaura_referral_code/);
  assert.match(source, /\/api\/auth\/signup/);
  assert.match(source, /signIn\('google'/);
});

test('onboarding est protégé et persiste seulement des signaux réellement utilisés', async () => {
  const page = await read('app/onboarding/page.tsx');
  const flow = await read('components/onboarding/OnboardingFlow.tsx');
  assert.match(page, /getServerSession/);
  assert.match(flow, /ONBOARDING_UNIVERSES/);
  assert.match(flow, /CREATOR_INTENTIONS/);
  assert.match(flow, /favoriteMoods/);
  assert.match(flow, /favoriteGenres/);
  assert.match(flow, /if \(!response\.ok\) throw/);
});

test('la frontière session masque les deep links pendant la décision', async () => {
  const source = await read('components/onboarding/OnboardingGate.tsx');
  assert.match(source, /SynauraEntryLoading/);
  assert.match(source, /checkedUser\.current === session\?\.user\?\.id/);
  assert.match(source, /router\.replace\(`\/onboarding\?callbackUrl=/);
});

test('SEO public a canonical, OpenGraph, social image et une legacy landing conservée', async () => {
  const home = await read('app/page.tsx');
  const legacy = await read('app/landing/page.tsx');
  const social = await read('app/opengraph-image.tsx');
  assert.match(home, /alternates: \{ canonical: '\/' \}/);
  assert.match(home, /openGraph/);
  assert.match(legacy, /canonical: '\/'/);
  assert.match(legacy, /<DiscoverSynaura legacy/);
  assert.match(social, /ImageResponse/);
  assert.doesNotMatch(social, /#[0-9a-f]+ 0 3%/i);
});

test('les événements d’entrée restent sans plateforme ni donnée personnelle', async () => {
  const source = await read('lib/entryAnalytics.ts');
  for (const name of ['discover_view', 'enter_click', 'signup_start', 'signup_complete', 'login_complete', 'onboarding_start', 'onboarding_complete']) assert.match(source, new RegExp(name));
  assert.match(source, /CustomEvent\('synaura:entry-event'/);
  assert.doesNotMatch(source, /email|password|username/);
});
