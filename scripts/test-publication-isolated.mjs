import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';
const args = ['-i','C:/Users/mvadn/.ssh/id_ed25519_weyra','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=8','synaura@192.168.1.43'];
const remote = (command, input) => execFileSync('ssh', [...args, command], { input, encoding: 'utf8', windowsHide: true, timeout: 30000, stdio: ['pipe','pipe','pipe'] });
const url = new URL(dotenv.parse(remote("sudo -n sed -n '/^DATABASE_URL=/p' /etc/synaura/synaura.env")).DATABASE_URL);
const name = 'synaura_publication_test_' + Date.now(), role = decodeURIComponent(url.username);
if (!/^[a-z_][a-z0-9_]+$/.test(role) || !/^synaura_publication_test_[0-9]+$/.test(name)) throw new Error('Invalid isolated target');
const psql = 'sudo -n -u postgres psql -X -p 5433 -d postgres -v ON_ERROR_STOP=1';
remote(psql, `CREATE DATABASE "${name}" OWNER "${role}";`);
console.log('Created disposable ' + name);
try {
  url.hostname = '127.0.0.1'; url.port = '15433'; url.pathname = '/' + name;
  console.log(execFileSync(process.execPath, ['scripts/publication-functional-gate.mjs'], { env: { ...process.env, PUBLICATION_TEST_DATABASE_URL: url.toString() }, encoding: 'utf8', windowsHide: true, timeout: 120000, stdio: ['ignore','pipe','pipe'] }));
} catch (error) { console.error(String(error.stdout || '') + String(error.stderr || '')); process.exitCode = 1; }
finally { remote(psql, `DROP DATABASE "${name}";`); console.log('Removed only own disposable database; production content untouched.'); }
