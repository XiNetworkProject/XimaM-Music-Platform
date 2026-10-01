import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../next.config.js';

test('production build isolates compilation and bounds page workers without bypassing quality gates', () => {
  assert.equal(config.experimental.webpackBuildWorker, true);
  assert.equal(config.experimental.cpus, 1);
  assert.notEqual(config.typescript?.ignoreBuildErrors, true);
  assert.notEqual(config.eslint?.ignoreDuringBuilds, true);
  assert.equal(typeof config.webpack, 'function');
});
