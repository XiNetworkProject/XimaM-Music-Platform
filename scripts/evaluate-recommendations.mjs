// Offline/synthetic only. No environment loading, database, users or requests.
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { writeFileSync, mkdirSync } from 'node:fs';
import { compile, engine, signals, cohort, now } from '../tests/helpers/recommendation-fixtures.mjs';

const baselineSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const baseline = compile(execFileSync('git', ['show', `${baselineSha}:lib/recommendation/engine.ts`], { encoding: 'utf8' }));
const snapshot = (ranked, maximum = 20) => {
  const items = ranked.slice(0, maximum);
  const counts = new Map();
  const buckets = {};
  let adjacent = 0;
  items.forEach((item, index) => {
    counts.set(item.artist?._id, (counts.get(item.artist?._id) || 0) + 1);
    buckets[item.recommendationBucket] = (buckets[item.recommendationBucket] || 0) + 1;
    if (index && item.artist?._id === items[index-1].artist?._id) adjacent++;
  });
  return { items: items.length, distinctTracks: new Set(items.map((t) => t._id)).size, distinctArtists: counts.size,
    maxArtistExposure: Math.max(0,...counts.values()), adjacentCreatorRepeats: adjacent, buckets };
};
const timings = (fn) => {
  fn(); const samples=[];
  for (let i=0; i<20; i++) { const start=performance.now(); fn(); samples.push(performance.now()-start); }
  samples.sort((a,b)=>a-b);
  return { p50Ms: +samples[9].toFixed(2), p95Ms: +samples[18].toFixed(2), maxMs: +samples[19].toFixed(2) };
};
const scenarios = {};
for (const [name, size, warm] of [['new-listener',90,false], ['known-tastes',90,true], ['large-pool',600,true]]) {
  const source=cohort(size), s=signals();
  if (warm) { s.signalStrength=30; s.preferredGenres.set('rap',10); }
  const context={now,sessionSeed:'offline-comparison',strategy:'reco'};
  const before=()=>baseline.rerankTracks(source,s,context), after=()=>engine.rerankTracks(source,s,context);
  scenarios[name]={ before:snapshot(before()), after:snapshot(after()), timingBefore:timings(before), timingAfter:timings(after) };
}
const report = { kind:'synthetic-offline-not-production', baselineSha, policy:'balanced-v1', generatedAt:new Date().toISOString(), scenarios,
  limitations:['No production database or network latency included','No empirical musical satisfaction claim','Quota fixtures intentionally supply each segment','Candidate pool coverage not measured on actual catalogue'] };
mkdirSync('artifacts/recommendation-policy',{recursive:true});
writeFileSync('artifacts/recommendation-policy/offline-comparison.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
