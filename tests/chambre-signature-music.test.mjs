import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import postcss from 'postcss';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const digest = source => createHash('sha256').update(source).digest('hex');
const printer = ts.createPrinter({ removeComments: true });
const parse = (path, source) => ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const baselines = [
  ['app/search/page.tsx', '8fbbdf4c324eb5b499855330826515674f6ba1d403716ed3208da2069412dd20', '00468623813f4a9de5b987ff5e9af8e097fe749fa0afe56b2f97f045c7609e6e', 7, '885d205b2c6f2b7774372949466dc79036c0cd17de7adf53ca85c97d1c960bb9', 19],
  ['app/playlists/[id]/page.tsx', 'a1d2bd05e05811415b20cc8b95b062f12b44603609066f27e34b3e2c1b25deec', 'e3694f7d936f2b81ddc09ff7f5ab04a4ae7dd9ef4a8288e8a0e11207d584ccf5', 21, 'b42451167ed97a2951c0c2a468e06b0257d66fe72cf6283f8b677f2d038f0651', 26],
  ['app/album/[id]/page.tsx', 'b7495d5846c8579f9e13bfe8d9e50a278e34f0080dc20c8dc6bb03eb7d692460', 'e16cb42f56ad437d869d1bd06e42b5424ee1b96d60ceb7c2c13399ea0ea62706', 8, '616d8fe17b8ad5e19e16399cccdf534d469b44c13346384903d4a33c7d43d6c0', 21],
];

test('unchanged Search, Playlist and Album preserve 36 handlers and 66 protected calls', async () => {
  // Exact snapshots in artifacts/chambre-signature/before/music; no snapshot dependency at test time.
  for (const [path, expectedLogic, expectedEvents, eventCount, expectedCalls, callCount] of baselines) {
    const source = await read(path);
    const ast = parse(path, source);
    assert.equal(ast.parseDiagnostics.length, 0, path);
    const normalized = ts.transform(ast, [context => {
      const visit = node => ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)
        ? ts.factory.createNull() : ts.visitEachChild(node, visit, context);
      return visit;
    }]);
    assert.equal(digest(printer.printNode(ts.EmitHint.Unspecified, normalized.transformed[0], ast)), expectedLogic, `${path}: non-presentation program changed`);
    normalized.dispose();
    const events = [], calls = [];
    const visit = node => {
      if (ts.isJsxAttribute(node) && /^on[A-Z]/.test(node.name.text)) events.push(printer.printNode(ts.EmitHint.Unspecified, node, ast));
      if (ts.isCallExpression(node) && /^(use[A-Z]|fetch$|play|pause|seek|setQueue|addToUpNext|uploadLocalMedia|seedFollowState)/.test(node.expression.getText(ast))) calls.push(printer.printNode(ts.EmitHint.Unspecified, node, ast));
      ts.forEachChild(node, visit);
    };
    visit(ast);
    assert.equal(events.length, eventCount, path);
    assert.equal(calls.length, callCount, path);
    assert.equal(digest(JSON.stringify(events)), expectedEvents, `${path}: handler changed`);
    assert.equal(digest(JSON.stringify(calls)), expectedCalls, `${path}: protected call changed`);
    assert.doesNotMatch(source, /new\s+(Audio|AudioContext|WebGLRenderer)\b|<audio\b/);
  }
});

function collect(node, match) {
  if (!node || typeof node !== 'object') return [];
  return [...(match(node) ? [node] : []), ...(node.children || []).flatMap(child => collect(child, match))];
}

function actualPage(source, path, state, player) {
  const ast = parse(path, source);
  const bindings = {};
  const declarations = ast.statements.filter(node => {
    if (!ts.isImportDeclaration(node)) return true;
    if (node.importClause?.name) bindings[node.importClause.name.text] = node.importClause.name.text;
    for (const specifier of node.importClause?.namedBindings?.elements || []) bindings[specifier.name.text] = specifier.name.text;
    return false;
  });
  const jsx = { createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }) };
  const exported = {};
  let stateIndex = 0;
  const context = vm.createContext({
    ...bindings, exports: exported, React: jsx, motion: { div: 'motion.div' },
    useState: () => [state[stateIndex++], () => { throw new Error('Render must not mutate state'); }],
    useEffect: () => {}, useMemo: compute => compute(), useCallback: callback => callback,
    useParams: () => ({ id: 'unit-fixture-not-persisted' }), useRouter: () => ({ back() {}, push() {}, replace() {} }),
    useAudioPlayer: () => player, notify: { success() {}, error() {} },
    window: { dispatchEvent() {} }, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    fetch: () => { throw new Error('Unit render must not request data'); },
  });
  const program = declarations.map(node => node.getText(ast)).join('\n');
  vm.runInContext(ts.transpileModule(program, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText, context);
  return exported.default();
}

const testTracks = () => Array.from({ length: 7 }, (_, index) => ({
  _id: `unit-${index}`, title: `Track ${index}`, duration: 90 + index, genre: [index % 2 ? 'Jazz' : 'Ambient'],
  artist: { _id: 'unit-artist', username: 'unit-artist', name: 'Unit artist' }, audioUrl: `/unit-${index}.mp3`,
}));

test('the actual playlist page renders the same ordered tracks and its real play handler keeps the selected queue index', async () => {
  const tracks = testTracks();
  const data = { _id: 'unit-playlist', name: 'Unit playlist', tracks, description: 'Unit fixture', isPublic: true };
  const calls = [];
  const player = { audioState: { tracks: [], currentTrackIndex: 0, isPlaying: false }, setQueueAndPlay: (...args) => calls.push(args), addToUpNext() {} };
  const source = await read('app/playlists/[id]/page.tsx');
  for (const [query, genre, sort, expected] of [
    ['', 'Tous', 'position', tracks], ['Track 3', 'Tous', 'position', [tracks[3]]],
    ['', 'Jazz', 'position', tracks.filter(track => track.genre[0] === 'Jazz')],
    ['', 'Tous', 'duration', [...tracks].reverse()],
  ]) {
    const tree = actualPage(source, 'playlist.tsx', [data, false, null, null, {}, {}, query, genre, sort], player);
    const rows = collect(tree, node => String(node.props.className || '').startsWith('v2-playlist-track-row '));
    assert.deepEqual(rows.map(node => node.props.key), expected.map(track => track._id));
    assert.equal(calls.length, 0, 'opening must never play');
    const index = Math.min(2, rows.length - 1);
    const button = collect(rows[index], node => node.type === 'button' && String(node.props['aria-label']).startsWith('Écouter'))[0];
    button.props.onClick();
    const [queue, start] = calls.pop();
    assert.deepEqual(Array.from(queue, track => track._id), expected.map(track => track._id));
    assert.equal(start, index);
  }
});

test('the actual album keeps one numbered row per track and its existing explicit selected-index playback', async () => {
  const tracks = testTracks();
  const album = { _id: 'unit-album', name: 'Unit album', tracks, trackCount: tracks.length, description: '', createdAt: '2025-01-01', coverUrl: '/unit-cover.jpg' };
  const calls = [];
  const player = { audioState: { tracks: [], currentTrackIndex: 0, isPlaying: false }, setQueueAndPlay: (...args) => calls.push(args), addToUpNext() {}, playTrack() {} };
  const tree = actualPage(await read('app/album/[id]/page.tsx'), 'album.tsx', [album, false, null], player);
  const rows = collect(tree, node => String(node.props.className || '').startsWith('v2-album-track-row '));
  assert.deepEqual(rows.map(node => node.props.key), tracks.map(track => track._id));
  assert.equal(calls.length, 0);
  rows[4].props.onClick();
  assert.equal(calls.length, 1);
  assert.deepEqual(Array.from(calls[0][0], track => track._id), tracks.map(track => track._id));
  assert.equal(calls[0][1], 4);
  const decorativeDisc = collect(tree, node => node.props.className === 'chambre-signature-album-disc');
  assert.equal(decorativeDisc.length, 1);
  assert.equal(decorativeDisc[0].props['aria-hidden'], 'true');
});

test('Search keeps real results and adds exactly three literal no-prefetch entry links only in the existing empty-query branch', async () => {
  const source = await read('app/search/page.tsx');
  const ast = parse('search.tsx', source);
  let nav;
  const visit = node => {
    if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(prop => ts.isJsxAttribute(prop) && prop.name.text === 'className' && prop.initializer?.text === 'chambre-signature-search-index')) nav = node;
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(nav);
  const links = nav.children.filter(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'Link');
  assert.equal(links.length, 3);
  assert.deepEqual(links.map(node => node.openingElement.attributes.properties.find(prop => prop.name.text === 'href').initializer.text), ['/discover', '/radar', '/community']);
  for (const link of links) {
    const props = link.openingElement.attributes.properties;
    assert.equal(props.find(prop => prop.name.text === 'prefetch').initializer.expression.kind, ts.SyntaxKind.FalseKeyword);
    assert.ok(!props.some(prop => /^on[A-Z]/.test(prop.name.text)));
  }
  let parent = nav.parent;
  while (parent && !ts.isConditionalExpression(parent)) parent = parent.parent;
  assert.equal(parent.condition.getText(ast), '!query');
  for (const result of ['tracks', 'posts', 'artists', 'playlists']) assert.ok(source.includes(`results.${result}`));
  assert.match(source, /<TrackActionButton track=\{track\} origin="search"/);
  assert.match(source, /controller\.abort\(\)/);
  assert.match(source, /chambre-signature-search-instrument" aria-hidden="true"/);
});

test('Profile retains owner/visitor actions, five sections, conditional creator identity and actual spotlight tracks', async () => {
  const profile = await read('app/profile/[username]/page.tsx');
  for (const tab of ['sons', 'clips', 'variations', 'playlists', 'posts']) assert.ok(profile.includes(`['${tab}',`));
  for (const marker of ['handleFollow', 'handleEdit', 'handleShareProfile', 'setShowMessageModal(true)', 'setShowPendingModal(true)', 'setShowBoosterModal(true)', 'handleImageUpload', 'displayTracks.map', 'topProfileTracks.map', 'spotlightTrack.cover_url', 'handlePlayTrack(spotlightTrack)', '<ProfileIdentity', 'chambre-signature-profile-records', 'chambre-signature-profile-discography']) assert.ok(profile.includes(marker), marker);
  assert.match(await read('components/profile/ProfileIdentity.tsx'), /p.profile.isArtist \? 'ARTISTE SYNAURA' : 'MEMBRE SYNAURA'/);
  assert.match(profile, /aria-pressed=\{activeSection === key\}/);
});

test('signature CSS is additive and scoped, keeps controls reachable and provides mobile plus reduced-motion compositions', async () => {
  const css = (await read('components/v2/music-v2.css')).replaceAll('\r\n', '\n');
  const marker = '/* CHAMBRE SIGNATURE MUSIC';
  const before = css.slice(0, css.indexOf(marker));
  assert.equal((before.match(/\/\* END CHAMBRE DISCOVERY CONTINUATION \*\//g) || []).length, 1);
  assert.equal(digest(before.replace('/* END CHAMBRE DISCOVERY CONTINUATION */', '').trimEnd()), '3047f53c7e94032efe6fc39871940cd3e0df11fbcdf2acf0bac3a9d376bdfce7');
  const added = css.slice(css.indexOf(marker));
  const parsed = postcss.parse(added);
  parsed.walkRules(rule => {
    for (const selector of rule.selectors) assert.match(selector, /chambre-signature/, selector);
    assert.doesNotMatch(rule.selector, /v2-live|v2-discover|v2-expanded|v2-track-page|chamber-product/);
  });
  parsed.walkDecls('display', declaration => assert.notEqual(declaration.value, 'none', 'do not remove a musical control or content'));
  assert.match(added, /max-width:767px/);
  assert.match(added, /min-width:768px\) and \(max-width:1199px/);
  assert.match(added, /prefers-reduced-motion:reduce/);
  assert.match(added, /:focus-visible/);
  assert.match(added, /min-width:44px; min-height:44px/);
  assert.doesNotMatch(added, /animation:[^;]*infinite|@keyframes|backdrop-filter:blur|position:fixed/);
});
