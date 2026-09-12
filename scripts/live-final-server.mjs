// Local validation only. Existing authorized SSH tunnel; credentials stay in process memory.
import dotenv from 'dotenv';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawn } from 'node:child_process';
dotenv.config({ path: '.env.local', quiet: true });
if (!process.env.DATABASE_URL) {
  const line = execFileSync('ssh', ['-i', path.join(os.homedir(), '.ssh/id_ed25519_weyra'), '-o', 'BatchMode=yes', 'synaura@192.168.1.43', "sudo -n sed -n '/^DATABASE_URL=/p' /etc/synaura/synaura.env"], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const connection = new URL(dotenv.parse(line).DATABASE_URL);
  connection.hostname = '127.0.0.1'; connection.port = process.env.FINAL_DB_TUNNEL_PORT || '15433';
  process.env.DATABASE_URL = connection.toString();
}
if (new URL(process.env.DATABASE_URL).hostname !== '127.0.0.1') throw new Error('Use the existing audited local DB tunnel');
if (process.argv.includes('--dev')) {
  process.env.NODE_ENV = 'development'; process.env.NEXTAUTH_URL = 'http://localhost:3001';
  const { default: next } = await import('next');
  const { createServer } = await import('node:http');
  // Next 14 custom-server reloads next.config.js: run exclusively, then rebuild production.
  const app = next({ dev: true, dir: process.cwd() });
  await app.prepare(); createServer(app.getRequestHandler()).listen(3001, '127.0.0.1', () => console.log('Exclusive dev diagnostics ready on port 3001; rebuild before next start'));
} else {
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3000'], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
  child.on('exit', code => { process.exitCode = code || 0; });
}
