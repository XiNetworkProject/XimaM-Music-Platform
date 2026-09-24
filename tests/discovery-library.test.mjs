import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import postcss from 'postcss';
import * as model from '../lib/discoverLibrary.ts';

const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
function compile(path, mocks, globals = {}, extra = '') {
  const module = { exports: {} };
  const code = ts.transpileModule(read(path) + extra, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(id => id in mocks ? mocks[id] : require(id), module, module.exports, ...Object.values(globals));
  return module.exports;
}
const main = 'components/discover/DiscoveryLibrary.tsx';
const data = 'components/discover/useDiscoveryData.ts';
const cards = 'components/discover/DiscoveryCards.tsx';
const nodes = tree => {
  const result = [];
  function walk(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); result.push(node); walk(node.props?.children); }
  walk(tree); return result;
};

test('discovery normalizes URL input and supports every real catalogue surface', () => {
  assert.deepEqual(model.discoveryView(new URLSearchParams('tab=bad&sort=bad&q=%20test%20')), { tab: 'explore', sort: 'trending', query: 'test', genre: '' });
  for (const tab of model.DISCOVERY_TABS) assert.equal(model.discoveryView(new URLSearchParams({ tab })).tab, tab);
  const long = model.discoveryView(new URLSearchParams({ q: 'q'.repeat(200), genre: 'g'.repeat(200), sort: 'newest' }));
  assert.equal(long.query.length, 120); assert.equal(long.genre.length, 40); assert.equal(long.sort, 'newest');
  assert.equal(model.searchFilter('explore'), 'all'); assert.equal(model.searchFilter('newest'), 'tracks');
});

test('sound and artist pagination use separate real continuation flags, never a fabricated loop', () => {
  const page = { page: 2, nextPage: 3, hasMore: true, profilePage: 1, nextProfilePage: 2, hasMoreProfiles: false };
  assert.equal(model.discoveryNextPage(page), 3); assert.equal(model.discoveryNextPage(page, true), undefined);
  assert.equal(model.discoveryNextPage({ ...page, hasMoreProfiles: true }, true), 2);
  for (const nextPage of [2, 1, -1, NaN, Infinity, 3.5, '3']) assert.equal(model.discoveryNextPage({ ...page, nextPage }), undefined);
  assert.equal(model.discoveryNextPage({ ...page, hasMore: false }), undefined);
  const path = new URL(model.discoveryPageUrl(3, 'newest', 'R&B', true), 'http://localhost');
  assert.equal(path.pathname, '/api/discover'); assert.equal(path.searchParams.get('category'), 'R&B');
  assert.equal(path.searchParams.get('page'), '3'); assert.equal(path.searchParams.get('profilePage'), '3');
  assert.equal(path.searchParams.get('limit'), '24');
});

test('post cursors stop at end or repeated cursor; catalogue items remain unique and in API order', () => {
  assert.equal(model.postsNextCursor({ hasMore: true, nextCursor: 'new' }, 'old'), 'new');
  for (const page of [{ hasMore: false, nextCursor: 'new' }, { hasMore: true, nextCursor: null }, { hasMore: true, nextCursor: 'old' }]) assert.equal(model.postsNextCursor(page, 'old'), undefined);
  assert.deepEqual(model.uniqueItems([{ id: 'a', v: 1 }, { id: 'b' }, { id: 'a', v: 2 }, { id: '' }], item => item.id), [{ id: 'a', v: 1 }, { id: 'b' }]);
});

test('post images retain attached covers and repost media; playlist links stay within the app', () => {
  assert.equal(model.postArtwork({ image_url: '/photo', track: { cover_url: '/cover' } }), '/photo');
  assert.equal(model.postArtwork({ track: { cover_video_poster_url: '/poster' } }), '/poster');
  assert.equal(model.postArtwork({ original_post: { track: { cover_url: '/original' } } }), '/original');
  assert.equal(model.postArtwork({}), undefined);
  assert.equal(model.playlistHref({ _id: 'a', publicUrl: '/playlists/editorial' }), '/playlists/editorial');
  for (const publicUrl of ['https://external.test', '//external.test', 'javascript:alert(1)']) assert.equal(model.playlistHref({ _id: 'a/b', publicUrl }), '/playlists/a%2Fb');
});

function playbackHarness() {
  const calls = [];
  const audio = { audioState: { tracks: [], currentTrackIndex: 0, isPlaying: false },
    setQueueAndPlay: (tracks, index) => calls.push(['queue', tracks.map(t => t._id), index]), pause: () => calls.push(['pause']), play: () => calls.push(['play']) };
  const exports = compile(cards, {
    '@/app/providers': { useAudioPlayer: () => audio }, '@/components/actions/useTrackActions': { useTrackActions: () => ({ open() {} }) },
    '@/components/profile/useProfilePeek': { useProfilePeek: () => () => {} }, '@/components/comments/useCommentsSurface': { useCommentsSurface: () => () => {} },
    '@/components/TrackCover': {}, '@/components/pilot/PilotImage': {}, '@/components/pilot/PilotLink': {}, '@/lib/discoverLibrary': model,
  });
  return { audio, calls, ...exports };
}

test('catalogue playback never starts on render and explicit selection plays the correct filtered queue once', () => {
  const h = playbackHarness();
  const queue = [{ _id: 'no-audio' }, { _id: 'a', audioUrl: '/a.mp3' }, { _id: 'b', audioUrl: '/b.mp3' }];
  const control = h.useDiscoveryPlayback(queue[2], queue);
  assert.deepEqual(h.calls, []); control.toggle(); assert.deepEqual(h.calls, [['queue', ['a', 'b'], 1]]);
  h.calls.length = 0; h.useDiscoveryPlayback(queue[0], queue).toggle(); h.useDiscoveryPlayback(undefined, queue).toggle(); assert.deepEqual(h.calls, []);
});

test('the current song pauses/resumes in place, without replacing the queue', () => {
  const h = playbackHarness(); const track = { _id: 'a', audioUrl: '/a.mp3' };
  h.audio.audioState = { tracks: [track], currentTrackIndex: 0, isPlaying: true };
  const playing = h.useDiscoveryPlayback(track, [track]); assert.equal(playing.playing, true); playing.toggle();
  h.audio.audioState.isPlaying = false; h.useDiscoveryPlayback(track, [track]).toggle(); assert.deepEqual(h.calls, [['pause'], ['play']]);
});

test('queries are session-scoped, cached, cancellable, and disabled when not needed', async () => {
  let session = { data: { user: { id: 'member-a' } }, status: 'authenticated' };
  const requests = [];
  const hooks = compile(data, {
    '@tanstack/react-query': { useQuery: options => options, useInfiniteQuery: options => options },
    'next-auth/react': { useSession: () => session }, '@/lib/discoverLibrary': model,
  }, { fetch: async (path, options) => { requests.push([path, options]); return { ok: true, json: async () => ({ tracks: [] }) }; } });
  const q = hooks.useDiscoveryQuery('/api/search?query=real', false);
  assert.equal(q.enabled, false); assert.equal(q.staleTime, 300000); assert.equal(q.refetchOnWindowFocus, false);
  assert.equal(q.queryKey[1], 'member-a');
  const controller = new AbortController(); await q.queryFn({ signal: controller.signal });
  assert.equal(requests[0][1].signal, controller.signal);
  session = { data: null, status: 'loading' }; assert.equal(hooks.useDiscoveryCatalogue('trending', '', false, true).enabled, false);
  session.status = 'unauthenticated'; assert.equal(hooks.useDiscoveryPosts(true).queryKey[1], 'guest');
  const artists = hooks.useDiscoveryCatalogue('trending', '', true, true);
  await artists.queryFn({ pageParam: 2, signal: controller.signal }); assert.match(requests.at(-1)[0], /profilePage=2/);
  const posts = hooks.useDiscoveryPosts(true); await posts.queryFn({ pageParam: 'a+b', signal: controller.signal }); assert.match(requests.at(-1)[0], /cursor=a%2Bb/);
});

test('failed public requests produce a recoverable error and do not render arbitrary response bodies', async () => {
  const { fetchDiscovery } = compile(data, { '@tanstack/react-query': {}, 'next-auth/react': {}, '@/lib/discoverLibrary': model }, { fetch: async () => ({ ok: false, json: () => assert.fail('must not consume error body') }) });
  await assert.rejects(fetchDiscovery('/api/discover', new AbortController().signal), /Impossible de charger/);
});

function moreHarness() {
  const state = [], effects = [], observers = []; let cursor = 0, loads = 0;
  class Observer { constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } }
  const react = { useRef: () => ({ current: {} }), useState: initial => { const slot = cursor++; if (!(slot in state)) state[slot] = initial; return [state[slot], value => { state[slot] = typeof value === 'function' ? value(state[slot]) : value; }]; }, useEffect: callback => effects.push(callback) };
  const { More } = compile(main, {
    react, 'next/navigation': {}, '@/components/ambient/useLivingMotion': {}, '@/components/ambient/ExperienceMotionFrame': {},
    '@/components/pilot/PilotImage': {}, '@/components/pilot/PilotLink': {}, '@/lib/discoverMoods': {}, '@/lib/discoverLibrary': model,
    './DiscoveryCards': {}, './useDiscoveryData': {}, './discovery-library.css': {},
  }, { window: { IntersectionObserver: Observer }, IntersectionObserver: Observer }, '\nexport { More };');
  let cleanups = [];
  const render = (props = {}) => { cleanups.forEach(fn => fn?.()); cleanups = []; effects.length = 0; cursor = 0;
    const tree = More({ hasMore: true, busy: false, error: false, count: 24, load: () => { loads++; }, ...props }); cleanups = effects.map(fn => fn()); return tree; };
  return { render, observers, state, loads: () => loads };
}

test('progressive loading needs one user gesture, pauses while busy/error, has a finite automatic budget', () => {
  const h = moreHarness(); const initial = h.render(); assert.equal(h.loads(), 0); assert.equal(h.observers.length, 0);
  nodes(initial).find(n => n.type === 'button').props.onClick(); assert.equal(h.loads(), 1);
  h.render({ busy: true }); assert.equal(h.observers.length, 0);
  h.render({ error: true }); assert.equal(h.observers.length, 0);
  h.render({ hasMore: false }); assert.equal(h.observers.length, 0);
  for (let i = 0; i < 3; i++) { h.render(); const observer = h.observers.at(-1); observer.callback([{ isIntersecting: true }]); assert.equal(observer.disconnected, true); }
  h.render(); assert.equal(h.loads(), 4); assert.equal(h.state[1], 0); assert.equal(h.observers.length, 3);
  const retry = h.render({ error: true }); assert.ok(nodes(retry).find(n => n.props?.role === 'alert')); assert.ok(nodes(retry).find(n => n.type === 'button'));
});

test('new sections are lazy, cards have no data queries and browsing creates no new audio owner', () => {
  assert.match(read(main), /<Deferred><FreshSection/); assert.match(read(main), /<Deferred><PostsSection/); assert.match(read(main), /<Deferred><PlaylistSection/);
  assert.match(read(main), /search.length >= 2/); assert.match(read(main), /clearTimeout\(timer\)/);
  assert.doesNotMatch(read(cards), /\bfetch\(|useQuery|useInfiniteQuery|useEffect/);
  for (const path of [main, cards, data]) assert.doesNotMatch(read(path), /new Audio\b|<audio\b|AudioPlayerProvider|\b(?:db|dbAdmin|supabase)\.from\(|localStorage|setInterval/);
  assert.match(read(main), /new URLSearchParams\(pendingParams.current \?\? params.toString\(\)\)/, 'preserve Live return and compose in-flight actions');
  assert.match(read(cards), /animationEnabled=\{hovered \|\| playing\}/);
});

test('playlist search strips legacy metadata, never presents a JSON header as user copy', () => {
  assert.equal(model.playlistDescription({ description: '<!--SYNAURA_COLLECTION:{"subtitle":"Une sélection"}-->' }), 'Une sélection');
  assert.equal(model.playlistDescription({ description: '<!--SYNAURA_COLLECTION:{"subtitle":"Une sélection"}-->\nDescription humaine' }), 'Description humaine');
  assert.equal(model.playlistDescription({ description: '<!--SYNAURA_COLLECTION:invalid-->' }), '');
  assert.equal(model.playlistDescription({ description: 'Une vraie playlist' }), 'Une vraie playlist');
});

test('rapid category then search changes compose correctly, preserving Live return without a history push', () => {
  const source = ts.createSourceFile(main, read(main), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration;
  const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'update') declaration = node; ts.forEachChild(node, visit); }; visit(source);
  const code = ts.transpileModule(`const ${declaration.getText(source)}; return update;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const changes = [], pendingParams = { current: null };
  const update = new Function('useCallback', 'pendingParams', 'params', 'pathname', 'router', code)(fn => fn, pendingParams, new URLSearchParams('tab=playlists&liveReturn=live-qa-safe'), '/discover', { replace: (...args) => changes.push(args) });
  update({ tab: null }); update({ q: 'Synaura' });
  assert.deepEqual(changes.at(-1), ['/discover?liveReturn=live-qa-safe&q=Synaura', { scroll: false }]);
});

test('discovery styles stay scoped, preserve mobile safe areas and honor motion/accessibility preferences', () => {
  const css = read('components/discover/discovery-library.css');
  postcss.parse(css).walkRules(rule => { if (rule.parent.type === 'atrule' && rule.parent.name === 'keyframes') return; for (const selector of rule.selectors) assert.ok(selector.includes('.discovery'), selector); });
  for (const required of ['prefers-reduced-motion:reduce', 'data-motion=false', 'animation-play-state:paused', 'env(safe-area-inset-bottom', ':focus-visible', 'scroll-margin-top:68px']) assert.ok(css.includes(required), required);
  assert.doesNotMatch(css, /overflow-y:\s*(auto|scroll)/, 'no nested vertical scrolling');
  assert.doesNotMatch(css, /nth-child[^}]*display:none/, 'do not hide real result cards at breakpoints');
});
