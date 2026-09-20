import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// The unified UI is a new, authorized presentation boundary, not a new provider
// implementation. Project ONLY this exact adapter out of historical visual
// snapshots. Existing requests, effects, audio, billing and track handlers remain
// audited by those tests. The new surface has its own contract tests.
export function projectUnifiedStudio(file, source) {
  if (file !== 'app/ai-generator/page.tsx') return source;
  const addedImport = "import UnifiedStudio from '@/components/ai-studio/UnifiedStudio';";
  if (!source.includes(addedImport)) {
    assert.ok(!source.includes('UNIFIED_STUDIO_PRESENTATION_START'), 'Unified adapter requires its explicit import');
    return source;
  }
  const startMarker = '  // UNIFIED_STUDIO_PRESENTATION_START';
  const endMarker = '  // UNIFIED_STUDIO_PRESENTATION_END';
  assert.equal(source.split(startMarker).length, 2);
  assert.equal(source.split(endMarker).length, 2);
  const start = source.indexOf(startMarker), end = source.indexOf(endMarker) + endMarker.length;
  assert.equal(createHash('sha256').update(source.slice(start, end).replace(/\r\n/g, '\n')).digest('hex'), '70e385c1032493e6504d5bc506c38ac7f63d2ada7980aaaaccdcfcab24fcdec1', 'Review the exact unified presentation adapter before changing this digest');
  source = source.slice(0, start) + source.slice(end);
  const replacements = [
    [addedImport, ''],
    ['function AIGeneratorContent({ unifiedStudio = true }: { unifiedStudio?: boolean } = {}) {', 'function AIGeneratorContent() {'],
    ['if (unifiedStudio) return;', ''],
    ['// The unified surface uses native controls; legacy global shortcuts must not steal Space or Ctrl+K.', ''],
    ['[audioState.isPlaying, cmdOpen, pause, play, unifiedStudio]', '[audioState.isPlaying, cmdOpen, pause, play]'],
  ];
  for (const [before, after] of replacements) {
    assert.equal(source.split(before).length, 2, `Only the explicit unified addition may be projected: ${before}`);
    source = source.replace(before, after);
  }
  return source;
}
