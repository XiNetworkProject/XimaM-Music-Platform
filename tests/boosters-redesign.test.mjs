import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import {
  RARITIES,
  canClaimPack,
  chooseBooster,
  cooldownFor,
  drawOdds,
  effectiveBoost,
  guaranteedRarity,
  missionHasReset,
  nextStreak,
  normalizePlan,
  weekStartUTC,
} from '../lib/boosters/policy.ts';
const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const catalog = RARITIES.map((rarity, i) => ({
  id: String(i),
  key: rarity,
  rarity,
  name: rarity,
  type: 'track',
  multiplier: 1 + i,
  duration_hours: 24,
  enabled: true,
}));

test('boost entitlements retain free/subscriber cooldown and existing pack limits', () => {
  assert.equal(cooldownFor('free'), 86400000);
  assert.equal(cooldownFor('starter'), 43200000);
  assert.equal(normalizePlan('unknown'), 'free');
  assert.equal(canClaimPack('free', 'starter_weekly'), false);
  assert.equal(canClaimPack('starter', 'pro_weekly'), false);
  for (const plan of ['starter', 'pro', 'enterprise'])
    assert.equal(canClaimPack(plan, 'starter_weekly'), true);
  for (const plan of ['pro', 'enterprise'])
    assert.equal(canClaimPack(plan, 'pro_weekly'), true);
  assert.equal(canClaimPack('enterprise', '__proto__'), false);
  assert.equal(weekStartUTC(new Date('2026-10-04T23:59:59Z')), '2026-09-28');
  assert.equal(weekStartUTC(new Date('2026-10-05T00:00:00Z')), '2026-10-05');
});
test('weighted draws never bypass a minimum rarity, even at the end of the roll', () => {
  for (const floor of RARITIES)
    for (let i = 0; i < 1000; i++) {
      const picked = chooseBooster(catalog, 0.5, floor, false, () => i / 1000);
      assert.ok(RARITIES.indexOf(picked.rarity) >= RARITIES.indexOf(floor));
    }
  assert.equal(chooseBooster(catalog.slice(0, 2), 0, 'legendary'), null);
  assert.equal(
    chooseBooster(catalog.map((b) => ({ ...b, enabled: false }))),
    null
  );
  assert.deepEqual(drawOdds(catalog), [
    { rarity: 'common', percent: 78 },
    { rarity: 'rare', percent: 18 },
    { rarity: 'epic', percent: 3 },
    { rarity: 'legendary', percent: 1 },
  ]);
  assert.equal(drawOdds(catalog, 0, 'legendary')[0].percent, 100);
});
test('pity and consecutive streak guarantees follow the published thresholds', () => {
  const p = {
    opens_since_rare: 0,
    opens_since_epic: 0,
    opens_since_legendary: 0,
  };
  for (const [count, rarity] of [
    [1, 'common'],
    [7, 'rare'],
    [14, 'epic'],
    [30, 'legendary'],
  ])
    assert.equal(guaranteedRarity(p, count), rarity);
  assert.equal(
    guaranteedRarity({ ...p, opens_since_legendary: 79 }, 7),
    'legendary'
  );
  assert.equal(guaranteedRarity({ ...p, opens_since_epic: 24 }, 1), 'epic');
  assert.equal(guaranteedRarity({ ...p, opens_since_rare: 6 }, 1), 'rare');
  const now = Date.now();
  assert.equal(
    nextStreak(new Date(now - 48 * 3600000).toISOString(), 6, now),
    7
  );
  assert.equal(
    nextStreak(new Date(now - 48 * 3600000 - 1).toISOString(), 6, now),
    1
  );
});
test('overlapping boosts take maximum power and expiry, never additive duration', () => {
  const now = Date.now(),
    old = new Date(now + 48 * 3600000).toISOString();
  assert.deepEqual(
    effectiveBoost(
      [{ multiplier: 3, expires_at: old }],
      { multiplier: 2, duration_hours: 24 },
      now
    ),
    { multiplier: 3, expiresAt: old }
  );
});
test('an earned mission remains claimable and claimed missions restart cleanly', () => {
  const m = { cooldown_hours: 24 },
    row = { claimed: false, completed_at: '2020-01-01T00:00:00Z' };
  assert.equal(missionHasReset(m, row, Date.now()), false);
  assert.equal(missionHasReset(m, { ...row, claimed: true }, Date.now()), true);
});
test('all new reward routes use short atomic transactions and session ownership', () => {
  for (const route of [
    'boosters/open',
    'boosters/use',
    'boosters/claim-pack',
    'missions/claim',
    'daily-spin',
  ])
    assert.match(read(`app/api/${route}/route.ts`), /boosterMutation\(/, route);
  const http = read('lib/boosters/http.ts');
  assert.match(http, /getServerSession\(authOptions\)/);
  assert.match(http, /withDatabaseTransaction/);
  const service = read('lib/boosters/service.ts');
  assert.match(service, /pg_advisory_xact_lock/);
  assert.match(service, /i\.user_id = \$2 FOR UPDATE OF i/);
  assert.match(service, /track\.creator_id !== userId/);
  assert.match(service, /startsWith\('ai-'\)/);
  assert.match(service, /startsWith\('radio-'\)/);
  assert.doesNotMatch(service, /fetch\(|setTimeout|catch\s*\{\s*\}/); // no ignored database writes
  assert.doesNotMatch(
    read('app/api/missions/route.ts'),
    /\.update\(|\.insert\(|\.upsert\(/
  );
  assert.match(
    read('app/api/missions/claim-many/route.ts'),
    /withDatabaseTransaction\(\s*\(db\) =>\s*claimMission/
  );
});
test('inventory hook fences stale responses, waits for readiness and never retries POST automatically', () => {
  const hook = read('hooks/useBoosters.ts');
  for (const marker of [
    'AbortController',
    'identityRef.current !== identity',
    'mutation.current',
    '!!data && !error',
    'deadline - now',
    'snapshot?.identity === identity',
    'visibilitychange',
  ])
    assert.ok(hook.includes(marker), marker);
  assert.doesNotMatch(hook, /setInventory\(\[\]\)/);
});
test('redesigned interface keeps explicit confirmation, free rewards, correct targets and lazy panels', () => {
  const ui = read('app/boosters/BoostersClient.tsx');
  for (const marker of [
    'useBoosters()',
    'useOnTrack',
    'useOnArtist',
    'Confirmer l’activation',
    'setConfirming(true)',
    '/api/boosters/targets',
    "tab === 'rewards' ? '/api/missions' : null",
    'groups.map',
    'state?.eligible',
    'state.claimed < state.perWeek',
    'dominated',
    'BoosterOpening',
  ])
    assert.ok(ui.includes(marker), marker);
  assert.doesNotMatch(ui, /useAudioPlayer|new Audio|router\.push/);
  assert.ok(
    read('components/boosters/BoosterOpening.tsx').includes(
      'Préparer l’activation'
    )
  );
  const dialog = read('components/boosters/BoosterDialog.tsx');
  for (const marker of [
    'showModal()',
    'previous.focus',
    'onCancel',
    'if (!busy) onClose()',
  ])
    assert.ok(dialog.includes(marker), marker);
});
test('styles are isolated, responsive, safe-area aware and respect reduced motion', () => {
  const css = read('app/boosters/boosters.css');
  postcss.parse(css);
  for (const marker of [
    'max-width: 700px',
    'env(safe-area-inset-bottom)',
    'prefers-reduced-motion: reduce',
    'focus-visible',
    'data-motion="false"',
  ])
    assert.ok(css.includes(marker), marker);
  assert.doesNotMatch(css, /url\(|@import/);
});

test('hero halo fades independently of content and full-bleed art escapes the global width cap', () => {
  const css = postcss.parse(read('app/boosters/boosters.css'));
  const declarations = (selector, prop) => {
    const values = [];
    css.walkRules(selector, rule => rule.walkDecls(prop, decl => values.push(decl.value)));
    return values;
  };
  assert.ok(declarations('.boost-stage', 'max-width').includes('none'));
  assert.deepEqual(declarations('.boost-stage', 'background'), ['none']);
  assert.equal(declarations('.boost-stage', 'mask-image').length, 0);
  assert.equal(declarations('.boost-stage-copy', 'mask-image').length, 0);
  assert.match(declarations('.boost-stage::before', 'mask-image')[0], /closest-side.*transparent 100%/);
  assert.match(declarations('.boost-stage-art', 'mask-image')[0], /transparent 100%/);
  assert.match(read('app/boosters/BoostersClient.tsx'), /className="boost-stage-art" aria-hidden="true"/);
});
