import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { handleAuddCopyrightCheck } from '../lib/security/auddCopyrightHandler.ts';
import { escapeHtml, validateSupportTicket } from '../lib/security/publicForms.ts';
import {
  hashRateLimitIdentifier,
  isTrustedMutationOrigin,
  readLimitedJson,
} from '../lib/security/requestSecurity.ts';
import { shouldBlockDiagnosticPage } from '../lib/diagnostics.ts';

const allow = () => ({ allowed: true, remaining: 1, retryAfterSeconds: 0, resetAt: Date.now() + 60_000 });
const deny = () => ({ allowed: false, remaining: 0, retryAfterSeconds: 23, resetAt: Date.now() + 23_000 });
const post = (body, headers = {}) => new Request('https://synaura.fr/api/upload/copyright-check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

test('les identifiants de rate limit sont haches et les origines cross-site sont refusees', () => {
  const privateValue = 'person@example.com';
  const hash = hashRateLimitIdentifier(privateValue);
  assert.equal(hash.length, 64);
  assert.doesNotMatch(hash, /person|example/);
  assert.equal(isTrustedMutationOrigin(new Request('https://synaura.fr/api/x', { headers: { Origin: 'https://synaura.fr' } })), true);
  assert.equal(isTrustedMutationOrigin(new Request('https://synaura.fr/api/x', { headers: { Origin: 'https://evil.example' } })), false);
  assert.equal(isTrustedMutationOrigin(new Request('https://synaura.fr/api/x')), true, 'un client natif sans Origin reste compatible');
});

test('la lecture JSON refuse les payloads invalides et trop gros', async () => {
  const invalid = await readLimitedJson(new Request('https://synaura.fr/api/x', { method: 'POST', body: '{' }), 100);
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.response.status, 400);

  const oversized = await readLimitedJson(post({ message: 'x'.repeat(500) }), 100);
  assert.equal(oversized.ok, false);
  if (!oversized.ok) assert.equal(oversized.response.status, 413);
});

test('le support valide strictement, borne et nettoie les entrees', () => {
  const subjects = ['Bug', 'Autre'];
  assert.equal(validateSupportTicket({ email: 'bad', subject: 'Bug', message: 'message assez long' }, subjects).ok, false);
  assert.equal(validateSupportTicket({ email: 'a@b.fr', subject: 'Bug', message: 'x'.repeat(5_001) }, subjects).ok, false);
  assert.equal(validateSupportTicket({ email: 'a@b.fr', subject: 'Bug', message: 'message assez long', url: 'javascript:alert(1)' }, subjects).ok, false);
  const valid = validateSupportTicket({ email: ' A@B.FR ', subject: 'Bug', message: ' ligne\0 valide ' }, subjects);
  assert.equal(valid.ok, true);
  if (valid.ok) assert.deepEqual(valid.value, { email: 'a@b.fr', subject: 'Bug', message: 'ligne valide', url: null });
  assert.equal(escapeHtml('<b>test & ok</b>'), '&lt;b&gt;test &amp; ok&lt;/b&gt;');
});

test('AudD refuse les appels non authentifies et limites avant le fournisseur', async () => {
  let calls = 0;
  const unauthenticated = await handleAuddCopyrightCheck(post({ audioUrl: 'https://media.synaura.fr/audio.mp3' }), {
    getUserId: async () => null,
    ownsAudio: () => true,
    consumeRateLimit: allow,
    recognize: async () => { calls += 1; return { ok: true }; },
  });
  assert.equal(unauthenticated.status, 401);

  const limited = await handleAuddCopyrightCheck(post({ audioUrl: 'https://media.synaura.fr/audio.mp3' }), {
    getUserId: async () => 'user-1',
    ownsAudio: () => true,
    consumeRateLimit: deny,
    recognize: async () => { calls += 1; return { ok: true }; },
  });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '23');
  assert.equal(calls, 0);
});

test('AudD filtre la reponse fournisseur et masque ses erreurs', async () => {
  const secret = 'provider-private-value';
  const dependencies = {
    getUserId: async () => 'user-1',
    ownsAudio: () => true,
    consumeRateLimit: allow,
    recognize: async (_url, signal) => {
      assert.ok(signal instanceof AbortSignal);
      return { ok: true, payload: { result: { title: 'Titre', artist: 'Artiste', score: 91, token: secret, extra: secret } } };
    },
  };
  const response = await handleAuddCopyrightCheck(post({ audioUrl: 'https://media.synaura.fr/audio.mp3' }), dependencies);
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.doesNotMatch(text, new RegExp(secret));
  assert.deepEqual(Object.keys(JSON.parse(text).details).sort(), ['album', 'artist', 'label', 'release_date', 'score', 'title']);

  const failed = await handleAuddCopyrightCheck(post({ audioUrl: 'https://media.synaura.fr/audio.mp3' }), {
    ...dependencies,
    recognize: async () => { throw new Error(secret); },
  });
  assert.doesNotMatch(await failed.text(), new RegExp(secret));
});

test('AudD interrompt un fournisseur qui depasse le timeout', async () => {
  const response = await handleAuddCopyrightCheck(post({ audioUrl: 'https://media.synaura.fr/audio.mp3' }), {
    getUserId: async () => 'user-1',
    ownsAudio: () => true,
    consumeRateLimit: allow,
    timeoutMs: 5,
    recognize: async (_url, signal) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('provider timeout secret')), { once: true });
    }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { matched: false, reason: 'SERVICE_UNAVAILABLE' });
});

test('les pages debug et test sont bloquees uniquement en production', () => {
  for (const pathname of ['/debug', '/debug-audio', '/test-auth', '/sandbox-lab']) {
    assert.equal(shouldBlockDiagnosticPage(pathname, 'production'), true);
    assert.equal(shouldBlockDiagnosticPage(pathname, 'development'), false);
  }
  assert.equal(shouldBlockDiagnosticPage('/embed/track-1', 'production'), false);
});

test('les headers globaux et exception embed sont configures', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const require = createRequire(import.meta.url);
  const config = require('../next.config.js');
  const rules = await config.headers();
  const global = rules.find((rule) => rule.source === '/:path*').headers;
  const asMap = Object.fromEntries(global.map(({ key, value }) => [key, value]));
  assert.equal(asMap['X-Content-Type-Options'], 'nosniff');
  assert.equal(asMap['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.match(asMap['Permissions-Policy'], /microphone=\(self\)/);
  assert.match(asMap['Strict-Transport-Security'], /max-age=31536000/);
  const embed = rules.find((rule) => rule.source === '/embed/:path*');
  assert.equal(embed.headers.find((header) => header.key === 'Content-Security-Policy').value, 'frame-ancestors *');
  const middleware = fs.readFileSync(new URL('../middleware.ts', import.meta.url), 'utf8');
  assert.match(middleware, /headers\.set\('X-Frame-Options', 'SAMEORIGIN'\)/);
  assert.match(middleware, /headers\.delete\('X-Frame-Options'\)/);
  process.env.NODE_ENV = previous;
});

test('les routes auth couteuses possedent leurs limites complementaires', () => {
  const authOptions = fs.readFileSync(new URL('../lib/authOptions.ts', import.meta.url), 'utf8');
  const signup = fs.readFileSync(new URL('../app/api/auth/signup/route.ts', import.meta.url), 'utf8');
  const forgot = fs.readFileSync(new URL('../app/api/auth/forgot-password/route.ts', import.meta.url), 'utf8');
  const reset = fs.readFileSync(new URL('../app/api/auth/reset-password/route.ts', import.meta.url), 'utf8');
  assert.match(authOptions, /auth-login-ip/);
  assert.match(authOptions, /auth-login-account/);
  assert.match(signup, /auth-signup-ip/);
  assert.match(forgot, /auth-forgot-email/);
  assert.match(forgot, /Si un compte existe avec cet email/);
  assert.match(reset, /auth-reset-credential/);
  assert.ok(reset.indexOf('auth-reset-credential') < reset.indexOf('hashLocalPassword\(password\)'));
  const mobileGoogle = fs.readFileSync(new URL('../app/api/auth/mobile/google/callback/route.ts', import.meta.url), 'utf8');
  assert.match(mobileGoogle, /parameters\.access_token[\s\S]*\? '#' : '\?'/);
});

test('la route support applique taille et rate limit avant insertion', () => {
  const support = fs.readFileSync(new URL('../app/api/support/route.ts', import.meta.url), 'utf8');
  assert.match(support, /support-ip/);
  assert.match(support, /support-email/);
  assert.match(support, /readLimitedJson[^\n]*16 \* 1024/);
});

test('les routes Suno sensibles verifient ownership, signature et ne renvoient plus de brut', () => {
  const status = fs.readFileSync(new URL('../app/api/suno/status/route.ts', import.meta.url), 'utf8');
  const save = fs.readFileSync(new URL('../app/api/suno/save-tracks/route.ts', import.meta.url), 'utf8');
  const legacyStatus = fs.readFileSync(new URL('../app/api/ai/status/[taskId]/route.ts', import.meta.url), 'utf8');
  const legacyWebhook = fs.readFileSync(new URL('../app/api/ai/webhook/route.ts', import.meta.url), 'utf8');
  const callback = fs.readFileSync(new URL('../app/api/suno/callback/route.ts', import.meta.url), 'utf8');
  for (const source of [status, save, legacyStatus]) {
    assert.match(source, /\.eq\('task_id', taskId\)/);
    assert.match(source, /\.eq\('user_id', session\.user\.id\)/);
  }
  assert.match(legacyWebhook, /verifySunoCallback/);
  assert.doesNotMatch(status, /raw:\s*json|Donnees brutes Suno|Response Suno/);
  assert.doesNotMatch(callback, /JSON\.stringify\(body/);
});
