// Isolated PostgreSQL only. Executes real job service with a deterministic provider.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import ts from 'typescript';
import pg from 'pg';
import * as tools from '../lib/studio/tools.ts';
import * as provider from '../lib/studio/provider.ts';
import * as models from '../lib/sunoModels.ts';
const url = new URL(process.env.STUDIO_TEST_DATABASE_URL || 'http://invalid');
if (!/^\/synaura_studio_test_\d+$/.test(url.pathname)) throw new Error('Disposable Studio database required');
const pool = new pg.Pool({ connectionString: url.toString(), max: 8 });
const cases = [];
const run = async (name, fn) => { await fn(); cases.push(name); console.log('PASS ' + name); };
const tx = async fn => { const client = await pool.connect(); try { await client.query('BEGIN'); const value = await fn(client); await client.query('COMMIT'); return value; } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); } };
let behavior = 'accept', submissions = 0, nextTask = 0, earlyCallback, pollResult;
const bindings = {
  'node:crypto': crypto,
  '@/lib/postgres': { queryDatabase: (...args) => pool.query(...args), withDatabaseTransaction: tx },
  '@/lib/entitlements': { getEntitlements: plan => ({ ai: { availableModels: plan === 'free' ? ['V6_MINI'] : ['V6', 'V6_MINI', 'V6_WILD'] } }) },
  '@/lib/sunoModels': models,
  '@/lib/suno-media-cache': { cacheSunoTrackMedia: async input => ({ audioUrl: input.audioUrl, imageUrl: input.imageUrl }) },
  './tools': tools,
  './provider': { ...provider, studioProviderRequest: async (path, payload) => {
    if (!payload) return pollResult;
    submissions++;
    if (behavior === 'reject') throw new provider.StudioProviderRejected('rejected');
    if (behavior === 'timeout') throw new Error('connection lost');
    const task = `test-provider-${++nextTask}`;
    if (earlyCallback) await earlyCallback(task);
    return { code: 200, data: { taskId: task } };
  } },
};
const mod = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync('lib/studio/jobs.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)(name => { if (!(name in bindings)) throw new Error('Unbound ' + name); return bindings[name]; }, mod, mod.exports);
const jobs = mod.exports;
try {
  const baseline = fs.readFileSync('database/baseline/010_production_schema.sql', 'utf8');
  await pool.query('CREATE TABLE public.profiles(id uuid PRIMARY KEY,plan text)');
  for (const name of ['ai_credit_balances', 'credit_ledger', 'ai_generations', 'ai_tracks']) {
    const match = baseline.match(new RegExp(`CREATE TABLE public\.${name} \\([\\s\\S]+?\\n\\);`));
    assert.ok(match, name); await pool.query(match[0]);
  }
  await pool.query('ALTER TABLE public.ai_credit_balances ADD PRIMARY KEY(user_id)');
  await pool.query('ALTER TABLE public.ai_generations ADD PRIMARY KEY(id)');
  await pool.query('ALTER TABLE public.ai_tracks ADD PRIMARY KEY(id)');
  for (const name of ['ai_add_credits', 'ai_debit_credits']) {
    const matches = Array.from(baseline.matchAll(new RegExp(`CREATE FUNCTION public\.${name}\\([\\s\\S]+?\\n\\$\\$;`, 'g')));
    const match = matches.find(value => value[0].includes('p_source text'));
    assert.ok(match, name); await pool.query(match[0]);
  }
  await tx(client => client.query(fs.readFileSync('database/migrations/20261008220000_studio_tool_jobs.sql', 'utf8')));
  const user = crypto.randomUUID(), other = crypto.randomUUID(), generation = crypto.randomUUID(), track = crypto.randomUUID();
  await pool.query('INSERT INTO public.profiles VALUES($1,$3),($2,$3)', [user, other, 'free']);
  await pool.query('INSERT INTO public.ai_credit_balances(user_id,balance) VALUES($1,1000),($2,1000)', [user, other]);
  await pool.query("INSERT INTO public.ai_generations(id,user_id,prompt,model,status,task_id) VALUES($1,$2,'','V6_MINI','completed','test-original')", [generation, user]);
  await pool.query("INSERT INTO public.ai_tracks(id,generation_id,suno_id,title,audio_url,duration) VALUES($1,$2,'test-audio','Original','https://synaura.fr/api/media/test.mp3',180)", [track, generation]);
  await pool.query('UPDATE public.ai_tracks SET source_links=$2 WHERE id=$1', [track, { library_folder: 'Mon album' }]);
  const input = tools.parseStudioInput({ action: 'extend', sourceId: track, start: 150, model: 'V6_MINI', style: 'Piano', title: 'Test' });
  const callback = id => `https://synaura.fr/api/studio/jobs/${id}/callback`;
  const create = (key = crypto.randomUUID(), who = user, body = input) => jobs.createStudioJob(who, key, body, callback);
  const balance = async () => (await pool.query('SELECT balance FROM public.ai_credit_balances WHERE user_id=$1', [user])).rows[0].balance;
  process.env.SUNO_API_KEY = 'test-only-not-a-provider-key';
  await run('unapproved prices: zero database debit / zero provider calls', async () => {
    delete process.env.STUDIO_TOOLS_ENABLED;
    await assert.rejects(create(), error => error.status === 409); assert.equal(submissions, 0); assert.equal(await balance(), 1000);
  });
  process.env.STUDIO_TOOLS_ENABLED = 'true';
  process.env.STUDIO_TOOLS_APPROVED_PRICES_JSON = JSON.stringify(Object.fromEntries(tools.STUDIO_TOOLS.map(tool => [tool.id, tool.suggestedCredits])));
  await run('foreign source, out-of-bounds range and paid model rejected before debit', async () => {
    await assert.rejects(create(crypto.randomUUID(), other), error => error.status === 404);
    await assert.rejects(create(crypto.randomUUID(), user, { ...input, start: 190 }));
    await assert.rejects(create(crypto.randomUUID(), user, { ...input, model: 'V6_WILD' }), error => error.status === 403);
    assert.equal(submissions, 0); assert.equal(await balance(), 1000);
  });
  let concurrent;
  await run('eight simultaneous identical requests: one provider submission / one debit', async () => {
    const key = crypto.randomUUID(); const results = await Promise.all(Array.from({ length: 8 }, () => create(key)));
    assert.equal(new Set(results.map(job => job.id)).size, 1); assert.equal(submissions, 1); assert.equal(await balance(), 988);
    await assert.rejects(create(key, user, { ...input, start: 100 }), error => error.status === 409);
    concurrent = results[0];
  });
  await run('owner-scoped history and status', async () => {
    assert.equal((await jobs.listStudioJobs(other)).length, 0);
    await assert.rejects(jobs.refreshStudioJob(concurrent.id, other), error => error.status === 404);
  });
  await run('concurrent duplicate completion: exactly one generation, private output', async () => {
    const result = { assets: [{ label: 'New version', url: 'https://file.aiquickdraw.com/audio.mp3', kind: 'audio', providerAudioId: 'test-result', duration: 42 }] };
    await Promise.all(Array.from({ length: 6 }, () => jobs.settleStudioJob(concurrent.id, 'completed', structuredClone(result))));
    const generations = await pool.query("SELECT * FROM public.ai_generations WHERE metadata->>'studioJobId'=$1", [concurrent.id]);
    assert.equal(generations.rowCount, 1); assert.equal(generations.rows[0].is_public, false);
    assert.equal(generations.rows[0].metadata.studioAction, 'extend');
    assert.deepEqual(generations.rows[0].metadata.sourceIds, [input.sourceId]);
    const tracks = await pool.query('SELECT * FROM public.ai_tracks WHERE generation_id=$1', [generations.rows[0].id]);
    assert.equal(tracks.rowCount, 1); assert.equal(tracks.rows[0].is_public, false);
    assert.equal(tracks.rows[0].source_links.library_folder, 'Mon album');
    await jobs.settleStudioJob(concurrent.id, 'failed', { assets: [] }); assert.equal(await balance(), 988);
  });
  await run('explicit rejection: refund exactly once despite duplicate failure callbacks', async () => {
    behavior = 'reject'; const before = await balance(); const job = await create();
    assert.equal(job.status, 'failed'); assert.equal(job.refunded, true); assert.equal(await balance(), before);
    await Promise.all([jobs.settleStudioJob(job.id, 'failed', { assets: [] }), jobs.settleStudioJob(job.id, 'failed', { assets: [] })]);
    assert.equal(await balance(), before);
  });
  await run('timeout: uncertain, no refund, same-key retry never resubmits', async () => {
    behavior = 'timeout'; const key = crypto.randomUUID(), before = await balance(); const job = await create(key), calls = submissions;
    assert.equal(job.status, 'uncertain'); assert.equal(job.refunded, false); assert.equal(await balance(), before - 12);
    const retry = await create(key); assert.equal(retry.id, job.id); assert.equal(submissions, calls);
  });
  await run('signed early callback can bind task before create response', async () => {
    behavior = 'accept'; const key = crypto.randomUUID();
    earlyCallback = async task => { const { rows } = await pool.query('SELECT id FROM public.studio_tool_jobs WHERE request_key=$1', [key]); await jobs.bindProviderTask(rows[0].id, task); };
    const job = await create(key); assert.equal(job.status, 'pending'); earlyCallback = null;
    await assert.rejects(jobs.bindProviderTask(job.id, 'wrong-task'), error => error.status === 409);
  });
  await run('poll explicit failure refunds; missing results remain pending', async () => {
    const job = await create(); const before = await balance(); pollResult = { code: 200, data: { status: 'GENERATE_AUDIO_FAILED' } };
    const final = await jobs.refreshStudioJob(job.id, user); assert.equal(final.status, 'failed'); assert.equal(await balance(), before + 12);
  });
  await run('insufficient balance rolls back both task reservation and credit ledger', async () => {
    await pool.query('UPDATE public.ai_credit_balances SET balance=0 WHERE user_id=$1', [user]);
    const key = crypto.randomUUID(), calls = submissions;
    await assert.rejects(create(key), error => error.status === 402);
    assert.equal(submissions, calls); assert.equal((await pool.query('SELECT id FROM public.studio_tool_jobs WHERE request_key=$1', [key])).rowCount, 0);
  });
  console.log(JSON.stringify({ passed: cases.length, provider: 'stub only', database: url.pathname.slice(1), productionDataWrites: 0 }));
} finally { await pool.end(); }
