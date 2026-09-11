import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getRouteChrome, shouldRenderGlobalMiniPlayer } from '../lib/routeChrome.ts';

const root = process.cwd();
const read = (relative) => readFile(path.join(root, relative), 'utf8');

test('le provider audio unique reste au-dessus des transitions de route', async () => {
  const [layout, providers] = await Promise.all([read('app/layout.tsx'), read('app/providers.tsx')]);
  assert.equal((providers.match(/<AudioPlayerProvider>/g) || []).length, 1);
  assert.equal((providers.match(/useAudioService\(\{ authority: true \}\)/g) || []).length, 1);
  assert.match(layout, /<Providers>[\s\S]*\{children\}[\s\S]*<\/Providers>/);
  assert.match(providers, /<AudioPlayerProvider>[\s\S]*\{children\}[\s\S]*<\/AudioPlayerProvider>/);
});

test('le noyau est l’unique propriétaire du moteur principal', async () => {
  const [core, adapter, providers, webSession, nativeSession] = await Promise.all([
    read('lib/audio/AudioCore.ts'),
    read('hooks/useAudioService.ts'),
    read('app/providers.tsx'),
    read('hooks/useMediaSession.ts'),
    read('hooks/useCapacitorMediaSession.ts'),
  ]);
  assert.equal((core.match(/audioFactory:\s*\(\)\s*=>\s*new Audio\(\)/g) || []).length, 1);
  assert.doesNotMatch(adapter, /new Audio\(/);
  assert.doesNotMatch(providers, /addEventListener\(['"](?:timeupdate|playing|pause|ended|error)/);
  assert.doesNotMatch(providers, /setInterval\([\s\S]{0,160}250/);
  assert.match(webSession, /subscribeTime\(update\)/);
  assert.match(nativeSession, /subscribeTime\(update\)/);
  assert.doesNotMatch(webSession, /audioEl\.addEventListener/);
  assert.doesNotMatch(nativeSession, /audioEl\.addEventListener/);
});

test('les routes masquent seulement le mini-player, pas le moteur persistant', () => {
  const routes = ['/', '/discover', '/library', '/notifications', '/studio', '/ai-generator', '/profile/ari', '/messages/room-1'];
  const visibility = routes.map((pathname) => [pathname, shouldRenderGlobalMiniPlayer(pathname)]);
  assert.deepEqual(visibility, [
    ['/', false],
    ['/discover', true],
    ['/library', true],
    ['/notifications', true],
    ['/studio', true],
    ['/ai-generator', true],
    ['/profile/ari', true],
    ['/messages/room-1', false],
  ]);
  for (const pathname of routes) assert.equal(getRouteChrome(pathname).useFullScreenLayout, true);
});

test('les lecteurs secondaires détachés appliquent explicitement la politique audio', async () => {
  const files = [
    'app/messages/[conversationId]/page.tsx',
    'app/upload/page.tsx',
    'app/clips/new/page.tsx',
    'components/upload/TrackListEditor.tsx',
  ];
  for (const file of files) {
    const source = await read(file);
    assert.match(source, /coordinateSecondaryAudioElement\(/, `${file} doit coordonner son preview`);
  }
});

test('le diagnostic navigateur est absent des builds production', async () => {
  const adapter = await read('hooks/useAudioService.ts');
  assert.match(adapter, /process\.env\.NODE_ENV\s*!==\s*['"]production['"]/);
  assert.match(adapter, /delete[\s\S]{0,160}__synauraAudioCore/);
});
