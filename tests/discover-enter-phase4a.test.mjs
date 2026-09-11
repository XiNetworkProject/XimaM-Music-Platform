import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildMemberContinueUrl, safeEntryTarget } from '../lib/entryRouting.ts';
import { getRouteChrome, shouldRenderGlobalMiniPlayer } from '../lib/routeChrome.ts';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const readBuffer = (path) => readFile(new URL(`../${path}`, import.meta.url));

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

test('le middleware reconstruit les redirects avec l’origine publique du proxy', async () => {
  const source = await read('middleware.ts');
  assert.match(source, /x-forwarded-host/);
  assert.match(source, /x-forwarded-proto/);
  assert.match(source, /new URL\('\/auth\/signin', publicRequestOrigin\(request\)\)/);
  assert.doesNotMatch(source, /new URL\('\/auth\/signin', request\.url\)/);
});

test('le retour membre centralise onboarding puis destination', async () => {
  const source = await read('app/enter/continue/page.tsx');
  assert.match(source, /memberHasCompletedOnboarding/);
  assert.match(source, /redirect\(`\/onboarding\?callbackUrl=/);
  assert.match(source, /redirect\(target\)/);
});

test('la signature sonore exige un geste, n’autoplay jamais et reste isolée d’Audio Core', async () => {
  const intro = await read('components/discover/SynauraSonicIntro.tsx');
  const sound = await read('lib/ui/entrySound.ts');
  assert.match(intro, /onClick=\{\(\) => play\(true\)\}/);
  assert.match(intro, /preload="metadata"/);
  assert.match(sound, /media\.play\(\)/);
  assert.match(sound, /media\.pause\(\)/);
  assert.doesNotMatch(intro, /autoPlay|autoplay/);
  assert.doesNotMatch(sound, /AudioContext|useAudioPlayer/);
});

test('le WAV officiel est intact et dure 3,2 secondes', async () => {
  const wav = await readBuffer('public/audio/synaura-sonic-logo.wav');
  assert.equal(wav.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(wav.readUInt16LE(22), 2);
  assert.equal(wav.readUInt32LE(24), 48_000);
  assert.equal(wav.readUInt16LE(34), 16);
  let offset = 12;
  let dataBytes = 0;
  while (offset + 8 <= wav.length) {
    const id = wav.subarray(offset, offset + 4).toString('ascii');
    const size = wav.readUInt32LE(offset + 4);
    if (id === 'data') { dataBytes = size; break; }
    offset += 8 + size + (size % 2);
  }
  assert.equal(dataBytes / wav.readUInt32LE(28), 3.2);
});

test('la signature visuelle est une scène Three.js GPU et non une simulation CSS', async () => {
  const intro = await read('components/discover/SynauraSonicIntro.tsx');
  const scene = await read('components/discover/SynauraSonicScene.tsx');
  const config = await read('components/discover/synauraSonicScene.config.ts');
  const shaders = await read('components/discover/synauraSonicShaders.ts');
  const css = await read('components/discover/SynauraSonicIntro.module.css');
  assert.match(intro, /dynamic\(loadSonicScene, \{ ssr: false \}\)/);
  assert.match(intro, /supportsWebGLRenderer/);
  assert.match(intro, /data-sonic-fallback/);
  assert.match(scene, /<Canvas/);
  assert.match(scene, /new THREE\.WebGLRenderer/);
  assert.match(scene, /<spotLight/);
  assert.match(scene, /<coneGeometry/);
  assert.match(scene, /beamSheetRef/);
  assert.match(scene, /LOGO_FRAGMENT_SHADER/);
  assert.match(scene, /uDepth: \{ value: SONIC_SCENE\.logo\.relief \}/);
  assert.match(scene, /<GodRays/);
  assert.match(scene, /<Bloom/);
  assert.match(scene, /<GodRays[\s\S]*<Bloom[\s\S]*<Vignette[\s\S]*<ToneMapping mode=\{ToneMappingMode\.ACES_FILMIC\} \/>\s*<\/EffectComposer>/);
  assert.match(scene, /gl\.outputColorSpace = THREE\.SRGBColorSpace/);
  assert.match(scene, /gl\.toneMappingExposure = 0\.86/);
  assert.doesNotMatch(scene, /gl\.toneMapping = THREE\.ACESFilmicToneMapping/);
  assert.match(scene, /gsap\.timeline/);
  assert.match(scene, /masterClockStartRef/);
  assert.match(scene, /clock\.elapsedTime - masterClockStartRef\.current/);
  assert.match(scene, /timeline\.time\(sceneTime, true\)/);
  assert.match(scene, /new THREE\.CubicBezierCurve3/);
  assert.doesNotMatch(scene, /timeline\.play\(/);
  assert.doesNotMatch(scene, /\.to\(target\.position|\.to\(camera\.position|\.to\(spot,/);
  for (const label of ['start', 'lightEnter', 'pulseOne', 'pulseTwo', 'logoContact', 'logoReveal', 'impact', 'lightExit', 'resolve']) {
    assert.match(scene, new RegExp(`addLabel\\('${label}'`));
  }
  assert.match(config, /HIGH:/);
  assert.match(config, /LOW:/);
  assert.match(config, /dpr: \[1, 1\.5\]/);
  assert.match(config, /dpr: \[1, 1\]/);
  assert.match(config, /duration: 3\.2,[\s\S]*lightEnter: 0\.19,[\s\S]*pulseOne: 0\.33,[\s\S]*pulseTwo: 0\.485,[\s\S]*logoContact: 0\.745,[\s\S]*logoReveal: 1,[\s\S]*impact: 1\.795,[\s\S]*resolve: 2\.65/);
  assert.match(shaders, /VOLUMETRIC_FRAGMENT_SHADER/);
  assert.match(shaders, /BEAM_SHEET_FRAGMENT_SHADER/);
  assert.match(shaders, /LOGO_FRAGMENT_SHADER/);
  assert.match(shaders, /waveSequence/);
  assert.match(shaders, /arcPropagation/);
  assert.match(shaders, /bar1[\s\S]*bar2[\s\S]*bar3[\s\S]*bar4[\s\S]*bar5/);
  assert.match(shaders, /slowNoise/);
  assert.match(shaders, /uBeamDirection/);
  assert.match(shaders, /uTrailOffset[\s\S]*trailShift[\s\S]*lateral3/);
  assert.match(shaders, /uHighlightTrail[\s\S]*distanceFromFront - uHighlightTrail \* 3\.0/);
  assert.match(scene, /HIGHLIGHT_TRAIL_SAMPLE_SECONDS = 1 \/ 320/);
  assert.match(scene, /const start = reducedMotion \? 1 : 0\.72/);
  assert.match(scene, /const end = reducedMotion \? 2\.7 : 2\.18/);
  assert.match(scene, /reducedMotion \? 0\.7 : 0\.72/);
  assert.match(shaders, /distanceFromFront \* 15\.8/);
  assert.match(shaders, /distanceFromFront \* 48\.0/);
  assert.match(scene, /const MOBILE_BEAM_PATH = new THREE\.CubicBezierCurve3/);
  assert.match(scene, /quality\.name === 'LOW' \? MOBILE_BEAM_PATH : NORMAL_BEAM_PATH/);
  assert.match(scene, /rightEdgeUniforms[\s\S]*leftEdgeUniforms[\s\S]*backgroundPulseUniforms/);
  assert.match(scene, /const logoHit = 1 \+ impactPulse \* 0\.015/);
  assert.match(scene, /particleCloudRef\.current\.position\.set/);
  assert.doesNotMatch(scene, /receiveShadow|planeGeometry args=\{\[18, 12\]\}|axesHelper|cameraHelper|spotLightHelper|wireframe/i);
  assert.doesNotMatch(scene, /performanceHud/);
  assert.doesNotMatch(css, /mask-image|clip-path|beacon-cross|reveal-mask/);
  assert.match(css, /\.root\[data-phase='playing'\] \.skip \{[^}]*opacity: 0\.24;/);
  assert.match(css, /\.root\[data-phase='playing'\] \.skip:hover,[^}]*opacity: 1;/);
  assert.match(css, /\.root\[data-phase='playing'\] \.skip:focus-visible \{[^}]*opacity: 1;/);
});

test('la timeline visuelle attend le démarrage audio réel et conserve reduced motion', async () => {
  const intro = await read('components/discover/SynauraSonicIntro.tsx');
  const scene = await read('components/discover/SynauraSonicScene.tsx');
  const sound = await read('lib/ui/entrySound.ts');
  assert.match(sound, /await media\.play\(\)/);
  assert.match(intro, /await startSynauraSonicLogo/);
  assert.match(scene, /if \(reducedMotion\)/);
  assert.match(intro, /active=\{phase === 'playing'\}/);
  assert.match(intro, /sonicReduced/);
  assert.match(intro, /sonicFallback/);
  assert.match(intro, /const debugTime = \(\(\) => \{\s*if \(process\.env\.NODE_ENV === 'production' \|\| typeof window === 'undefined'\) return null;\s*const raw = new URLSearchParams\(window\.location\.search\)\.get\('sonicTime'\)/);
  assert.match(scene, /SONIC_TIMELINE\.labels\.impact - 0\.075/);
  assert.match(scene, /\.to\(logoUniforms\.uArcPulse, \{ value: 1, duration: 0\.28, ease: 'power2\.out' \}, SONIC_TIMELINE\.labels\.impact \+ 0\.075\)/);
  assert.match(scene, /\.to\(logoUniforms\.uWavePulse, \{ value: 1, duration: 0\.58, ease: 'sine\.inOut' \}, 1\.5\)[\s\S]*\.to\(logoUniforms\.uArcPulse, \{ value: 1, duration: 0\.36, ease: 'sine\.inOut' \}, 2\.08\)/);
  assert.match(scene, /\.to\(auraUniforms\.uOpacity, \{ value: reducedMotion \? 0\.1 : 0\.24,[\s\S]*reducedMotion \? 2\.45 : 'impact'\)/);
  assert.match(scene, /cuePulse\(sceneTime, SONIC_TIMELINE\.labels\.pulseOne,[\s\S]*cuePulse\(sceneTime, SONIC_TIMELINE\.labels\.pulseTwo,[\s\S]*cuePulse\(sceneTime, SONIC_TIMELINE\.labels\.impact/);
  assert.doesNotMatch(intro, /finishTimer|FULL_DURATION_MS|setTimeout\(\(\) => finish/);
  const frameLoopStart = scene.indexOf('useFrame(({ clock }, delta) => {');
  const frameLoopEnd = scene.indexOf('\n  });', frameLoopStart);
  const frameLoop = scene.slice(frameLoopStart, frameLoopEnd);
  assert.ok(frameLoopStart >= 0 && frameLoopEnd > frameLoopStart);
  assert.doesNotMatch(frameLoop, /(?<!\.)\bset[A-Z][A-Za-z0-9_]*\s*\(/);
});

test('le logo 2026 a une source de vérité, une safe zone et aucun crop', async () => {
  const brand = await read('lib/brand.ts');
  const component = await read('components/brand/SynauraLogo.tsx');
  assert.match(brand, /symbol: '\/brand\/2026\/synaura-symbol-2026\.png'/);
  assert.match(component, /SYNAURA_BRAND\.symbol/);
  assert.match(component, /data-synaura-logo-safe-zone/);
  assert.match(component, /object-contain/);
  assert.match(component, /overflow-visible/);
  assert.doesNotMatch(component, /object-cover|overflow-hidden/);
});

test('les surfaces web actives ne référencent plus les anciens logos', async () => {
  const active = await Promise.all([
    'components/discover/DiscoverSynaura.tsx',
    'components/discover/SynauraSonicIntro.tsx',
    'components/enter/EntryFrame.tsx',
    'components/enter/SynauraEntryLoading.tsx',
    'components/onboarding/OnboardingFlow.tsx',
    'components/synaura/SynauraShell.tsx',
    'components/AppNavbar.tsx',
    'components/AppSidebar.tsx',
    'app/auth/forgot-password/page.tsx',
    'app/auth/reset-password/page.tsx',
    'app/reset-password/page.tsx',
    'app/star-academy-tiktok/page.tsx',
    'app/star-academy-tiktok/inscription/page.tsx',
    'app/star-academy-tiktok/inscription-staff/page.tsx',
  ].map(read));
  const source = active.join('\n');
  assert.doesNotMatch(source, /favicon\.svg|synaura_logotype\.svg|synaura-brand-lockup\.png/);
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
  assert.match(source, /synaura\.sonic-intro\.seen\.v1/);
  assert.match(source, /useReducedMotion/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /prefers-reduced-data/);
  const introCss = await read('components/discover/SynauraSonicIntro.module.css');
  assert.match(introCss, /prefers-reduced-motion/);
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
