import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { validGenerationFolder, initialGenerationFolder } from '../lib/studio/generationSettings.ts';
const read = file => readFileSync(file, 'utf8');

test('destination is a private bounded folder label and never resets a moved existing song', () => {
  for (const input of [null, undefined, '', 'Mon album', 'Ébauches']) assert.equal(validGenerationFolder(input), true);
  for (const input of [[], {}, 4, 'x'.repeat(81), 'Album\nAutre']) assert.equal(validGenerationFolder(input), false);
  assert.deepEqual(initialGenerationFolder({ libraryFolder: ' Album ' }, false), { library_folder: 'Album' });
  assert.deepEqual(initialGenerationFolder({ libraryFolder: 'Album' }, true), {});
  assert.deepEqual(initialGenerationFolder({ libraryFolder: {} }, false), {});
  assert.match(read('lib/aiGenerationService.ts'), /initialGenerationFolder\(generation\?\.metadata, !!existing\)/);
});

test('new controls parse and scope lyric results to explicit user application', () => {
  for (const file of ['StudioLyricsEditor', 'StudioTextLibrary', 'StudioInspector']) {
    const path = `components/ai-studio/${file}.tsx`;
    assert.equal(ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX).parseDiagnostics.length, 0);
  }
  const editor = read('components/ai-studio/StudioLyricsEditor.tsx');
  assert.match(editor, /if \(lock.current \|\| uncertain/);
  assert.match(editor, /taskId \? 'GET' : 'POST'/);
  assert.match(editor, /method: taskId \? 'GET' : 'POST'/);
  assert.match(editor, /maxLength=\{200\}/);
  assert.match(editor, /Ajouter à la suite/);
  assert.match(editor, /Annuler la modification des paroles/);
  assert.match(editor, /abort.current\?\.abort\(\)/);
  assert.match(editor, /if \(p.toolsDemo\)/);
  assert.match(editor, /document.visibilityState !== 'visible'/);
  const accept = editor.slice(editor.indexOf('const accept'), editor.indexOf('const generate'));
  assert.doesNotMatch(accept, /field.set/);
});

test('outer scrolling is locked only while the Studio is mounted; top-edge nav also works on click and keyboard', () => {
  const css = read('components/ai-studio/studio-workspace.css');
  assert.match(css, /\.app-scroll-container:has\(\.sw-workflow\).*overflow:hidden!important/);
  assert.match(css, /\.sc-inspector-scroll.*overflow-y:auto/);
  const nav = read('components/navigation/AppNavigation.tsx');
  assert.match(nav, /const studio = pathname === '\/studio'/);
  assert.match(nav, /aria-label="Afficher la navigation supérieure"/);
  assert.match(nav, /setCollapsed\(value => !value\)/);
  assert.match(nav, /event.key === 'Escape'/);
  assert.match(read('components/navigation/app-navigation.css'), /:focus-within/);
});
