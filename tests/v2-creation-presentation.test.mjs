import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('V2 intent entry retains every genuine creative destination and challenge context', async () => {
  const source = await readFile(new URL('../app/create/page.tsx', import.meta.url), 'utf8');
  for (const href of ['/ai-generator', '/upload', '/clips/new', '/create/variation', '/posts?compose=true', '/community?compose=true&category=feedback', '/community?compose=true&category=collab', '/community?compose=true&category=remix', '/studio', '/ai-library']) assert(source.includes(href), href);
  assert.match(source, /aria-pressed=\{creativeIntent === id\}/);
  assert.match(source, /aria-controls="creative-path"/);
  assert.match(source, /href=\{withChallenge\(creativePath\.primary\.href\)\}/);
  assert.match(source, /useHandoffRouter/);
  assert.doesNotMatch(source, /new Audio\(|setQueueAndPlay|\.play\(|\.pause\(/);
});

test('V2 Studio mobile composition removes inactive column footprints without changing store tabs', async () => {
  const css = await readFile(new URL('../components/v2/creation-v2.css', import.meta.url), 'utf8');
  const tabs = await readFile(new URL('../components/studio/ui/MobileTabs.tsx', import.meta.url), 'utf8');
  assert.match(css, /\.v2-studio-canvas > div:has\(> \.hidden\) \{ display: none; \}/);
  for (const id of ['generate', 'library', 'timeline', 'inspector']) assert(tabs.includes(`btn('${id}'`));
  assert.match(tabs, /aria-pressed=\{active\}/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('historical Studio demo never presents its fixture as the real user library', async () => {
  const source = await readFile(new URL('../app/studio/library/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /Démonstration historique/);
  assert.match(source, /exemples non persistants/);
  assert.match(source, /href="\/ai-library"/);
});

test('V2 component review preserves the production 404 and contains no account fixtures', async () => {
  const page = await readFile(new URL('../app/dev/v2/page.tsx', import.meta.url), 'utf8');
  const review = await readFile(new URL('../app/dev/v2/V2Review.tsx', import.meta.url), 'utf8');
  assert.match(page, /process\.env\.NODE_ENV === 'production'\) notFound\(\)/);
  assert.match(review, /SSR\/parcours NON VALIDÉS/);
  for (const route of ['ai-generator/page', 'studio/StudioClient', 'upload/page', 'library/LibraryClient', 'messages/page', 'settings/SettingsClient']) assert(review.includes(route), route);
  assert.doesNotMatch(review, /qa-v2-local|MOCK_TRACKS|setCookie|authOptions|setSession|database/);
});

test('V2 capture runner explicitly isolates writes, credentials and canonical auth', async () => {
  const source = await readFile(new URL('../scripts/synaura-v2-capture.mjs', import.meta.url), 'utf8');
  assert.match(source, /assert\.equal\(process\.env\.SYNAURA_V2_CAPTURE, '1'/);
  assert.match(source, /Only a loopback candidate is allowed/);
  assert.match(source, /publicSource\.origin === base \|\| publicSource\.origin === 'https:\/\/synaura\.fr'/);
  assert.match(source, /method: 'GET', redirect: 'error'/);
  assert.match(source, /!\['GET', 'HEAD'\]\.includes\(method\)/);
  assert.match(source, /intercepted-never-sent/);
  assert.match(source, /BLOCKED_SSR_AUTH/);
  assert.match(source, /browser\.createBrowserContext\(\)/);
  assert.match(source, /PARTIAL — CONSOLE ERRORS REQUIRE REVIEW/);
  assert.doesNotMatch(source, /dotenv|setCookie\(|DATABASE_URL|NEXTAUTH_SECRET|process\.env\.E2E/);
});
