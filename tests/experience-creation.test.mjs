import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import postcss from 'postcss';
import { projectReviewedV6 } from './helpers/reviewed-suno-v6.mjs';

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
    const old = parse(file, before(file)), current = parse(file, projectReviewedV6(file));
    for (const [name, predicate] of Object.entries(predicates)) {
      assert.deepEqual(collect(current, predicate), collect(old, predicate), `${file}: ${name}`);
    }
  }
});

test('navigation keeps every existing destination; Publish adds only the existing Clip/post entry routes and an IA library shortcut', () => {
  const href = node => ts.isJsxAttribute(node) && node.name.getText() === 'href';
  for (const file of files) {
    const old = collect(parse(file, before(file)), href).sort();
    const current = collect(parse(file, projectReviewedV6(file)), href).sort();
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
  assert.match(ai, /onClick=\{generateMusic\}\s+disabled=\{isGenerationDisabled \|\| isGenerating \|\| rateLimitActive \|\| quotaLoading\}/);
  assert.match(ai, /ACTION_COSTS\.generation\.credits/);
  assert.match(ai, /data-generation-state=\{sunoState\}/);
  assert.match(ai, /showStudioInspector &&/);
  assert.match(ai, /aria-label="Durée demandée en secondes"/);
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

test('AI reserves the mounted desktop player and lifts the open mobile composer route above its sibling player', () => {
  const tree = postcss.parse(css);
  const desktopSelector = 'body.synaura-v2 [data-route-chrome="studio"]:has(.v2-mini-player) .experience-generator.v2-ai-workspace';
  const mobileSelector = '.v2-route-enter[data-v2-route="/ai-generator"]:has(.experience-generator .v2-ai-columns[data-mobile-composer-open="true"])';
  const columnSelector = '.experience-generator .v2-ai-columns[data-mobile-composer-open="true"]';
  const rule = selector => {
    const matches = [];
    tree.walkRules(selector, node => matches.push(node));
    assert.equal(matches.length, 1, selector);
    return matches[0];
  };
  const desktop = rule(desktopSelector);
  assert.equal(desktop.parent.params, '(min-width: 1024px)');
  const padding = desktop.nodes.find(node => node.prop === 'padding-bottom');
  assert.equal(padding.value, 'calc(env(safe-area-inset-bottom, 0px) + 6.75rem)');
  assert.equal(padding.important, true, 'override the workspace’s explicit !pb-0');
  assert.ok(read('components/synaura/SynauraShell.tsx').includes('pb-[calc(env(safe-area-inset-bottom,0px)+6.75rem)]'));
  const mobile = rule(mobileSelector);
  assert.equal(mobile.parent.params, '(max-width: 1023px)');
  assert.equal(mobile.nodes.find(node => node.prop === 'z-index').value, 'calc(var(--v2-z-player) + 1)');
  assert.equal(rule(columnSelector).nodes.find(node => node.prop === 'z-index').value, 'calc(var(--v2-z-context) - 1)');
  const tokens = read('app/v2.css');
  const playerZ = Number(tokens.match(/--v2-z-player:\s*(\d+)/)[1]);
  const contextZ = Number(tokens.match(/--v2-z-context:\s*(\d+)/)[1]);
  assert.ok(playerZ + 1 < contextZ, 'open composer must stay below real overlays');
  assert.match(read('components/FullScreenPlayer.tsx'), /<PlayerDock/);
  assert.match(read('components/player/listening-player.css'), /\.listening-dock \{[^}]*z-index:115/);
  tree.walkRules(node => {
    if (node.selector.includes('.v2-mini-player')) {
      const declarations = node.nodes.filter(child => child.type === 'decl');
      if (node.selector === 'body:has(.v2-mini-player) .experience-studio.studio-pro') {
        assert.deepEqual(declarations.map(child => child.prop), ['--studio-workspace-floor']);
        assert.equal(declarations[0].value, node.parent.type === 'atrule'
          ? 'calc(164px + env(safe-area-inset-bottom, 0px))'
          : 'calc(108px + env(safe-area-inset-bottom, 0px))');
      } else {
        const mobileFloor = 'body.synaura-v2 [data-route-chrome="studio"]:has(.v2-mini-player) .v2-route-enter .experience-generator.v2-ai-workspace';
        assert.ok([desktopSelector, mobileFloor].includes(node.selector), 'only workspace padding may depend on the player; the player itself is untouched');
        assert.deepEqual(declarations.map(child => child.prop), ['padding-bottom']);
        if (node.selector === mobileFloor) {
          assert.equal(node.parent.params, '(max-width: 1023px)');
          assert.equal(declarations[0].value, 'calc(164px + env(safe-area-inset-bottom, 0px))');
          assert.equal(declarations[0].important, true);
        }
      }
    }
  });
});

test('responsive studio reserves the player floor and mobile library has usable scroll space', () => {
  const tree = postcss.parse(css);
  const declarations = selector => {
    const found = [];
    tree.walkRules(selector, node => found.push(node));
    return found;
  };
  const studio = declarations('.experience-studio.studio-pro');
  assert.ok(studio.some(rule => rule.nodes.some(node => node.prop === 'padding-bottom' && node.value === 'var(--studio-workspace-floor, 0px)')));
  const mobileBody = declarations('.experience-generator .v2-ai-workspace-body').find(rule => rule.parent.params === '(max-width: 1023px)');
  assert.ok(mobileBody.nodes.some(node => node.prop === 'overflow-y' && node.value === 'auto'));
  const columns = declarations('.experience-generator .v2-ai-columns').find(rule => rule.parent.params === '(max-width: 1023px)');
  assert.ok(columns.nodes.some(node => node.prop === 'min-height' && node.value === '620px'));
  assert.match(read('components/studio/LeftDock/LeftDock.tsx'), /<details className="workspace-projects">\s*<summary>Projet & organisation<\/summary>/);
  assert.match(read('app/ai-generator/page.tsx'), /<div className="workspace-information">/);
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

test('the floating queue shortcut does not cover the open mobile composer and returns on close', () => {
  const tree = postcss.parse(css);
  let rule;
  tree.walkRules(node => { if (node.selector === 'body:has(.experience-generator .v2-ai-columns[data-mobile-composer-open="true"]) > [data-context-surface-trigger-key="queue-bubble"]') rule = node; });
  assert.ok(rule);
  assert.equal(rule.parent.params, '(max-width: 1023px)');
  assert.deepEqual(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]), [['visibility', 'hidden']]);
});
