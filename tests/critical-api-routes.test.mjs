import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  handleMeteoPresentationRequest,
  handleSunoStatusRequest,
  normalizeSunoTaskId,
  parseEmailAllowlist,
} from '../lib/security/criticalRouteHandlers.ts';
import { InMemoryRateLimiter } from '../lib/security/rateLimit.ts';

const allow = () => ({ allowed: true, remaining: 1, retryAfterSeconds: 0, resetAt: Date.now() + 60_000 });
const deny = () => ({ allowed: false, remaining: 0, retryAfterSeconds: 17, resetAt: Date.now() + 17_000 });
const post = (body) => new Request('http://localhost/api/meteo/send-presentation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

test('la presentation Meteo refuse un utilisateur non authentifie sans appeler SMTP', async () => {
  let sends = 0;
  const response = await handleMeteoPresentationRequest(post({}), {
    getActor: async () => null,
    consumeRateLimit: allow,
    sendPresentation: async () => { sends += 1; },
  });

  assert.equal(response.status, 401);
  assert.equal(sends, 0);
});

test('la presentation Meteo refuse un membre authentifie non admin', async () => {
  let sends = 0;
  const response = await handleMeteoPresentationRequest(post({}), {
    getActor: async () => ({ id: 'user-1', email: 'member@example.com', authorized: false }),
    consumeRateLimit: allow,
    sendPresentation: async () => { sends += 1; },
  });

  assert.equal(response.status, 403);
  assert.equal(sends, 0);
});

test('un admin Meteo peut envoyer la presentation uniquement a une destination autorisee', async () => {
  const sent = [];
  const response = await handleMeteoPresentationRequest(post({ to: 'TEAM@EXAMPLE.COM' }), {
    getActor: async () => ({ id: 'admin-1', email: 'admin@example.com', authorized: true }),
    configuredRecipients: 'team@example.com; second@example.com',
    consumeRateLimit: allow,
    sendPresentation: async (recipients) => { sent.push(recipients); },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(sent, [['team@example.com']]);
});

test('la presentation Meteo rejette les destinations arbitraires et les corps inattendus', async () => {
  let sends = 0;
  const dependencies = {
    getActor: async () => ({ id: 'admin-1', email: 'admin@example.com', authorized: true }),
    configuredRecipients: 'team@example.com',
    consumeRateLimit: allow,
    sendPresentation: async () => { sends += 1; },
  };

  const arbitrary = await handleMeteoPresentationRequest(post({ to: 'victim@example.net' }), dependencies);
  const unexpected = await handleMeteoPresentationRequest(post({ subject: 'controlled by client' }), dependencies);
  assert.equal(arbitrary.status, 403);
  assert.equal(unexpected.status, 400);
  assert.equal(sends, 0);
  assert.deepEqual(parseEmailAllowlist('A@example.com,invalid,a@example.com'), ['a@example.com']);
});

test('la presentation Meteo renvoie 429 avec Retry-After sans appeler SMTP', async () => {
  let sends = 0;
  const response = await handleMeteoPresentationRequest(post({}), {
    getActor: async () => ({ id: 'admin-1', email: 'admin@example.com', authorized: true }),
    consumeRateLimit: deny,
    sendPresentation: async () => { sends += 1; },
  });

  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '17');
  assert.equal(sends, 0);
});

test('le statut Suno refuse une requete non authentifiee sans interroger Suno', async () => {
  let fetches = 0;
  const response = await handleSunoStatusRequest('1234567890abcdef', {
    getUserId: async () => null,
    ownsTask: async () => true,
    consumeRateLimit: allow,
    fetchStatus: async () => { fetches += 1; return {}; },
  });

  assert.equal(response.status, 401);
  assert.equal(fetches, 0);
});

test('le statut Suno refuse une tache qui ne correspond pas a son proprietaire', async () => {
  let fetches = 0;
  const response = await handleSunoStatusRequest('1234567890abcdef', {
    getUserId: async () => 'user-1',
    ownsTask: async () => false,
    consumeRateLimit: allow,
    fetchStatus: async () => { fetches += 1; return {}; },
  });

  assert.equal(response.status, 403);
  assert.equal(fetches, 0);
});

test('le statut Suno valide le taskId avant la BDD ou le fournisseur', async () => {
  let ownershipLookups = 0;
  let fetches = 0;
  const response = await handleSunoStatusRequest('../not-a-task', {
    getUserId: async () => 'user-1',
    ownsTask: async () => { ownershipLookups += 1; return true; },
    consumeRateLimit: allow,
    fetchStatus: async () => { fetches += 1; return {}; },
  });

  assert.equal(response.status, 400);
  assert.equal(ownershipLookups, 0);
  assert.equal(fetches, 0);
  assert.equal(normalizeSunoTaskId('1234567890abcdef'), '1234567890abcdef');
});

test('le proprietaire obtient uniquement le sous-ensemble nettoye de la reponse Suno', async () => {
  const remoteSecret = 'must-never-leak';
  const response = await handleSunoStatusRequest('1234567890abcdef', {
    getUserId: async () => 'user-1',
    ownsTask: async () => true,
    consumeRateLimit: allow,
    fetchStatus: async () => ({
      data: {
        status: 'SUCCESS',
        callbackType: 'complete',
        apiKey: remoteSecret,
        error: remoteSecret,
        data: [
          { audio_url: 'https://media.example.com/song.mp3', token: remoteSecret },
          { audio_url: 'javascript:alert(1)' },
        ],
      },
      privateMetadata: remoteSecret,
    }),
  });

  const text = await response.text();
  const body = JSON.parse(text);
  assert.equal(response.status, 200);
  assert.equal(body.status, 'SUCCESS');
  assert.equal(body.callbackType, 'complete');
  assert.deepEqual(body.audioUrls, ['https://media.example.com/song.mp3']);
  assert.doesNotMatch(text, new RegExp(remoteSecret));
});

test('le rate limit Suno bloque avant l acces au fournisseur', async () => {
  let fetches = 0;
  const response = await handleSunoStatusRequest('1234567890abcdef', {
    getUserId: async () => 'user-1',
    ownsTask: async () => true,
    consumeRateLimit: deny,
    fetchStatus: async () => { fetches += 1; return {}; },
  });

  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '17');
  assert.equal(fetches, 0);
});

test('les erreurs SMTP et Suno restent generiques et ne transmettent pas le secret du fournisseur', async () => {
  const providerSecret = 'provider-secret-must-stay-server-side';
  const events = [];
  const meteoResponse = await handleMeteoPresentationRequest(post({}), {
    getActor: async () => ({ id: 'admin-1', email: 'admin@example.com', authorized: true }),
    consumeRateLimit: allow,
    sendPresentation: async () => { throw new Error(providerSecret); },
    reportFailure: (event) => events.push(event),
  });
  const sunoResponse = await handleSunoStatusRequest('1234567890abcdef', {
    getUserId: async () => 'user-1',
    ownsTask: async () => true,
    consumeRateLimit: allow,
    fetchStatus: async () => { throw new Error(providerSecret); },
    reportFailure: (event) => events.push(event),
  });

  assert.equal(meteoResponse.status, 500);
  assert.equal(sunoResponse.status, 502);
  assert.doesNotMatch(await meteoResponse.text(), new RegExp(providerSecret));
  assert.doesNotMatch(await sunoResponse.text(), new RegExp(providerSecret));
  assert.deepEqual(events, ['send_failed', 'upstream_failed']);
});

test('le rate limiter en memoire ouvre une nouvelle fenetre apres expiration', () => {
  const limiter = new InMemoryRateLimiter();
  assert.equal(limiter.consume('key', 1, 1_000, 1_000).allowed, true);
  const blocked = limiter.consume('key', 1, 1_000, 1_001);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 1);
  assert.equal(limiter.consume('key', 1, 1_000, 2_000).allowed, true);
});

test('les routes ne journalisent ni fragment de cle ni reponse distante brute', () => {
  const aiRoute = fs.readFileSync(new URL('../app/api/ai/status-simple/[taskId]/route.ts', import.meta.url), 'utf8');
  const meteoRoute = fs.readFileSync(new URL('../app/api/meteo/send-presentation/route.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(aiRoute, /substring\s*\(|response\.text\s*\(|JSON\.stringify\s*\(data|sunoError/);
  assert.doesNotMatch(aiRoute, /console\.(?:log|warn|error)\([^\n]*(?:SUNO_API_KEY|apiKey)/);
  assert.match(aiRoute, /\.eq\('task_id', taskId\)/);
  assert.match(aiRoute, /\.eq\('user_id', userId\)/);
  assert.match(meteoRoute, /getAdminGuard/);
  assert.doesNotMatch(meteoRoute, /body\?\.to\s*\|\|/);
});
