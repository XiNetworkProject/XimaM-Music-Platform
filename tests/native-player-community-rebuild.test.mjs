import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(new URL('../synaura-app/src/' + path, import.meta.url), 'utf8');

test('player chrome is unavailable over auth gates and engaged calls', () => {
  const source = read('components/NativePlayerChrome.tsx');
  for (const fragment of ['auth.loading', 'auth.mfaRequired', 'auth.biometricLocked', 'auth.user.profileComplete', 'calls.engaged']) assert.ok(source.includes(fragment), fragment);
  assert.match(read('calls/NativeCallProvider.tsx'), /engaged: Boolean\(current \|\| busy \|\| incoming\)/);
});
test('mini player keeps opening and playback as sibling controls', () => {
  const source = read('components/MiniPlayer.tsx');
  assert.match(source, /accessibilityLabel/);
  assert.match(source, /useEntryMotion/);
  assert.match(source, /togglePlayPause/);
  assert.doesNotMatch(source, /getTrackById|fetch\(/);
});
test('full player actions target root routes and protect entity-specific reads', () => {
  const source = read('components/FullPlayerModal.tsx');
  assert.match(source, /navigate\('PublicProfile'/);
  assert.match(source, /navigate\('AIStudio'/);
  assert.doesNotMatch(source, /navigate\('Tabs', \{ screen: '(PublicProfile|AIStudio)'/);
  assert.match(source, /entityRef.current/);
  assert.match(source, /if \(!animate \|\| !player.isPlaying\)/);
});
test('community lists all actual categories, paginates, and serializes a post like', () => {
  const source = read('screens/CommunityScreen.tsx');
  assert.match(source, /getCommunityPosts\('all', 1, 15\)/);
  assert.match(source, /epoch !== generation.current/);
  assert.match(source, /pendingLikes.current.has\(post.id\)/);
  assert.match(source, /onEndReached=/);
  assert.match(source, /!previous.some\(item => item.id === post.id\)/);
  assert.doesNotMatch(source, /reclassif|mockPosts|placeholderPosts/);
});
test('club replies are isolated by ID, stale results ignored, and guests are invited to sign in', () => {
  const source = read('screens/ClubDetailScreen.tsx');
  assert.match(source, /drafts.current\[id\]/);
  assert.match(source, /\[id, retry\]/);
  assert.match(source, /epoch === requestId.current/);
  assert.match(source, /onReply\(targetId\)/);
  assert.match(source, /!auth.requireAuth\(\)/);
  assert.match(source, /Se connecter pour répondre/);
  assert.match(source, /Voir plus de discussions/);
});
test('City preserves real mutations, reports no imaginary reminder, and stops background motion', () => {
  const city = read('screens/CityScreen.tsx'); const events = read('components/events/SynauraEvents.tsx');
  for (const name of ['voteSynauraCityBattle', 'participateCityEvent', 'claimCityEventReward']) assert.ok(city.includes(name));
  assert.match(city, /mutationLock.current/);
  assert.doesNotMatch(city, /Rappel activé/);
  assert.match(city, /section === 'events'/); assert.match(city, /section === 'discover'/); assert.match(city, /section === 'progress'/);
  assert.match(events, /if \(!animate\) \{ progress.stopAnimation/);
  assert.match(events, /if \(!animate\) \{ pulse.stopAnimation/);
});
test('challenge entry opens exactly its clip identity, never another source-track feed', () => {
  const source = read('screens/ChallengeDetailScreen.tsx');
  assert.match(source, /entry.contentType === 'clip' \? entry.contentId/);
  assert.match(source, /mode: 'clips', clipId/);
  assert.doesNotMatch(source, /sourceTrackIdFromHref|sourceTrackId: clipSourceTrackId/);
});
test('post page handles failures and restores failed optimistic likes', () => {
  const source = read('screens/PostDetailScreen.tsx');
  assert.match(source, /setPost\(snapshot\)/);
  assert.match(source, /request === epoch.current/);
  assert.match(source, /liking.current/);
  assert.match(source, /resizeMode="contain"/);
  assert.match(source, /kind="post"/);
});
