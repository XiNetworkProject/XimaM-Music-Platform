import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);

async function route(file, { user = 'viewer', owner = 'viewer', missing = false, failure = false } = {}) {
  const calls = [];
  const dbAdmin = { from(table) {
    const call = { table, filters: [], op: 'read' }; calls.push(call);
    const resolve = () => {
      if (call.op === 'upsert') return { data: null, error: failure ? { code: 'TEST_FAILURE' } : null };
      if (table === 'tracks') return { data: { id: 'track', creator_id: owner, is_public: true, audio_url: 'https://example.test/audio.mp3' }, error: null };
      if (table === 'comments') return { data: missing ? null : { id: 'comment', user_id: owner, track_id: 'track' }, error: null };
      return { data: null, error: null };
    };
    const query = { select() { return query; }, eq(k,v) { call.filters.push([k,v]); return query; }, is(k,v) { call.filters.push([k,v]); return query; }, maybeSingle: async () => resolve(), upsert(data, options) { call.op = 'upsert'; call.data = data; call.options = options; return query; }, then(a,b) { return Promise.resolve(resolve()).then(a,b); } };
    return query;
  } };
  const session = async () => user ? { user: { id: user } } : null;
  const mocks = {
    '@/lib/database': { dbAdmin }, '@/lib/getApiSession': { getApiSession: session },
    'next-auth': { getServerSession: session }, '@/lib/authOptions': { authOptions: {} },
    '@/lib/contentModeration': { default: { analyzeContent: () => ({ isClean: true }) }, __esModule: true },
    '@/lib/publicTracks': { canViewTrack: () => true },
    '@/lib/remixServer': { normalizeRemixTrackRef: id => ({ id, type: 'track' }) },
  };
  const source = await readFile(file, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(id => mocks[id] || require(id), module, module.exports);
  return { ...module.exports, calls };
}
const params = { params: { id: 'track', commentId: 'comment' } };
const request = body => new Request('http://localhost/api/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const ownerRoute = 'app/api/tracks/[id]/comments/[commentId]/route.ts';
const creatorRoute = 'app/api/tracks/[id]/comments/[commentId]/moderation/route.ts';

test('suppression auteur : PK réelle, appartenance au morceau, aucun hard delete', async () => {
  const r = await route(ownerRoute);
  assert.equal((await r.DELETE(request({}), params)).status, 200);
  const call = r.calls.find(c => c.op === 'upsert');
  assert.deepEqual(call.options, { onConflict: 'comment_id,creator_id' });
  assert.equal(call.data.creator_id, 'viewer'); assert.equal(call.data.is_deleted, true);
  assert(r.calls[0].filters.some(([k,v]) => k === 'track_id' && v === 'track'));
});
test('suppression refusée ou DB en erreur : jamais de faux succès', async () => {
  for (const [options,status] of [[{user:null},401], [{owner:'other'},403], [{missing:true},404], [{failure:true},500]]) {
    const r = await route(ownerRoute, options);
    assert.equal((await r.DELETE(request({}), params)).status, status);
  }
});
test('modération créateur : actions existantes et même PK corrigée', async () => {
  for (const action of ['delete','favorite','filter','unfilter']) {
    const r = await route(creatorRoute);
    assert.equal((await r.POST(request({action}), params)).status, 200);
    assert.deepEqual(r.calls.find(c=>c.op==='upsert').options, {onConflict:'comment_id,creator_id'});
  }
});
test('modération refuse cible croisée, non-créateur, action inconnue et erreur DB', async () => {
  for (const [options,action,status] of [[{owner:'other'},'filter',403], [{missing:true},'filter',404], [{},'unknown',400], [{failure:true},'filter',500]]) {
    const r = await route(creatorRoute, options);
    assert.equal((await r.POST(request({action}), params)).status, status);
  }
});
test('replies et likes ne mutent jamais une cible inexistante ou un autre morceau', async () => {
  for (const name of ['replies','like']) {
    const r = await route(`app/api/tracks/[id]/comments/[commentId]/${name}/route.ts`, {missing:true});
    assert.equal((await r.POST(request({content:'Test'}), params)).status, 404);
    assert(r.calls.find(c=>c.table==='comments').filters.some(([k,v])=>k==='track_id' && v==='track'));
    assert(!r.calls.some(c=>c.op==='upsert'));
  }
});

test('waveform : peaks JSONB sérialisés pour pg, contrat HTTP tableau conservé', async () => {
  const r = await route('app/api/tracks/[id]/waveform/route.ts');
  const peaks = Array.from({ length: 16 }, (_, i) => i / 16);
  const response = await r.POST(request({ duration: 120, peaks }), params);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).peaks, peaks);
  const call = r.calls.find(c => c.table === 'track_waveforms' && c.op === 'upsert');
  assert.equal(typeof call.data.peaks, 'string');
  assert.deepEqual(JSON.parse(call.data.peaks), peaks);
  assert.deepEqual(call.options, { onConflict: 'track_id,track_type' });
});
