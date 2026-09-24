import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const ts = createRequire(import.meta.url)('typescript');
const source = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
function find(file, predicate) {
  const tree = ts.createSourceFile(file, source(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = [];
  const visit = node => { if (predicate(node, tree)) nodes.push(node); ts.forEachChild(node, visit); };
  visit(tree);
  assert.equal(nodes.length, 1, 'exercise exactly one actual production callback');
  return nodes[0].getText(tree);
}
const mini = 'components/FullScreenPlayer.tsx';
const studio = 'components/ai-studio/UnifiedStudio.tsx';
const openCallback = find(mini, n => ts.isVariableDeclaration(n) && n.name.getText() === 'openPlayer');
const studioEffect = find(studio, (n, tree) => ts.isCallExpression(n) && n.expression.getText(tree) === 'useEffect'
  && n.getText(tree).includes("window.addEventListener('synaura:open-studio-track'"));
const script = ts.transpileModule(`const ${openCallback}; globalThis.open = openPlayer; ${studioEffect};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

function harness(pathname, trackId, fresh = false) {
  const song = { id: 'owned', title: 'Private draft' };
  const changes = [];
  const ctx = {
    pathname, currentTrackId: trackId, window: new EventTarget(), CustomEvent,
    useCallback: fn => fn, useEffect: fn => { ctx.cleanup = fn(); },
    setShowTikTok: value => changes.push(['feed', value]),
    setDetails: value => changes.push(['details', value]),
    setView: value => changes.push(['view', value]),
    p: { library: { songs: fresh ? [] : [{ track: song }], fresh: fresh ? [song] : [] }, select: track => changes.push(['select', track.id]) },
  };
  // Deliberately no play, pause, seek, queue setter, router or fetch in this scope:
  // opening details must not touch playback, history or public recommendations.
  runInNewContext(script, ctx);
  return { ctx, changes };
}

for (const pathname of ['/studio', '/ai-generator', '/dev/studio']) {
  for (const id of ['owned', 'gen-owned', 'ai-owned']) {
    test(`${pathname}: ${id} opens existing Studio details, without the scrolling feed`, () => {
      const h = harness(pathname, id); h.ctx.open();
      assert.deepEqual(h.changes, [['select', 'owned'], ['details', true], ['view', 'library']]);
    });
  }
}
test('freshly generated songs open without waiting for the saved library to refresh', () => {
  const h = harness('/studio', 'gen-owned', true); h.ctx.open();
  assert.deepEqual(h.changes, [['select', 'owned'], ['details', true], ['view', 'library']]);
});
test('unrelated music and non-Studio routes retain their existing player; listener is cleaned up', () => {
  for (const [path, id] of [['/library', 'gen-owned'], ['/studio', 'other']]) {
    const h = harness(path, id); h.ctx.open(); assert.deepEqual(h.changes, [['feed', true]]);
  }
  const h = harness('/studio', 'gen-owned'); h.ctx.cleanup(); h.ctx.open();
  assert.deepEqual(h.changes, [['feed', true]]);
});
test('all mini-player entry points and the global opening event share the same Studio-aware handler', () => {
  const text = source(mini);
  assert.equal((text.match(/onClick=\{openPlayer\}/g) || []).length, 1);
  assert.match(text, /<PlayerDock onOpen=\{openPlayer\}/);
  assert.match(source('components/player/ListeningPlayer.tsx'), /className="lp-now" onClick=\{onOpen\}/);
  assert.match(text, /addEventListener\('synaura:open-full-player', openPlayer\)/);
  assert.doesNotMatch(text, /onClick=\{\(\) => setShowTikTok\(true\)\}/);
});
test('the legacy player can be closed even before recommendations have loaded', () => {
  const file = 'components/TikTokPlayer.tsx';
  const loading = find(file, n => ts.isVariableDeclaration(n) && n.name.getText() === 'LoadingScreen');
  const code = ts.transpileModule(`const ${loading}; globalThis.render = LoadingScreen;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const ctx = { memo: fn => fn, React: { createElement: (tag, props, ...children) => ({ tag, props, children }) }, ChevronDown: 'icon', SynauraLogo: 'logo' };
  runInNewContext(code, ctx);
  let closed = 0;
  const tree = ctx.render({ onClose: () => closed++ });
  const button = tree.children.find(node => node.tag === 'button');
  assert.equal(button.props['aria-label'], 'Réduire le lecteur');
  button.props.onClick(); assert.equal(closed, 1);
  assert.match(source(file), /if \(loading\) return <LoadingScreen onClose=\{closeHandler\} \/>/);
});
