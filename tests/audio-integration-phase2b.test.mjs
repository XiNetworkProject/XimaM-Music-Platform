import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { sanitizeAudioErrorEvent } from '../lib/audio/audioErrorTelemetrySchema.ts';

const root = process.cwd();
const read = (relative) => readFile(path.join(root, relative), 'utf8');

async function sourceFiles(directory) {
  const entries = await readdir(path.join(root, directory), { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name))
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)).replaceAll('\\', '/'));
}

test('l’identité interne du core est stable et exposée uniquement par le harness dev', async () => {
  const [core, adapter, provider, harness, probe] = await Promise.all([
    read('lib/audio/AudioCore.ts'), read('hooks/useAudioService.ts'), read('app/providers.tsx'),
    read('app/audio-core-harness/AudioCoreHarnessClient.tsx'), read('app/audio-core-harness/route/AudioCoreRouteProbe.tsx'),
  ]);
  assert.match(core, /instanceId:\s*this\.instanceId/);
  assert.match(harness, /data-testid="instance-id"/);
  assert.match(probe, /data-testid="route-instance-id"/);
  assert.match(adapter, /NODE_ENV\s*!==\s*['"]production['"]/);
  assert.match(adapter, /delete[\s\S]{0,180}__synauraAudioCore/);
  assert.match(provider, /delete target\.__synauraAudioNavigate/);
});

test('la matrice authentifiée reproductible couvre toutes les routes demandées', async () => {
  const script = await read('scripts/audio-authenticated-matrix.mjs');
  for (const route of ['/', '/discover', '/library', '/messages', '/ai-generator', '/studio']) assert.ok(script.includes(`'${route}'`));
  for (const dynamic of ['/track/', '/profile/', '/playlists/', '/messages/']) assert.ok(script.includes(dynamic));
  assert.match(script, /instanceId === identity/);
  assert.match(script, /second\.position > first\.position/);
  for (const scenario of ['#next', '#voice', '#pause-resume', '#refresh', 'media-session']) assert.ok(script.includes(scenario));
});

test('chaque new Audio web est moteur, lecteur coordonné, sonde ou diagnostic connu', async () => {
  const files = [...await sourceFiles('app'), ...await sourceFiles('components'), ...await sourceFiles('hooks'), ...await sourceFiles('lib')];
  const actual = new Map();
  for (const file of files) {
    const source = await read(file);
    const count = (source.match(/new Audio\(/g) || []).length;
    if (count) actual.set(file, count);
  }
  assert.deepEqual(Object.fromEntries([...actual.entries()].sort()), {
    'app/audio-core-harness/AudioCoreHarnessClient.tsx': 1,
    'app/clips/new/page.tsx': 1,
    'app/messages/[conversationId]/page.tsx': 1,
    'app/test-mobile/page.tsx': 1,
    'app/upload/page.tsx': 2,
    'components/ai-studio/UploadConfirmModal.tsx': 1,
    'components/upload/TrackListEditor.tsx': 1,
    'lib/audio/AudioCore.ts': 1,
  });
});

test('la façade directe reste limitée au provider et à une page diagnostic', async () => {
  const files = [...await sourceFiles('app'), ...await sourceFiles('components')];
  const consumers = [];
  for (const file of files) {
    if ((await read(file)).includes("@/hooks/useAudioService")) consumers.push(file);
  }
  assert.deepEqual(consumers.sort(), ['app/providers.tsx', 'app/test-direct/page.tsx']);
  assert.match(await read('app/providers.tsx'), /useAudioService\(\{ authority: true \}\)/);
});

test('Studio reste sur la façade globale et sa seule sonde locale ne joue pas', async () => {
  const [studio, timeline, inspector, confirmation] = await Promise.all([
    read('app/studio/StudioClient.tsx'), read('components/studio/Center/StudioTimeline.tsx'),
    read('components/studio/RightDock/Inspector.tsx'), read('components/ai-studio/UploadConfirmModal.tsx'),
  ]);
  assert.match(studio, /useAudioPlayer/);
  assert.match(timeline, /useAudioPlayer/);
  assert.match(inspector, /useAudioPlayer/);
  assert.doesNotMatch([studio, timeline, inspector, confirmation].join('\n'), /new Audio[\s\S]{0,250}\.play\(/);
});

test('télémétrie audio accepte uniquement des champs bornés et sans query string', () => {
  const valid = sanitizeAudioErrorEvent({
    category: 'network', trackId: 'track-1', route: '/library', device: 'chromium-desktop',
    generation: 4, context: 'global', event: 'media-error', mediaUrl: 'https://secret.invalid/?token=x',
  });
  assert.deepEqual(valid, {
    category: 'network', trackId: 'track-1', route: '/library', device: 'chromium-desktop',
    generation: 4, context: 'global', event: 'media-error',
  });
  assert.equal(sanitizeAudioErrorEvent({ ...valid, route: '/library?token=secret' }), null);
  assert.equal(sanitizeAudioErrorEvent({ ...valid, category: 'arbitrary' }), null);
});

test('les contrôles principaux gardent labels, disabled et seek clavier', async () => {
  const player = await read('components/FullScreenPlayer.tsx');
  assert.match(player, /role="slider"/);
  assert.match(player, /aria-label="Position dans le morceau"/);
  assert.match(player, /onKeyDown=\{onProgressKeyDown\}/);
  assert.match(player, /event\.key === 'ArrowRight'/);
  assert.match(player, /disabled=\{audioState\.isLoading\}/);
  for (const label of ['Precedent', 'Suivant', 'Pause', 'Play']) assert.ok(player.includes(label));
});

test('Media Session remplace les métadonnées et expose toutes les commandes', async () => {
  const media = await read('hooks/useMediaSession.ts');
  assert.match(media, /navigator\.mediaSession\.metadata = null/);
  assert.match(media, /new \(window as any\)\.MediaMetadata/);
  for (const action of ['play', 'pause', 'seekto', 'nexttrack', 'previoustrack']) {
    assert.ok(media.includes(`'${action}'`), `action Media Session manquante: ${action}`);
  }
  assert.match(media, /setPositionState/);
});

test('les préchargements RSC invités vers les routes protégées sont désactivés', async () => {
  const [shell, actions] = await Promise.all([read('components/synaura/SynauraShell.tsx'), read('components/TrackCreateRemixActions.tsx')]);
  assert.match(shell, /item\.id === 'library' && !session\?\.user \? false/);
  const links = actions.match(/<Link\b[\s\S]*?>/g) || [];
  assert(links.length > 0);
  assert(links.every(link => /prefetch=\{false\}/.test(link)));
  // 4B.5: Remix is an explicit confirmation button, not a prefetched route.
  assert.match(actions, /actions.open\(track, 'track-remix'/);
});
