import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveFlowPage } from '../synaura-app/src/feed/flowPaging.ts';

test('a fast fling advances by at most one Flow item', () => {
  const result = resolveFlowPage({ currentIndex: 7, offsetY: 14 * 800, pageHeight: 800, itemCount: 40 });
  assert.deepEqual(result, { rawIndex: 14, index: 8, corrected: true });
});
test('a fast reverse fling goes back by at most one Flow item', () => {
  const result = resolveFlowPage({ currentIndex: 7, offsetY: 800, pageHeight: 800, itemCount: 40 });
  assert.deepEqual(result, { rawIndex: 1, index: 6, corrected: true });
});

test('a settled adjacent page is preserved without correction', () => {
  const result = resolveFlowPage({ currentIndex: 7, offsetY: 8 * 800, pageHeight: 800, itemCount: 40 });
  assert.deepEqual(result, { rawIndex: 8, index: 8, corrected: false });
});

test('invalid measurements and boundaries remain safe', () => {
  assert.deepEqual(
    resolveFlowPage({ currentIndex: 0, offsetY: -900, pageHeight: 800, itemCount: 3 }),
    { rawIndex: 0, index: 0, corrected: false },
  );
  assert.deepEqual(
    resolveFlowPage({ currentIndex: 2, offsetY: 99_000, pageHeight: 800, itemCount: 3 }),
    { rawIndex: 2, index: 2, corrected: false },
  );
  assert.deepEqual(
    resolveFlowPage({ currentIndex: 2, offsetY: 800, pageHeight: 0, itemCount: 3 }),
    { rawIndex: 0, index: 0, corrected: false },
  );
});
