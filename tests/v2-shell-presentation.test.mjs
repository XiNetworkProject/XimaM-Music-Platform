import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getRouteChrome, shouldRenderGlobalMiniPlayer } from '../lib/routeChrome.ts';

const read = name => readFile(new URL(`../${name}`, import.meta.url), 'utf8');

test('V2 AI library has exactly one route chrome; musical visibility is preserved', () => {
  const chrome = getRouteChrome('/ai-library');
  assert.equal(chrome.showSidebar, false);
  assert.equal(chrome.showTopSearch, false);
  assert.equal(chrome.showBottomNav, false);
  assert.equal(chrome.useFullScreenLayout, true);
  assert.equal(shouldRenderGlobalMiniPlayer('/ai-library'), true);
  assert.equal(shouldRenderGlobalMiniPlayer('/live'), false);
});

test('V2 component laboratory cannot ship as an authentication bypass', async () => {
  const [page, client] = await Promise.all([read('app/dev/v2/page.tsx'), read('app/dev/v2/V2Review.tsx')]);
  assert.match(page, /NODE_ENV === 'production'\) notFound\(\)/);
  assert.doesNotMatch(client, /signIn\(|SessionProvider|jwt\.encode|document\.cookie|DATABASE_URL/);
  assert.match(client, /NON VALIDÉS/);
  assert.equal(getRouteChrome('/dev/v2').showBottomNav, false);
});

test('V2 short-height entry makes room for the CTA and chapter controls', async () => {
  const css = await read('components/discover/DiscoverSynaura.module.css');
  assert.match(css, /@media\(max-height:760px\)\{\.stage\{min-height:0\}/);
  assert.match(css, /@media\(max-height:560px\) and \(min-width:481px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /\.root\[data-reduced=true\] \.artwork\{transform:none\}/);
});

test('V2 toast uses semantic error contrast and an explicit reduced-motion variant', async () => {
  const toast = await read('components/ui/SynauraToastViewport.tsx');
  assert.match(toast, /useReducedMotion\(\)/);
  assert.match(toast, /role=\{isError \? 'alert' : 'status'\}/);
  assert.match(toast, /bg-\[var\(--v2-surface\)\]/);
  assert.match(toast, /border-\[var\(--v2-danger\)\]/);
  assert.doesNotMatch(toast, /bg-\[var\(--syn-destructive\)\] text-white|backdrop-blur/);
});

test('V2 theme preserves existing preference keys with two nocturnal brightness choices', async () => {
  const [provider, layout, css] = await Promise.all([read('components/theme/SynauraThemeProvider.tsx'), read('app/layout.tsx'), read('app/v2.css')]);
  assert.match(provider, /Nuit profonde/);
  assert.match(provider, /Nuit douce/);
  assert.match(layout, /synaura\.theme\.mode\.v1/);
  assert.match(layout, /d\.style\.colorScheme='dark'/);
  assert.match(css, /html\[data-synaura-theme='light'\]\{--v2-bg:#10141e/);
});

test('V2 waveform fallback is honestly unavailable, never fabricated', async () => {
  const source = await read('components/audio/SynauraWaveform.tsx');
  assert.doesNotMatch(source, /buildFallbackWaveform|Math\.random\(/);
  assert.match(source, /Forme d’onde indisponible/);
  assert.match(source, /role=\{onSeek \? 'slider' : undefined\}/);
  assert.match(source, /ArrowRight/);
});
