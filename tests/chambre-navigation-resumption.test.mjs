import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { getRouteChrome, shouldRenderGlobalMiniPlayer } from '../lib/routeChrome.ts';
const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('Spaces navigation uses existing accessible overlay and handoffs, without fetching or audio commands', () => {
  const source = read('components/synaura/ChambreSpacesMenu.tsx');
  assert.match(source, /aria-haspopup="dialog" aria-expanded=\{open\}/);
  assert.match(source, /initialFocusRef=\{titleRef\} history=\{false\}/);
  assert.match(source, /SynauraOverlayTitle ref=\{titleRef\} tabIndex=\{-1\}/);
  assert.match(source, /components\/navigation\/HandoffLink/);
  assert.equal((source.match(/prefetch=\{false\}/g) || []).length, 2);
  assert.doesNotMatch(source, /fetch\(|useSession|new Audio|playTrack|setQueue|\.seek\(|router\./);
  assert.match(source, /getWebProfileHref\(username, authenticated\)/);
  for (const route of ['/live','/discover','/library','/create','/studio','/upload','/clips/new','/ai-library','/community','/messages','/notifications','/city','/settings','/support']) assert.ok(source.includes(`href: '${route}'`), route);
});

test('Publish has one product frame with real routes and an explicit return', () => {
  const source = read('app/publish/page.tsx');
  assert.match(source, /<SynauraTopBar \/>/);
  assert.match(source, /<SynauraRouteNav \/>/);
  assert.match(source, /fallbackHref="\/create"/);
  const chrome = getRouteChrome('/publish');
  assert.equal(chrome.showSidebar, false);
  assert.equal(chrome.showTopSearch, false);
  assert.equal(chrome.showBottomNav, false);
  assert.equal(chrome.useFullScreenLayout, true);
  assert.equal(shouldRenderGlobalMiniPlayer('/publish'), true);
  assert.equal(getRouteChrome('/publisher').showSidebar, true);
});

const beforePath = 'artifacts/chambre-resumption/before/foundation/lib/routeChrome.ts';
test('Publish framing is the only route presentation change; musical visibility is identical', {skip: !fs.existsSync(new URL(`../${beforePath}`, import.meta.url))}, () => {
  const before = read(beforePath), after = read('lib/routeChrome.ts');
  assert.equal(after.replace("pathname === '/publish' || startsWithAny(pathname, [", 'startsWithAny(pathname, ['), before);
  const exports = {};
  vm.runInNewContext(ts.transpileModule(before, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports});
  const inventory = JSON.parse(read('artifacts/chambre-full-redesign/inventory.json'));
  for (const route of [...inventory.routes.map(r=>r.route), null, '/publisher', '/publish/other', '/dev/chambre-extra']) {
    assert.equal(shouldRenderGlobalMiniPlayer(route), exports.shouldRenderGlobalMiniPlayer(route), route);
    if (route !== '/publish') assert.deepEqual(JSON.parse(JSON.stringify(getRouteChrome(route))), JSON.parse(JSON.stringify(exports.getRouteChrome(route))), route);
  }
});

test('Spaces sheet retains mobile safe area, readable focus and reduced motion', () => {
  const css = read('app/v2.css');
  assert.match(css, /chambre-spaces-panel[^}]*env\(safe-area-inset-bottom/);
  assert.match(css, /max-height:88dvh/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.chambre-spaces-trigger/);
  assert.match(css, /:focus-visible/);
});
