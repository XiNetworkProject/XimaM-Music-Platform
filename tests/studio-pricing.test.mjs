import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { STUDIO_TOOLS, approvedToolPrices, studioToolOffer, parseStudioInput } from '../lib/studio/tools.ts';
import { STUDIO_PRICING_POLICY, STUDIO_TARIFFS, accessibleStudioPrices, parseStudioPriceQuote, studioCreditsLabel } from '../lib/studio/pricing.ts';
import { studioEconomyScenario } from '../lib/studio/pricingAudit.ts';
import { CREDITS_PER_GENERATION, PLANS, CREDIT_PACKS, ACTION_COSTS } from '../lib/billing/pricing.ts';

test('familiar scale preserves subscriptions, packs, generation and existing balances', () => {
  assert.equal(CREDITS_PER_GENERATION, 12);
  assert.equal(ACTION_COSTS.stem_split.credits, STUDIO_TARIFFS.stems_multi);
  assert.deepEqual([PLANS.starter.monthlyCredits, PLANS.pro.monthlyCredits], [600, 2400]);
  assert.deepEqual(CREDIT_PACKS.map(p => p.credits), [120, 500, 1200, 3000]);
  assert.deepEqual(accessibleStudioPrices(), { extend: 12, replace: 6, vocals: 12, instrumental: 12, style: 1, persona: 0, stems: 10, stems_multi: 50, stems_instrument: 20, wav: 1, cover: 0 });
  for (const tool of STUDIO_TOOLS) assert.equal(tool.suggestedCredits, STUDIO_TARIFFS[tool.id]);
});
test('explicit versioned release opt-in, unknown costs closed, zero prices preserved', () => {
  assert.deepEqual(approvedToolPrices({ STUDIO_TOOLS_ENABLED: 'true' }), {});
  assert.deepEqual(approvedToolPrices({ STUDIO_TOOLS_PRICING_POLICY: STUDIO_PRICING_POLICY }), {});
  const env = { STUDIO_TOOLS_ENABLED: 'true', STUDIO_TOOLS_PRICING_POLICY: STUDIO_PRICING_POLICY };
  assert.deepEqual(approvedToolPrices(env), accessibleStudioPrices());
  assert.equal(approvedToolPrices(env).persona, 0);
  for (const action of ['mashup', 'sounds', 'midi', 'recovery']) assert.equal(approvedToolPrices(env)[action], undefined);
  assert.deepEqual(approvedToolPrices({ ...env, STUDIO_TOOLS_APPROVED_PRICES_JSON: 'bad' }), {});
  assert.deepEqual(approvedToolPrices({ ...env, STUDIO_TOOLS_APPROVED_PRICES_JSON: '{"wav":2}' }), { wav: 2 });
});
test('price visibility never misrepresents unavailable tools or missing tariffs as free', () => {
  assert.equal(studioToolOffer('cover', {}, false).enabled, false);
  assert.equal(studioToolOffer('cover', {}, false).displayCredits, 0);
  assert.equal(studioToolOffer('midi', {}, true).displayCredits, null);
  assert.equal(studioToolOffer('midi', {}, true).unavailableReason, 'pricing_review');
  assert.equal(studioToolOffer('wav', { wav: 1 }, false).unavailableReason, 'unavailable');
  assert.equal(studioToolOffer('cover', { cover: 0 }, true).enabled, true);
  assert.equal(studioCreditsLabel(0), 'Sans crédit');
  assert.equal(studioCreditsLabel(1), '1 crédit');
  assert.equal(studioCreditsLabel(12), '12 crédits');
});
test('quote is explicit, bounded and cannot be injected into the provider parameters', () => {
  for (const value of [undefined, null, '0', -1, 0.5, NaN, Infinity, 1001]) assert.throws(() => parseStudioPriceQuote(value));
  assert.equal(parseStudioPriceQuote(0), 0);
  assert.equal(parseStudioPriceQuote(12), 12);
  assert.equal(parseStudioInput({ action: 'wav', sourceId: 'mine', expectedCredits: 1 }).expectedCredits, undefined);
});
test('actual job service refuses changed price before debit and preserves accepted retries', async () => {
  let existing = null, writes = 0, calls = 0;
  const bindings = {
    'node:crypto': crypto,
    '@/lib/postgres': { queryDatabase: async sql => {
      if (sql.includes('to_regclass')) return { rows: [{ ready: true }] };
      if (sql.includes('request_key')) return { rows: existing ? [existing] : [] };
      throw new Error(`Unexpected database query: ${sql}`);
    }, withDatabaseTransaction: async () => { writes++; throw new Error('Must not debit'); } },
    '@/lib/entitlements': {}, '@/lib/sunoModels': {}, '@/lib/suno-media-cache': {},
    './tools': { STUDIO_TOOLS, approvedToolPrices: () => ({ wav: 1, persona: 0 }), StudioInputError: Error },
    './provider': { studioProviderRequest: () => { calls++; } },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync('lib/studio/jobs.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)(name => {
    assert.ok(name in bindings, name); return bindings[name];
  }, module, module.exports);
  const previous = process.env.SUNO_API_KEY;
  process.env.SUNO_API_KEY = 'test-only';
  try {
    const input = { action: 'wav', sourceId: 'mine' }, key = crypto.randomUUID();
    for (const quote of [0, 2, -1, NaN]) await assert.rejects(module.exports.createStudioJob('mine', key, input, () => 'unused', quote), e => e.status === 409);
    existing = { id: 'accepted', user_id: 'mine', request_hash: crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex'), input, action: 'wav', credits: 2, status: 'pending', result: { assets: [] } };
    assert.equal((await module.exports.createStudioJob('mine', key, input, () => 'unused', 2)).credits, 2);
    assert.equal(writes, 0); assert.equal(calls, 0);
  } finally { if (previous === undefined) delete process.env.SUNO_API_KEY; else process.env.SUNO_API_KEY = previous; }
});
test('economy audit exposes full-use risk and keeps unused credit liability', () => {
  const base = { revenueEur: 143.88 / 12, grantedCredits: 2400, extraRewardCredits: 0, customerCost: 12, providerCredits: 12, consumedFraction: 1, usdToEur: 1, reserveFraction: 0.2 };
  const full = studioEconomyScenario(base), half = studioEconomyScenario({ ...base, consumedFraction: 0.5 });
  assert.ok(full.remainingBeforeOtherCostsEur < 0);
  assert.equal(half.providerCostEur + half.outstandingProviderExposureEur, full.providerCostEur);
  assert.ok(studioEconomyScenario({ ...base, extraRewardCredits: 50 }).providerCostEur > full.providerCostEur);
  assert.throws(() => studioEconomyScenario({ ...base, customerCost: 0 }));
});
test('read-only audit CLI runs without credentials and produces explicit stress cases', () => {
  const report = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/audit-studio-pricing.mjs'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  assert.equal(report.scenarios.length, 32);
  assert.equal(report.tariffs.wav, 1);
  assert.equal(report.assumptions.usdToEur, 1);
  assert.equal(report.unavailablePendingCosts.length, 4);
});
test('price is shown before confirmation; reopening an existing result is not a paid submission', () => {
  const ui = fs.readFileSync('components/ai-studio/StudioTools.tsx', 'utf8');
  assert.ok(ui.includes('expectedCredits: capability.credits'));
  assert.ok(ui.includes('setConfirm(false); }, [capability?.credits, capability?.enabled]'));
  assert.ok(ui.includes('retrouver sans frais'));
  assert.ok(ui.includes('pas par résultat'));
  const route = fs.readFileSync('app/api/studio/jobs/route.ts', 'utf8');
  assert.ok(route.indexOf('parseStudioPriceQuote((parsed.value') < route.indexOf('await createStudioJob'));
});
