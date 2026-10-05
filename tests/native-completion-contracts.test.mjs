import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CLIP_MIN_SECONDS, CLIP_MAX_SECONDS, CLIP_MAX_BYTES, clipDurationValid, pickerDurationSeconds, requireClipDuration } from '../synaura-app/src/clips/clipPolicy.ts';
import { MUSIC_CLIP_MIN_SECONDS, MUSIC_CLIP_MAX_SECONDS, MUSIC_CLIP_MAX_BYTES } from '../lib/clipLimits.ts';
import { planCharge, annualSaving, isStripeCheckout } from '../synaura-app/src/subscriptions/planModel.ts';
import { WHEEL_SEGMENTS, wheelArc, wheelLanding, readSpinOutcome, remainingLabel } from '../synaura-app/src/boosters/boosterModel.ts';
import { WHEEL_SEGMENTS as webSegments } from '../components/boosters/wheelModel.ts';
const read = path => fs.readFileSync(path, 'utf8');
test('native clip contract exactly mirrors the real publication and SSD limits', () => {
  assert.deepEqual([CLIP_MIN_SECONDS, CLIP_MAX_SECONDS, CLIP_MAX_BYTES], [MUSIC_CLIP_MIN_SECONDS, MUSIC_CLIP_MAX_SECONDS, MUSIC_CLIP_MAX_BYTES]);
  for (const seconds of [15, 60, 180, 240]) assert.equal(requireClipDuration(seconds), seconds);
  for (const seconds of [0, NaN, Infinity, 14.99, 240.01]) { assert.equal(clipDurationValid(seconds), false); assert.throws(() => requireClipDuration(seconds)); }
  assert.equal(pickerDurationSeconds(240000), 240);
  assert.equal(pickerDurationSeconds(800), .8); // must not reinterpret a subsecond video as 800 seconds
  assert.equal(pickerDurationSeconds(null), 0);
  const queue = read('synaura-app/src/clips/ClipUploadProvider.tsx');
  assert.match(queue, /duration: requireClipDuration\(input.duration\)/);
  assert.doesNotMatch(queue, /Math\.min\(60/);
});
test('plans never present an absent paid price as a free plan or invent annual savings', () => {
  const plan = { id: 'pro', priceMonthly: 10, priceYearly: 100 };
  assert.equal(planCharge(plan, 'year'), 100); assert.equal(annualSaving(plan), 17);
  assert.equal(planCharge({ ...plan, priceYearly: NaN }, 'year'), null);
  assert.equal(planCharge({ ...plan, priceMonthly: 0 }, 'month'), null);
  assert.equal(annualSaving({ ...plan, priceYearly: 150 }), null);
  assert.equal(isStripeCheckout('https://checkout.stripe.com/c/pay/a'), true);
  for (const url of ['http://checkout.stripe.com/a', 'https://checkout.stripe.com.evil.test/a', 'https://a:b@checkout.stripe.com/a', 'javascript:alert(1)']) assert.equal(isStripeCheckout(url), false);
});
test('native wheel matches web weighted sectors and lands exactly on server outcome', () => {
  assert.deepEqual(WHEEL_SEGMENTS.map(({ key, kind, weight }) => ({ key, kind, weight })), webSegments.map(({ key, kind, weight }) => ({ key, kind, weight })));
  assert.equal(WHEEL_SEGMENTS.reduce((sum, item) => sum + item.weight, 0), 100);
  WHEEL_SEGMENTS.forEach((segment, index) => {
    const outcome = { index, resultKey: segment.key, reward: { kind: segment.kind, label: segment.label } };
    assert.equal(readSpinOutcome(outcome), outcome);
    assert.ok(Math.abs((wheelLanding(index) + wheelArc(index).middle) % 360) < .00001);
  });
  assert.throws(() => readSpinOutcome({ index: 1, resultKey: 'credits_25', reward: { kind: 'credits', label: '+25' } }));
  assert.throws(() => readSpinOutcome(null)); assert.throws(() => readSpinOutcome({ index: 99 }));
  assert.equal(remainingLabel(1), '1 min'); assert.equal(remainingLabel(0), 'Disponible'); assert.equal(remainingLabel(NaN), 'Horaire indisponible');
});
test('booster transports preserve cookie sessions and use verified mobile identity, never body userId', () => {
  for (const route of ['boosters', 'boosters/targets', 'boosters/history', 'boosters/my-active', 'daily-spin']) {
    const source = read('app/api/' + route + '/route.ts');
    assert.match(source, /getApiSession\(request\)/, route);
  }
  const http = read('lib/boosters/http.ts');
  assert.match(http, /request \? await getApiSession\(request\) : await getServerSession\(authOptions\)/);
  assert.match(http, /const userId = session.user.id/);
  assert.match(http, /withDatabaseTransaction\(\(db\) => operation\(db, userId\)\)/);
  for (const route of ['boosters/open', 'boosters/use', 'boosters/claim-pack', 'daily-spin']) {
    const source = read('app/api/' + route + '/route.ts');
    assert.match(source, /boosterMutation/); assert.match(source, /,\s*request\s*\)/);
    assert.doesNotMatch(source, /body\??\.userId/);
  }
});
test('new editors avoid duplicate publish, hidden crop and silent one-minute truncation', () => {
  const post = read('synaura-app/src/screens/CreatePostScreen.tsx');
  assert.match(post, /lock.current = true/); assert.match(post, /usePreventRemove/);
  assert.match(post, /mimeType/); assert.match(post, /editable=\{!busy\}/);
  const clip = read('synaura-app/src/screens/ClipComposerScreen.tsx');
  assert.match(clip, /resizeMode="contain"/); assert.match(clip, /!previewPlaying \|\| !focused \|\| callLocked/);
  assert.match(clip, /sourceRequestRef.current\+\+/); assert.match(clip, /accessibilityActions/);
});
test('stats fail explicitly when endpoints fail instead of displaying invented zeros', () => {
  const api = read('synaura-app/src/api/client.ts');
  assert.match(api, /if \(!tracksPayload \|\| !trackSeries \|\| !posts \|\| !audience \|\| !heatmapPayload/);
  const links = read('synaura-app/src/navigation/internalLinks.ts');
  assert.match(links, /root === 'boosters'[\s\S]*?navigation.navigate\('Boosters'\)/);
});

test('native public links resolve to real screens and Android player waits for system-bar styling', () => {
  const app = read('synaura-app/src/App.tsx');
  for (const route of ["TrackDetail: 'track/:trackId'", "Subscriptions: 'subscriptions'", "Boosters: 'boosters'", "City: 'city'"]) assert.ok(app.includes(route));
  const player = read('synaura-app/src/components/NativePlayerChrome.tsx');
  assert.match(player, /requestAnimationFrame\(\(\) => \{\s*secondFrame = requestAnimationFrame/);
  assert.match(player, /visible=\{open && modalReady\}/);
  assert.match(player, /cancelAnimationFrame\(firstFrame\)/);
});
