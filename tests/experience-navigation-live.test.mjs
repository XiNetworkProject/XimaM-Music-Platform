import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import postcss from 'postcss';
import { reviewedPilotV1 } from './helpers/reviewed-pilot-v1.mjs';
import { projectUnifiedPresentation } from './helpers/reviewed-unified-navigation.mjs';

const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const printer = ts.createPrinter({ removeComments: true });
const files = ['components/synaura/SynauraShell.tsx', 'components/synaura/SynauraPrimaryDock.tsx', 'components/home/SynauraScroll.tsx', 'components/home/HomeFlowPrelude.tsx'];
function parse(file, text) {
  const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(tree.parseDiagnostics.length, 0, file);
  return tree;
}
function behavior(tree) {
  const result = ts.transform(tree, [context => root => {
    const visit = node => ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)
      ? context.factory.createStringLiteral('PRESENTATION')
      : ts.visitEachChild(node, visit, context);
    return ts.visitNode(root, visit);
  }]);
  const text = printer.printFile(result.transformed[0]);
  result.dispose();
  return text;
}
function controls(tree) {
  const values = [];
  const visit = node => {
    if (ts.isJsxAttribute(node) && /^(on[A-Z].*|value|checked|disabled|key|href|ref)$/.test(node.name.getText(tree))) {
      values.push(printer.printNode(ts.EmitHint.Unspecified, node, tree));
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return values;
}

for (const file of files) {
  const snapshot = `artifacts/chambre-experience/before/navigation-live/${file}`;
  test(`${file}: recomposition preserves controllers and every event, target and entity key`, {skip: !fs.existsSync(new URL(`../${snapshot}`, import.meta.url))}, () => {
    const before = parse(file, read(snapshot)), after = parse(file, reviewedPilotV1(file, projectUnifiedPresentation(file, read(file))));
    assert.equal(behavior(after), behavior(before));
    assert.deepEqual(controls(after), controls(before));
  });
}

test('listening material is decorative, real identity and waveform remain owned by the existing feed', () => {
  const source = read('components/home/SynauraScroll.tsx');
  assert.match(source, /experience-listening-scene" data-playing=\{isPlayingThis\}/);
  assert.match(source, /className="experience-record-halo" aria-hidden="true"/);
  assert.match(source, /data-active=\{index === activeIndex \? 'true' : 'false'\}/);
  assert.match(source, /el\?\.toggleAttribute\('inert', index !== activeIndex\)/);
  assert.match(source, /peaks=\{trackWaveform.peaks\}/);
  assert.match(source, /getAudioElement=\{getAudioElement\}/);
  assert.match(source, /onSeek=\{seek\}/);
  assert.doesNotMatch(source, /new (?:Audio|AudioContext|WebGLRenderer)\(/);
});

test('navigation retains all destinations, account actions, names and existing creation handoffs', () => {
  const shell = read('components/synaura/SynauraShell.tsx');
  const dock = read('components/synaura/SynauraPrimaryDock.tsx');
  for (const feature of ['MessageInboxButton', 'NotificationCenter', 'ChambreSpacesMenu', 'SynauraUniversalSearch', 'PRIMARY_WEB_NAV_ITEMS.map', 'ACCOUNT_WEB_NAV_ITEMS.map']) assert.ok(shell.includes(feature), feature);
  assert.match(shell, /aria-label="Ouvrir le menu du compte"/);
  assert.match(dock, /router.push\(withAuthRedirect\(withCurrentHandoff\(href\), authenticated\), \{ scroll: false \}\)/);
  assert.match(dock, /aria-expanded=\{createOpen\}/);
});

test('new motion is bounded to active cards, finite, decorative and reducible; navigation remains usable on mobile', () => {
  const css = read('components/v2/experience-live-navigation.css');
  assert.doesNotThrow(() => postcss.parse(css));
  assert.match(css, /\[data-active=true\] \.experience-record-halo/);
  assert.match(css, /experience-record-halo \{[^}]*pointer-events:none/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /max-height:650px/);
  assert.match(css, /max-width:767px/);
  assert.match(css, /:focus-visible/);
  assert.doesNotMatch(css, /animation:[^;}]*infinite|backdrop-filter:\s*blur|will-change:/);
  assert.match(css, /experience-account-menu \.v2-account-panel \{[^}]*overflow-y:auto/);
});

test('short-height listening layouts retain a separate scrolling action rail and text navigation links retain their width', () => {
  const css = read('components/v2/experience-live-navigation.css');
  const shortHeight = postcss.parse(css).nodes.find(node => node.type === 'atrule' && node.params === '(max-height:600px)');
  assert.ok(shortHeight);
  assert.match(shortHeight.toString(), /grid-template:'art meta rail' minmax\(0,1fr\)/);
  assert.match(shortHeight.toString(), /live-track-actions \{[^}]*overflow-y:auto/);
  assert.match(shortHeight.toString(), /live-track-actions > button \{ flex-shrink:0/);
  assert.match(css, /a:not\(\.v2-action\)/);
  assert.match(css, /v2-topbar-tools > a\.v2-action \{ width:auto/);
  assert.match(css, /synaura-scroll-feed > section:has\(> \.experience-listening-scene\) \{ overflow:clip; \}/);
});

test('route entry never creates a containing block for the fixed navigation and composer', () => {
  const css = postcss.parse(read('components/v2/experience-live-navigation.css'));
  const entry = css.nodes.find(node => node.type === 'atrule' && node.name === 'keyframes' && node.params === 'experience-route-in');
  assert.ok(entry);
  entry.walkDecls(decl => assert.equal(decl.prop, 'opacity'));
  const rule = css.nodes.find(node => node.type === 'rule' && node.selector === '.synaura-chambre .v2-route-enter');
  assert.ok(rule.nodes.some(decl => decl.prop === 'animation-name' && decl.value === 'experience-route-in'));
});
