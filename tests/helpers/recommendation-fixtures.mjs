import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

export const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
export function compile(source, imports = {}, globals = {}) {
  const module = { exports: {} };
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, console, URL, URLSearchParams, Date, Map, Set, ...globals,
    require: (name) => { if (name in imports) return imports[name]; throw new Error(`Unexpected dependency: ${name}`); } });
  return module.exports;
}
export const policy = compile(read('lib/recommendation/policy.ts'));
export const campaigns = compile(read('lib/boosters/campaigns.ts'));
export const engine = compile(read('lib/recommendation/engine.ts'), { './policy.ts': policy, '../boosters/campaigns.ts': campaigns });
export const clips = compile(read('lib/recommendation/clips.ts'), { './policy.ts': policy, './engine': engine });
export const now = Date.parse('2026-09-27T12:00:00Z');
export function signals() {
  const source = read('lib/recommendation/signals.ts');
  const ast = ts.createSourceFile('signals.ts', source, ts.ScriptTarget.Latest, true);
  const fn = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'emptySignals');
  return compile(`${fn.getText(ast)}\nexports.emptySignals=emptySignals;`).emptySignals('fixture-user');
}
export function track(id, group = 'affinity', artist = `artist-${id}`) {
  const fresh = group === 'fresh', emerging = group === 'emerging';
  return { _id: id, title: id, artist: { _id: artist, followersCount: emerging ? 20 : 1000 }, audioUrl: '/fixture.mp3',
    genre: [group === 'affinity' ? 'rap' : group === 'fresh' ? 'folk' : 'jazz'], rankingScore: 5, plays: emerging ? 30 : 2000,
    createdAt: new Date(now - (fresh ? 24 : 24 * 60) * 3600000).toISOString(),
    discoveryMetrics: { plays30d: emerging ? 30 : 1000, completes30d: 20, likes30d: 4, shares30d: 2, saves30d: 2, comments30d: 1,
      reactions30d: 1, uniqueListeners30d: 25, completionRate30d: 70, creatorFollowers: emerging ? 20 : 1000,
      ageHours: fresh ? 24 : 1440, qualityScore: 5, reachScore: 3, momentumScore: 2, freshnessScore: fresh ? 10 : .5,
      emergingScore: emerging ? 8 : 0, catalogScore: 4, confidence: .7 } };
}
export function clip(id, creator = `creator-${id}`, source = `source-${id}`) {
  return { id, creatorId: creator, sourceTrackId: source, visibility: 'published', videoUrl: '/fixture.mp4',
    sourceTrack: { isPublic: true, artist: { _id: `artist-${source}` }, genre: ['rap'] }, createdAt: new Date(now).toISOString(), likesCount: 2, commentsCount: 1 };
}
export function cohort(size = 90) { return Array.from({ length: size }, (_, i) => track(`track-${i}`, ['affinity', 'fresh', 'emerging'][i % 3], `artist-${i % 40}`)); }
export const plain = (value) => JSON.parse(JSON.stringify(value));
