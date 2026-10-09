import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STUDIO_TOOLS, STUDIO_STEMS, parseStudioInput, approvedToolPrices } from '../lib/studio/tools.ts';
import { buildStudioPayload, normalizeStudioResult, studioMediaUrl, studioProviderRequest, StudioProviderRejected, STUDIO_ENDPOINTS } from '../lib/studio/provider.ts';
import { encodeStudioMidi } from '../lib/studio/midi.ts';
const source = { id: 'mine', audioId: 'audio-mine', taskId: 'generation-mine', audioUrl: 'https://synaura.fr/api/media/source.mp3', duration: 180, model: 'V5', title: 'Original' };
const input = action => parseStudioInput({ action, sourceId: 'mine', secondSourceId: 'second', stemJobId: '00000000-0000-4000-8000-000000000001', title: 'Nouvelle version', style: 'Piano', lyrics: 'Nouveau couplet', fullLyrics: 'Paroles complètes', description: 'Voix douce', prompt: 'Une texture', start: 15, end: 30, stemName: 'Piano', variety: 4 });
const payload = action => buildStudioPayload(input(action), 'V6_MINI', 'https://synaura.fr/api/callback', source, { ...source, id: 'second', audioUrl: 'https://synaura.fr/second.mp3' }, 'owned-stem-task', 'owned-persona');
test('15 explicit tools, prices fail closed independently from suggested prices', () => {
  assert.equal(STUDIO_TOOLS.length, 15);
  assert.deepEqual(approvedToolPrices({}), {});
  assert.deepEqual(approvedToolPrices({ STUDIO_TOOLS_ENABLED: 'true', STUDIO_TOOLS_APPROVED_PRICES_JSON: '{"wav":2,"stems":-1,"unknown":99}' }), { wav: 2 });
  assert.deepEqual(approvedToolPrices({ STUDIO_TOOLS_ENABLED: 'true', STUDIO_TOOLS_APPROVED_PRICES_JSON: 'broken' }), {});
  assert.deepEqual(approvedToolPrices({ STUDIO_TOOLS_APPROVED_PRICES_JSON: '{"wav":2}' }), {});
});
test('strict fields: no arbitrary URL, provider id, callback, model coercion or NaN', () => {
  assert.equal(parseStudioInput({ action: 'wav', sourceId: 'mine', audioId: 'victim', uploadUrl: 'http://localhost', callBackUrl: 'https://evil.test' }).audioId, undefined);
  for (const body of [{}, { action: 'constructor' }, { action: 'sounds', prompt: 'x', variety: 4.5 }, { action: 'sounds', prompt: 'x', tempo: 0 }, { action: 'sounds', prompt: 'x', loop: 'false' }, { action: 'extend', sourceId: 'x', start: NaN }, { action: 'replace', sourceId: 'x' }, { action: 'mashup', sourceId: 'x', secondSourceId: 'x' }]) assert.throws(() => parseStudioInput(body));
});
test('source modes follow current provider contracts without mixing identifiers', () => {
  assert.equal(payload('extend').uploadUrl, source.audioUrl);
  assert.equal(payload('extend').continueAt, 15);
  assert.equal(payload('replace').audioId, undefined);
  assert.equal(payload('replace').model, 'V6_MINI');
  assert.equal(payload('replace').tags, 'Piano');
  assert.equal(payload('replace').fullLyrics, 'Paroles complètes');
  assert.equal(payload('vocals').prompt, 'Nouveau couplet');
  assert.equal(payload('instrumental').style, undefined);
  assert.equal(payload('instrumental').tags, 'Piano');
  assert.equal(payload('mashup').uploadUrlList.length, 2);
  assert.equal(payload('midi').taskId, 'owned-stem-task');
  assert.equal(payload('wav').audioId, 'audio-mine');
  assert.equal(payload('stems').type, 'separate_vocal');
  assert.equal(payload('stems_multi').type, 'split_stem');
  assert.equal(payload('stems_instrument').stemName, 'Piano');
  assert.equal(payload('persona').vocalStart, 15);
  assert.equal(payload('sounds').prompt, 'Une texture');
  assert.equal(payload('style').content, 'Une texture');
  assert.equal(payload('cover').taskId, 'generation-mine');
  assert.equal(payload('recovery').sunoTaskId, 'generation-mine');
});
test('ranges validated against actual server-side duration before billing', () => {
  for (const [action, start, end] of [['replace', 10, 19.99], ['replace', 170, 190], ['extend', 180, 190], ['extend', 0, 20], ['persona', 15, 15]]) assert.throws(() => buildStudioPayload({ ...input(action), start, end }, 'V6_MINI', 'callback', source));
  assert.throws(() => buildStudioPayload(input('extend'), 'V6', 'callback', { ...source, duration: 481 }));
  assert.throws(() => buildStudioPayload(input('wav'), 'V6', 'callback', { ...source, audioId: '' }));
});
test('media URLs reject credentials, local hosts, lookalikes and active content', () => {
  for (const url of ['javascript:alert(1)', 'http://synaura.fr/a', 'https://synaura.fr.evil.test/a', 'https://127.0.0.1/a', 'https://user:secret@synaura.fr/a', 'https://synaura.fr:444/a']) assert.equal(studioMediaUrl(url), '');
  assert.ok(studioMediaUrl('https://file.aiquickdraw.com/a.wav'));
});
test('normalization handles each async result and never treats missing data as completion', () => {
  assert.equal(normalizeStudioResult('wav', { data: { successFlag: 'SUCCESS', response: { audioWavUrl: 'https://file.aiquickdraw.com/a.wav' } } }).state, 'completed');
  assert.equal(normalizeStudioResult('wav', { data: { successFlag: 'SUCCESS', response: {} } }).state, 'pending');
  assert.equal(normalizeStudioResult('stems', { data: { successFlag: 'SUCCESS', response: { vocalUrl: 'https://file.aiquickdraw.com/v.mp3', instrumentalUrl: 'https://file.aiquickdraw.com/i.mp3' } } }).result.assets.length, 2);
  assert.equal(normalizeStudioResult('cover', { data: { successFlag: 2 } }).state, 'pending');
  assert.equal(normalizeStudioResult('midi', { data: { successFlag: 2 } }).state, 'failed');
  assert.equal(normalizeStudioResult('style', { data: { successFlag: '1', result: 'Ambient' } }).result.text, 'Ambient');
  assert.equal(normalizeStudioResult('persona', { data: { personaId: 'owned', description: 'Test' } }).state, 'completed');
  assert.equal(normalizeStudioResult('recovery', { code: 201 }).state, 'pending');
  assert.equal(normalizeStudioResult('extend', { data: { status: 'FIRST_SUCCESS' } }).state, 'pending');
});
test('provider 5xx / malformed acceptance remains uncertain; only explicit rejection refundable', async () => {
  const before = process.env.SUNO_API_KEY; process.env.SUNO_API_KEY = 'test-only';
  try {
    for (const [status, body, rejected] of [[500, { code: 500 }, false], [200, { code: 400 }, true], [401, { code: 401 }, true]]) {
      await assert.rejects(studioProviderRequest('/test', {}, async () => new Response(JSON.stringify(body), { status })), error => rejected === (error instanceof StudioProviderRejected));
    }
  } finally { if (before === undefined) delete process.env.SUNO_API_KEY; else process.env.SUNO_API_KEY = before; }
});
test('MIDI export contains standard header, tempo, note-on/off and skips invalid notes', () => {
  const bytes = Buffer.from(encodeStudioMidi([{ name: 'Piano', notes: [{ pitch: 60, start: 0, end: 1, velocity: 0.8 }, { pitch: 999, start: 0, end: 1, velocity: 1 }] }]));
  assert.equal(bytes.subarray(0, 4).toString(), 'MThd');
  assert.equal(bytes.readUInt16BE(10), 2);
  assert.ok(bytes.includes(Buffer.from([0x90, 60, 102])));
  assert.ok(bytes.includes(Buffer.from([0x80, 60, 0])));
});
test('new tasks are origin/auth guarded, bounded, owner scoped and never autoplay', () => {
  const route = fs.readFileSync('app/api/studio/jobs/route.ts', 'utf8');
  for (const fragment of ['rejectUntrustedMutationOrigin', 'getApiSession(req)', 'readLimitedJson', 'Idempotency-Key', 'enforceRequestRateLimit']) assert.ok(route.includes(fragment));
  const ui = fs.readFileSync('components/ai-studio/StudioTools.tsx', 'utf8');
  assert.ok(!/new Audio\(|<audio/.test(ui));
  const tasks = fs.readFileSync('components/ai-studio/useStudioTasks.ts', 'utf8');
  assert.ok(tasks.includes('document.hidden'));
  assert.ok(ui.includes('Confirmer et lancer'));
  assert.ok(tasks.includes('!owner || demo'));
});
