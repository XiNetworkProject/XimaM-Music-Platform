import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import postcss from 'postcss';

const files = [
  'app/ai-generator/page.tsx', 'app/studio/StudioClient.tsx', 'app/publish/page.tsx',
  'components/ai-studio/LibraryMiddlePanel.tsx', 'components/studio/Center/StudioTimeline.tsx',
  'components/studio/RightDock/Inspector.tsx', 'components/studio/LeftDock/LeftDock.tsx',
  'components/studio/Library/LibraryPanel.tsx',
];
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const before = file => read(`artifacts/chambre-experience/before/creation/${file}`);
const parse = (file, source = read(file)) => ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const printer = ts.createPrinter({ removeComments: true });
function collect(ast, predicate) {
  const values = [];
  const visit = node => {
    if (predicate(node)) values.push(printer.printNode(ts.EmitHint.Unspecified, node, ast));
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return values;
}
const css = read('components/v2/experience-creation.css');

test('all recomposed creation surfaces parse as TSX, and scoped CSS parses', () => {
  for (const file of files) assert.deepEqual(parse(file).parseDiagnostics, [], file);
  assert.ok(postcss.parse(css).nodes.length > 0);
});

test('every existing import, handler, effect, backend call and media constructor is unchanged from the local snapshots', () => {
  const predicates = {
    imports: ts.isImportDeclaration,
    handlers: node => ts.isJsxAttribute(node) && /^on[A-Z]/.test(node.name.getText()),
    boundaries: node => ts.isCallExpression(node) && /^(fetch|useEffect|useLayoutEffect|useSyncExternalStore|router\.(push|replace|back)|setQueueAndPlay|playTrack|play|pause|seek|uploadLocalMedia|startBackgroundGeneration)$/.test(node.expression.getText()),
    constructors: ts.isNewExpression,
    formControls: node => ts.isJsxAttribute(node) && /^(value|defaultValue|disabled|key|ref|type|checked|defaultChecked|required|accept|multiple|action|method)$/.test(node.name.getText()),
  };
  for (const file of files) {
    const old = parse(file, before(file)), current = parse(file);
    for (const [name, predicate] of Object.entries(predicates)) {
      assert.deepEqual(collect(current, predicate), collect(old, predicate), `${file}: ${name}`);
    }
  }
});

test('navigation keeps every existing destination; Publish adds only the existing Clip/post entry routes and an IA library shortcut', () => {
  const href = node => ts.isJsxAttribute(node) && node.name.getText() === 'href';
  for (const file of files) {
    const old = collect(parse(file, before(file)), href).sort();
    const current = collect(parse(file), href).sort();
    const additions = file === 'app/publish/page.tsx'
      ? ['href="/ai-library"', 'href="/clips/new"', 'href="/posts?compose=true"']
      : [];
    assert.deepEqual(current, [...old, ...additions].sort(), file);
  }
});

test('generation retains actual costs, disable gates, task state, source routing and resizable columns', () => {
  const ai = read('app/ai-generator/page.tsx');
  assert.match(ai, /data-mobile-composer-open=\{mobileCreateOpen \|\| undefined\}/);
  assert.match(ai, /gridTemplateColumns: studioGridTemplate/);
  assert.match(ai, /context=\{sourceContext \? 'variation' : 'ai'\}/);
  assert.match(ai, /onClick=\{generateMusic\}\s+disabled=\{isGenerationDisabled \|\| isGenerating \|\| rateLimitActive\}/);
  assert.match(ai, /ACTION_COSTS\.generation\.credits/);
  assert.match(ai, /data-generation-state=\{sunoState\}/);
  assert.match(ai, /showStudioInspector &&/);
  assert.match(ai, /aria-pressed=\{generationDuration === duration\}/);
});

test('editor and listening regions retain usable scrolling; commit is outside the scrolling editor', () => {
  const ast = parse('app/ai-generator/page.tsx');
  const className = element => element.openingElement?.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText() === 'className')?.initializer?.getText() || '';
  const commits = [];
  const visit = node => {
    if (ts.isJsxElement(node) && className(node).includes('experience-generation-commit')) commits.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.equal(commits.length, 1);
  let ancestor = commits[0].parent;
  while (ancestor) {
    if (ts.isJsxElement(ancestor)) assert.ok(!className(ancestor).includes('experience-composer-scroll'));
    ancestor = ancestor.parent;
  }
  assert.match(css, /\.experience-composer-scroll \{[^}]*min-height: 0;[^}]*overflow-y: auto;/);
  assert.match(css, /\.experience-listening-desk > \.v2-ai-results \{ flex: 1;/);
  assert.match(css, /\.experience-studio \.experience-studio-timeline \{[^}]*overflow-y: auto;/);
  assert.match(css, /\.v2-studio-canvas > div:has\(> \.hidden\) \{ display: none;/);
});

test('empty and busy states use the actual collection, filter and generation state', () => {
  const collection = read('components/ai-studio/LibraryMiddlePanel.tsx');
  assert.match(collection, /tracks\.length > 0 \? 'Aucune piste dans cette sélection\.'/);
  assert.match(collection, /liveGeneration\?\.visible \? 'Tes premières versions arrivent\.'/);
  assert.match(collection, /experience-library-loading" role="status"/);
  assert.match(collection, /experience-library-error" role="alert"/);
  assert.match(collection, /data-selected=\{isSelected \|\| isSource \|\| undefined\}/);
  const inspector = read('components/studio/RightDock/Inspector.tsx');
  assert.match(inspector, /!t \? \(/);
  assert.match(inspector, /aria-pressed=\{tab === 'ab'\}/);
  assert.match(inspector, /onClick=\{toggleVisibility\}/);
  assert.match(inspector, /disabled=\{busyAction === 'publish'\}/);
});

test('spectral material is decorative, palette remains token driven and new motion is finite with reduced motion support', () => {
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|animation:[^;]*infinite|@import/i);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation: none !important/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /@media \(max-width: 380px\)/);
  for (const file of ['app/publish/page.tsx', 'components/ai-studio/LibraryMiddlePanel.tsx']) {
    assert.match(read(file), /aria-hidden="true"><(?:div|img)/);
  }
});
