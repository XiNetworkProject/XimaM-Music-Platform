import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { projectProductJourneys } from './reviewed-product-journeys.mjs';
import { projectStudioFinishing } from './reviewed-studio-finishing.mjs';

// The unified UI is a new, authorized presentation boundary, not a new provider
// implementation. Project ONLY this exact adapter out of historical visual
// snapshots. Existing requests, effects, audio, billing and track handlers remain
// audited by those tests. The new surface has its own contract tests.
export function projectUnifiedStudio(file, source) {
  if (file === 'app/ai-generator/page.tsx') {
    assert.equal(source.split('      checkGeneration={resumeBackgroundGeneration}\n').length, 2);
    source = source.replace('      checkGeneration={resumeBackgroundGeneration}\n', '');
  }
  source = projectStudioFinishing(file, source);
  if (file === 'app/ai-generator/page.tsx' && source.includes("owner={session?.user?.id || ''}")) {
    // Reviewed workflow adapter: account isolation + explicit version lineage only.
    for (const addition of [
      "      key={session?.user?.id || 'guest'} owner={session?.user?.id || ''}\n",
      "      refreshCredits={() => { void fetchCreditsBalance().then(data => { if (data && typeof data.balance === 'number') setCreditsBalance(data.balance); }); }}\n",
      "import { studioFolder } from '@/lib/studio/workspace';\n",
      ", generationId: String(source.generation_id), sourceIds: Array.isArray(generation?.metadata?.sourceIds) ? generation.metadata.sourceIds.filter((id: unknown): id is string => typeof id === 'string') : [], operation: generation?.metadata?.studioAction",
    ]) {
      assert.equal(source.split(addition).length, 2, 'Review exact Studio workflow binding');
      source = source.replace(addition, '');
    }
    assert.equal(source.split('folder: studioFolder(source.source_links)').length, 2);
    source = source.replace('folder: studioFolder(source.source_links)', 'folder: parseSourceLinks(source.source_links)?.library_folder');
  }
  source = projectProductJourneys(file,source);
  if (file !== 'app/ai-generator/page.tsx') return source;
  // Reviewed optional duration UI: omitted API field, no change to billing or playback.
  for (const [before, after] of [
    ['  const [durationAuto, setDurationAuto] = useState(false);\n', ''],
    ['duration: durationAuto ? undefined : generationDuration,', 'duration: generationDuration,'],
    ['durationAuto: { value: durationAuto, set: setDurationAuto }, ', ''],
    ['  const [generationFolder, setGenerationFolder] = useState(\'\');\n', ''],
    ['      requestBody.libraryFolder = generationFolder;\n', ''],
    ['libraryFolder: { value: generationFolder, set: setGenerationFolder }, ', ''],
  ]) {
    assert.equal(source.split(before).length, 2, 'Review exact optional-duration binding');
    source = source.replace(before, after);
  }
  // Reviewed Studio API addition: only the three exact Variety bindings.
  // Their validation/provider forwarding is covered by studio-tools tests.
  if (source.includes('const [variety, setVariety]')) {
    for (const addition of [
      '  const [variety, setVariety] = useState<number>(1);\n',
      '        variety,\n',
      'variety: { value: variety, set: setVariety }, ',
    ]) {
      assert.equal(source.split(addition).length, 2, 'Review exact Variety binding');
      source = source.replace(addition, '');
    }
  }
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
  assert.equal(createHash('sha256').update(source.slice(start, end).replace(/\r\n/g, '\n')).digest('hex'), '0a3c68efddee9528850e8802fa55f08b28760d2d1b7e0eb68fcc7295d3bdb555', 'Review the exact unified presentation adapter before changing this digest');
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
