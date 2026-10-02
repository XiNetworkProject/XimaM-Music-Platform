import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { resolveLiveEntryLayout, shouldDismissSheet } from '../synaura-app/src/components/swipe/liveLayout.ts';
const read = name => fs.readFileSync(new URL('../synaura-app/src/' + name, import.meta.url), 'utf8');

test('Live entry reserves the sticky action, navigation and safe bottom on small phones and tablets', () => {
  for (const [width, height, top, bottom] of [[320,568,24,90],[390,844,44,94],[448,997,48,98],[800,1280,32,100],[740,360,24,83]]) {
    const metrics = resolveLiveEntryLayout(height,top,bottom,width-36);
    assert.ok(metrics.coverSize >= 130 && metrics.coverSize <= 310);
    assert.ok(metrics.scrollBottom >= bottom + metrics.actionHeight + 24);
    assert.ok(height-bottom-metrics.actionHeight > top, 'primary action remains in viewport');
  }
  const source = read('components/swipe/HomeFlowPrelude.tsx');
  assert.match(source, /styles\.entryDock, \{ bottom: bottomPad/);
  assert.ok(source.indexOf('styles.entryDock') > source.lastIndexOf('</ScrollView>'), 'entry action is outside the scroller');
  assert.match(source, /paddingBottom: metrics.scrollBottom/);
});

test('sheet dismissal needs deliberate downward intent, not a tap or an upward drag', () => {
  for (const [distance, velocity] of [[0,2],[8,4],[24,1],[-100,2],[70,.2],[84,0]]) assert.equal(shouldDismissSheet(distance,velocity), false);
  assert.equal(shouldDismissSheet(85,0), true);
  assert.equal(shouldDismissSheet(30,1), true);
  const source = read('components/swipe/CommentsSheet.tsx');
  assert.match(source, /useSheetDrag\(visible, close, !peek\)/);
  assert.equal((source.match(/\.\.\.drag.panHandlers/g) || []).length, 1);
  assert.doesNotMatch(source, /<FlatList[^>]*panHandlers/);
});

test('ambience controls use the persisted native preferences and respect reduced motion', () => {
  const source = read('components/swipe/LiveAmbienceSheet.tsx');
  for (const key of ['dynamicBackground','coverVideos','reducedMotion']) assert.ok(source.includes(key));
  assert.match(source, /await updateSettings/);
  assert.doesNotMatch(source, /setQueue|seekTo|\.play\(|\.pause\(/);
  assert.match(read('components/swipe/LiveAtmosphere.tsx'), /active && settings.dynamicBackground/);
  assert.match(read('components/entry/EntryPressable.tsx'), /if \(!motion\) return/);
});

test('entry renders the cover behind the interactive aura, not on top of it', () => {
  const source = read('components/swipe/HomeFlowPrelude.tsx');
  assert.ok(source.indexOf('<LiveAtmosphere') < source.indexOf('<EntryAtmosphere transparent'));
  assert.match(read('components/entry/EntryAtmosphere.tsx'), /if \(inherited !== undefined\) return/);
});

test('the real CommentsSheet binding keeps A when the native player and feed advance to B', async () => {
  const source = read('screens/SwipeScreen.tsx');
  const start = source.indexOf('      <CommentsSheet');
  const end = source.indexOf('      />', start) + '      />'.length;
  const a = { _id: 'a', commentsCount: 7 }, b = { _id: 'b', commentsCount: 99 };
  const calls = [];
  const context = {
    React: { createElement: (_type, props) => props }, CommentsSheet: () => {}, commentsOpen: true,
    commentTarget: { track: a, clip: null }, activeTrack: b, activeClip: null, preludeActionTrack: null,
    commentsCounts: { a: 8, b: 99 }, commentTimestamp: null, clipInteractionKey: id => 'clip:' + id,
    player: { current: b, playTrack: async track => calls.push(['play',track._id]), seekTo: seconds => calls.push(['seek',seconds]) },
    setCommentsOpen: () => {}, setPreludeActionTrack: () => {}, setCommentsCounts: fn => { context.counts = fn({}); },
  };
  vm.createContext(context);
  vm.runInContext(ts.transpile('globalThis.props = (' + source.slice(start,end) + ');', { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 }),context);
  assert.equal(context.props.track, a);
  assert.equal(context.props.commentCount, 8);
  assert.equal(context.props.clip, null);
  assert.deepEqual(calls, [], 'opening remains passive');
  context.props.onSeek(42);
  await Promise.resolve();
  assert.deepEqual(calls, [['play','a'],['seek',42]], 'an explicit timestamp still targets A');
  context.props.onCountChange('a',9);
  assert.equal(context.counts.a,9);
  assert.equal(context.counts.b,undefined);
});
