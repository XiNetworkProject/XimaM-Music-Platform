// Opt-in loopback-only control-plane smoke. No database, users or production.
// Supply a checksum-verified LiveKit binary path, never an installer URL.
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { AccessToken, RoomServiceClient, TokenVerifier, TrackSource } from 'livekit-server-sdk';

const binary = process.argv[2];
if (!binary) throw new Error('Usage: node scripts/voice-local-smoke.mjs <verified-livekit-binary>');
async function isOpen(port) {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const done = result => { socket.destroy(); resolve(result); };
    socket.once('connect', () => done(true)); socket.once('error', () => done(false)); socket.setTimeout(400, () => done(false));
  });
}
for (const port of [17880, 17881]) if (await isOpen(port)) throw new Error(`Smoke port ${port} already occupied`);
const key = `local-${randomBytes(12).toString('hex')}`;
const secret = randomBytes(32).toString('hex');
const config = { port: 17880, bind_addresses: ['127.0.0.1'], rtc: { tcp_port: 17881, udp_port: 17882, node_ip: '127.0.0.1', use_external_ip: false, enable_loopback_candidate: true, ips: { includes: ['127.0.0.1/32'] } }, room: { auto_create: false, max_participants: 8, empty_timeout: 60 }, logging: { level: 'error' }, keys: { [key]: secret } };
const childEnv = { ...process.env, LIVEKIT_CONFIG: JSON.stringify(config) };
delete childEnv.LIVEKIT_KEYS; delete childEnv.LIVEKIT_API_KEY; delete childEnv.LIVEKIT_API_SECRET;
const child = spawn(resolve(binary), ['--bind', '127.0.0.1'], { env: childEnv, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let diagnostic = '';
child.stderr.on('data', chunk => { diagnostic = (diagnostic + String(chunk)).slice(-2000); });
child.stdout.on('data', chunk => { diagnostic = (diagnostic + String(chunk)).slice(-2000); });
let spawnError = false; child.on('error', () => { spawnError = true; });
const media = new RoomServiceClient('http://127.0.0.1:17880', key, secret, { requestTimeout: 3 });
const name = `synaura-call-smoke-${randomUUID()}`;
try {
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (spawnError || child.exitCode !== null) throw new Error(`Local LiveKit failed to start: ${diagnostic.split(secret).join('[redacted]').split(key).join('[redacted]')}`);
    try { await media.listRooms(); ready = true; break; } catch { await delay(150); }
  }
  assert.equal(ready, true, 'Local control plane ready');
  await media.createRoom({ name, maxParticipants: 8, emptyTimeout: 60 });
  assert.equal((await media.listRooms([name]))[0]?.maxParticipants, 8);
  const token = new AccessToken(key, secret, { identity: 'isolated-fixture', ttl: 30 });
  token.addGrant({ roomJoin: true, room: name, canPublish: true, canSubscribe: true, canPublishSources: [TrackSource.MICROPHONE], canPublishData: false });
  const jwt = await token.toJwt();
  const claims = await new TokenVerifier(key, secret).verify(jwt);
  assert.equal(claims.video.room, name);
  assert.deepEqual(claims.video.canPublishSources, ['microphone']);
  assert.equal(Number(claims.exp) - Number(claims.nbf), 30);
  const unprivileged = new RoomServiceClient('http://127.0.0.1:17880', undefined, undefined, { token: jwt, requestTimeout: 3 });
  await assert.rejects(unprivileged.listRooms(), 'Join tokens cannot administer rooms');
  await media.deleteRoom(name); assert.equal((await media.listRooms([name])).length, 0);
  console.log('PASS: local LiveKit authenticated create/list/delete; microphone-only short token; administrative access denied to join token.');
  console.log('NOT TESTED: microphone capture, two-device WebRTC audio, TURN, Freebox WAN. No database accessed.');
} finally {
  try { await media.deleteRoom(name); } catch {}
  child.kill();
}
