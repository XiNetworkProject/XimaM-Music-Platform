import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import postcss from 'postcss';
import { projectReviewedV6, assertUnchangedV6TrackBoundaries } from './helpers/reviewed-suno-v6.mjs';
import { projectUnifiedPresentation } from './helpers/reviewed-unified-navigation.mjs';

const read = (file) => readFileSync(resolve(file), 'utf8');
const css = read('components/v2/creation-v2.css');
const files = [
  'app/create/variation/page.tsx',
  'app/ai-generator/page.tsx', 'app/ai-library/page.tsx',
  'app/studio/StudioClient.tsx', 'app/studio/library/page.tsx',
  'app/upload/page.tsx', 'app/publish/page.tsx',
  'app/clips/new/page.tsx', 'app/clips/[id]/page.tsx',
  'components/create/CreateArrivalBanner.tsx',
  'components/clips/ClipUploadIndicator.tsx',
  'components/variations/PendingApprovalsModal.tsx',
  'components/ai-studio/LibraryMiddlePanel.tsx',
  'components/ai-studio/TrackInspector.tsx',
  'components/ai-studio/GenerationTimeline.tsx',
  'components/studio/LeftDock/GeneratorForm.tsx',
  'components/studio/ui/MobileTabs.tsx',
];
const parse = (file, content = read(file)) => ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const normalized = (value) => value.replace(/\s+/g, ' ').trim();
const collect = (source, predicate) => {
  const result = [];
  const visit = (node) => {
    if (predicate(node)) result.push(normalized(node.getText(source)));
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
};

test('creation presentation files remain valid TSX and CSS', () => {
  for (const file of files) assert.equal(parse(file).parseDiagnostics.length, 0, file);
  assert.ok(postcss.parse(css).nodes.length > 0);
});

test('Create is now a bottom sheet with every real tool, not a sculpture hub', () => {
  const source = read('lib/createSurface.ts') + read('components/create/CreateSurface.tsx');
  for (const route of ['/ai-generator', '/upload', '/clips/new', '/create/variation', '/studio', '/ai-library']) assert.ok(source.includes(route), route);
  assert.match(source, /presentation: 'sheet'/);
  assert.match(source, /withCreateSurfaceContext/);
  assert.doesNotMatch(source, /CreativeResonator|ChamberMaterial|new Audio|setQueueAndPlay/);
});

test('variation sources still require creator permission and retain source/challenge routing', () => {
  const source = read('app/create/variation/page.tsx');
  assert.match(source, /\/api\/remixes\/sources\?limit=80/);
  assert.match(source, /status !== 'authenticated'/);
  assert.match(source, /sourceTrackId: source\.sourceTrackId/);
  assert.match(source, /sourceTrackType: source\.sourceTrackType/);
  assert.match(source, /params\.set\('challengeId', challengeId\)/);
  assert.match(source, /Le créateur original reste toujours crédité/);
});

test('creation library counts stay real and the historical demo stays explicit', () => {
  const source = read('app/ai-library/page.tsx');
  for (const count of ['stats.total', 'stats.favorites', 'stats.totalDuration']) assert.ok(source.includes(count));
  assert.match(source, /chambre-library-cover/);
  const legacy = read('app/studio/library/page.tsx');
  assert.match(legacy, /Démonstration historique/);
  assert.match(legacy, /exemples non persistants/);
  assert.match(legacy, /ne sont pas fonctionnelles/);
  assert.match(legacy, /href="\/ai-library"/);
});

test('public Clip keeps its own identity, source credit and explicit native playback', () => {
  const source = read('app/clips/[id]/page.tsx');
  assert.match(source, /getPublicClip\(params\.id\)/);
  assert.match(source, /filter=clips&clipId=\$\{encodeURIComponent\(clip\.id\)\}/);
  assert.match(source, /src=\{clip\.videoUrl\}/);
  assert.match(source, /controls\s+playsInline\s+preload="metadata"/);
  assert.match(source, /href=\{clip\.sourceTrack\.trackUrl\}/);
  assert.doesNotMatch(source, /autoPlay/);
});

test('workspace layouts retain internal scrolling, mobile access and reduced motion', () => {
  assert.match(css, /\.v2-ai-workspace-body[^}]*min-height: 0[^}]*overflow: hidden/s);
  assert.match(css, /\.v2-studio-canvas[^}]*grid-template-columns:/s);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /\.v2-upload-layout \{ grid-template-columns: 1fr/);
  assert.match(css, /\.v2-clip-layout \{ grid-template-columns: 1fr/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*\.chambre-creation-material img \{ animation: none/);
  assert.match(css, /:focus-visible/);
  assert.match(read('components/studio/ui/MobileTabs.tsx'), /env\(safe-area-inset-bottom/);
  assert.match(read('components/variations/PendingApprovalsModal.tsx'), /env\(safe-area-inset-bottom/);
});

test('generation stages, source attribution and upload status remain based on real state', () => {
  const ai = read('app/ai-generator/page.tsx');
  assert.match(ai, /\{studioStateLabel\}/);
  assert.match(ai, /\{creditsBalance\}/);
  assert.match(ai, /context=\{sourceContext \? 'variation' : 'ai'\}/);
  assert.match(read('components/ai-studio/LibraryMiddlePanel.tsx'), /\{filtered\.length\}/);
  assert.match(read('components/ai-studio/GenerationTimeline.tsx'), /\{generatedTracks\.length\} piste/);
  const indicator = read('components/clips/ClipUploadIndicator.tsx');
  assert.match(indicator, /useSyncExternalStore\(subscribeClientClipUpload/);
  assert.match(indicator, /onClick=\{retryClientClipUpload\}/);
  assert.match(indicator, /Math\.round\(task\.progress \* 100\)/);
});

test('validation modal keeps explicit approve/reject decisions and source links', () => {
  const source = read('components/variations/PendingApprovalsModal.tsx');
  assert.match(source, /method: 'PATCH'/);
  assert.match(source, /JSON\.stringify\(\{ decision \}\)/);
  assert.match(source, /decide\(item\.remixId, 'approve'\)/);
  assert.match(source, /decide\(item\.remixId, 'reject'\)/);
  assert.match(source, /setConfirmingId\(item\.remixId\)/);
  assert.match(source, /href=\{item\.source\.trackUrl\}/);
  assert.match(source, /disabled=\{busyId === item\.remixId\}/);
});

const snapshotRoot = 'artifacts/chambre-full-redesign/before/creation';
const snapshotsAvailable = files.every((file) => existsSync(resolve(snapshotRoot, file)));
test('local before/after: events, side effects, navigation, backend calls and media constructors are unchanged', { skip: !snapshotsAvailable }, () => {
  for (const file of files) {
    // The clip composer is now an explicitly requested functional redesign.
    // Its upload, duration, retry and navigation contract runs in live-media-continuity.
    if (['app/clips/new/page.tsx', 'components/clips/ClipUploadIndicator.tsx'].includes(file)) continue;
    const before = parse(file, read(`${snapshotRoot}/${file}`));
    const after = parse(file, projectUnifiedPresentation(file, projectReviewedV6(file)));
    if (['app/ai-generator/page.tsx', 'app/ai-library/page.tsx', 'app/studio/StudioClient.tsx'].includes(file)) assertUnchangedV6TrackBoundaries(file);
    const event = (node) => ts.isJsxAttribute(node) && /^on[A-Z]/.test(node.name.getText());
    const boundaryCall = (node) => ts.isCallExpression(node) && /^(fetch|useEffect|useLayoutEffect|useSyncExternalStore|router\.(push|replace|back)|getPublicClip|setQueueAndPlay|playTrack|pause|seek)$/.test(node.expression.getText());
    const constructor = (node) => ts.isNewExpression(node);
    const imports = (node) => ts.isImportDeclaration(node);
    for (const predicate of [event, boundaryCall, constructor]) {
      assert.deepEqual(collect(after, predicate), collect(before, predicate), `${file}: behavioral contract changed`);
    }
    const beforeImports = collect(before, imports);
    const afterImports = collect(after, imports);
    if (file === 'app/publish/page.tsx') {
      // Exact presentation imports authorized for the canonical Publish shell.
      // No module-wide, prefix or general import exemption is permitted.
      const presentationImports = [
        "import { SynauraAppShell, SynauraRouteNav, SynauraTopBar } from '@/components/synaura/SynauraShell';",
        "import HandoffReturn from '@/components/navigation/HandoffReturn';",
      ];
      assert.deepEqual(afterImports, [...beforeImports, ...presentationImports], `${file}: only the two reviewed presentation imports may be added`);
    } else {
      assert.deepEqual(afterImports, beforeImports, `${file}: imports changed`);
    }
  }
});

test('Create exposes direct links before secondary tools without an intermediate choice', () => {
  const source = read('components/create/CreateSurface.tsx');
  assert.match(source, /<Link key=\{tool.id\} replace prefetch=\{false\} data-live-route-intent href=\{href\(tool.href\)\}/);
  assert.ok(source.indexOf('CREATE_TOOLS.map') < source.indexOf('CREATE_OTHER_TOOLS.map'));
  assert.doesNotMatch(source, /setCreativeIntent|aria-pressed|<canvas/);
});

test('AI uses readable tokens for every reviewed former beige composer state', () => {
  const source = read('app/ai-generator/page.tsx');
  assert.doesNotMatch(source, /(?:text|bg)-\[#(?:6e5f54|7f7065|8b7868|5b4a80|9b8d82|416b6d|5f5650|efe0ce|fff4dc|f7efe4|fff7ec)\]/i);
  assert.match(source, /chambre-ai-mode/);
  assert.match(source, /aria-pressed=\{modelVersion === model.id\}/);
  assert.match(source, /aria-label="Durée demandée en secondes"/);
  assert.match(source, /chambre-ai-generation-commit/);
  assert.match(source, /onClick=\{generateMusic\}[\s\S]{0,400}bg-\[var\(--v2-accent-fill\)\]/);
});

test('generation is not labelled publication; V6 catalog and existing modes are explicit', () => {
  const source = read('app/ai-generator/page.tsx');
  assert.match(source, /01 \/ L’intention/);
  assert.match(source, /Affiner le rendu/);
  assert.match(source, /Lancer la génération/);
  assert.doesNotMatch(source, /3 &middot; Publication|2 &middot; Reglages/);
  assert.match(source, /key: 'custom' as const, label: 'Sur mesure'/);
  const form = read('components/studio/LeftDock/GeneratorForm.tsx');
  for (const value of ['custom', 'simple']) assert.ok(form.includes(`value="${value}"`));
  assert.match(form, /CURRENT_SUNO_MODELS.map/);
  assert.match(form, /entitlements.ai.availableModels/);
  assert.match(form, /title="Réglages avancés"/);
  assert.doesNotMatch(form, /title="(?:Project|Lyrics|Advanced)"|>Model<|>Title<|>Negative tags<|Un batch Suno/);
});
