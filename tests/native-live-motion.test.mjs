import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(new URL('../synaura-app/src/' + path, import.meta.url),'utf8');
test('gesture-linked Live rendering stays native and does not drive musical commits', () => {
  const screen=read('screens/SwipeScreen.tsx');
  assert.match(screen, /<Animated.FlatList/);
  assert.match(screen,/Animated.event\(\[\{ nativeEvent: \{ contentOffset: \{ y: scrollOffset \}/);
  assert.match(screen,/onScroll=\{handleNativeScroll\}/);
  assert.doesNotMatch(screen,/useNativeDriver: false|Animated\.Value\(0\)\)\.current;\s*const feedProgress/);
  assert.match(screen,/onMomentumScrollEnd=\{handleMomentumScrollEnd\}/);
  assert.match(screen,/liveMotion && value.item.kind === 'track'/);
  assert.match(read('components/TrackCover.tsx'),/animatedSurface \? ViewType.TEXTURE : undefined/);
  const motion=read('components/swipe/LiveMotion.tsx');
  assert.doesNotMatch(motion,/setInterval|requestAnimationFrame|playTrack|playQueueIndex|setActiveIndex|usePlayer/);
  assert.match(motion,/extrapolate: 'clamp'/);
  assert.match(motion,/useEntryMotion\(active\)/);
});
test('atmosphere loops are bounded, native and suspended outside active playback', () => {
  const atmosphere=read('components/swipe/LiveAtmosphere.tsx');
  assert.match(atmosphere,/active && settings.dynamicBackground/);
  assert.match(atmosphere,/return \(\) => loops.forEach\(loop => loop.stop\(\)\)/);
  assert.doesNotMatch(atmosphere,/setInterval|requestAnimationFrame|Math.random|useNativeDriver: false/);
  const slide=read('components/swipe/SwipeSlide.tsx');
  assert.match(slide, /<LiveCoverMotion size=\{coverSize\} active=\{isActive && isPlaying\}/);
  assert.match(slide, /<ArtworkHalo/);
  assert.doesNotMatch(slide,/Animated.timing\(reveal/);
});
