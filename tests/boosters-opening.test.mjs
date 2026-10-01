import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import {
  openingPhase,
  tearProgress,
  TEAR_COMPLETE_AT,
} from '../components/boosters/openingSequence.ts';

test('the sealed card never auto-opens, even after the server reward is ready', () => {
  assert.equal(openingPhase(0, null, false), 'charge');
  assert.equal(openingPhase(700, 180, false), 'charge');
  assert.equal(openingPhase(1050, 180, false), 'sealed');
  assert.equal(openingPhase(120000, 180, false), 'sealed');
  assert.equal(openingPhase(120000, 180, false, null, 0.7), 'tearing');
});
test('completing the gesture triggers exactly the short finish and then the reward', () => {
  assert.equal(openingPhase(3000, 180, false, 3000, 1), 'fracture');
  assert.equal(openingPhase(3179, 180, false, 3000, 1), 'fracture');
  assert.equal(openingPhase(3180, 180, false, 3000, 1), 'burst');
  assert.equal(openingPhase(3829, 180, false, 3000, 1), 'burst');
  assert.equal(openingPhase(3830, 180, false, 3000, 1), 'revealed');
});
test('slow or missing network response never invents a reward', () => {
  for (const elapsed of [1050, 3000, 10000, 120000]) {
    assert.equal(openingPhase(elapsed, null, false), 'sealed');
    assert.equal(openingPhase(elapsed, null, false, 900, 1), 'waiting');
    assert.equal(openingPhase(elapsed, null, true), 'waiting');
  }
  assert.equal(openingPhase(5000, 5000, false, 900, 1), 'fracture');
  assert.equal(openingPhase(5180, 5000, false, 900, 1), 'burst');
  assert.equal(openingPhase(5830, 5000, false, 900, 1), 'revealed');
});
test('tear distance is bounded, resumable and cannot be increased by an upward gesture', () => {
  assert.equal(tearProgress(0, 0, 360), 0);
  assert.equal(tearProgress(0.3, -50, 360), 0.3);
  assert.equal(tearProgress(0, 100, 360), 0.5);
  assert.equal(tearProgress(0.5, 70, 360), 0.85);
  assert.equal(tearProgress(0.85, 80, 360), 1);
  assert.ok(tearProgress(0, 200, 360) >= TEAR_COMPLETE_AT);
  assert.equal(tearProgress(0, 110, 80), 1);
  assert.equal(tearProgress(0, 200, 1200), 1);
});
test('skip and reduced motion show confirmed rewards immediately, not a fake draw', () => {
  assert.equal(openingPhase(200, 180, true), 'revealed');
  assert.equal(openingPhase(200, null, true), 'waiting');
});
test('opening is strictly presentational, with motion preference and native modal focus', () => {
  const source = readFileSync('components/boosters/BoosterOpening.tsx', 'utf8');
  assert.doesNotMatch(
    source,
    /\bfetch\(|axios|useBoosters|new Audio|useAudioPlayer|Math\.random/
  );
  assert.match(source, /useLivingMotion/);
  assert.match(source, /BoosterDialog/);
  assert.match(source, /timers\.forEach\(window.clearTimeout\)/);
  assert.match(source, /Passer l’animation/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /onSelect\(reward\)/);
});
test('visual lab is development-only and cannot call a reward endpoint', () => {
  const route = readFileSync('app/dev/boosters-opening/page.tsx', 'utf8');
  const lab = readFileSync(
    'app/dev/boosters-opening/OpeningPreview.tsx',
    'utf8'
  );
  assert.match(route, /NODE_ENV !== 'development'\) notFound\(\)/);
  assert.doesNotMatch(lab, /\bfetch\(|axios|useBoosters/);
  assert.match(lab, /Aucun boost récupéré/);
});

test('fracture, shell halves and glow share the same centered card geometry', () => {
  const css = postcss.parse(
    readFileSync('components/boosters/booster-opening.css', 'utf8')
  );
  const rule = (selector) =>
    css.nodes.find(
      (node) => node.type === 'rule' && node.selector === selector
    );
  const value = (selector, prop) =>
    rule(selector).nodes.find((node) => node.prop === prop)?.value;
  const points = (selector) =>
    [
      ...value(selector, 'clip-path').matchAll(
        /var\((--bo-cut-[\w]+)\) (\d+)%?/g
      ),
    ].map((match) => ({
      name: match[1],
      x: parseFloat(value('.bo-capsule', match[1])),
      y: Number(match[2]),
    }));
  const left = points('.bo-capsule-left');
  const right = points('.bo-capsule-right');
  assert.equal(left.length, 7);
  assert.deepEqual(left, [right[0], ...right.slice(1).reverse()]);
  assert.equal(left[0].x, 50);
  assert.equal(left[3].x, 50);
  assert.equal(left[6].x, 50);
  // Point symmetry guarantees a centered cut at every card size.
  left.forEach((point, i) => {
    assert.equal(point.x + left[6 - i].x, 100);
    assert.equal(point.y + left[6 - i].y, 100);
    for (const direction of ['+', '-']) {
      assert.ok(
        value('.bo-seam', 'clip-path').includes(
          `calc(var(${point.name}) ${direction} 1%) ${point.y}`
        )
      );
    }
  });
  assert.equal(value('.bo-core', 'left'), '50%');
  assert.equal(value('.bo-core', 'top'), '50%');
  assert.equal(value('.bo-core', 'translate'), '-50% -50%');
  const source = readFileSync('components/boosters/BoosterOpening.tsx', 'utf8');
  assert.equal(source.match(/className="bo-seam"/g).length, 1);
  assert.match(
    source,
    /className="bo-capsule" aria-hidden="true">\s*<Capsule half="left" \/>\s*<Capsule half="right" \/>\s*<div className="bo-core" \/>\s*<span className="bo-seam" \/>/
  );
});

test('opening rings cannot collapse into an off-center line under the global max-width rule', () => {
  const global = readFileSync('app/globals.css', 'utf8');
  assert.match(global, /\*:not\(html\):not\(body\)\s*\{\s*max-width: 100%/);
  const css = postcss.parse(
    readFileSync('components/boosters/booster-opening.css', 'utf8')
  );
  const rule = (selector) =>
    css.nodes.find(
      (node) => node.type === 'rule' && node.selector === selector
    );
  const value = (selector, prop) =>
    rule(selector).nodes.find((node) => node.prop === prop)?.value;
  assert.equal(
    value('.bo-opening :is(.bo-impact, .bo-particles) > *', 'max-width'),
    'none'
  );
  // Each circular effect must stay square with its center on the impact anchor.
  for (const selector of ['.bo-shockwave', '.bo-bloom']) {
    const width = parseFloat(value(selector, 'width'));
    assert.equal(width, parseFloat(value(selector, 'height')));
    assert.equal(width / 2 + parseFloat(value(selector, 'left')), 0);
    assert.equal(width / 2 + parseFloat(value(selector, 'top')), 0);
  }
});
