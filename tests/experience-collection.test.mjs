import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const postcss = require('postcss');
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const paths = ['app/discover/DiscoverClient.tsx', 'app/discover/DiscoverMoodTiles.tsx', 'app/library/LibraryClient.tsx'];
const printer = ts.createPrinter({ removeComments: true });
const parse = (path, source = read(path)) => ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const print = (node, ast) => printer.printNode(ts.EmitHint.Unspecified, node, ast);
const descendants = (node, predicate) => !node || typeof node !== 'object' ? [] : [...(predicate(node) ? [node] : []), ...(node.children || []).flatMap(child => descendants(child, predicate))];
const react = { createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }) };

function render(code, bindings) {
  const context = vm.createContext({ React: react, ...bindings });
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
  return context.result;
}

function contract(path, source) {
  const ast = parse(path, source);
  const events = [];
  function visit(node) {
    if (ts.isJsxAttribute(node) && /^on[A-Z]/.test(node.name.text)) events.push(print(node, ast));
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const transformed = ts.transform(ast, [context => {
    const visit = node => ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node) ? ts.factory.createNull() : ts.visitEachChild(node, visit, context);
    return visit;
  }]);
  const logic = printer.printFile(transformed.transformed[0]);
  transformed.dispose();
  return { logic, events };
}

test('all imports, data logic, state, effects and exact event expressions match the collection before snapshots', context => {
  for (const path of paths) {
    const before = `artifacts/chambre-experience/before/collection/${path}`;
    if (!existsSync(new URL(`../${before}`, import.meta.url))) return context.skip('Local before snapshots absent; no preservation claim inferred.');
    assert.deepEqual(contract(path, read(path)), contract(path, read(before)), path);
    assert.deepEqual(parse(path).parseDiagnostics, [], `${path} remains valid TSX`);
  }
});

test('actual Library masthead exposes five source counts, unchanged tab callbacks and a real recent-track resume', () => {
  const ast = parse('app/library/LibraryClient.tsx');
  let header;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'nativeLibraryHeader') header = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(header);
  const actions = [];
  const recent = [{ _id: 'recent-1', title: 'Long real title', coverUrl: '/real.jpg', artist: { name: 'Real artist' } }];
  const bindings = {
    tab: 'playlists', viewMode: 'grid', selectedPlaylistId: null, selectedPlaylist: null,
    search: '', trackSort: 'recent', genreFilter: 'all', filterableTracks: [],
    playlists: Array(2), favoriteTracks: Array(3), recentTracks: recent,
    downloadedTracks: Array(4), upNextTracks: Array(5), resumeTrack: recent[0], resumeActive: false,
    cx: (...values) => values.filter(Boolean).join(' '),
    setViewMode: value => actions.push(['view', value]), setSearch: value => actions.push(['search', value]),
    setTab: value => actions.push(['tab', value]), setSelectedPlaylistId: value => actions.push(['selected', value]),
    playTracks: (...args) => actions.push(['play', ...args]), setTrackSort: () => {}, setGenreFilter: () => {},
    ...Object.fromEntries(['Grid','List','Search','X','TabButton','SynauraImage','Pause','Play','Clock3'].map(name => [name,name])),
  };
  const tree = render(`globalThis.result = ${header.getText(ast)};`, bindings);
  const tabs = descendants(tree, node => node.type === 'TabButton');
  assert.equal(tabs.length, 5);
  assert.deepEqual(tabs.map(node => descendants(node, child => child.props.className === 'experience-collection-count')[0].children[0]), [2,3,1,4,5]);
  tabs[3].props.onClick();
  assert.deepEqual(actions.splice(0), [['tab','downloads'],['selected',null]]);
  const resume = descendants(tree, node => node.props.className?.includes('signature-library-resume') && node.type === 'button')[0];
  assert.equal(descendants(resume, node => node.type === 'SynauraImage')[0].props.src, '/real.jpg');
  resume.props.onClick();
  assert.equal(actions[0][1], recent, 'original queue identity is retained');
  assert.deepEqual(actions[0].slice(2), [0,'library-resume']);
  const gridButton = descendants(tree, node => node.props['aria-label'] === 'Vue grille')[0];
  assert.equal(gridButton.props['aria-pressed'], true);
  const search = descendants(tree, node => node.type === 'input')[0];
  search.props.onChange({ target: { value: 'ambient' } });
  assert.deepEqual(actions.at(-1), ['search','ambient']);
});

test('actual folder views retain record IDs, source covers and explicit playback callbacks', () => {
  const ast = parse('app/library/LibraryClient.tsx');
  const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === 'PlaylistCard');
  const folder = { _id: 'actual-folder', name: 'My records', coverUrl: '/folder.jpg', trackCount: 3, tracks: [], isPublic: false };
  for (const viewMode of ['grid','list']) {
    const actions = [];
    const tree = render(`${component.getText(ast)}\nglobalThis.result = PlaylistCard(input);`, {
      input: { playlist: folder, viewMode, onOpen: () => actions.push('open'), onDelete: () => actions.push('delete'), onPlay: () => actions.push('play') },
      ...Object.fromEntries(['SynauraImage','Play','Trash2','Globe','Lock'].map(name => [name,name])),
    });
    assert.equal(tree.props['data-library-playlist'], folder._id);
    assert.equal(descendants(tree, node => node.type === 'SynauraImage')[0].props.src, folder.coverUrl);
    const play = descendants(tree, node => node.props['aria-label'] === 'Lire')[0];
    play.props.onClick({ stopPropagation: () => actions.push('stop') });
    assert.deepEqual(actions, ['stop','play']);
    const open = descendants(tree, node => node.props.role === 'button')[0];
    open.props.onKeyDown({ key: 'Enter', preventDefault() {} });
    assert.equal(actions.at(-1), 'open');
  }
});

test('the new layer is scoped, parseable, responsive and keeps early controls and real cover art on small screens', () => {
  const source = read('components/v2/experience-collection.css');
  const css = postcss.parse(source);
  css.walkRules(rule => assert.ok(rule.selectors.every(selector => selector.includes('experience-')), rule.selector));
  assert.match(source, /@media \(max-width: 767px\)/);
  assert.match(source, /@media \(max-width: 359px\)/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /signature-library-track > \.signature-library-track-cover \{ display: block/);
  assert.match(source, /v2-discover-opening \{[^}]*min-height: 0/);
  assert.match(source, /v2-library-categories button \{[^}]*min-height: 44px/);
  assert.doesNotMatch(source, /animation:[^;}]*infinite|backdrop-filter|position: fixed/);
});
