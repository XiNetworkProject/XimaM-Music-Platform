import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { remoteDatabaseUrl, operationalLine } from '../scripts/dev-local.mjs';

test('local dev defaults to the connected launcher, with an explicit offline option', () => {
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url)));
  assert.equal(pkg.scripts.dev,'node scripts/dev-local.mjs');
  assert.match(pkg.scripts['dev:offline'],/--hostname 127.0.0.1/);
});
test('SSH database target accepts only the existing remote loopback PostgreSQL', () => {
  assert.equal(remoteDatabaseUrl('DATABASE_URL=postgresql://127.0.0.1:5433/demo').port,'5433');
  assert.throws(()=>remoteDatabaseUrl('DATABASE_URL=postgresql://external.example/demo'));
  assert.throws(()=>remoteDatabaseUrl('DATABASE_URL=https://localhost/demo'));
  assert.throws(()=>remoteDatabaseUrl('DATABASE_URL=private-malformed-value'),error=>!error.message.includes('private-malformed-value'));
});
test('local logs discard secrets, auth payloads and URL query strings', () => {
  assert.equal(operationalLine('session body with private fields'),null);
  assert.equal(operationalLine(' GET /api/auth/callback?code=private#hash 200 in 20ms'),'GET /api/auth/callback 200 in 20ms');
  assert.equal(operationalLine('✓ Compiled private-value',['private-value']),'✓ Compiled [redacted]');
});
test('launcher owns only its processes, keeps host verification and never writes secrets', () => {
  const source=readFileSync(new URL('../scripts/dev-local.mjs',import.meta.url),'utf8');
  assert.match(source,/StrictHostKeyChecking=yes/);
  assert.match(source,/ExitOnForwardFailure=yes/);
  assert.match(source,/127\.0\.0\.1:\$\{tunnelPort\}/);
  assert.match(source,/String\(preview.pid\)/);
  assert.doesNotMatch(source,/writeFile|appendFile|rejectUnauthorized:\s*false|StrictHostKeyChecking=no/);
});
