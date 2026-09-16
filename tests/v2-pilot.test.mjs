import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import postcss from 'postcss';
import { getRouteChrome, isV2PilotRoute, shouldRenderGlobalMiniPlayer } from '../lib/routeChrome.ts';
import { reviewedPilotV1 } from './helpers/reviewed-pilot-v1.mjs';
const require = createRequire(import.meta.url);
test('canonical promotion preserves member guards, public discovery and transparent vector identity', () => {
  const live = read('app/live/page.tsx');
  assert.match(live, /if \(!session\?\.user\?\.id\) redirect\('\/'\)/);
  assert.match(live, /memberHasCompletedOnboarding\(session.user.id\)/);
  assert.match(live, /<PilotShell><LiveHandoffEntry><PilotLive/);
  const discover = read('app/discover/page.tsx');
  assert.match(discover, /<PilotShell><PilotDiscover/);
  assert.match(discover, /canonical: '\/discover'/);
  assert.doesNotMatch(discover, /redirect\(|getServerSession/);
  const shell = read('components/pilot/PilotShell.tsx');
  assert.doesNotMatch(shell, /Version actuelle/);
  assert.match(shell, /canonicalPath !== '\/live' && <PilotPlayer/);
  const logo = read('public/brand/v2/synaura-lockup.svg');
  assert.match(logo, /viewBox=/);
  assert.doesNotMatch(logo, /<image|data:image|<rect/);
});
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const compile = (file, mocks, globals = {}) => {
  const module = { exports: {} };
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(id => id in mocks ? mocks[id] : require(id), module, module.exports, ...Object.values(globals));
  return module.exports;
};

test('promoted routes have one navigation/player; preview aliases remain authenticated and noindex', () => {
  for (const route of ['/live','/discover','/v2','/v2/live','/v2/discover']) {
    assert.equal(isV2PilotRoute(route), true);
    assert.equal(getRouteChrome(route).showSidebar, false);
    assert.equal(shouldRenderGlobalMiniPlayer(route), false);
  }
  for (const route of ['/live-other','/discover/other','/v2/live-other','/v2/discover/other','/v20',null]) assert.equal(isV2PilotRoute(route), false);
  const layout = read('app/v2/layout.tsx');
  assert.match(layout, /getServerSession\(authOptions\)/);
  assert.match(layout, /if \(!session\?\.user\?\.id\) redirect/);
  assert.match(layout, /index: false, follow: false/);
  assert.doesNotMatch(read('components/pilot/PilotShell.tsx'), /AudioPlayerProvider|ContextSurfaceProvider/);
});

test('legacy renderer and other chrome remain identical after approved presentation boundary projection', () => {
  reviewedPilotV1('components/home/SynauraScroll.tsx', read('components/home/SynauraScroll.tsx'));
  reviewedPilotV1('lib/routeChrome.ts', read('lib/routeChrome.ts'));
});

test('new renderers are distinct and share the existing feed and surface contracts', () => {
  const live = read('components/pilot/PilotLive.tsx');
  assert.match(live, /<SynauraScroll renderPilot=/);
  for (const type of ['track','post','clip','artist_spotlight','collection','challenge','announcement']) assert.ok(live.includes(type));
  for (const hook of ['useProfilePeek','useCommentsSurface','useTrackActions']) assert.ok(live.includes(hook));
  assert.match(live, /resolveStatus=\{active\}/);
  assert.match(live, /active && item.type === 'track'/);
  assert.match(live, /toggleAttribute\('inert', index !== activeIndex\)/);
  assert.doesNotMatch(live, /<ScrollPostSlide|renderItemBody|new Audio|<audio\b/);
});

test('Discover is lazy by route, uses normal APIs, scoped cached queries, cancellation and no prefetch', () => {
  const discover = read('components/pilot/PilotDiscover.tsx');
  assert.match(discover, /session\?\.user\?\.id \|\| 'guest'/);
  assert.match(discover, /enabled: enabled && status !== 'loading'/);
  assert.match(discover, /staleTime: 5 \* 60_000/);
  assert.match(discover, /refetchOnWindowFocus: false/);
  assert.match(discover, /fetch\(path, \{ signal \}\)/);
  assert.match(discover, /Boolean\(mood\)/);
  for (const file of ['PilotLive.tsx','PilotShell.tsx','PilotPlayer.tsx','PilotLink.tsx']) assert.doesNotMatch(read(`components/pilot/${file}`), /PilotDiscover|\/api\/discover/);
  assert.match(read('components/pilot/PilotLink.tsx'), /prefetch=\{false\}/);
});

test('pilot navigation carries a valid existing snapshot and review mode without rewriting history', () => {
  const pushes = [];
  const Link = () => null;
  const window = { location: { origin: 'https://synaura.fr', pathname: '/v2/live', search: '?pilotReview=1' }, history: { state: {} } };
  const { default: PilotLink } = compile('components/pilot/PilotLink.tsx', {
    'next/link': { default: Link }, 'next/navigation': { useRouter: () => ({ push: (...args) => pushes.push(args) }) },
    '@/lib/liveContinuity': { readLiveSnapshotId: () => 'live-qa-safe' }, '@/lib/creationHandoffClient': { validLiveReturn: token => token === 'live-qa-safe' },
  }, { window });
  const event = { button: 0, preventDefault() { this.defaultPrevented = true; } };
  PilotLink({ href: '/v2/discover' }).props.onClick(event);
  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(pushes, [['/v2/discover?liveReturn=live-qa-safe&pilotReview=1', { scroll: false }]]);
  pushes.length = 0;
  window.location.pathname = '/live';
  PilotLink({ href: '/discover' }).props.onClick({ button: 0, preventDefault() {} });
  assert.deepEqual(pushes, [['/discover?liveReturn=live-qa-safe&pilotReview=1', { scroll: false }]]);
  pushes.length = 0;
  PilotLink({ href: '/track/real' }).props.onClick({ button: 0 });
  PilotLink({ href: '/v2/discover' }).props.onClick({ button: 0, ctrlKey: true });
  assert.equal(pushes.length, 0);
});

test('waveform renders actual signal, has keyboard range, no seek on mount, one seek on explicit marker', () => {
  const seeks = [], opens = [], effects = [];
  const { default: Waveform } = compile('components/pilot/PilotWaveform.tsx', {
    react: { useId: () => ':qa:', useRef: () => ({ current: null }), useEffect: effect => effects.push(effect) },
    'lucide-react': { MessageCircle: () => null },
  });
  const element = Waveform({ peaks: [.1,.7,.3], duration: 100, getAudioElement: () => null, onSeek: value => seeks.push(value), canSeek: true,
    markers: [{ id: 'm1', timestampSeconds: 32, content: 'real', user: { name: 'Auteur' } }], onMarkerSeek: marker => opens.push(marker.id), reactionClusters: [] });
  assert.equal(seeks.length, 0);
  const nodes = [];
  function walk(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); nodes.push(node); walk(node.props?.children); }
  walk(element);
  const range = nodes.find(node => node.type === 'input');
  assert.equal(range.props.type, 'range');
  range.props.onChange({ target: { value: '21' } });
  assert.deepEqual(seeks, [21]);
  seeks.length = 0;
  nodes.find(node => node.type === 'button').props.onClick();
  assert.deepEqual(seeks, [32]);
  assert.deepEqual(opens, ['m1']);
});

test('all pilot styles are scoped, finite, reduced-motion aware, and preserve safe areas', () => {
  const css = read('components/pilot/pilot.css');
  const root = postcss.parse(css);
  root.walkRules(rule => {
    if (rule.parent.type === 'atrule' && rule.parent.name === 'keyframes') return;
    for (const selector of rule.selectors) assert.ok(selector.includes('.synaura-pilot'), selector);
  });
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.doesNotMatch(css, /animation:[^;]*infinite/);
  assert.match(css, /max-height: 720px/);
  assert.match(css, /pilot-slide \{ height: max\(100%,620px\)/);
});

test('review metrics are opt-in read-only and cleanup both timer and observer', () => {
  const source = read('components/pilot/PilotReview.tsx');
  assert.match(source, /if \(!enabled\) return/);
  assert.match(source, /clearInterval\(timer\); observer\?\.disconnect\(\)/);
  assert.doesNotMatch(source, /fetch\(|localStorage|sessionStorage|\.play\(|\.pause\(|\.seek\(|setQueue/);
});

test('no new musical element, dependency authority or auto social mutation in pilot components', () => {
  for (const file of readdirSync(new URL('../components/pilot', import.meta.url)).filter(name => name.endsWith('.tsx'))) {
    const source = read(`components/pilot/${file}`);
    assert.doesNotMatch(source, /new\s+(?:Audio|AudioContext|WebGLRenderer)\b|<audio\b|AudioPlayerProvider|authority:\s*true/, file);
    assert.equal(ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX).parseDiagnostics.length, 0, file);
  }
  const player = read('components/pilot/PilotPlayer.tsx');
  assert.doesNotMatch(player, /useEffect|setQueueAndPlay|playTrack/);
});

test('Live entry displays the actual feed anchor and entering never mutates audio or queue', () => {
  const calls = [], enters = [];
  const track = { _id: 'feed-first', title: 'Premier vrai morceau', artist: { name: 'Artiste réel' }, coverUrl: '/real.jpg' };
  const audio = { audioState: { tracks: [], currentTrackIndex: 0, isPlaying: false }, pause: () => calls.push('pause'), play: () => calls.push('play') };
  const { default: Entry } = compile('components/pilot/PilotLiveEntry.tsx', {
    react: { useRef: () => ({ current: null }) },
    'lucide-react': { ArrowDown: () => null, ArrowUpRight: () => null, Headphones: () => null, Heart: () => null, MessageCircle: () => null, Share2: () => null, Pause: () => null, Play: () => null },
    '@/app/providers': { useAudioPlayer: () => audio }, './PilotImage': { default: () => null },
  });
  const model = { items: [{ id: 'first', type: 'track', track }, { id: 'next', type: 'track', track: { ...track, _id: 'other' } }], activeIndex: 0,
    playIndex: index => calls.push(['queue-play', index]), enterFeed: () => enters.push('enter') };
  const root = Entry({ model }), nodes = [];
  const walk = node => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); nodes.push(node); walk(node.props?.children); };
  walk(root);
  assert.equal(root.props['data-pilot-entry-track'], 'feed-first');
  assert.deepEqual(calls, []);
  nodes.find(node => node.type === 'button' && node.props['aria-label']).props.onClick();
  assert.deepEqual(calls, [['queue-play', 0]]);
  calls.length = 0;
  nodes.find(node => node.props?.className === 'pilot-entry-enter').props.onClick();
  const end = { scrollTop: 0, clientHeight: 500, scrollHeight: 500 };
  root.props.onWheel({ deltaY: 50, currentTarget: end, target: { closest: () => null } });
  assert.equal(enters.length, 2);
  root.props.onWheel({ deltaY: 50, currentTarget: { ...end, scrollHeight: 900 }, target: { closest: () => null } });
  root.props.onWheel({ deltaY: 50, currentTarget: end, target: { closest: () => null } });
  assert.equal(enters.length, 2, 'wheel inertia reaching the bottom does not dismiss the entry');
  assert.deepEqual(calls, [], 'entry dismissal never seeks, pauses, starts or resets the queue');
  audio.audioState = { tracks: [track], currentTrackIndex: 0, isPlaying: true };
  const playingEntry = Entry({ model });
  playingEntry.props.onTouchStart({ touches: [{ clientY: 500 }], currentTarget: end });
  playingEntry.props.onTouchEnd({ changedTouches: [{ clientY: 200 }] });
  assert.equal(enters.length, 3);
  assert.deepEqual(calls, []);
  playingEntry.props.onTouchStart({ touches: [{ clientY: 500 }], currentTarget: { ...end, scrollHeight: 900 } });
  playingEntry.props.onTouchEnd({ changedTouches: [{ clientY: 200 }] });
  assert.equal(enters.length, 3, 'reading entry content does not prematurely dismiss it');
});
