import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getRouteChrome } from '../lib/routeChrome.ts';

const root = process.cwd();
const read = (relative) => readFile(path.join(root, relative), 'utf8');

test('les routes partagent un contrat de chrome explicite', () => {
  assert.equal(getRouteChrome('/').kind, 'immersive');
  assert.equal(getRouteChrome('/discover').kind, 'wide');
  assert.equal(getRouteChrome('/studio').kind, 'studio');
  assert.equal(getRouteChrome('/auth/signin').kind, 'auth-public');
  assert.equal(getRouteChrome('/meteo').kind, 'subproduct');
  assert.equal(getRouteChrome('/admin').kind, 'admin');
});

test('le layout autorise le zoom et garde audio au-dessus des transitions', async () => {
  const layout = await read('app/layout.tsx');
  assert.doesNotMatch(layout, /maximumScale|userScalable/);
  assert.match(layout, /<PageTransition>\{children\}<\/PageTransition>/);
  assert.match(layout, /id="synaura-overlay-root"/);
  assert.equal((layout.match(/<SynauraToastViewport/g) || []).length, 1);
});

test('les tokens couvrent thème, focus, motion, élévation et couches', async () => {
  const css = await read('app/globals.css');
  for (const token of ['--syn-background', '--syn-elevated-surface', '--syn-text-primary', '--syn-warning', '--syn-focus', '--syn-radius-lg', '--syn-shadow-high', '--syn-motion-standard', '--syn-ease-standard', '--syn-z-overlay', '--syn-z-toast']) assert.match(css, new RegExp(token));
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /data-motion-essential/);
  assert.doesNotMatch(css.match(/\*\s*\{[\s\S]*?\}/)?.[0] || '', /transition-property/);
});

test('les overlays communs implémentent les garanties clavier et navigateur', async () => {
  const overlay = await read('components/ui/SynauraOverlay.tsx');
  for (const contract of ['role="dialog"', 'aria-modal="true"', 'focusableSelector', "event.key === 'Escape'", "event.key !== 'Tab'", 'restoreFocusRef', "document.body.style.overflow = 'hidden'", 'overlayStack', 'popstate', "document.getElementById('synaura-overlay-root')"]) assert.match(overlay, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const studioDrawer = await read('components/studio/ui/DrawerInspector.tsx');
  const unified = await read('components/ui/UnifiedUI.tsx');
  assert.match(studioDrawer, /SynauraOverlay/);
  assert.match(unified, /<SynauraOverlay/);
});

test('les toasts transitoires ont un unique viewport global', async () => {
  const [source, store, center] = await Promise.all([read('components/ui/SynauraToastViewport.tsx'), read('lib/ui/notifications.ts'), read('components/NotificationCenter.tsx')]);
  assert.equal((source.match(/notificationStore\.subscribe\(setToasts\)/g) || []).length, 1);
  assert.match(source, /export function SynauraToastViewport/);
  assert.match(source, /'alert'/);
  assert.match(source, /'status'/);
  assert.match(store, /export const notify/);
  assert.match(center, /export \{ notificationStore, notify \}/);
});

test('les primitives couvrent actions, formulaires et états fondamentaux', async () => {
  const [primitives, states, cards] = await Promise.all([read('components/ui/SynauraPrimitives.tsx'), read('components/ui/SynauraStates.tsx'), read('components/ui/SynauraContentCard.tsx')]);
  for (const name of ['SynauraButton', 'SynauraIconButton', 'SynauraInput', 'SynauraTextarea', 'SynauraSelect', 'SynauraCheckbox', 'SynauraSwitch', 'SynauraSlider', 'SynauraTabs', 'SynauraSegmentedControl']) assert.match(primitives, new RegExp(`export (?:const|function|interface) ${name}`));
  for (const name of ['SynauraPageLoading', 'SynauraTrackSkeleton', 'SynauraProfileSkeleton', 'SynauraEmptyState', 'SynauraErrorState']) assert.match(states, new RegExp(name));
  for (const kind of ['track', 'playlist', 'creator', 'album', 'post', 'clip', 'recommendation', 'statistic']) assert.match(cards, new RegExp(kind));
});

test('le laboratoire est explicitement absent de production', async () => {
  const page = await read('app/dev/ui/page.tsx');
  assert.match(page, /process\.env\.NODE_ENV === 'production'/);
  assert.match(page, /notFound\(\)/);
});

test('messages adopte le shell et les deux niveaux de navigation sans toucher au polling', async () => {
  const messages = await read('app/messages/page.tsx');
  assert.match(messages, /<SynauraAppShell/);
  assert.match(messages, /<SynauraTopBar/);
  assert.match(messages, /<SynauraRouteNav/);
  assert.match(messages, /loadInbox/);
});
