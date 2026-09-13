import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectReviewedV6, assertUnchangedV6TrackBoundaries } from './helpers/reviewed-suno-v6.mjs';
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('reviewed V6 slots project to the historical visual contract, without changing track actions', () => {
  for (const file of ['app/ai-generator/page.tsx', 'app/ai-library/page.tsx', 'app/studio/StudioClient.tsx', 'components/studio/LeftDock/GeneratorForm.tsx']) {
    projectReviewedV6(file);
    assertUnchangedV6TrackBoundaries(file);
  }
});

test('V6 preservation rejects mutations to a reviewed request or a protected playback handler', () => {
  const file = 'app/ai-generator/page.tsx';
  const source = read(file);
  for (const [from, to] of [['duration: generationDuration,', 'duration: 999,'], ['model: modelVersion,', "model: 'V5',"]]) {
    assert.ok(source.includes(from));
    assert.throws(() => projectReviewedV6(file, source.replace(from, to)));
  }
  const handler = 'const playGenerated = async (gt: GeneratedTrack) => {';
  assert.ok(source.includes(handler));
  assert.throws(() => assertUnchangedV6TrackBoundaries(file, source.replace(handler, `${handler} throw new Error('regression');`)));
});
