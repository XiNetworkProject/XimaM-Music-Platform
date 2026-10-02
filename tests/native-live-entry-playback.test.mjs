import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../synaura-app/src/screens/SwipeScreen.tsx', import.meta.url), 'utf8');
function host() {
  const track = { _id: 'a', audioUrl: 'https://example.test/a.mp3' };
  const calls = [];
  const context = {
    feedItems: [{ kind: 'track', track }], playableQueue: [track],
    activeIndexRef: { current: 0 }, lastCommittedIndexRef: { current: 0 }, gestureStartIndexRef: { current: 0 },
    flowOwnsPlaybackRef: { current: false }, lastFlowRequestedTrackRef: { current: 'old' },
    listRef: { current: { scrollToIndex: args => calls.push(['scroll', args.index]) } },
    player: { current: track, isPlaying: true, play: () => calls.push(['play']), playTrack: t => calls.push(['playTrack', t._id]) },
    setHomePreludeVisible: () => {}, setPreludeActionTrack: () => {}, setPlayingClipId: () => {}, setActiveIndex: () => {},
    useCallback: fn => fn, requestAnimationFrame: fn => fn(), playableTrackOfItem: item => item?.track,
  };
  vm.createContext(context);
  const start = source.indexOf('  const enterPreludeFlow =');
  const end = source.indexOf('  const openPreludeComments =', start);
  vm.runInContext(ts.transpile(`${source.slice(start, end)}\n globalThis.enter = enterPreludeFlow; globalThis.open = openPreludeTrack;`, { target: ts.ScriptTarget.ES2022 }), context);
  return { context, track, calls };
}

test('opening the already playing home track enables native end-of-track follow without duplicate play', () => {
  const { context, track, calls } = host();
  context.open(track);
  assert.equal(context.flowOwnsPlaybackRef.current, true);
  assert.equal(context.lastFlowRequestedTrackRef.current, null);
  assert.deepEqual(calls, [['scroll', 0]]);
});

test('entering Flow while paused resumes exactly once and enables follow', () => {
  const { context, calls } = host();
  context.player.isPlaying = false;
  context.enter();
  assert.equal(context.flowOwnsPlaybackRef.current, true);
  assert.deepEqual(calls, [['play']]);
});

function followHost({ scrolling = false, index = 0, owns = true, focused = true, requested = null, currentId = 'native-next' } = {}) {
  const calls = [];
  const start = source.indexOf('  useEffect(() => {\n    if (!isFocused || homePreludeVisible) return;');
  assert.ok(start > 0, 'native queue follow effect found');
  const end = source.indexOf('\n\n', source.indexOf('  }, [player.current?._id, loadState, feedItems,', start));
  const context = {
    isFocused: focused, homePreludeVisible: false, loadState: 'ready',
    flowOwnsPlaybackRef: { current: owns }, scrollInProgressRef: { current: scrolling },
    lastFlowRequestedTrackRef: { current: requested }, lastFlowCommitAtRef: { current: 0 },
    activeIndexRef: { current: index }, lastCommittedIndexRef: { current: index }, gestureStartIndexRef: { current: index },
    feedItems: [{ track: { _id: 'a' } }, { post: { id: 'p' } }, { track: { _id: 'reranked' } }, { track: { _id: 'native-next' } }],
    player: { current: { _id: currentId } }, playableTrackOfItem: item => item?.track,
    feedItemsRef: { current: [] }, setFeedItems: items => calls.push(['insert', Array.from(items, item => item.track?._id || 'post')]),
    setActiveIndex: value => calls.push(['active', value]), listRef: { current: { scrollToIndex: args => calls.push(['scroll', args.index]) } },
    requestAnimationFrame: fn => fn(), useEffect: fn => fn(), setTimeout,
  };
  vm.createContext(context); vm.runInContext(ts.transpile(source.slice(start, end), { target: ts.ScriptTarget.ES2022 }), context);
  return calls;
}
test('end-of-track follows the real native queue across reranked futures and context cards, without audio commands', () => {
  assert.deepEqual(followHost(), [['active', 3], ['scroll', 3]]);
});
test('native transitions do not hijack a swipe, a passive screen or an external playback source', () => {
  assert.deepEqual(followHost({ scrolling: true }), []);
  assert.deepEqual(followHost({ focused: false }), []);
  assert.deepEqual(followHost({ owns: false }), []);
  assert.deepEqual(followHost({ index: 3 }), []);
});
test('the previous native item cannot hijack entry while the requested home track is loading', () => {
  const { context, track, calls } = host();
  context.player.current = { _id: 'previous-track' };
  context.open(track);
  assert.equal(context.lastFlowRequestedTrackRef.current, 'a');
  assert.deepEqual(calls, [['scroll', 0], ['playTrack', 'a']]);
  assert.deepEqual(followHost({ requested: 'a' }), []);
});
test('a restored native queue may point to a track earlier in the reranked feed', () => {
  assert.deepEqual(followHost({ index: 2, currentId: 'a' }), [['active', 0], ['scroll', 0]]);
});
test('a real track outside the refreshed API page is inserted without resetting the native queue', () => {
  assert.deepEqual(followHost({ currentId: 'restored-track' }), [
    ['insert', ['a', 'restored-track', 'post', 'reranked', 'native-next']], ['active', 1], ['scroll', 1],
  ]);
});
