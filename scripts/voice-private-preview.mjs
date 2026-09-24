// Temporary, account-restricted HTTPS preview. No application deployment.
// Credentials are read through SSH into memory, never written or printed.
import dotenv from 'dotenv';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from 'pg';

const origin = 'https://voice-test.synaura.fr';
const ports = { app: 3331, database: 15434, livekit: 17890, reverse: 13331 };
const remote = 'synaura@192.168.1.43';
const sshArgs = ['-i', path.join(os.homedir(), '.ssh/id_ed25519_weyra'), '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10'];
const children = new Set();
let stopping = false;
let phase = 'preflight';
let client;
let expiry;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  clearTimeout(expiry);
  for (const child of children) if (child.pid && child.exitCode === null) {
    try {
      if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', timeout: 10000, windowsHide: true });
      else child.kill('SIGTERM');
    } catch { child.kill(); }
  }
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
function child(command, args, env = process.env, output = false) {
  const proc = spawn(command, args, { env, stdio: output ? ['ignore', 'pipe', 'pipe'] : 'ignore', windowsHide: true });
  children.add(proc);
  proc.on('error', () => { console.error(`Preview could not start (${phase}). No secret displayed.`); stop(1); });
  proc.on('exit', () => children.delete(proc));
  if (output) for (const stream of [proc.stdout, proc.stderr]) {
    let buffer = '';
    stream.setEncoding('utf8');
    stream.on('data', chunk => {
      buffer += chunk;
      const lines = buffer.split('\n'); buffer = lines.pop() || '';
      for (const raw of lines) {
        const line = raw.replace(/\x1b\[[0-9;]*m/g, '').trim();
        // No request/session/query bodies or arbitrary library diagnostics.
        if (/^(?:✓ (?:Compiled|Ready|Generating|Collecting|Finalizing)|Creating an optimized|Linting and checking|Collecting page data|Generating static pages|Finalizing page optimization|Failed to compile|Type error:)/.test(line)) console.log(line.slice(0, 350));
      }
    });
  }
  return proc;
}
async function open(port) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    const done = value => { socket.destroy(); resolve(value); };
    socket.setTimeout(400, () => done(false)); socket.once('connect', () => done(true)); socket.once('error', () => done(false));
  });
}
function remoteRead(command) {
  return execFileSync('ssh', [...sshArgs, remote, command], { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
}
try {
  dotenv.config({ path: '.env.local', quiet: true });
  for (const port of [ports.app, ports.database, ports.livekit]) if (await open(port)) throw new Error('Port busy');
  const raw = remoteRead("sudo -n sed -n '/^DATABASE_URL=/p' /etc/synaura/synaura.env");
  const database = new URL(dotenv.parse(raw).DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !['127.0.0.1', 'localhost'].includes(database.hostname) || database.port !== '5433') throw new Error('Unexpected DB');
  // One supervised tunnel: all binds loopback. GatewayPorts must remain disabled.
  const tunnel = child('ssh', [...sshArgs, '-N', '-o', 'ExitOnForwardFailure=yes', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=2', '-L', `127.0.0.1:${ports.database}:127.0.0.1:5433`, '-L', `127.0.0.1:${ports.livekit}:127.0.0.1:7880`, '-R', `127.0.0.1:${ports.reverse}:127.0.0.1:${ports.app}`, remote]);
  tunnel.on('exit', () => { if (!stopping) { console.error('Private preview tunnel closed.'); stop(1); } });
  for (let i = 0; i < 40 && !(await open(ports.database)) && !stopping; i++) await delay(250);
  if (stopping || !(await open(ports.database))) throw new Error('Tunnel unavailable');
  database.hostname = '127.0.0.1'; database.port = String(ports.database);
  phase = 'approved identities';
  client = new Client({ connectionString: database.toString(), application_name: 'synaura-voice-preview-preflight', connectionTimeoutMillis: 5000, options: '-c default_transaction_read_only=on -c statement_timeout=5000' });
  await client.connect();
  if ((await client.query('SELECT rolsuper FROM pg_roles WHERE rolname = current_user')).rows[0]?.rolsuper !== false) throw new Error('Unexpected DB role');
  const { rows } = await client.query(`SELECT p.id, lower(p.username) AS username, lower(u.email) = $1 AS e2e
    FROM public.profiles p JOIN auth.users u ON u.id = p.id
    WHERE u.deleted_at IS NULL AND lower(p.username) = ANY($2::text[]) LIMIT 3`, [(process.env.SYNAURA_E2E_EMAIL || '').toLowerCase(), ['ximamoff', 'test2']]);
  if (rows.length !== 2 || !rows.some(r => r.username === 'test2' && r.e2e) || !rows.some(r => r.username === 'ximamoff') || new Set(rows.map(r => r.id)).size !== 2) throw new Error('Identity mismatch');
  await client.end(); client = null;
  const keyFile = remoteRead('sudo -n cat /etc/synaura-voice/keys.yaml').trim();
  const key = keyFile.match(/^(SV[a-f0-9]{24}):\s*([a-f0-9]{96})$/);
  if (!key) throw new Error('Unexpected voice credentials');
  const env = {
    ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
    DATABASE_URL: database.toString(), DATABASE_POOL_MAX: '3',
    NEXTAUTH_URL: origin, NEXTAUTH_URL_INTERNAL: `http://127.0.0.1:${ports.app}`, NEXTAUTH_SECRET: randomBytes(48).toString('hex'),
    NEXT_PUBLIC_SITE_URL: origin, ALLOWED_WEB_ORIGINS: origin,
    GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '',
    SYNAURA_VOICE_PREVIEW_BUILD: 'true', SYNAURA_VOICE_PREVIEW: 'true',
    SYNAURA_CALLS_ENABLED: 'true', SYNAURA_CALLS_SINGLE_PROCESS: 'true', LIVEKIT_ROOM_AUTO_CREATE_DISABLED: 'true',
    SYNAURA_CALLS_ACCESS: 'private', SYNAURA_CALLS_TEST_USER_IDS: rows.map(r => r.id).join(','), SYNAURA_CALLS_INSTANCE: 'phone-test',
    SYNAURA_CALLS_MAX_PARTICIPANTS: '2', SYNAURA_CALLS_MAX_CONCURRENT: '1',
    LIVEKIT_URL: 'wss://voice.synaura.fr', LIVEKIT_SERVER_URL: `http://127.0.0.1:${ports.livekit}`, LIVEKIT_API_KEY: key[1], LIVEKIT_API_SECRET: key[2],
  };
  if (!process.argv.includes('--skip-build')) {
    phase = 'isolated production build';
    console.log('Building isolated private preview; existing development server and production unchanged.');
    const readOnlyDb = new URL(database); readOnlyDb.searchParams.set('options', '-c default_transaction_read_only=on');
    const build = child(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { ...env, DATABASE_URL: readOnlyDb.toString(), SYNAURA_CALLS_ENABLED: 'false' }, true);
    const [code] = await once(build, 'exit');
    if (code !== 0 || stopping) throw new Error('Build failed');
    console.log('Private preview production build PASS.');
  }
  phase = 'private application';
  const app = child(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '-p', String(ports.app)], env, true);
  app.on('exit', () => { if (!stopping) stop(1); });
  for (let i = 0; i < 120 && !(await open(ports.app)) && !stopping; i++) await delay(500);
  if (stopping || !(await open(ports.app))) throw new Error('App unavailable');
  const res = await fetch(`http://127.0.0.1:${ports.app}/api/messages/calls`, { redirect: 'manual' });
  if (res.status !== 401) throw new Error('Private gate failed');
  // Intentionally temporary: never leave an unattended account preview open indefinitely.
  expiry = setTimeout(() => { console.log('Private preview expired after 8 hours.'); stop(); }, 8 * 60 * 60_000);
  console.log(`PRIVATE PREVIEW RUNNING: ${origin}/messages — ximamoff + test2 only; microphone not started; expires in 8h.`);
} catch {
  console.error(`Private preview stopped during ${phase}. No secret displayed.`);
  stop(1);
} finally { await client?.end().catch(() => undefined); }
