// Network-only smoke from the operator workstation. No browser or credentials.
// Public address from LAN exercises NAT hairpin, NOT an independent WAN network.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import dgram from 'node:dgram';
import net from 'node:net';

const host = 'voice.synaura.fr';
for (const [path, expected] of [['/healthz', 200], ['/rtc/validate', 401], ['/twirp/livekit.RoomService/ListRooms', 404], ['/debug/rooms', 404]]) {
  const response = await fetch(`https://${host}${path}`, { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, expected, path);
  console.log(`PASS HTTPS ${path}: ${expected}`);
}

await new Promise((resolve, reject) => {
  const socket = net.connect({ host, port: 7881 });
  socket.setTimeout(5000);
  socket.once('connect', () => { socket.destroy(); resolve(); });
  socket.once('error', reject);
  socket.once('timeout', () => { socket.destroy(); reject(new Error('ICE TCP timeout')); });
});
console.log('PASS TCP 7881 through public address from workstation');

await new Promise((resolve, reject) => {
  const udp = dgram.createSocket('udp4');
  const id = randomBytes(12);
  const header = Buffer.alloc(20);
  header.writeUInt16BE(1, 0); // STUN Binding Request, no credentials.
  header.writeUInt32BE(0x2112a442, 4);
  id.copy(header, 8);
  const timeout = setTimeout(() => finish(new Error('STUN UDP timeout')), 5000);
  let finished = false;
  function finish(error) {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    udp.close();
    error ? reject(error) : resolve();
  }
  udp.once('error', finish);
  udp.on('message', data => {
    if (data.length < 20 || !data.subarray(8, 20).equals(id)) return;
    if (data.readUInt16BE(0) !== 0x0101) return finish(new Error('Unexpected STUN response'));
    finish();
  });
  udp.send(header, 3478, host, error => { if (error) finish(error); });
});
console.log('PASS STUN response over UDP 3478 through public address from workstation');
console.log('NOT VALIDATED: media on UDP 7882, authenticated TURN relay, independent WAN/4G, real audio.');
