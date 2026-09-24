// Explicit operator invocation; enables ONLY the approved two-account pilot.
// No app restart, schema change, public access, or secret output.
import { readFileSync, writeFileSync, existsSync, mkdirSync, chownSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const apply = args[0] === '--apply';
const expected = args[1];
const target = '/etc/synaura/voice.env';
const dropin = '/etc/systemd/system/synaura.service.d/voice.conf';
let client;
try {
  if (process.getuid?.() !== 0 || !['--check', '--apply'].includes(args[0]) || !/^[a-f0-9]{40}$/.test(expected || '')) throw new Error('Usage: sudo node enable-private-production.mjs --check|--apply EXPECTED_CURRENT_SHA');
  if (realpathSync('/srv/apps/synaura/current') !== `/srv/apps/synaura/releases/${expected}`) throw new Error('Current release changed; review first');
  if (existsSync(target) || existsSync(dropin)) throw new Error('Refusing to overwrite existing voice configuration');
  for (const unit of ['synaura', 'synaura-voice', 'nginx']) execFileSync('systemctl', ['is-active', '--quiet', unit]);
  const require = createRequire('/srv/apps/synaura/current/package.json');
  const env = require('dotenv').parse(readFileSync('/etc/synaura/synaura.env'));
  if (Object.keys(env).some(key => /^(SYNAURA_CALLS_|LIVEKIT_|SYNAURA_VOICE_PREVIEW)/.test(key))) throw new Error('Existing voice flags require explicit review');
  if (!/^\s*auto_create:\s*false\s*$/m.test(readFileSync('/etc/synaura-voice/livekit.yaml', 'utf8'))) throw new Error('Automatic room creation must remain disabled');
  const keys = readFileSync('/etc/synaura-voice/keys.yaml', 'utf8').trim().match(/^(SV[a-f0-9]{24}):\s+([a-f0-9]{96})$/);
  if (!keys) throw new Error('Unexpected key format');
  const dbUrl = new URL(env.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(dbUrl.hostname) || dbUrl.port !== '5433') throw new Error('Unexpected database target');
  const { Client } = require('pg');
  client = new Client({connectionString:dbUrl.toString(),application_name:'voice-production-readonly',connectionTimeoutMillis:5000,options:'-c default_transaction_read_only=on -c statement_timeout=5000'});
  await client.connect();
  const role = await client.query('SELECT rolsuper FROM pg_roles WHERE rolname = current_user');
  if (role.rows[0]?.rolsuper !== false) throw new Error('Require the non-superuser application role');
  const approved = ['test2', 'ximamoff'];
  const result = await client.query('SELECT p.id, lower(p.username) AS username FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE lower(p.username) = ANY($1::text[]) AND u.deleted_at IS NULL ORDER BY lower(p.username)', [approved]);
  if (result.rows.length !== 2 || result.rows.some((row, i) => row.username !== approved[i] || !/^[a-f0-9-]{36}$/.test(row.id))) throw new Error('Approved identities are missing or ambiguous');
  const ids = result.rows.map(row => row.id);
  const relationship = await client.query('SELECT EXISTS(SELECT 1 FROM public.friendships WHERE user_id = $1 AND friend_id = $2) AS friends, EXISTS(SELECT 1 FROM public.user_blocks WHERE blocker_id = ANY($3::uuid[]) AND blocked_id = ANY($3::uuid[])) AS blocked', [...ids.slice().sort(), ids]);
  if (!relationship.rows[0]?.friends || relationship.rows[0]?.blocked) throw new Error('Approved pair is not eligible for calls');
  await client.end(); client = null;
  console.log('Checks PASS: unchanged baseline, active services, auto_create=false, two approved friends, application-role read-only DB.');
  if (apply) {
    const values = {
      SYNAURA_CALLS_ENABLED:'true', SYNAURA_CALLS_ACCESS:'private',
      SYNAURA_CALLS_TEST_USER_IDS:ids.join(','), SYNAURA_CALLS_INSTANCE:'production-private',
      SYNAURA_CALLS_SINGLE_PROCESS:'true', LIVEKIT_ROOM_AUTO_CREATE_DISABLED:'true',
      LIVEKIT_URL:'wss://voice.synaura.fr', LIVEKIT_SERVER_URL:'http://127.0.0.1:7880',
      LIVEKIT_API_KEY:keys[1], LIVEKIT_API_SECRET:keys[2],
      SYNAURA_CALLS_MAX_PARTICIPANTS:'2', SYNAURA_CALLS_MAX_CONCURRENT:'1',
    };
    const gid = Number(execFileSync('id', ['-g','synaura'], {encoding:'utf8'}).trim());
    if (!Number.isSafeInteger(gid) || gid <= 0) throw new Error('Unexpected application group');
    writeFileSync(target, Object.entries(values).map(([key,value])=>`${key}=${value}`).join('\n')+'\n', {flag:'wx',mode:0o640});
    chownSync(target, 0, gid);
    mkdirSync('/etc/systemd/system/synaura.service.d', {recursive:true,mode:0o755});
    writeFileSync(dropin, '[Service]\nEnvironmentFile=/etc/synaura/voice.env\n', {flag:'wx',mode:0o644});
    execFileSync('systemctl', ['daemon-reload']);
    console.log('Private configuration installed. No restart; canonical deployment will load it. No preview gate on the public website.');
  }
} catch (error) {
  // PostgreSQL/provider errors can include private details: never serialize them.
  console.error(error?.code ? 'Configuration refused; check prerequisites without exposing credentials.' : error.message);
  process.exitCode = 1;
} finally { await client?.end().catch(()=>{}); }
