import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { versionFamilies, selectWorkspaceSongs, mergeStudioJobs, studioFolder } from '../lib/studio/workspace.ts';
const song = (id, extra = {}) => ({ track: { id, title: 'Même titre', style: 'Électro', duration: 180, createdAt: '2026-10-08T12:00:00Z', isInstrumental: false }, liked: false, trashed: false, published: false, ...extra });
const input = [song('a', { generationId: 'g1', folder: 'Album' }), song('b', { generationId: 'g1', liked: true }), song('c', { generationId: 'g2', sourceIds: ['a'], published: true }), song('d', { generationId: 'g3' }), song('e', { sourceIds: ['c'], trashed: true })];
test('real JSONB folders and historical serialized folders both remain visible', () => {
  assert.equal(studioFolder({ library_folder: 'Album' }), 'Album');
  assert.equal(studioFolder('{"library_folder":"Album"}'), 'Album');
  assert.equal(studioFolder('broken'), undefined);
});

test('version families join real generation pairs and descendant IDs, never matching titles', () => {
  const result = versionFamilies(input);
  assert.deepEqual(result.get('a').map(item => item.track.id), ['a', 'b', 'c', 'e']);
  assert.equal(result.get('d').length, 1);
  assert.deepEqual(versionFamilies([song('a', { sourceIds: ['b'] }), song('b', { sourceIds: ['a'] })]).get('a').map(item => item.track.id), ['a', 'b']);
});
test('workspace filters compose, include accents, preserve trash isolation and never mutate the source', () => {
  const options = { query: 'electro', filter: 'all', folder: '*', sort: 'newest' };
  const ids = changes => selectWorkspaceSongs(input, { ...options, ...changes }).map(song => song.track.id);
  assert.deepEqual(ids({ family: 'c' }), ['a', 'b', 'c']);
  assert.deepEqual(ids({ folder: 'Album' }), ['a']);
  assert.deepEqual(ids({ filter: 'public' }), ['c']);
  assert.deepEqual(ids({ filter: 'liked' }), ['b']);
  assert.deepEqual(ids({ filter: 'trash' }), ['e']);
  assert.deepEqual(ids({ folder: '' }), ['b', 'c', 'd']);
  assert.equal(input.length, 5);
});
test('stale responses never replace completed tasks or duplicate versions', () => {
  const base = { id: 'a', status: 'completed', createdAt: '2026-10-08', result: { assets: [{ trackId: 'version' }] } };
  const merged = mergeStudioJobs([base], [{ ...base, status: 'pending', result: { assets: [] } }]);
  assert.equal(merged.length, 1); assert.equal(merged[0].status, 'completed'); assert.equal(merged[0].result.assets[0].trackId, 'version');
});
test('controller retains owner scope, source context, draft guard and polling outside tool visibility', () => {
  const read = path => readFileSync(path, 'utf8');
  const tasks = read('components/ai-studio/useStudioTasks.ts');
  assert.match(tasks, /controller.abort\(\)/); assert.match(tasks, /sessionRef.current !== session/);
  assert.doesNotMatch(tasks, /p\.open|new Audio|<audio|method: 'POST'/);
  const tools = read('components/ai-studio/StudioTools.tsx');
  assert.match(tools, /p.tasks.accept\(data.job\)/); assert.match(tools, /\[p.launchKey\]/);
  assert.match(read('components/ai-studio/UnifiedStudio.tsx'), /setReplaceIntent\(\{ action, track \}\)/);
  const server = read('lib/studio/jobs.ts');
  assert.match(server, /sourceId: source\?\.id/); assert.match(server, /studioAction: job.action/); assert.match(server, /library_folder: job.input.workspace/);
  for (const file of ['UnifiedStudio.tsx','StudioTools.tsx','StudioLibrary.tsx','StudioComposer.tsx','StudioSongMenu.tsx','useStudioTasks.ts']) assert.equal(ts.createSourceFile(file, read(`components/ai-studio/${file}`), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX).parseDiagnostics.length, 0);
});

test('context actions use collision-aware portals and an accessible mobile sheet, never expand song rows', () => {
  const menu = readFileSync('components/ai-studio/StudioSongMenu.tsx', 'utf8');
  for (const token of ['createPortal', 'getBoundingClientRect', 'window.innerHeight - menu.height', 'ArrowDown', 'ArrowUp', 'Escape', 'p.anchor.focus', 'SynauraOverlay', 'role="menuitem"']) assert.ok(menu.includes(token), token);
  assert.doesNotMatch(readFileSync('components/ai-studio/studio-workspace.css', 'utf8'), /:has\(\.sw-menu\)/);
  const composer = readFileSync('components/ai-studio/StudioComposer.tsx', 'utf8');
  assert.match(composer, /<details className="sc-section"/);
  assert.doesNotMatch(composer, /fetch\(|new Audio\(|setQueueAndPlay/);
});
