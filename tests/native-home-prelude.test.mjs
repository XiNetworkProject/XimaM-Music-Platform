import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOME_PUNCHLINES,
  pickNextPunchlineIndex,
  resolveHomePreludeMetrics,
} from '../synaura-app/src/components/swipe/homePreludeModel.ts';

test('the native home picks one stable, non-repeating phrase per reopen', () => {
  const first = pickNextPunchlineIndex(-1, 0.5);
  const nextFromStart = pickNextPunchlineIndex(first, 0);
  const nextFromEnd = pickNextPunchlineIndex(first, 0.999999);

  assert.ok(first >= 0 && first < HOME_PUNCHLINES.length);
  assert.notEqual(nextFromStart, first);
  assert.notEqual(nextFromEnd, first);
});

test('the pulse area stays near 42 percent while preserving the Flow preview', () => {
  const viewports = [
    { width: 320, height: 568, topInset: 24, bottomPad: 83 },
    { width: 360, height: 740, topInset: 24, bottomPad: 83 },
    { width: 390, height: 844, topInset: 24, bottomPad: 87 },
    { width: 430, height: 932, topInset: 28, bottomPad: 91 },
  ];

  for (const viewport of viewports) {
    const metrics = resolveHomePreludeMetrics({
      ...viewport,
      isPhoneLandscape: false,
      isVeryShort: viewport.height - viewport.topInset < 560,
    });
    const ratio = metrics.pulseHeight / metrics.availableHeight;
    if (metrics.pulseHeight < 322) {
      assert.ok(ratio >= 0.39 && ratio <= 0.43, `${viewport.width}px pulse ratio: ${ratio}`);
    } else {
      assert.equal(metrics.pulseHeight, 322, `${viewport.width}px web-aligned pulse cap`);
    }
    assert.ok(metrics.previewHeight >= 188, `${viewport.width}px preview: ${metrics.previewHeight}`);
    assert.ok(metrics.railCardWidth < viewport.width, `${viewport.width}px rail card`);
  }
});

test('phone landscape remains usable without hiding the Flow preview', () => {
  const metrics = resolveHomePreludeMetrics({
    width: 740,
    height: 360,
    topInset: 0,
    bottomPad: 83,
    isPhoneLandscape: true,
    isVeryShort: true,
  });

  assert.equal(metrics.compactTop, true);
  assert.ok(metrics.pulseHeight >= 120 && metrics.pulseHeight <= 176);
  assert.ok(metrics.previewHeight >= 96);
});

test('tablet cards use the broader web rail proportions', () => {
  const metrics = resolveHomePreludeMetrics({
    width: 800,
    height: 1_280,
    topInset: 24,
    bottomPad: 72,
    isPhoneLandscape: false,
    isVeryShort: false,
  });

  assert.equal(metrics.railCardWidth, 270);
  assert.equal(metrics.pulseHeight, 350);
  assert.equal(metrics.compactTop, false);
  assert.ok(metrics.previewHeight >= 214);

  const mobileBreakpoint = resolveHomePreludeMetrics({
    width: 760,
    height: 1_100,
    topInset: 24,
    bottomPad: 72,
    isPhoneLandscape: false,
    isVeryShort: false,
  });
  const wideBreakpoint = resolveHomePreludeMetrics({
    width: 1_280,
    height: 1_200,
    topInset: 24,
    bottomPad: 72,
    isPhoneLandscape: false,
    isVeryShort: false,
  });

  assert.equal(mobileBreakpoint.railCardWidth, 220);
  assert.equal(wideBreakpoint.railCardWidth, 285);
  assert.equal(wideBreakpoint.pulseHeight, 400);
});
