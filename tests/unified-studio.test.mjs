import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import postcss from 'postcss';
import { projectUnifiedStudio } from './helpers/reviewed-unified-studio.mjs';
import { assertUnchangedV6TrackBoundaries } from './helpers/reviewed-suno-v6.mjs';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const view = read('components/ai-studio/UnifiedStudio.tsx');
const controller = read('app/ai-generator/page.tsx');
const css = read('components/ai-studio/unified-studio.css');

test('unified studio and offline lab parse, styling remains scoped and responsive', () => {
  for (const file of ['components/ai-studio/UnifiedStudio.tsx', 'app/dev/studio/StudioLab.tsx', 'app/studio/page.tsx']) {
    assert.equal(ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX).parseDiagnostics.length, 0);
  }
  assert.ok(postcss.parse(css).nodes.length);
  for (const value of ['max-width: 720px', 'max-width: 360px', ':focus-visible', 'prefers-reduced-motion', 'safe-area-inset-bottom']) assert.ok(css.includes(value));
  const tree = postcss.parse(css);
  const scrollRules = [];
  tree.walkDecls('overflow-y', decl => {
    if (/^(auto|scroll)$/.test(decl.value)) scrollRules.push(decl);
  });
  assert.equal(scrollRules.length, 2);
  for (const decl of scrollRules) assert.equal(decl.parent.parent.params, '(min-width: 900px)');
  assert.match(css, /\.us-workbench \.us-composer-scroll \{ overflow:visible; \}/);
  assert.match(css, /\.us-composer-drawer \{[^}]*grid-template-rows:0fr/);
  assert.match(css, /\[data-studio-view=create\] \.us-composer-drawer \{ grid-template-rows:1fr/);
});

test('all former IA entry routes resolve to one real controller, not the historical mock IDE library', async () => {
  const config = (await import('../next.config.js')).default;
  assert.deepEqual(await config.redirects(), [
    { source: '/ai-generator', destination: '/studio', permanent: false },
    { source: '/ai-library', destination: '/studio?view=library', permanent: false },
    { source: '/studio/library', destination: '/studio?view=library', permanent: false },
  ]);
  assert.match(read('app/studio/page.tsx'), /import AIGenerator from '@\/app\/ai-generator\/page'/);
  assert.doesNotMatch(read('app/studio/page.tsx'), /StudioClient/);
  assert.match(view, /search\?\.get\('track'\)/);
  assert.match(view, /search\?\.get\('view'\) === 'library'/);
});

test('paid creation remains explicit, locked against double click, and uses existing entitlement and pricing contracts', () => {
  assert.match(view, /submitLock\.current \|\| disabled/);
  assert.match(view, /submitLock\.current = true/);
  assert.match(view, /finally \{ submitLock\.current = false/);
  assert.match(view, /ACTION_COSTS\.generation\.credits/);
  assert.match(view, /disabled=\{!form.allowedModels.includes\(model.id\)\}/);
  assert.match(controller, /submit: generateMusic/);
  assert.match(controller, /normalizeGenerationModel\(value, availableModels\)/);
  assert.match(view, /form.mode.value === 'remix' && !form.remixReady/);
  const cost = view.match(/const MUSIC_VIDEO_CREDIT_COST = (\d+)/)[1];
  assert.match(read('app/api/suno/generate-music-video/route.ts'), new RegExp(`const MUSIC_VIDEO_CREDIT_COST = ${cost};`));
  assert.doesNotMatch(view, /fetch\(|new Audio\(|<audio|<video|setQueueAndPlay|mock|MOCK/);
  assertUnchangedV6TrackBoundaries('app/ai-generator/page.tsx');
});

test('all modes, real errors and lifecycle actions remain reachable without automatic publication', () => {
  for (const field of ['description', 'title', 'style', 'lyrics', 'instrumental', 'model', 'duration', 'weirdness', 'styleInfluence', 'audioWeight', 'negativeTags', 'vocalGender']) assert.ok(view.includes(`form.${field}`), field);
  for (const action of ['play', 'download', 'share', 'remix', 'reuse', 'copyLyrics', 'like', 'trash', 'folder', 'video', 'publish']) assert.ok(view.includes(`p.actions.${action}`), action);
  assert.match(view, /setConfirm\('publish'\)/);
  assert.match(view, /setConfirm\('trash'\)/);
  assert.match(view, /setConfirm\('video'\)/);
  assert.match(view, /role="alert"/);
  assert.match(view, /generation.error\) setView\('create'\)/);
  assert.match(view, /<SynauraOverlay/);
  assert.match(view, /<HandoffReturn fallbackHref="\/live"/);
  assert.match(controller, /if \(unifiedStudio\) return;/);
});

test('historical preservation cannot hide a change to the adapter or existing audio handlers', () => {
  assert.doesNotThrow(() => projectUnifiedStudio('app/ai-generator/page.tsx', controller));
  assert.throws(() => projectUnifiedStudio('app/ai-generator/page.tsx', controller.replace('submit: generateMusic', 'submit: playGenerated')));
  assert.throws(() => projectUnifiedStudio('app/ai-generator/page.tsx', controller.replace('if (unifiedStudio) return;', 'if (false) return;')));
  const projected = projectUnifiedStudio('app/ai-generator/page.tsx', controller);
  assert.ok(!projected.includes('return <UnifiedStudio'));
  assert.match(projected, /const generateMusic = async/);
});

test('visual fixture is explicitly labelled, production-disabled, and cannot send paid or content mutations', () => {
  assert.match(read('app/dev/studio/page.tsx'), /process.env.NODE_ENV === 'production'\) notFound\(\)/);
  assert.match(read('components/onboarding/OnboardingGate.tsx'), /process.env.NODE_ENV !== 'production' && pathname === '\/dev\/studio'/);
  const lab = read('app/dev/studio/StudioLab.tsx');
  assert.match(lab, /données de démonstration/);
  assert.doesNotMatch(lab, /fetch\(|useSession|useBackgroundGeneration|\/api\//);
});
