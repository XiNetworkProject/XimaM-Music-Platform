import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = fileURLToPath(new URL('../', import.meta.url));

// Execute the actual TypeScript handlers with isolated provider/session/database
// dependencies. No real environment secrets, network or database are accessible.
function harness(options = {}) {
  const calls = { rpc: [], provider: [], inserts: [], errors: [] };
  const cache = new Map();
  const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const database = {
    from(table) {
      const builder = {
        select() { return builder; },
        eq() { return builder; },
        async maybeSingle() {
          return { data: table === 'profiles' ? { plan: options.plan || 'starter' } : { balance: 120 }, error: null };
        },
        async insert(row) { calls.inserts.push(row); return { error: options.insertError || null }; },
      };
      return builder;
    },
    async rpc(name, args) {
      calls.rpc.push({ name, args });
      if (name === 'ai_add_credits') return { error: options.refundError || null };
      return { data: options.debitResult ?? true, error: null };
    },
  };
  const mocks = {
    'next/server': { NextResponse: { json: (body, init = {}) => response(body, init.status || 200) } },
    '@/lib/getApiSession': { getApiSession: async () => options.unauthenticated ? null : { user: { id: 'user-test' } } },
    '@/lib/database': { dbAdmin: database },
    '@/lib/credits': { CREDITS_PER_GENERATION: 12 },
    '@/lib/remixServer': { assertCanCreateAiVariation: async () => options.remixResult || { ok: true, source: { id: 'source-test' } } },
    '@/lib/remixOptions': {
      sanitizeRemixPrompt: (value) => value,
      sanitizeRemixPromptVisibility: (value) => value || 'private',
      sanitizeRemixType: (value) => value || 'variation',
    },
    '@/lib/sunoWebhook': {
      buildSunoCallbackUrl: () => {
        if (options.callbackFailure) throw new Error('synthetic-private-config');
        return 'https://callback.invalid/api/suno/callback?test-signature=1';
      },
    },
    '@/lib/security/requestSecurity': {
      rejectUntrustedMutationOrigin: () => null,
      enforceRequestRateLimit: () => null,
      readLimitedJson: async (request) => ({ ok: true, value: await request.json() }),
    },
  };
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const source = fs.readFileSync(filename, 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const module = { exports: {} };
    cache.set(filename, module);
    const requireIsolated = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith('@/lib/')) return load(`${id.slice(2)}.ts`);
      if (id.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), `${id}.ts`)));
      throw new Error(`Unexpected dependency: ${id}`);
    };
    new Function('require', 'module', 'exports', 'process', 'fetch', 'console', 'crypto', 'AbortSignal', compiled)(
      requireIsolated, module, module.exports,
      { env: { SUNO_API_KEY: 'test-placeholder', SUNO_API_BASE: 'https://provider.invalid' } },
      async (url, init) => {
        calls.provider.push({ url, body: JSON.parse(init.body) });
        if (options.providerFailure) throw new Error('synthetic-private-provider-detail');
        return response(options.providerReply ?? { code: 200, msg: 'synthetic-private-provider-detail', data: { taskId: 'test-task' } }, options.providerStatus ?? 200);
      },
      { error: (...args) => calls.errors.push(args), log: () => {}, warn: () => {} },
      { randomUUID }, AbortSignal,
    );
    return module.exports;
  }
  return {
    calls,
    load,
    async post(route, body) {
      const request = new Request(`https://app.invalid/api/suno/${route}`, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
      return load(`app/api/suno/${route}/route.ts`).POST(request);
    },
  };
}

const custom = { customMode: true, instrumental: false, model: 'V6', title: 'Une chanson', style: 'pop, piano', prompt: '[Verse]\n  Mes paroles exactes.  \n' };
const cover = { uploadUrl: 'https://media.invalid/source.mp3', sourceDurationSec: 100 };
const debits = (h) => h.calls.rpc.filter((call) => call.name === 'ai_debit_credits');
const refunds = (h) => h.calls.rpc.filter((call) => call.name === 'ai_add_credits');

test('validation uses V6 text limits and distinct cover/simple limits', () => {
  const { validateSunoGenerationInput: validate } = harness().load('lib/sunoValidation.ts');
  for (const model of ['V6', 'V6_WILD', 'V6_MINI']) {
    assert.equal(validate({ ...custom, model, prompt: 'a'.repeat(5000), style: 'a'.repeat(1000), title: 'a'.repeat(80) }).ok, true);
    for (const [key, value] of [['prompt', 'a'.repeat(5001)], ['style', 'a'.repeat(1001)], ['title', 'a'.repeat(81)]]) {
      assert.equal(validate({ ...custom, model, [key]: value }).ok, false, `${model}: ${key}`);
    }
    assert.equal(validate({ ...custom, customMode: false, model, prompt: 'a'.repeat(3000) }).ok, true);
    assert.equal(validate({ ...custom, customMode: false, model, prompt: 'a'.repeat(3001) }).ok, false);
    assert.equal(validate({ ...custom, customMode: false, model, hasUploadUrl: true, prompt: 'a'.repeat(500) }).ok, true);
    assert.equal(validate({ ...custom, customMode: false, model, hasUploadUrl: true, prompt: 'a'.repeat(501) }).ok, false);
  }
  assert.equal(validate({ ...custom, prompt: `${'a'.repeat(5000)} ` }).ok, false, 'do not trim away overflow before sending unchanged lyrics');
});

test('duration is optional or an integer 10–360 in custom generation and cover', () => {
  const { validateSunoGenerationInput: validate, validateUploadCoverExtra } = harness().load('lib/sunoValidation.ts');
  for (const hasUploadUrl of [false, true]) {
    for (const duration of [undefined, 10, 180, 360]) assert.equal(validate({ ...custom, hasUploadUrl, duration }).ok, true);
    for (const duration of [9, 361, 10.5, '180', Infinity, NaN]) assert.equal(validate({ ...custom, hasUploadUrl, duration }).ok, false);
    assert.equal(validate({ ...custom, hasUploadUrl, customMode: false, duration: 180 }).ok, false);
  }
  for (const duration of [0, -1, Infinity, NaN, '50', 481]) assert.equal(validateUploadCoverExtra('V6', duration).ok, false);
  assert.equal(validateUploadCoverExtra('V6', 480).ok, true);
});

test('new request normalization does not change historical display identity', () => {
  const h = harness();
  const { normalizeSunoModel } = h.load('lib/sunoValidation.ts');
  const { getSunoModelLabel } = h.load('lib/sunoModels.ts');
  assert.equal(normalizeSunoModel('V5_5'), 'V6');
  assert.equal(normalizeSunoModel(' v6_wild '), 'V6_WILD');
  assert.equal(getSunoModelLabel('V5_5'), 'V5.5');
  assert.equal(getSunoModelLabel('UPLOAD'), 'UPLOAD');
});

for (const route of ['generate', 'upload-cover']) {
  const requestBody = (patch = {}) => ({ ...custom, ...(route === 'upload-cover' ? cover : {}), ...patch });

  test(`${route}: invalid text, tuning and duration never debit credits or call provider`, async () => {
    for (const patch of [
      { title: '' }, { title: 'a'.repeat(81) }, { prompt: 7 }, { instrumental: 'false' },
      { customMode: 'false' }, { styleWeight: 2 }, { vocalGender: 'male' }, { negativeTags: {} },
      { duration: 361 }, { duration: 10.5 }, { customMode: false, duration: 120 },
      ...(route === 'upload-cover' ? [{ sourceDurationSec: 481 }, { uploadUrl: 'javascript:bad' }] : []),
    ]) {
      const h = harness();
      const res = await h.post(route, requestBody(patch));
      assert.equal(res.status, 400, JSON.stringify(patch));
      assert.equal(debits(h).length, 0);
      assert.equal(h.calls.provider.length, 0);
    }
  });

  test(`${route}: callback configuration is checked before debit`, async () => {
    const h = harness({ callbackFailure: true });
    const res = await h.post(route, requestBody());
    assert.equal(res.status, 502);
    assert.equal(debits(h).length, 0);
    assert.equal(h.calls.provider.length, 0);
    assert.doesNotMatch(await res.text(), /synthetic-private/);
  });

  test(`${route}: paid plans send all V6 variants with exact lyrics and duration`, async () => {
    for (const plan of ['starter', 'pro']) {
      for (const model of ['V6', 'V6_WILD', 'V6_MINI']) {
        const h = harness({ plan });
        const res = await h.post(route, requestBody({ model, duration: 360, bpm: 130, key: 'A minor', durationHint: 'unused legacy hint' }));
        const json = await res.json();
        assert.equal(res.status, 200);
        assert.equal(json.model, model);
        assert.equal(json.requestedModel, model);
        assert.equal(json.modelAdjusted, false);
        assert.equal(json.credits.debited, 12);
        assert.equal(debits(h).length, 1);
        assert.equal(refunds(h).length, 0);
        assert.equal(h.calls.provider[0].body.model, model);
        assert.equal(h.calls.provider[0].body.prompt, custom.prompt);
        assert.equal(h.calls.provider[0].body.duration, 360);
        assert.equal(h.calls.provider[0].body.callBackUrl, 'https://callback.invalid/api/suno/callback?test-signature=1');
        assert.equal(h.calls.inserts[0].prompt, custom.prompt);
        assert.equal(h.calls.inserts[0].model, model);
        assert.equal(h.calls.inserts[0].metadata.duration, 360);
        assert.doesNotMatch(JSON.stringify(json), /synthetic-private/);
      }
    }
  });

  test(`${route}: free model restrictions and old drafts report actual adjusted model`, async () => {
    for (const model of ['V6', 'V6_WILD', 'V5_5', 'unknown-model']) {
      const h = harness({ plan: 'free' });
      const res = await h.post(route, requestBody({ model }));
      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.model, 'V6_MINI');
      assert.equal(json.requestedModel, model);
      assert.equal(json.modelAdjusted, true);
      assert.equal(h.calls.provider[0].body.model, 'V6_MINI');
    }
    const mini = harness({ plan: 'free' });
    const miniResponse = await mini.post(route, requestBody({ model: 'V6_MINI' }));
    const miniJson = await miniResponse.json();
    assert.equal(miniResponse.status, 200);
    assert.equal(miniJson.model, 'V6_MINI');
    assert.equal(miniJson.modelAdjusted, false);

    const defaults = harness({ plan: 'free' });
    const defaultResponse = await defaults.post(route, requestBody({ model: undefined }));
    const defaultJson = await defaultResponse.json();
    assert.equal(defaultResponse.status, 200);
    assert.equal(defaultJson.model, 'V6_MINI');
    assert.equal(defaultJson.requestedModel, 'V6');
    assert.equal(defaultJson.modelAdjusted, true);
  });

  test(`${route}: simple mode sends description without custom fields or duration`, async () => {
    const h = harness();
    const res = await h.post(route, requestBody({ customMode: false, prompt: 'a'.repeat(route === 'upload-cover' ? 500 : 3000) }));
    assert.equal(res.status, 200);
    const payload = h.calls.provider[0].body;
    assert.equal(payload.customMode, false);
    for (const key of ['duration', 'title', 'style', 'styleWeight', 'weirdnessConstraint', 'audioWeight']) assert.equal(key in payload, false, key);
  });

  test(`${route}: explicit provider rejection gets one refund and sanitized error`, async () => {
    const h = harness({ providerReply: { code: 400, msg: 'synthetic-private-provider-detail' } });
    const res = await h.post(route, requestBody());
    assert.equal(res.status, 502);
    assert.equal(debits(h).length, 1);
    assert.equal(refunds(h).length, 1);
    assert.equal(refunds(h)[0].args.p_amount, 12);
    assert.equal(h.calls.inserts.length, 0);
    assert.doesNotMatch(await res.text(), /synthetic-private/);
  });

  test(`${route}: refund RPC failure is checked and not retried blindly`, async () => {
    const h = harness({ providerStatus: 400, providerReply: { code: 400 }, refundError: { message: 'synthetic-private-db-detail' } });
    const res = await h.post(route, requestBody());
    assert.equal(res.status, 502);
    assert.equal(refunds(h).length, 1);
    assert.ok(h.calls.errors.some((args) => args.join(' ').includes('remboursement impossible')));
    assert.doesNotMatch(await res.text(), /synthetic-private/);
  });

  test(`${route}: lost or incomplete acceptance is not refunded as a definite rejection`, async () => {
    for (const options of [{ providerFailure: true }, { providerReply: { code: 200, data: {} } }, { providerReply: {} }]) {
      const h = harness(options);
      const res = await h.post(route, requestBody());
      assert.equal(res.status, 502);
      assert.equal(debits(h).length, 1);
      assert.equal(refunds(h).length, 0);
    }
  });

  test(`${route}: unauthenticated or failed debit cannot call provider`, async () => {
    for (const options of [{ unauthenticated: true }, { debitResult: false }]) {
      const h = harness(options);
      const res = await h.post(route, requestBody());
      assert.equal(res.status, options.unauthenticated ? 401 : 402);
      assert.equal(h.calls.provider.length, 0);
    }
  });
}

test('low-level custom helper defaults V6 but preserves an explicit legacy caller model', async () => {
  const h = harness();
  const { generateCustomMusic } = h.load('lib/suno.ts');
  await generateCustomMusic({ ...custom, model: undefined });
  await generateCustomMusic({ ...custom, model: 'V4_5PLUS' });
  assert.deepEqual(h.calls.provider.map((call) => call.body.model), ['V6', 'V4_5PLUS']);
});

test('generation still enforces remix permission before debit and preserves challenge context', async () => {
  const request = { ...custom, remixSource: { sourceTrackId: 'source-test', sourceTrackType: 'ai_track' }, remixType: 'variation', remixPrompt: 'Un nouveau style', remixPromptVisibility: 'private', challengeId: 'challenge-test' };
  const denied = harness({ remixResult: { ok: false, status: 403, error: 'Variation non autorisée' } });
  const deniedResponse = await denied.post('generate', request);
  assert.equal(deniedResponse.status, 403);
  assert.equal(debits(denied).length, 0);
  assert.equal(denied.calls.provider.length, 0);

  const permitted = harness();
  assert.equal((await permitted.post('generate', request)).status, 200);
  const metadata = permitted.calls.inserts[0].metadata;
  assert.equal(metadata.challengeId, 'challenge-test');
  assert.deepEqual(metadata.remixSource, { id: 'source-test' });
  assert.equal(metadata.remixPromptVisibility, 'private');
});
