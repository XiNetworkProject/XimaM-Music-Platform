import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { usesUnifiedNavigation } from '../lib/unifiedNavigation.ts';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('product destinations share chrome; entry and subproducts are not accidentally migrated', () => {
  for (const route of ['/live','/discover','/create','/library','/studio','/settings','/subscriptions','/notifications','/messages/123','/community','/profile/test2','/track/a','/v2/live','/dev/studio']) assert.equal(usesUnifiedNavigation(route), true, route);
  for (const route of ['/', '/landing','/auth/signin','/onboarding','/admin','/meteo','/embed','/dev/ui','/library-extra','/v20',null]) assert.equal(usesUnifiedNavigation(route), false, route);
});
test('one navigation owner; legacy headers and docks opt out without changing media ownership', () => {
  assert.match(read('components/ConditionalNav.tsx'), /if \(usesUnifiedNavigation\(pathname\)\) return <div className="syn-unified-app"><AppNavigation/);
  assert.equal((read('components/synaura/SynauraShell.tsx').match(/if \(usesUnifiedNavigation\(pathname\)\) return null;/g) || []).length, 3);
  assert.match(read('components/pilot/PilotShell.tsx'), /!usesUnifiedNavigation\(pathname\) &&/);
  const source = read('components/navigation/AppNavigation.tsx');
  assert.match(source, /synaura-lockup\.svg/);
  for (const href of ['/live','/discover','/create','/library','/community']) assert.ok(source.includes(`href: '${href}'`));
  assert.match(source, /PilotLink : Link/);
  assert.match(source, /prefetch=\{false\}/);
  assert.doesNotMatch(source, /fetch\(|new Audio|playTrack|setQueue|AudioPlayerProvider/);
  assert.match(read('components/navigation/app-navigation.css'), /safe-area-inset-bottom/);
});
test('decorative motion uses existing pause, visibility and reduced-motion preferences, never media state', () => {
  const source = read('components/ambient/ExperienceMotionFrame.tsx');
  assert.match(source, /useLivingMotion/);
  assert.match(source, /data-motion=\{enabled\}/);
  assert.match(source, /if \(!enabled \|\| event.pointerType !== 'mouse'\) return/);
  assert.doesNotMatch(source, /fetch\(|setInterval|requestAnimationFrame|Audio|setQueue/);
  assert.doesNotMatch(read('components/create/CreateSurface.tsx'), /fetch\(|useAudioPlayer|new Audio/);
});

test('shared navigation has no decorative borders but retains keyboard focus and safe areas', () => {
  const css = read('components/navigation/app-navigation.css');
  const borders = [...css.matchAll(/\bborder(?:-(?:top|right|bottom|left))?\s*:\s*([^;}\n]+)/g)];
  assert.ok(borders.length > 0);
  for (const [, value] of borders) assert.equal(value.trim(), '0');
  assert.match(css, /:focus-visible/);
  assert.match(css, /outline:2px solid/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /min-width:801px\) and \(max-width:1100px/);
});

test('mobile keeps four readable entries and retains secondary destinations in Menu', () => {
  const source = read('components/navigation/AppNavigation.tsx');
  const css = read('components/navigation/app-navigation.css');
  const menu = read('components/synaura/ChambreSpacesMenu.tsx');
  const mobile = css.slice(css.indexOf('@media(max-width:800px)'));
  assert.match(mobile, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(mobile, /\.syn-app-destination--library,\.syn-app-destination--community \{ display:none; \}/);
  assert.doesNotMatch(css.slice(0, css.indexOf('@media(max-width:800px)')), /\.syn-app-destination--(?:library|community).*display:none/);
  assert.match(source, /className="syn-app-dock-spaces"><ChambreSpacesMenu triggerLabel="Menu"/);
  assert.match(menu, /triggerLabel = 'Espaces'/);
  assert.match(menu, /aria-label=\{triggerLabel\}/);
  assert.match(menu, /aria-expanded=\{open\}/);
  for (const href of ['/library', '/community', '/messages', '/notifications', '/settings']) assert.ok(menu.includes(`href: '${href}'`));
});
