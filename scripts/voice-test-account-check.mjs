// Read-only identity check, using the already authorized local DB tunnel.
// Never print email, password, connection URL, profile UUID or session tokens.
import dotenv from 'dotenv';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { Client } from 'pg';

let client;
try {
  dotenv.config({ path: '.env.local', quiet: true });
  const username = (process.argv[2] || '').trim().toLowerCase();
  const e2e = (process.env.SYNAURA_E2E_EMAIL || '').trim().toLowerCase();
  if (!username || !e2e) throw new Error('Missing identity');
  const raw = execFileSync('ssh', ['-i', path.join(os.homedir(), '.ssh/id_ed25519_weyra'), '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10', 'synaura@192.168.1.43', "sudo -n sed -n '/^DATABASE_URL=/p' /etc/synaura/synaura.env"], { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  const url = new URL(dotenv.parse(raw).DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('Unexpected target');
  url.hostname = '127.0.0.1'; url.port = '15433';
  client = new Client({ connectionString: url.toString(), application_name: 'synaura-voice-readonly-check', connectionTimeoutMillis: 5000, options: '-c default_transaction_read_only=on -c statement_timeout=5000' });
  await client.connect();
  const role = await client.query('SELECT rolsuper FROM pg_roles WHERE rolname = current_user');
  if (role.rows[0]?.rolsuper !== false) throw new Error('Read-only check requires the application role');
  const result = await client.query(`SELECT p.id, p.username, p.name, lower(u.email) = $2 AS e2e,
    coalesce(length(u.encrypted_password) > 0, false) AS password_login_available
    FROM public.profiles p JOIN auth.users u ON u.id = p.id
    WHERE u.deleted_at IS NULL AND (lower(p.username) = $1 OR lower(p.name) = $1 OR lower(u.email) = $2) LIMIT 3`, [username, e2e]);
  const pair = result.rows.map(row => row.id).sort();
  let relationship = null;
  if (pair.length === 2) {
    const check = await client.query(`SELECT
      EXISTS(SELECT 1 FROM public.friendships WHERE user_id = $1 AND friend_id = $2) AS friends,
      EXISTS(SELECT 1 FROM public.user_blocks WHERE blocker_id = ANY($3::uuid[]) AND blocked_id = ANY($3::uuid[])) AS blocked,
      (SELECT count(*)::int FROM public.conversations c WHERE c.is_group = false AND c.is_active = true
        AND (SELECT count(*) FROM public.conversation_participants cp WHERE cp.conversation_id = c.id) = 2
        AND (SELECT count(*) FROM public.conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = ANY($3::uuid[])) = 2) AS direct_conversations`, [pair[0], pair[1], pair]);
    relationship = check.rows[0];
  }
  console.log(JSON.stringify({ profiles: result.rows.map(({ username, name, e2e, password_login_available }) => ({ username, name, e2e, password_login_available })), distinctProfiles: new Set(pair).size, relationship, readOnly: true }, null, 2));
} catch {
  console.error('Read-only account check unavailable. No credentials displayed.');
  process.exitCode = 1;
} finally { await client?.end().catch(() => undefined); }
