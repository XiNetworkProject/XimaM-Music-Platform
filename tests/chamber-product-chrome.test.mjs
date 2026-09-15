import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getRouteChrome, isChamberProductRoute, shouldRenderGlobalMiniPlayer } from '../lib/routeChrome.ts';
import { shouldBlockDiagnosticPage } from '../lib/diagnostics.ts';

test('Chambre product chrome is opt-in for the exact dev route and children', () => {
  for (const pathname of ['/dev/chambre', '/dev/chambre/', '/dev/chambre/listen']) {
    assert.equal(isChamberProductRoute(pathname), true);
    assert.deepEqual(getRouteChrome(pathname), {
      kind: 'immersive',
      showSidebar: false,
      showTopSearch: false,
      showBottomNav: false,
      useFullScreenLayout: true,
      suppressGlobalPlayerPadding: true,
      showGlobalShutdownNotice: false,
    });
    assert.equal(shouldRenderGlobalMiniPlayer(pathname), false);
  }
});

test('Chambre chrome does not match unrelated or similarly named routes', () => {
  for (const pathname of [null, undefined, '/', '/live', '/dev/chambre-extra', '/dev/chambre2', '/chambre', '/dev/v2']) {
    assert.equal(isChamberProductRoute(pathname), false);
  }
  for (const pathname of ['/dev/chambre-extra', '/dev/chambre2', '/chambre']) {
    assert.equal(getRouteChrome(pathname).showSidebar, true);
    assert.equal(getRouteChrome(pathname).useFullScreenLayout, false);
    assert.equal(shouldRenderGlobalMiniPlayer(pathname), true);
  }
});

test('Existing routes preserve global player and layout decisions', () => {
  for (const pathname of ['/live', '/', '/swipe', '/auth/signin', '/enter', '/create', '/messages/thread']) {
    assert.equal(shouldRenderGlobalMiniPlayer(pathname), false, pathname);
  }
  for (const pathname of ['/library', '/ai-library', '/track/example', '/community', '/dev/v2']) {
    assert.equal(shouldRenderGlobalMiniPlayer(pathname), true, pathname);
    assert.equal(getRouteChrome(pathname).showSidebar, false, pathname);
  }
  assert.equal(getRouteChrome('/live').kind, 'immersive');
  assert.equal(getRouteChrome('/studio').kind, 'studio');
  assert.equal(getRouteChrome(null).showSidebar, true);
});

test('Chambre dev candidate remains inaccessible in production under existing diagnostics policy', () => {
  for (const pathname of ['/dev/chambre', '/dev/chambre/listen']) {
    assert.equal(shouldBlockDiagnosticPage(pathname, 'production'), true);
    assert.equal(shouldBlockDiagnosticPage(pathname, 'development'), false);
  }
});

test('Global queue bubble uses the exact route predicate after all hooks', async () => {
  const source = await readFile(new URL('../components/GlobalQueueBubble.tsx', import.meta.url), 'utf8');
  assert.match(source, /isChamberProductRoute\(pathname\)/);
  const lastHook = source.indexOf('useEffect(() => setMounted(true), []);');
  const routeDecision = source.indexOf('const hiddenOnSynaura');
  const earlyReturn = source.indexOf("if (!mounted || typeof document === 'undefined' || hiddenOnSynaura || isV2PilotRoute(pathname))");
  assert.ok(lastHook > 0 && lastHook < routeDecision && routeDecision < earlyReturn);
});
