import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { voiceAccessPolicy, voiceUserAllowed, voiceConversationAllowed, voiceRoomPrefix, voiceRoomOwned } from '../lib/voice/access.ts';
import { voiceConfig } from '../lib/voice/config.ts';
import { CallRegistry } from '../lib/voice/callRegistry.ts';

const a = '10000000-0000-4000-8000-000000000001';
const b = '10000000-0000-4000-8000-000000000002';
const outsider = '10000000-0000-4000-8000-000000000003';
const callId = '20000000-0000-4000-8000-000000000001';
const env = { SYNAURA_CALLS_ACCESS: 'private', SYNAURA_CALLS_TEST_USER_IDS: `${a},${b}`, SYNAURA_CALLS_INSTANCE: 'qa-preview' };

test('private access is default and fails closed without two distinct approved UUIDs', () => {
  for (const value of ['', a, `${a},${a}`, `${a},`, `${a},*`, `${a},XimaM`, `${a},mail@example.test`]) {
    assert.equal(voiceAccessPolicy({ SYNAURA_CALLS_TEST_USER_IDS: value }), null, value);
  }
  assert.equal(voiceAccessPolicy({}), null);
  assert.equal(voiceAccessPolicy({ ...env, SYNAURA_CALLS_ACCESS: 'preview' }), null);
  assert.equal(voiceAccessPolicy({ ...env, SYNAURA_CALLS_TEST_USER_IDS: Array.from({ length: 9 }, (_, n) => `10000000-0000-4000-8000-00000000000${n}`).join(',') }), null);
});

test('only listed accounts and entirely approved conversations may call', () => {
  const policy = voiceAccessPolicy(env);
  assert.equal(voiceUserAllowed(policy, a), true);
  assert.equal(voiceUserAllowed(policy, outsider), false);
  assert.equal(voiceUserAllowed(policy, ''), false);
  assert.equal(voiceConversationAllowed(policy, [a, b]), true);
  assert.equal(voiceConversationAllowed(policy, [a, outsider]), false);
  assert.equal(voiceConversationAllowed(policy, [a, b, outsider]), false);
  assert.equal(voiceConversationAllowed(policy, []), false);
});

test('public access is an explicit operator decision, not a malformed private fallback', () => {
  assert.equal(voiceUserAllowed(voiceAccessPolicy({ SYNAURA_CALLS_ACCESS: 'public' }), outsider), true);
  assert.equal(voiceUserAllowed(voiceAccessPolicy({ SYNAURA_CALLS_ACCESS: 'PUBLIC' }), outsider), false);
});

test('rooms are isolated across deployments, modes and legacy names', () => {
  const policy = voiceAccessPolicy(env);
  const prefix = voiceRoomPrefix(env, policy);
  assert.equal(voiceRoomOwned(prefix, `${prefix}${callId}`), true);
  assert.equal(voiceRoomOwned(prefix, `synaura-call-${callId}`), false);
  assert.equal(voiceRoomOwned(prefix, `${prefix}other-${callId}`), false);
  const publicPrefix = voiceRoomPrefix({ ...env, SYNAURA_CALLS_ACCESS: 'public' }, { mode: 'public', userIds: [] });
  assert.equal(voiceRoomOwned(prefix, `${publicPrefix}${callId}`), false);
  const other = voiceRoomPrefix({ ...env, SYNAURA_CALLS_INSTANCE: 'another-preview' }, policy);
  assert.equal(voiceRoomOwned(prefix, `${other}${callId}`), false);
  for (const instance of ['', '*', '../production', 'production-']) assert.equal(voiceRoomPrefix({ ...env, SYNAURA_CALLS_INSTANCE: instance }, policy), null);
});

test('configuration cannot enable a private service with only one identity or no namespace', () => {
  const config = { ...env, SYNAURA_CALLS_ENABLED: 'true', SYNAURA_CALLS_SINGLE_PROCESS: 'true', LIVEKIT_ROOM_AUTO_CREATE_DISABLED: 'true', LIVEKIT_URL: 'wss://voice.example.test', LIVEKIT_SERVER_URL: 'http://127.0.0.1:7880', LIVEKIT_API_KEY: 'fixture', LIVEKIT_API_SECRET: 'f'.repeat(64) };
  assert.equal(voiceConfig(config)?.access.mode, 'private');
  assert.equal(voiceConfig({ ...config, SYNAURA_CALLS_TEST_USER_IDS: a }), null);
  assert.equal(voiceConfig({ ...config, SYNAURA_CALLS_INSTANCE: '' }), null);
  assert.equal(voiceConfig({ ...config, SYNAURA_CALLS_ENABLED: 'false' }), null);
});

test('registry creates a preview-prefixed room while keeping the single-identity guard', async () => {
  const rooms = [];
  const prefix = voiceRoomPrefix(env, voiceAccessPolicy(env));
  const registry = new CallRegistry({ roomPrefix: prefix, access: async () => ({ title: 'Fixture', group: false, people: [{ id: a, name: 'A' }, { id: b, name: 'B' }] }), createRoom: async room => rooms.push(room), deleteRoom: async () => {}, removeMember: async () => {}, now: Date.now, id: () => callId });
  await registry.start(a, 'fixture', 'pc');
  assert.deepEqual(rooms, [`${prefix}${callId}`]);
  await assert.rejects(registry.action(a, callId, 'phone', 'join'), /autre onglet/);
});

function routeHarness(user, policyEnv = env) {
  let serviceCalls = 0;
  const source = readFileSync(new URL('../app/api/messages/calls/route.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  const deps = {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/getApiSession': { getApiSession: async () => user ? { user: { id: user } } : null },
    '@/lib/voice/access': { voiceAccessPolicy, voiceUserAllowed },
    '@/lib/voice/server': { getVoiceService: async () => { serviceCalls++; return { registry: { list: () => [] } }; } },
    '@/lib/voice/callRegistry': { CallError: class extends Error {} },
    '@/lib/security/requestSecurity': { enforceRequestRateLimit: () => null, rejectUntrustedMutationOrigin: () => null, readLimitedJson: async () => { throw new Error('Outsider body must not be read'); } },
  };
  vm.runInNewContext(output, { exports, process: { env: policyEnv }, console, require: name => { if (!deps[name]) throw new Error(name); return deps[name]; } });
  return { route: exports, calls: () => serviceCalls };
}

test('outsider GET returns disabled, without starting LiveKit or disclosing the allowlist', async () => {
  const harness = routeHarness(outsider);
  const response = await harness.route.GET({});
  assert.deepEqual(await response.json(), { enabled: false, calls: [] });
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(harness.calls(), 0);
});

test('outsider POST is forbidden before reading client flags or creating credentials', async () => {
  const harness = routeHarness(outsider);
  assert.equal((await harness.route.POST({})).status, 403);
  assert.equal(harness.calls(), 0);
});

test('authorized GET reaches the service; anonymous and incomplete configuration never do', async () => {
  const allowed = routeHarness(a);
  assert.equal((await (await allowed.route.GET({})).json()).enabled, true);
  assert.equal(allowed.calls(), 1);
  const anonymous = routeHarness(null);
  assert.equal((await anonymous.route.GET({})).status, 401);
  assert.equal((await anonymous.route.POST({})).status, 401);
  assert.equal(anonymous.calls(), 0);
  const unconfigured = routeHarness(a, {});
  assert.equal((await (await unconfigured.route.GET({})).json()).enabled, false);
  assert.equal(unconfigured.calls(), 0);
});

test('server enforces the policy for all members before block/friend queries and token issuance', () => {
  const server = readFileSync(new URL('../lib/voice/server.ts', import.meta.url), 'utf8');
  assert.ok(server.indexOf('voiceConversationAllowed(config.access, ids)') < server.indexOf('FROM public.user_blocks'));
  assert.match(server, /voiceRoomOwned\(config.roomPrefix, room.name\)/);
  assert.doesNotMatch(server, /room.name.startsWith\('synaura-call-'\)/);
  assert.match(server, /voiceUserAllowed\(service.config.access, user\)/);
});
