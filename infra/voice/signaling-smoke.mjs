// Run on the voice host with sudo and the current release's package.json path.
// One isolated technical room, no application account, microphone or media.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire(process.argv[2] || '/srv/apps/synaura/current/package.json');
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
const { JoinRequest, WrappedJoinRequest, ClientInfo, ConnectionSettings, SignalResponse } = require('@livekit/protocol');
const { WebSocket } = require('ws');
const entries = readFileSync('/etc/synaura-voice/keys.yaml', 'utf8').trim().split(': ');
assert.equal(entries.length, 2, 'Expected one existing voice key');
const [key, secret] = entries;
const media = new RoomServiceClient('http://127.0.0.1:7880', key, secret, { requestTimeout: 5 });
const room = `synaura-call-signaling-smoke-${randomUUID()}`;
const origin = 'https://synaura.fr';
const endpoint = 'https://voice.synaura.fr';

function signalJoin(path, params) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`wss://voice.synaura.fr${path}?${params}`, { headers: { Origin: origin } });
    let finished = false;
    const timeout = setTimeout(() => done(new Error('Signal timeout')), 10000);
    function done(error, status) {
      if (finished) return;
      finished = true; clearTimeout(timeout);
      socket.terminate();
      error ? reject(error) : resolve(status);
    }
    socket.on('error', () => { if (!finished) done(new Error('Signal transport failed')); });
    socket.on('unexpected-response', (_request, response) => { response.resume(); done(null, response.statusCode); });
    socket.on('close', () => { if (!finished) done(new Error('Signal closed before join')); });
    socket.on('message', (data, binary) => {
      try {
        const response = binary ? SignalResponse.fromBinary(new Uint8Array(data)) : SignalResponse.fromJson(JSON.parse(data.toString()));
        assert.equal(response.message.case, 'join', 'Expected real signaling JoinResponse');
        assert.equal(response.message.value.room?.name, room, 'Only the isolated room may be joined');
        done(null, 101);
      } catch { done(new Error('Invalid signaling response')); }
    });
  });
}
async function validate(path, params, status) {
  const response = await fetch(`${endpoint}${path}?${params}`, { headers: { Origin: origin }, signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, status, path);
  assert.ok(['*', origin].includes(response.headers.get('access-control-allow-origin')), `${path}: browser-readable CORS`);
  return response;
}

let cleanupNeeded = false;
let stage = 'create isolated room';
try {
  cleanupNeeded = true;
  await media.createRoom({ name: room, emptyTimeout: 30, departureTimeout: 10, maxParticipants: 1 });
  const token = new AccessToken(key, secret, { identity: 'isolated-signaling-smoke', ttl: 60 });
  token.addGrant({ roomJoin: true, room, canPublish: false, canSubscribe: false, canPublishData: false });
  const jwt = await token.toJwt();
  const join = new JoinRequest({ clientInfo: new ClientInfo({ protocol: 15, sdk: 1, version: '2.22.3' }), connectionSettings: new ConnectionSettings({ autoSubscribe: false }) });
  const wrapped = new WrappedJoinRequest({ joinRequest: join.toBinary(), compression: 0 });
  const modern = new URLSearchParams({ access_token: jwt, join_request: Buffer.from(wrapped.toBinary()).toString('base64').replaceAll('+', '-').replaceAll('/', '_') });
  stage = 'v1 websocket';
  const status = await signalJoin('/rtc/v1', modern);
  if (status === 404) {
    stage = 'v1 browser-readable fallback validation';
    const response = await validate('/rtc/v1/validate', modern, 404);
    assert.ok(!(await response.text()).includes('requested room does not exist'), 'SDK must classify the 404 as supported v0 fallback');
    console.log('PASS v1 reaches upstream; browser-readable 404 enables SDK fallback on this server');
  } else {
    assert.equal(status, 101, 'v1 websocket upgrade');
    await validate('/rtc/v1/validate', modern, 200);
    console.log('PASS v1 websocket upgrade and real JoinResponse');
  }
  const legacyToken = new AccessToken(key, secret, { identity: 'isolated-signaling-legacy', ttl: 60 });
  legacyToken.addGrant({ roomJoin: true, room, canPublish: false, canSubscribe: false, canPublishData: false });
  const legacy = new URLSearchParams({ access_token: await legacyToken.toJwt(), auto_subscribe: '0', protocol: '15' });
  stage = 'legacy validation and websocket';
  await validate('/rtc/validate', legacy, 200);
  assert.equal(await signalJoin('/rtc', legacy), 101);
  console.log('PASS legacy websocket upgrade and real JoinResponse; no media published');
} catch {
  console.error(`FAIL isolated signaling smoke at ${stage}; no credentials displayed`);
  process.exitCode = 1;
} finally {
  if (cleanupNeeded) {
    await media.deleteRoom(room).catch(error => { if (error?.code !== 'not_found') throw new Error('Isolated smoke cleanup failed'); });
    assert.equal((await media.listRooms([room])).length, 0, 'No technical room remains');
    console.log('PASS isolated technical room removed; no user calls touched');
  }
}
console.log('NOT VALIDATED: microphone, two-device media, independent cellular network, TURN/TLS');
