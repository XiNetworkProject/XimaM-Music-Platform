import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { voicePreviewDecision } from '../lib/voice/previewGate.ts';

const a = '10000000-0000-4000-8000-000000000001';
const b = '10000000-0000-4000-8000-000000000002';
const stranger = '10000000-0000-4000-8000-000000000003';
const env = { SYNAURA_VOICE_PREVIEW: 'true', SYNAURA_CALLS_ACCESS: 'private', SYNAURA_CALLS_TEST_USER_IDS: `${a},${b}`, NEXTAUTH_SECRET: 'unit-test-not-a-real-key' };

test('preview gate is inert outside the explicitly enabled private instance', () => {
  assert.equal(voicePreviewDecision({}, '/messages', 'GET', ''), 'allow');
  assert.equal(voicePreviewDecision({}, '/api/tracks', 'POST', ''), 'allow');
});
test('preview requires complete private policy, even on sign-in', () => {
  for (const invalid of [{ ...env, NEXTAUTH_SECRET: '' }, { ...env, SYNAURA_CALLS_ACCESS: 'public' }, { ...env, SYNAURA_CALLS_TEST_USER_IDS: a }]) {
    assert.equal(voicePreviewDecision(invalid, '/auth/signin', 'GET', ''), 'unavailable');
  }
});
test('all private pages and data APIs require an approved identity', () => {
  for (const route of ['/messages', '/live', '/profile/ximamoff', '/api/messages/calls', '/api/messages/conversations', '/api/tracks', '/api/admin/users']) {
    assert.equal(voicePreviewDecision(env, route, 'GET', a), 'allow');
    assert.equal(voicePreviewDecision(env, route, 'GET', b), 'allow');
    assert.equal(voicePreviewDecision(env, route, 'GET', stranger), 'forbidden');
    assert.equal(voicePreviewDecision(env, route, 'GET', ''), route.startsWith('/api/') ? 'unauthorized' : 'login');
  }
});
test('only exact credential auth routes are anonymous, not arbitrary auth-prefixed APIs', () => {
  for (const route of ['/auth/signin', '/api/auth/csrf', '/api/auth/session', '/api/auth/providers']) assert.equal(voicePreviewDecision(env, route, 'GET', ''), 'allow');
  assert.equal(voicePreviewDecision(env, '/api/auth/callback/credentials', 'POST', ''), 'allow');
  for (const route of ['/api/auth/register', '/api/auth/callback/google', '/api/auth/admin', '/api/auth/csrf/extra', '/api/auth/reset-password']) {
    assert.equal(voicePreviewDecision(env, route, 'POST', ''), 'unauthorized');
  }
  assert.equal(voicePreviewDecision(env, '/auth/signup', 'GET', ''), 'login');
});
test('anonymous static allowlist does not cover API names or writes', () => {
  assert.equal(voicePreviewDecision(env, '/brand/v2/synaura-lockup.svg', 'GET', ''), 'allow');
  assert.equal(voicePreviewDecision(env, '/brand/v2/synaura-lockup.svg', 'POST', ''), 'unauthorized');
  assert.equal(voicePreviewDecision(env, '/api/images/avatar.png', 'GET', ''), 'unauthorized');
});
test('nginx pins the preview origin, strips middleware bypass headers and exposes no dev socket', () => {
  const config = readFileSync(new URL('../infra/voice/nginx-test.conf', import.meta.url), 'utf8');
  for (const expected of ['proxy_pass http://127.0.0.1:13331', 'proxy_set_header Host voice-test.synaura.fr', 'proxy_set_header x-middleware-subrequest ""', 'proxy_set_header x-middleware-invoke ""', 'proxy_set_header Upgrade ""', 'private, no-store', 'access_log off']) assert.ok(config.includes(expected), expected);
  assert.doesNotMatch(config, /server_name synaura\.fr|proxy_pass.*:3000|proxy_set_header.*\$http_host/);
});
test('preview middleware verifies secure JWT IDs before the existing cookie fallback', () => {
  const middleware = readFileSync(new URL('../middleware.ts', import.meta.url), 'utf8');
  assert.ok(middleware.indexOf('voicePreviewDecision(process.env') < middleware.indexOf('const hasSessionCookie'));
  assert.match(middleware, /secureCookie: true/);
  assert.match(middleware, /typeof token\?\.id === 'string' \? token.id : ''/);
  assert.doesNotMatch(middleware.slice(middleware.indexOf('matcher:')), /\?!api/);
});
