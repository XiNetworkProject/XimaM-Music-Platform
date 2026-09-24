import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CallRegistry, CallError, CALL_RING_MS, CALL_LEASE_MS, CALL_MAX_MS } from '../lib/voice/callRegistry.ts';
import { voiceConfig } from '../lib/voice/config.ts';

function setup(group = false, capacity = 4) {
  let time = 1_000_000; let count = 0; let denied = false; let failDelete = false; let failCreate = false;
  let people = [{ id: 'a', name: 'Alice' }, { id: 'b', name: 'Bob' }, ...(group ? [{ id: 'c', name: 'Chloé' }] : [])];
  const events = [];
  const registry = new CallRegistry({ now: () => time, id: () => `call-${++count}`,
    access: async (_id, user) => { if (denied || !people.some(p => p.id === user)) throw new CallError('Forbidden', 403); return { title: 'Fixture', group, people }; },
    createRoom: async room => { events.push(['create', room]); if (failCreate) throw new Error('Create response lost'); },
    deleteRoom: async room => { events.push(['delete', room]); if (failDelete) throw new Error('Offline'); },
    removeMember: async (room, id) => { events.push(['remove', room, id]); },
  }, capacity);
  return { registry, events, advance: ms => time += ms, deny: () => denied = true, remove: id => people = people.filter(p => p.id !== id), failDelete: value => failDelete = value, failCreate: value => failCreate = value };
}
test('calls are disabled by default and cannot use production ws or placeholder secrets', () => {
  assert.equal(voiceConfig({}), null);
  const env = { SYNAURA_CALLS_ENABLED: 'true', SYNAURA_CALLS_ACCESS: 'public', SYNAURA_CALLS_INSTANCE: 'unit-test', SYNAURA_CALLS_SINGLE_PROCESS: 'true', LIVEKIT_ROOM_AUTO_CREATE_DISABLED: 'true', LIVEKIT_URL: 'ws://127.0.0.1:7880', LIVEKIT_SERVER_URL: 'http://127.0.0.1:7880', LIVEKIT_API_KEY: 'test', LIVEKIT_API_SECRET: 'x'.repeat(40), NODE_ENV: 'development' };
  assert.equal(voiceConfig(env)?.maxParticipants, 8);
  assert.equal(voiceConfig({ ...env, NODE_ENV: 'production' }), null);
  assert.equal(voiceConfig({ ...env, LIVEKIT_ROOM_AUTO_CREATE_DISABLED: 'false' }), null);
  assert.equal(voiceConfig({ ...env, LIVEKIT_SERVER_URL: 'http://public.example' }), null);
  assert.equal(voiceConfig({ ...env, LIVEKIT_API_SECRET: 'replace'.repeat(8) }), null);
  assert.equal(voiceConfig({ ...env, SYNAURA_CALLS_MAX_PARTICIPANTS: '999' }), null);
});
test('start is idempotent per device and private acceptance is explicit', async () => {
  const { registry: r, events } = setup();
  const [a, b] = await Promise.all([r.start('a', 'conv', 'one'), r.start('a', 'conv', 'one')]);
  assert.equal(a.id, b.id); assert.equal(events.filter(e => e[0] === 'create').length, 1);
  assert.equal(r.list('b')[0].mine, 'invited');
  await assert.rejects(r.action('b', a.id, 'two', 'heartbeat'), /rejoint/);
  await r.action('b', a.id, 'two', 'join');
  assert.equal(r.list('a')[0].status, 'active');
  await r.action('b', a.id, 'two', 'leave');
  assert.equal(r.list('a').length, 0); assert.equal(events.at(-1)[0], 'delete');
});
test('unknown users, mismatched devices and simultaneous calls cannot join', async () => {
  const { registry: r } = setup(); const c = await r.start('a', 'conv', 'one');
  await assert.rejects(r.action('x', c.id, 'x', 'join'), /introuvable/);
  await assert.rejects(r.action('a', c.id, 'another', 'join'), /autre onglet/);
  await assert.rejects(r.start('a', 'other', 'one'), /déjà dans/);
  await assert.rejects(r.start('b', 'other', 'two'), /déjà en appel/);
});
test('decline, missed call and exhausted capacity close or refuse correctly', async () => {
  const f = setup(false, 1); const c = await f.registry.start('a', 'conv', 'one');
  await f.registry.action('b', c.id, 'two', 'decline'); assert.equal(c.status, 'ended');
  await f.registry.sweep();
  const next = await f.registry.start('a', 'conv', 'one'); f.advance(CALL_RING_MS + 1); await f.registry.sweep(); assert.equal(next.status, 'ended');
  const limited = setup(true, 1); await limited.registry.start('a', 'conv', 'one');
  await assert.rejects(limited.registry.start('b', 'other', 'two'), /occupés/);
});
test('concurrent joins across two groups can reserve a user only once', async () => {
  const { registry: r } = setup(true);
  const a = await r.start('a', 'one', 'a-device'); const b = await r.start('b', 'two', 'b-device');
  const results = await Promise.allSettled([r.action('c', a.id, 'c-device', 'join'), r.action('c', b.id, 'c-device', 'join')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected').length, 1);
});
test('forbidden conversation never creates a media room or invitation', async () => {
  const f = setup(); f.deny();
  await assert.rejects(f.registry.start('a', 'conv', 'one'), /Forbidden/);
  assert.equal(f.events.length, 0); assert.deepEqual(f.registry.list('a'), []);
});
test('a group keeps playing for remaining members and closes when empty', async () => {
  const { registry: r, events } = setup(true); const c = await r.start('a', 'conv', 'one');
  await r.action('b', c.id, 'two', 'join'); await r.action('c', c.id, 'three', 'join');
  await r.action('a', c.id, 'one', 'leave'); assert.equal(c.status, 'active'); assert.equal(events.at(-1)[0], 'remove');
  assert.equal(r.list('a')[0].mine, 'left');
  await r.action('a', c.id, 'one', 'join'); await r.action('a', c.id, 'one', 'leave');
  await r.action('b', c.id, 'two', 'leave'); await r.action('c', c.id, 'three', 'leave'); assert.equal(c.status, 'ended');
});
test('membership removal or block closes the room, not just the UI', async () => {
  for (const revoke of ['deny', 'remove']) {
    const f = setup(true); const c = await f.registry.start('a', 'conv', 'one');
    if (revoke === 'deny') f.deny(); else f.remove('b');
    await f.registry.sweep(); assert.equal(c.status, 'ended'); assert.equal(f.events.at(-1)[0], 'delete');
  }
});
test('lost heartbeats and maximum duration end calls', async () => {
  for (const duration of [CALL_LEASE_MS + 1, CALL_MAX_MS + 1]) {
    const f = setup(); const c = await f.registry.start('a', 'conv', 'one'); await f.registry.action('b', c.id, 'two', 'join');
    f.advance(duration); await f.registry.sweep(); assert.equal(c.status, 'ended');
  }
});
test('failed room closure retains tombstone and retries without exposing the call', async () => {
  const f = setup(); const c = await f.registry.start('a', 'conv', 'one'); f.failDelete(true);
  await assert.rejects(f.registry.action('a', c.id, 'one', 'leave'), /Offline/);
  assert.equal(f.registry.list('a').length, 0); assert.equal(c.closed, undefined);
  f.failDelete(false); await f.registry.sweep(); assert.equal(c.closed, true);
});
test('a lost CreateRoom response is cleaned up by maintenance', async () => {
  const f = setup(); f.failCreate(true);
  await assert.rejects(f.registry.start('a', 'conv', 'one'), /lost/);
  await f.registry.sweep(); assert.equal(f.events.at(-1)[0], 'delete');
});
test('transport grants restrict clients to microphones and no room administration', () => {
  const server = readFileSync(new URL('../lib/voice/server.ts', import.meta.url), 'utf8');
  assert.match(server, /canPublishSources: \[TrackSource.MICROPHONE\]/);
  assert.match(server, /ttl: 30/); assert.match(server, /canPublishData: false/);
  assert.doesNotMatch(server, /roomAdmin: true|roomCreate: true|roomRecord: true/);
  assert.match(server, /WHERE c.id = \$1 AND c.is_active = true AND EXISTS/);
  const route = readFileSync(new URL('../app/api/messages/calls/route.ts', import.meta.url), 'utf8');
  assert.match(route, /rejectUntrustedMutationOrigin/); assert.match(route, /readLimitedJson/); assert.match(route, /enforceRequestRateLimit/);
});
test('mounting or closing an idle provider cannot pause the musical session', () => {
  const code = readFileSync(new URL('../components/messaging/VoiceCallProvider.tsx', import.meta.url), 'utf8');
  assert.match(code, /if \(releaseMusic.current\) \{ getBrowserAudioCore\(\)\?\.pause\(\)/);
  assert.match(code, /track\.stop\(\)/); assert.match(code, /microphone.current\?\.stop\(\)/);
  assert.match(code, /await import\('livekit-client'\)/);
  assert.doesNotMatch(code, /NEXT_PUBLIC_LIVEKIT_API_SECRET|localStorage|sessionStorage/);
});
