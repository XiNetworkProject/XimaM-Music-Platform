import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const postcss = require('postcss');
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const digest = value => createHash('sha256').update(value).digest('hex');
const printer = ts.createPrinter({ removeComments: true });
const astFor = (path, source) => ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const print = (node, ast) => printer.printNode(ts.EmitHint.Unspecified, node, ast);
const layerMarker = '/* CHAMBRE DISCOVERY CONTINUATION';

function renderActualFunction(source, name, bindings = {}) {
  const ast = astFor('actual-discovery.tsx', source);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === name);
  assert.ok(declaration, `the actual ${name} component must exist`);
  const code = ts.transpileModule(`${declaration.getText(ast).replace(/^export default /, '').replace(/^export /, '')}\nglobalThis.render = ${name};`, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = vm.createContext({
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }) },
    TrackTile: 'TrackTile', ArrowRight: 'ArrowRight', ...bindings,
  });
  vm.runInContext(code, context);
  return context.render;
}

function descendants(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...(node.children || []).flatMap(child => descendants(child, predicate))];
}

test('the actual three edition renderers retain every source object once, in order, with no synthetic tracks', async () => {
  const render = renderActualFunction(await read('app/discover/DiscoverClient.tsx'), 'DiscoverTrackRail');
  for (const edition of ['releases', 'hidden', 'popular']) {
    for (const length of [0, 1, 3, 4, 5, 6, 7, 16, 31]) {
      const tracks = Array.from({ length }, (_, index) => Object.freeze({ _id: `${edition}-${index}`, title: `Track ${index}` }));
      Object.freeze(tracks);
      const tree = render({ title: 'Title', subtitle: 'Subtitle', eyebrow: 'Chapter', tracks, edition });
      if (!length) {
        assert.equal(tree, null);
        continue;
      }
      const tiles = descendants(tree, node => node.type === 'TrackTile');
      assert.equal(tiles.length, length);
      tiles.forEach((tile, index) => {
        assert.equal(tile.props.track, tracks[index], `${edition}: source identity or ordering changed`);
        assert.equal(tile.props.grid, true);
      });
      assert.deepEqual(descendants(tree, node => node.props['data-discover-track']).map(node => node.props['data-discover-track']), tracks.map(track => track._id));
      const lists = descendants(tree, node => node.type === 'ol');
      const limit = edition === 'popular' ? 6 : 4;
      assert.equal(descendants(lists[0], node => node.type === 'TrackTile').length, Math.min(length, limit));
      const details = descendants(tree, node => node.type === 'details');
      assert.equal(details.length, length > limit ? 1 : 0);
      if (length > limit) {
        assert.equal(descendants(details[0], node => node.type === 'summary').length, 1);
        assert.equal(lists[1].props.start, limit + 1);
        assert.equal(descendants(details[0], node => node.type === 'TrackTile').length, length - limit);
      }
    }
  }
});

test('the actual Discover page still forwards all catalogue sections, moods, portraits, collections and community links', async () => {
  const moods = ['night', 'drive', 'club', 'focus', 'bittersweet', 'rap', 'electro', 'ai'].map(id => ({ id }));
  const clubs = ['feedback', 'collab', 'remix', 'ai'].map(slug => ({ slug, name: slug, accent: '#86afff' }));
  const render = renderActualFunction(await read('app/discover/DiscoverClient.tsx'), 'DiscoverClient', {
    useRouter: () => ({ replace: () => { throw new Error('Rendering must not navigate'); } }),
    useState: initial => [initial, () => { throw new Error('Rendering must not mutate state'); }],
    useMemo: calculate => calculate(), useCallback: callback => callback,
    DISCOVER_MOODS: moods, COMMUNITY_CLUBS: clubs, getMoodById: () => null,
    SynauraAppShell: 'SynauraAppShell', SynauraTopBar: 'SynauraTopBar', SynauraRouteNav: 'SynauraRouteNav',
    DiscoverLeadCard: 'DiscoverLeadCard', MoodCard: 'MoodCard', RadarSection: 'RadarSection',
    DiscoverTrackRail: 'DiscoverTrackRail', CollectionSpotlight: 'CollectionSpotlight',
    ArtistDiscoverCard: 'ArtistDiscoverCard', HorizontalScroller: 'HorizontalScroller',
    SynauraCityTeaser: 'SynauraCityTeaser', SectionHeader: 'SectionHeader', Link: 'Link',
  });
  const data = {
    initialMood: null, radarTracks: [{ _id: 'radar' }], newestTracks: [{ _id: 'newest' }],
    hiddenTracks: [{ _id: 'hidden' }], popularTracks: [{ _id: 'popular' }], totalTracks: 4,
    moodPreviews: Object.fromEntries(moods.map(mood => [mood.id, [`/${mood.id}.jpg`]])),
    collections: [{ _id: 'collection' }], artists: Array.from({ length: 10 }, (_, index) => ({ _id: `artist-${index}` })),
    favoriteMoodIds: ['electro'],
  };
  const tree = render(data);
  const editions = descendants(tree, node => node.type === 'DiscoverTrackRail');
  assert.deepEqual(editions.map(node => node.props.edition), ['releases', 'hidden', 'popular']);
  assert.equal(editions[0].props.tracks, data.newestTracks);
  assert.equal(editions[1].props.tracks, data.hiddenTracks);
  assert.equal(editions[2].props.tracks, data.popularTracks);
  assert.equal(descendants(tree, node => node.type === 'RadarSection')[0].props.tracks, data.radarTracks);
  assert.equal(descendants(tree, node => node.type === 'CollectionSpotlight')[0].props.playlists, data.collections);
  assert.equal(descendants(tree, node => node.type === 'SynauraCityTeaser').length, 1);
  const moodCards = descendants(tree, node => node.type === 'MoodCard');
  assert.equal(moodCards.length, 8);
  assert.equal(moodCards[0].props.mood.id, 'electro');
  for (const card of moodCards) {
    assert.equal(card.props.covers, data.moodPreviews[card.props.mood.id]);
    assert.equal(card.props.highlighted, card.props.mood.id === 'electro');
    assert.equal(typeof card.props.onOpen, 'function');
  }
  const portraits = descendants(tree, node => node.type === 'ArtistDiscoverCard');
  assert.equal(portraits.length, data.artists.length);
  portraits.forEach((node, index) => assert.equal(node.props.artist, data.artists[index]));
  for (const club of clubs) assert.equal(descendants(tree, node => node.type === 'Link' && node.props.href === `/community/${club.slug}`).length, 1);
});

test('Discovery effects, queue selection and playback logic match the exact before snapshot, without an exception', async () => {
  // SHA captured from artifacts/chambre-continuation/before/discover before any edit.
  const logic = [];
  for (const path of ['app/discover/DiscoverClient.tsx', 'app/discover/DiscoverMoodTiles.tsx']) {
    const ast = astFor(path, await read(path));
    assert.equal(ast.parseDiagnostics.length, 0);
    for (const node of ast.statements) {
      if (ts.isFunctionDeclaration(node) && ['MoodResultsView', 'DiscoverLeadCard', 'DiscoverClient', 'ArtistDiscoverCard'].includes(node.name.text)) {
        logic.push({ path, name: node.name.text, parameters: node.parameters.map(item => print(item, ast)), statements: node.body.statements.filter(statement => !ts.isReturnStatement(statement)).map(statement => print(statement, ast)) });
      }
    }
  }
  assert.equal(digest(JSON.stringify(logic)), 'f478afe01e0f3e584047cb232320697e258cef94e98b19669d47b9c5dabc5dc8');
  assert.equal(digest((await read('app/discover/DiscoverTiles.tsx')).replaceAll('\r\n', '\n')), 'c42b9dde6150b432ccf1e80f90f1f4067da8a494570e261174764bca63f6f266', 'native TrackTile controls must not change in this scoped reprise');
});

test('the approved lead, opening and all pre-existing music CSS remain exactly untouched', async () => {
  const ast = astFor('DiscoverClient.tsx', await read('app/discover/DiscoverClient.tsx'));
  const lead = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === 'DiscoverLeadCard');
  assert.equal(digest(print(lead, ast)), '7a9ec33601d2e6740f11394ac449e4a94a071cfb3c6ac6fb23d11d10a3752481');
  const openings = [];
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(prop => ts.isJsxAttribute(prop) && prop.name.text === 'className' && prop.initializer?.text === 'v2-discover-opening')) openings.push(node);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(openings.length, 1);
  assert.equal(digest(print(openings[0], ast)), '4c513474bdd3f54f2592d712c3ca98335d33698919a14653575018773e6f5822');
  const css = (await read('components/v2/music-v2.css')).replaceAll('\r\n', '\n');
  assert.equal(digest(css.slice(0, css.indexOf(layerMarker)).trimEnd()), '7c96c73f246f664e6cf1376f9d79be4737db9155f07acb9b596c394278928d77');
});

test('only Discovery CSS is added, with three distinct compositions, native disclosure focus and mobile actions', async () => {
  const css = await read('components/v2/music-v2.css');
  const layerEnd = css.indexOf('/* END CHAMBRE DISCOVERY CONTINUATION */');
  assert.ok(layerEnd > css.indexOf(layerMarker), 'the Discovery layer must have an explicit boundary');
  const continuation = css.slice(css.indexOf(layerMarker), layerEnd);
  const parsed = postcss.parse(continuation);
  parsed.walkRules(rule => {
    assert.match(rule.selector, /chambre-discover/, `out-of-scope selector: ${rule.selector}`);
    assert.doesNotMatch(rule.selector, /v2-discover-opening|v2-discover-lead|v2-live|v2-expanded|v2-track/);
  });
  assert.match(continuation, /edition--releases[^}]+grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(continuation, /edition--hidden[^}]+grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(continuation, /edition--popular[^}]+grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(continuation, /summary:focus-visible \{ outline:2px solid var\(--v2-focus\)/);
  assert.match(continuation, /div:last-child :is\(button,a\) \{ min-height:44px; min-width:44px/);
  assert.match(continuation, /@media\(max-width:767px\)/);
  assert.match(continuation, /@media\(max-width:359px\)/);
  assert.match(continuation, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(continuation, /font-family:[^;]*serif|animation:[^;]*infinite|position:fixed/);
  parsed.walkDecls('display', declaration => {
    if (declaration.value === 'none') assert.match(declaration.parent.selector, /::-webkit-details-marker$/, 'do not conceal a catalogue item, action or metadata');
  });
});
