import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import postcss from 'postcss';

const require = createRequire(import.meta.url);
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const path = 'components/home/HomeFlowPrelude.tsx';
const source = read(path);
const css = read('components/home/home-flow-prelude.css');
const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const printer = ts.createPrinter({ removeComments: true });
const digest = value => createHash('sha256').update(value).digest('hex');
const attributes = (pattern, tree = ast) => {
  const result = [];
  const visit = node => {
    if (ts.isJsxAttribute(node) && pattern.test(node.name.getText(tree))) result.push(printer.printNode(ts.EmitHint.Unspecified, node, tree));
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return result;
};

test('Live keeps the entire pre-render behavior, props, imports, derivations and gestures unchanged', () => {
  // Fingerprint taken from the untouched continuation snapshot, never from candidate output.
  // Only these exact presentation imports are allowed. Image failures were
  // observed by the main agent; existing shared fallback code is reused as-is.
  assert.equal((source.match(/import '\.\/home-flow-prelude\.css';/g) || []).length, 1);
  assert.equal((source.match(/import \{ SynauraImage \} from '@\/components\/ui\/SynauraImage';/g) || []).length, 1);
  const behavioralPrefix = source.slice(0, source.lastIndexOf('  return (\n    <div'))
    .replace("import './home-flow-prelude.css';\n", '')
    .replace("import { SynauraImage } from '@/components/ui/SynauraImage';\n", '');
  assert.equal(digest(behavioralPrefix), 'f141e3024dcbb9acd876f721ee530a2874b7b43f530c89ebc2f9e49f492e85c6');
  assert.equal(ast.parseDiagnostics.length, 0);
  assert.doesNotMatch(source, /new\s+(?:Audio|AudioContext|WebGLRenderer)|<audio\b|fetch\(|router\.(?:push|replace)|localStorage|sessionStorage/);
});

test('22 events and 10 disabled/entity keys match original AST, except the exact observed keyboard-bubbling guard', () => {
  const guard = '        if (event.target !== event.currentTarget) return;\n';
  assert.equal(source.split(guard).length - 1, 1);
  assert.match(source, /onKeyDown=\{\(event\) => \{\n        if \(event.target !== event.currentTarget\) return;/);
  const restored = ts.createSourceFile(path, source.replace(guard, ''), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const events = attributes(/^on[A-Z]/, restored), controls = attributes(/^(disabled|key)$/);
  assert.equal(events.length, 22);
  assert.equal(digest(JSON.stringify(events)), 'a25044aa49630d10417033d032ca32673f3dea42ec3a912e2cc137d1398eb5b8');
  assert.equal(controls.length, 10);
  assert.equal(digest(JSON.stringify(controls)), '1968a73950018cf96c9d3f29317249667af33ecae6000d50615782b082865a81');
});

test('Live presents actual record identity and direct controls before contextual content', () => {
  assert.ok(source.indexOf('className="chambre-live-primary-actions"') < source.indexOf('className="chambre-live-around"'));
  assert.match(source, /className="chambre-live-artwork"><SynauraImage src=\{featuredTrack\?\.coverUrl/);
  assert.match(source, /Continuer dans Live/);
  for (const originalCollection of ['discoveryTracks.length ? discoveryTracks', 'recentPosts.slice(1).map', 'avatarCandidates.length ? avatarCandidates', 'shortcuts.map']) assert.ok(source.includes(originalCollection));
  assert.match(source, /<MessageInboxButton className="chambre-live-inbox"/);
  assert.match(source, /<SynauraLogo size=\{24\}[^>]*decorative/);
  assert.doesNotMatch(source, /v2-prelude-cover-shade|v2-prelude-intro-copy|membrane-cobalt/);
  assert.equal((source.match(/fallbackSrc="\/default-avatar\.svg"/g) || []).length, 3);
  assert.equal((source.match(/fallbackSrc="\/default-cover\.svg"/g) || []).length, 2);
  assert.doesNotMatch(source, /default-avatar\.png/);
});

test('local CSS is scoped, responsive, keyboard-visible and does not add a competing vertical scroll or animation', () => {
  const root = postcss.parse(css);
  root.walkRules(rule => assert.ok(postcss.list.comma(rule.selector).every(part => part.trim().startsWith('.chambre-live-start')), rule.selector));
  assert.match(css, /grid-template-columns:76px minmax\(0,1fr\)/);
  assert.match(css, /\.chambre-live-primary-actions > button \{ min-height:48px/);
  assert.match(css, /overflow-x:auto; overflow-y:hidden/);
  assert.match(css, /max\(12px,env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /@media\(max-height:600px\)/);
  assert.match(css, /@media\(max-width:360px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css, /overflow-y:\s*(?:auto|scroll)|animation:[^;]*infinite|@keyframes/);
});

// Isolated SSR presentation fixtures. These are not a signed-in session, real feed,
// browser layout, playback test, or production proof. Effects intentionally do not run.
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const effects = [];
const output = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, {
  module: output, exports: output.exports,
  window: { matchMedia: () => ({ matches:true }) },
  require(id) {
    if (id === './home-flow-prelude.css') return {};
    if (id === 'react') return {
      ...React,
      useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
      useRef: initial => ({ current: initial }),
      useMemo: fn => fn(), useCallback: fn => fn,
      useEffect: fn => effects.push(fn),
    };
    if (id === '@/components/brand/SynauraLogo') return { __esModule: true, default: () => React.createElement('svg', { 'aria-hidden': true }) };
    if (id === '@/components/messaging/MessageInboxButton') return { __esModule: true, default: () => React.createElement('button', { 'aria-label': 'Messages' }) };
    if (id === '@/components/ui/SynauraImage') return { SynauraImage: ({ fallbackSrc, ...props }) => React.createElement('img', props) };
    return require(id);
  },
});
const Prelude = output.exports.default;
const calls = [];
const callbacks = Object.fromEntries(['onEnterFlow','onPlayTrack','onOpenTrack','onOpenPost','onSearch','onNotifications','onDiscover','onRadar','onStudio','onEvents'].map(name => [name, () => calls.push(name)]));
const fixture = {
  _id: 'fixture-track', title: 'Titre de test', artist: { _id:'fixture-artist', name:'Artiste test', username:'fixture' },
  audioUrl: '/fixture-audio-not-loaded.mp3', coverUrl:'/fixture-cover-not-loaded.jpg', duration:120, likes:['one','two'], comments:1, plays:37,
};
const render = props => renderToStaticMarkup(React.createElement(Prelude, { open:true, tracks:[], posts:[], ...callbacks, ...props }));

test('closed and empty presentation states keep explicit access without generating playback', () => {
  assert.equal(render({ open:false }), '');
  const empty = render({});
  assert.match(empty, /Ton Live est prêt/);
  assert.match(empty, /Aucun morceau disponible/);
  assert.match(empty, /Aucune publication disponible/);
  assert.match(empty, /class="chambre-live-enter"/);
  assert.match(empty, /disabled=""[^>]*class="chambre-live-play"/);
  assert.deepEqual(calls, []);
});

test('SSR fixtures retain true now-playing/paused states, author, counts and all shortcuts', () => {
  const playing = render({ tracks:[fixture], currentTrack:fixture, currentPlaying:true, userName:'Prénom Test' });
  assert.match(playing, /data-playing="true"/);
  assert.match(playing, /Mettre en pause/);
  assert.match(playing, /À l’écoute/);
  assert.match(playing, /Titre de test/);
  assert.match(playing, /Artiste test/);
  assert.match(playing, /37 écoutes/);
  assert.match(playing, /2 j’aime/);
  assert.match(playing, /Bonjour Prénom/);
  const paused = render({ tracks:[fixture], currentTrack:fixture, currentPlaying:false });
  assert.match(paused, /Prêt à reprendre/);
  assert.match(paused, /Écouter le morceau/);
  for (const label of ['Découvrir', 'Radar', 'Studio IA', 'Événements']) assert.ok(paused.includes(label), label);
  assert.deepEqual(calls, []);
});

test('Space bubbling from a child causes zero enterFlow; Space on the container causes exactly one', () => {
  const element = Prelude({ open:true, tracks:[fixture], posts:[], ...callbacks });
  const container = {};
  calls.length = 0;
  element.props.onKeyDown({ key:' ', target:{}, currentTarget:container });
  assert.deepEqual(calls, []);
  element.props.onKeyDown({ key:' ', target:container, currentTarget:container });
  assert.deepEqual(calls, ['onEnterFlow']);
  calls.length = 0;
});
