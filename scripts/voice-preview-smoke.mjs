// HTTP contract smoke only. Uses its own E2E session, never browser cookies.
// No microphone, call, message, invitation or friendship is created.
import dotenv from 'dotenv';
import assert from 'node:assert/strict';

dotenv.config({ path: '.env.local', quiet: true });
const base = 'https://voice-test.synaura.fr';
const jar = new Map();
let signedIn = false;
let stage = 'anonymous isolation';
async function request(route, init = {}, useSession = false) {
  const headers = new Headers(init.headers);
  if (useSession) headers.set('cookie', Array.from(jar, ([name, value]) => `${name}=${value}`).join('; '));
  const result = await fetch(`${base}${route}`, { ...init, headers, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  if (useSession) for (const cookie of result.headers.getSetCookie()) {
    const pair = cookie.split(';')[0]; const sep = pair.indexOf('=');
    jar.set(pair.slice(0, sep), pair.slice(sep + 1));
  }
  return result;
}
try {
  for (const route of ['/api/messages/calls', '/api/messages/conversations', '/api/tracks', '/api/admin/users']) {
    const response = await request(route);
    assert.equal(response.status, 401);
    assert.match(response.headers.get('cache-control'), /private.*no-store/);
  }
  for (const headers of [{ cookie: '__Secure-next-auth.session-token=invalid' }, { 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware' }, { 'x-middleware-invoke': '1', 'x-invoke-path': '/api/messages/calls', 'x-forwarded-host': 'synaura.fr' }]) {
    assert.equal((await request('/api/messages/calls', { headers })).status, 401);
  }
  assert.equal((await request('/api/auth/register', { method: 'POST' })).status, 401);
  const redirect = await request('/messages');
  assert.equal(redirect.status, 307);
  assert.equal(new URL(redirect.headers.get('location')).origin, base);
  assert.equal((await request('/auth/signin')).status, 200);
  console.log('PASS: anonymous pages/APIs, invalid session and spoofed middleware headers remain closed.');

  stage = 'E2E sign-in';
  const csrf = await (await request('/api/auth/csrf', {}, true)).json();
  assert.ok(csrf.csrfToken);
  const login = await request('/api/auth/callback/credentials', { method: 'POST', headers: { origin: base, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email: process.env.SYNAURA_E2E_EMAIL || '', password: process.env.SYNAURA_E2E_PASSWORD || '', csrfToken: csrf.csrfToken, callbackUrl: `${base}/messages`, json: 'true' }) }, true);
  assert.equal(login.status, 200);
  const session = await (await request('/api/auth/session', {}, true)).json();
  assert.equal(session.user?.username?.toLowerCase(), 'test2');
  signedIn = true;
  stage = 'approved preview access';
  const voice = await request('/api/messages/calls', {}, true);
  assert.equal(voice.status, 200);
  const voiceBody = await voice.json();
  assert.equal(voiceBody.enabled, true);
  assert.ok(Array.isArray(voiceBody.calls));
  assert.equal((await request('/messages', {}, true)).status, 200);
  const conversations = await request('/api/messages/conversations', {}, true);
  assert.equal(conversations.status, 200);
  // Only check the approved recipient is represented; never print chat content.
  const conversationBody = JSON.stringify(await conversations.json());
  assert.match(conversationBody, /ximamoff/i);
  console.log('PASS: test2 login, messages, existing XimaMOff conversation and private call availability. No call created.');
} catch {
  console.error(`Private preview smoke FAIL during ${stage}. No credentials or message data displayed.`);
  process.exitCode = 1;
} finally {
  if (signedIn) try {
    const csrf = await (await request('/api/auth/csrf', {}, true)).json();
    await request('/api/auth/signout', { method: 'POST', headers: { origin: base, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: `${base}/auth/signin`, json: 'true' }) }, true);
  } catch { console.log('Smoke session cookie discarded locally.'); }
  jar.clear();
}
