import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import postcss from 'postcss';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
function moduleFrom(source, imports = {}, globals = {}) {
  const module = { exports: {} };
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, URLSearchParams, AbortController, AbortSignal, setTimeout, clearTimeout,
    require: (name) => { if (name in imports) return imports[name]; throw new Error(`Unexpected import ${name}`); }, ...globals });
  return module.exports;
}
const clubs = moduleFrom(read('lib/communityClubs.ts'));
const feed = moduleFrom(read('lib/communityFeed.ts'), { './communityClubs': clubs });
const plain = (value) => JSON.parse(JSON.stringify(value));

test('community filters retain canonical clubs and never reclassify historical posts', () => {
  assert.deepEqual(plain(feed.COMMUNITY_FILTERS.map((f) => f.category)), ['all', 'feedback', 'collab', 'remix', 'ai_prompt']);
  assert.equal(feed.communityCategory('question'), 'question');
  assert.equal(feed.communityCategoryLabel('question'), 'Questions');
  assert.equal(feed.communityCategoryLabel('suggestion'), 'Suggestions');
  assert.equal(feed.communityCategory('unexpected'), 'all');
  for (const club of clubs.COMMUNITY_CLUBS) assert.equal(clubs.composeHref(club), `/community/forum/new?category=${club.category}`);
});

test('feed queries whitelist categories/sort, bound search and normalize pagination', () => {
  for (const page of [NaN, Infinity, -5, 0]) assert.equal(feed.communityFeedParams('all', '', 'bad', page).get('page'), '1');
  const params = feed.communityFeedParams('question', '  vrai son  ', 'popular', 2.8);
  assert.deepEqual(Object.fromEntries(params), { limit: '15', page: '2', sort: 'popular', category: 'question', search: 'vrai son' });
  assert.equal(feed.communityFeedParams('invalid', 'x'.repeat(200), 'most_replied').get('search').length, 120);
  assert.equal(feed.communityFeedParams('all', '', 'recent').has('category'), false);
});

test('pagination merges stable IDs and participants are unique actual authors', () => {
  const posts = feed.mergeCommunityPosts([{ id: 'a', title: 'old' }], [{ id: 'a', title: 'updated' }, { id: 'b' }, {}, null]);
  assert.deepEqual(plain(posts), [{ id: 'a', title: 'updated' }, { id: 'b' }]);
  assert.deepEqual(plain(feed.communityParticipants([{ author: { username: 'sam' } }, { author: { username: 'sam' } }, {}, { author: { username: 'lea' } }])), [{ username: 'sam' }, { username: 'lea' }]);
  assert.equal(feed.communityDate('invalid'), '');
  assert.equal(feed.communityPostHref('a/b'), '/community/forum/a%2Fb');
  assert.equal(feed.communityPostHref('a/b', true), 'https://synaura.fr/community/forum/a%2Fb');
});

// Execute the real hook with isolated hook state and explicitly controlled requests.
function hookHarness({ environment = 'production' } = {}) {
  let index = 0, dirty = true, effects = [], args = ['all', '', 'recent'], value;
  const slots = [], requests = [];
  const equal = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) { const i = index++; if (!slots[i]) slots[i] = { value: initial }; return [slots[i].value, (next) => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; dirty = true; }]; },
    useRef(initial) { const i = index++; return slots[i] ||= { current: initial }; },
    useCallback(fn, deps) { const i = index++; if (!equal(slots[i]?.deps, deps)) slots[i] = { deps, fn }; return slots[i].fn; },
    useEffect(fn, deps) { const i = index++; if (!equal(slots[i]?.deps, deps)) { const previous = slots[i]; slots[i] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  const hook = moduleFrom(read('components/community/useCommunityFeed.ts'), { react, '@/lib/communityFeed': feed }, {
    process: { env: { NODE_ENV: environment } }, fetch: (url, options) => new Promise((resolve, reject) => requests.push({ url, options, resolve, reject })),
  }).useCommunityFeed;
  function render() { let guard = 0; while (dirty && guard++ < 12) { dirty = false; index = 0; value = hook(...args); const pending = effects; effects = []; pending.forEach((fn) => fn()); } return value; }
  const flush = async () => { for (let i = 0; i < 8; i++) { await Promise.resolve(); if (dirty) render(); } return value; };
  const respond = async (request, posts, pages = 1, status = 200) => { request.resolve({ ok: status < 400, status, json: async () => ({ posts, pagination: { totalPages: pages } }) }); return flush(); };
  render();
  return { requests, render, flush, respond, get value() { return value; }, switch: (...next) => { args = next; dirty = true; return render(); }, unmount: () => slots.forEach((slot) => slot?.cleanup?.()) };
}

test('rapid A/B/C filter changes abort earlier requests and ignore stale responses', async () => {
  const h = hookHarness();
  const a = h.requests[0];
  h.switch('feedback', '', 'recent'); const b = h.requests[1];
  h.switch('collab', '', 'recent'); const c = h.requests[2];
  assert.equal(a.options.signal.aborted, true); assert.equal(b.options.signal.aborted, true);
  await h.respond(c, [{ id: 'C' }]); await h.respond(b, [{ id: 'B' }]); await h.respond(a, [{ id: 'A' }]);
  assert.deepEqual(plain(h.value.posts), [{ id: 'C' }]);
  assert.equal(h.requests.length, 3); h.unmount();
});

test('changing filters hides preceding posts before replacement data arrives', async () => {
  const h = hookHarness(); await h.respond(h.requests[0], [{ id: 'A' }]);
  h.switch('remix', 'different', 'popular');
  assert.equal(h.value.posts.length, 0); assert.equal(h.value.loading, true); h.unmount();
});

test('viewer change clears previous personalized likes and private track data', async () => {
  const h = hookHarness(); h.switch('all', '', 'recent', 'viewer-A');
  await h.respond(h.requests[1], [{ id: 'A', is_liked: true, track: { id: 'private' } }]);
  h.switch('all', '', 'recent', 'viewer-B');
  assert.equal(h.value.posts.length, 0); assert.equal(h.value.loading, true);
  assert.equal(h.requests[2].url.includes('viewer-'), false);
  await h.respond(h.requests[2], [{ id: 'A', is_liked: false, track: null }]);
  assert.equal(h.value.posts[0].track, null); h.unmount();
});

test('load more deduplicates, failure preserves prior page and retry targets only failed page', async () => {
  const h = hookHarness(); await h.respond(h.requests[0], [{ id: 'A' }], 3);
  h.value.loadMore(); await h.flush(); await h.respond(h.requests[1], [], 0, 500);
  assert.equal(h.value.error, true); assert.equal(h.value.page, 1); assert.equal(h.value.posts[0].id, 'A');
  h.value.retry(); await h.flush(); assert.match(h.requests[2].url, /page=2/);
  await h.respond(h.requests[2], [{ id: 'A' }, { id: 'B' }], 2);
  assert.deepEqual(plain(h.value.posts.map((p) => p.id)), ['A', 'B']); assert.equal(h.value.hasMore, false);
  h.value.loadMore(); assert.equal(h.requests.length, 3); h.unmount();
});

test('production never falls back to public preview and errors are not represented as an empty success', async () => {
  const h = hookHarness(); await h.respond(h.requests[0], [], 0, 500);
  assert.equal(h.requests.length, 1); assert.equal(h.value.error, true); assert.equal(h.value.loading, false); assert.equal(h.value.publicPreview, false); h.unmount();
});

test('development fallback is explicitly read-only and only follows server failures', async () => {
  const h = hookHarness({ environment: 'development' }); await h.respond(h.requests[0], [], 0, 500);
  assert.match(h.requests[1].url, /^\/api\/dev\/community-preview\?/);
  await h.respond(h.requests[1], [{ id: 'public' }]); assert.equal(h.value.publicPreview, true); h.unmount();
  const unauthorized = hookHarness({ environment: 'development' }); await unauthorized.respond(unauthorized.requests[0], [], 0, 401);
  assert.equal(unauthorized.requests.length, 1); assert.equal(unauthorized.value.error, true); unauthorized.unmount();
});

test('unmount aborts work and completed warm renders do not refetch', async () => {
  const h = hookHarness(); await h.respond(h.requests[0], [{ id: 'A' }]); h.render(); h.render();
  assert.equal(h.requests.length, 1); h.unmount(); assert.equal(h.requests[0].options.signal.aborted, true);
});

function preview(environment, fetch) {
  class NextResponse { constructor(body, init) { this.body = body; this.status = init.status; } static json(body, init) { return { body, ...init }; } }
  return moduleFrom(read('app/api/dev/community-preview/route.ts'), { 'next/server': { NextResponse }, '@/lib/communityFeed': feed }, { fetch, process: { env: { NODE_ENV: environment } } });
}
const request = (query = '') => ({ nextUrl: new URL(`http://localhost/api/dev/community-preview?${query}`), signal: new AbortController().signal, headers: { cookie: 'must-not-forward' } });
test('preview is unavailable in production before any outbound access and exposes GET only', async () => {
  const route = preview('production', () => assert.fail('Network forbidden'));
  assert.deepEqual(Object.keys(route), ['GET']); assert.equal((await route.GET(request())).status, 404);
});
test('preview uses a fixed public host, forwards no identity and sanitizes query', async () => {
  let outbound;
  const route = preview('development', async (url, options) => { outbound = { url, options }; return { ok: true, json: async () => ({ posts: [{ id: 'public' }], pagination: {}, ignored: 'not-forwarded' }) }; });
  const result = await route.GET(request('url=https://evil.example&category=question&sort=invalid&token=secret'));
  const url = new URL(outbound.url); assert.equal(url.origin, 'https://synaura.fr'); assert.equal(url.pathname, '/api/community/posts');
  assert.equal(url.searchParams.has('token'), false); assert.equal(url.searchParams.get('sort'), 'recent');
  assert.deepEqual(plain(outbound.options.headers), { Accept: 'application/json' }); assert.equal(outbound.options.method, 'GET');
  assert.equal('credentials' in outbound.options, false); assert.equal(result.headers['Cache-Control'], 'no-store'); assert.equal('ignored' in result.body, false);
});

const hub = read('components/community/CommunityHub.tsx');
const component = hub.slice(hub.indexOf('function DiscussionCard'), hub.indexOf('export default function'));
function cardHarness({ signedIn = true, publicPreview = false, liked = false, current = false, playing = false, success = true } = {}) {
  const states = [], calls = [], refs = [];
  const react = { useState: (initial) => { const i = states.length; states.push(initial); return [initial, (next) => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; }, useRef: (value) => { const ref = { current: value }; refs.push(ref); return ref; }, useEffect: () => {} };
  const jsx = (type, props) => ({ type, props });
  const icons = Object.fromEntries(['Heart', 'Play', 'Pause', 'MessageCircle', 'Check', 'Share2'].map((name) => [name, name]));
  const globals = { ...react, ...icons, ...feed, Link: 'a', Avatar: 'Avatar', TrackCover: 'TrackCover',
    useSession: () => ({ data: signedIn ? { user: { id: 'test-user' } } : null }),
    useAudioPlayer: () => ({ audioState: { tracks: current ? [{ _id: 'track-A' }] : [], currentTrackIndex: 0, isPlaying: playing }, setQueueAndPlay: (...args) => calls.push(['queue', ...args]), play: () => calls.push(['play']), pause: () => calls.push(['pause']) }),
    notify: { info: (...args) => calls.push(['info', ...args]), error: (...args) => calls.push(['error', ...args]) },
    fetch: async (...args) => { calls.push(['fetch', ...args]); return { ok: success }; },
  };
  const render = moduleFrom(`${component}\nexports.render = DiscussionCard;`, { 'react/jsx-runtime': { jsx, jsxs: jsx } }, globals).render;
  const tree = render({ publicPreview, post: { id: 'post-A', title: 'Test post', content: 'A real fixture', category: 'question', is_liked: liked, likes_count: 4, track: { id: 'track-A', audioUrl: '/test.mp3', title: 'Test track' } } });
  const nodes = [];
  function visit(node) { if (!node) return; if (Array.isArray(node)) return node.forEach(visit); if (typeof node === 'object') { nodes.push(node); visit(node.props?.children); } }
  visit(tree);
  return { calls, states, like: nodes.find((n) => n.props?.['aria-pressed'] !== undefined), play: nodes.find((n) => n.props?.className === 'community-track-play') };
}
test('cards do no audio mutation or per-card query on render; Play exclusively uses AudioCore', () => {
  const card = cardHarness(); assert.deepEqual(card.calls, []); card.play.props.onClick();
  assert.equal(card.calls.length, 1); assert.equal(card.calls[0][0], 'queue'); assert.equal(card.calls[0][1][0]._id, 'track-A');
  const active = cardHarness({ current: true, playing: true }); active.play.props.onClick(); assert.deepEqual(active.calls, [['pause']]);
  const paused = cardHarness({ current: true }); paused.play.props.onClick(); assert.deepEqual(paused.calls, [['play']]);
});
test('preview and anonymous reactions cannot write', async () => {
  const previewCard = cardHarness({ publicPreview: true }); assert.equal(previewCard.like.props.disabled, true); await previewCard.like.props.onClick(); assert.deepEqual(previewCard.calls, []);
  const guest = cardHarness({ signedIn: false }); await guest.like.props.onClick(); assert.equal(guest.calls[0][0], 'info'); assert.equal(guest.calls.some((c) => c[0] === 'fetch'), false);
});
test('like/unlike call the existing endpoints once and count only successful writes', async () => {
  const card = cardHarness(); await Promise.all([card.like.props.onClick(), card.like.props.onClick()]);
  assert.equal(card.calls.length, 1); assert.equal(card.calls[0][1], '/api/community/posts/likes'); assert.equal(card.calls[0][2].method, 'POST'); assert.equal(card.states[1], 5);
  const liked = cardHarness({ liked: true }); await liked.like.props.onClick(); assert.equal(liked.calls[0][2].method, 'DELETE'); assert.equal(liked.states[1], 3);
  const failed = cardHarness({ success: false }); await failed.like.props.onClick(); assert.equal(failed.states[1], 4); assert.equal(failed.states[0], false); assert.equal(failed.calls[1][0], 'error');
});

test('hub uses actual content and existing destinations, with no fabricated social proof', () => {
  for (const fragment of ['orderedClubs.map', 'composeHref(club)', 'communityParticipants(feed.posts)', 'post.content', 'post.author', 'post.track', 'communityPostHref(post.id', 'feed.loadMore', 'feed.retry']) assert.ok(hub.includes(fragment), fragment);
  assert.doesNotMatch(hub, /new Audio\(|<audio|<video|personnes en ligne|membres connectés|Math.random\(/);
  for (const href of ['/messages?tab=contacts', '/city', '/posts', '/community/faq', '/partnerships']) assert.ok(hub.includes(`href="${href}"`), href);
  assert.match(read('app/community/page.tsx'), /<CommunityHub\s*\/>/);
  assert.match(read('app/community/forum/page.tsx'), /<CommunityHub forum\s*\/>/);
});
test('responsive skin stays local, keyboard visible and motion respects accessibility preferences', () => {
  const css = read('components/community/community-hub.css');
  postcss.parse(css).walkRules((rule) => { if (rule.parent.type !== 'atrule' || rule.parent.name !== 'keyframes') assert.ok(rule.selectors.every((s) => s.startsWith('.synaura-chambre .community-hub')), rule.selector); });
  for (const marker of [':focus-visible', 'prefers-reduced-motion: reduce', "data-motion='false'", 'max-width: 540px', 'max-width: 800px']) assert.ok(css.includes(marker), marker);
  assert.doesNotMatch(css, /overflow-y:\s*(auto|scroll)/);
  assert.match(hub, /aria-label="Rechercher dans les discussions"/);
  assert.match(hub, /role="alert"/); assert.match(hub, /aria-busy=\{feed.loading\}/);
});
