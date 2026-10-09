import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

// Explicitly authorized fixes, not blanket exceptions for old playback/billing tests.
const slots = {
  // Reviewed feedback only: report upload, cancellation and separate persistence failures.
  performRemixUpload: 'e3583044434191e953731518ac14b41e089d7b0b0d3bc14fa64416f0fd459d67',
  shareGenerated: '1cf4cce4845c451f02d5b9ab04361d9256d0254fb6861adda9824b3d3eedd1c3',
  selectedTrackForVisibility: '5375b7c9c69a3ad2e292d5f9d2c0874c8959abf4e92f027d5f80854522690de0',
  selectedGenerationForVisibility: 'a3488e7a85e43f6a988d0db014fe81958e751ae190b74b388115fcaf75adb8e1',
  selectedVisibilityState: '1d8ea80a7b5b25ff1898d2576bc9e723864dcef0c1a61e46dddbb746bd837745',
};
export function projectStudioFinishing(file, source, actionsOnly = false) {
  if (file !== 'app/ai-generator/page.tsx') return source;
  const old = readFileSync(new URL('../../artifacts/suno-v6/before/app/ai-generator/page.tsx', import.meta.url), 'utf8');
  const parse = text => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const currentAst = parse(source), oldAst = parse(old), printer = ts.createPrinter({ removeComments: true });
  const find = (ast, name) => { let result; const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) result = node; ts.forEachChild(node, visit); }; visit(ast); assert.ok(result, name); return result; };
  const edits = Object.entries(slots).filter(([name]) => !actionsOnly || name === 'shareGenerated').map(([name, hash]) => {
    const current = find(currentAst, name), original = find(oldAst, name);
    assert.equal(createHash('sha256').update(printer.printNode(ts.EmitHint.Unspecified, current, currentAst)).digest('hex'), hash, `Review finishing behavior: ${name}`);
    return { start: current.getStart(currentAst), end: current.end, text: original.getText(oldAst) };
  }).sort((a, b) => b.start - a.start);
  for (const edit of edits) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  if (actionsOnly) return source;
  for (const [before, after] of [
    ["import { reportStudioActivity, startStudioActivity } from '@/lib/studio/clientActivity';\n", ''],
    ["import { feedbackFailure } from '@/lib/studio/feedback';\n", ''],
    ["    429: 'Trop de demandes rapprochées. Attendez avant de réessayer.',", "    429: 'Crédits insuffisants. Ajoutez des crédits pour continuer.',"],
    ['    if (unifiedStudio) return; // The single inspector lyric surface owns its track-scoped request.\n', ''],
    ['[effectiveTrackContext.taskId, effectiveTrackContext.audioId, fetchTimestampedLyrics, unifiedStudio]', '[effectiveTrackContext.taskId, effectiveTrackContext.audioId, fetchTimestampedLyrics]'],
    ['        sunoAudioId: track.id,\n        generationTaskId: activeBgGeneration.taskId,\n', ''],
  ]) { assert.equal(source.split(before).length, 2, before); source = source.replace(before, after); }
  return source;
}
