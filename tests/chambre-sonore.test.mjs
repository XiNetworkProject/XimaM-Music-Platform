import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile, stat } from 'node:fs/promises';
import { request } from 'node:http';
import { after, before, test } from 'node:test';
import { createChamberServer } from '../prototypes/chambre-sonore/server.mjs';

const prototypeRoot = new URL('../prototypes/chambre-sonore/', import.meta.url);
const signatureFile = new URL('../public/audio/synaura-sonic-logo.wav', import.meta.url);
const server = createChamberServer();
let port;

before(async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  port = server.address().port;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

// Use raw HTTP paths: fetch and URL constructors normalize traversal attempts.
function get(path, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: { Connection: 'close', ...headers },
      agent: false,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks),
      }));
      response.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

test('serves the isolated entry point and its local styles and module', async () => {
  const page = await get('/');
  assert.equal(page.status, 200);
  assert.match(page.headers['content-type'], /^text\/html/);
  assert.match(page.body.toString(), /La Chambre Sonore/i);
  assert.equal(page.headers['x-content-type-options'], 'nosniff');
  assert.equal(page.headers['access-control-allow-origin'], undefined);
  assert.equal(page.headers['cache-control'], 'no-store');
  const direct = await get('/index.html?preview=local');
  assert.deepEqual(direct.body, page.body);

  for (const [path, type] of [
    ['/chamber.css', 'text/css'],
    ['/chamber.js', 'text/javascript'],
  ]) {
    const result = await get(path);
    assert.equal(result.status, 200, path);
    assert.ok(result.headers['content-type'].startsWith(type), path);
    assert.ok(result.body.length > 0, path);
  }
});

test('allows only the exact installed Three.js vendor modules', async () => {
  for (const path of ['/vendor/three.module.js', '/vendor/three.core.js', '/vendor/RoomEnvironment.js']) {
    const result = await get(path);
    assert.equal(result.status, 200, path);
    assert.match(result.headers['content-type'], /^text\/javascript/);
    assert.ok(result.body.length > 100, path);
  }
  for (const path of ['/vendor/', '/vendor/package.json', '/vendor/three.cjs', '/vendor/../package.json']) {
    assert.equal((await get(path)).status, 404, path);
  }
});

test('serves the exact existing signature with HEAD and valid audio byte ranges', async () => {
  const expectedSize = (await stat(signatureFile)).size;
  const head = await get('/media/signature.wav', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers['content-type'], 'audio/wav');
  assert.equal(Number(head.headers['content-length']), expectedSize);
  assert.equal(head.body.length, 0);

  const partial = await get('/media/signature.wav', { headers: { Range: 'bytes=0-11' } });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers['content-range'], `bytes 0-11/${expectedSize}`);
  assert.equal(partial.body.length, 12);
  assert.equal(partial.body.subarray(0, 4).toString(), 'RIFF');
  assert.equal(partial.body.subarray(8, 12).toString(), 'WAVE');

  const suffix = await get('/media/signature.wav', { headers: { Range: 'bytes=-16' } });
  assert.equal(suffix.status, 206);
  assert.equal(suffix.body.length, 16);
  assert.equal(suffix.headers['content-range'], `bytes ${expectedSize - 16}-${expectedSize - 1}/${expectedSize}`);
});

test('rejects malformed and unsatisfiable byte ranges', async () => {
  for (const range of ['bytes=', 'bytes=-', 'bytes=-0', 'bytes=8-2', 'bytes=999999999-', 'bytes=0-1,3-4']) {
    const result = await get('/media/signature.wav', { headers: { Range: range } });
    assert.equal(result.status, 416, range);
    assert.match(result.headers['content-range'], /^bytes \*\/\d+$/);
  }
});

test('denies workspace files, hidden files, source server, APIs, and path traversal', async () => {
  const denied = [
    '/.env',
    '/.env.local',
    '/.git/config',
    '/package.json',
    '/server.mjs',
    '/README.md',
    '/api/auth/session',
    '/public/audio/synaura-sonic-logo.wav',
    '/media/synaura-sonic-logo.wav',
    '/node_modules/three/build/three.module.js',
    '/../package.json',
    '/../../.env',
    '/%2e%2e/package.json',
    '/%2E%2E%2F.env',
    '/%252e%252e%252f.env',
    '/..%5c..%5c.env',
    '/vendor/%2e%2e/%2e%2e/.env',
    '/vendor/three.module.js/../../.env',
    '//localhost/.env',
    '/C:/Windows/win.ini',
    '/%00.html',
    '/%FF.html',
    '/%',
  ];
  for (const path of denied) {
    const result = await get(path);
    assert.equal(result.status, 404, path);
    assert.equal(result.body.toString(), 'Not found.\n', path);
  }
});

test('accepts only read-only HTTP methods and has no fallback into the existing site', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const result = await get('/', { method });
    assert.equal(result.status, 405, method);
    assert.equal(result.headers.allow, 'GET, HEAD');
  }
  assert.equal((await get('/unrelated-existing-site-route')).status, 404);
  const missingHead = await get('/missing.html', { method: 'HEAD' });
  assert.equal(missingHead.status, 404);
  assert.equal(missingHead.body.length, 0);
});

test('the page keeps a single explicit audio control and accessible chamber controls', async () => {
  const html = await readFile(new URL('index.html', prototypeRoot), 'utf8');
  const requiredIds = [
    'chamber-canvas', 'chamber-audio', 'sound-toggle', 'motion-toggle',
    'enter-chamber', 'chamber-stage', 'material-pulse', 'chamber-announcement',
  ];
  for (const id of requiredIds) {
    assert.equal((html.match(new RegExp(`\\bid=["']${id}["']`, 'g')) ?? []).length, 1, id);
  }

  const audioTags = html.match(/<audio\b[^>]*>/gi) ?? [];
  assert.equal(audioTags.length, 1, 'one audio element');
  assert.match(audioTags[0], /\bid=["']chamber-audio["']/);
  assert.doesNotMatch(audioTags[0], /\bautoplay(?:\s|=|>)/i);

  const buttons = html.match(/<button\b[^>]*>/gi) ?? [];
  for (const id of ['sound-toggle', 'motion-toggle', 'enter-chamber']) {
    assert.ok(buttons.some((tag) => new RegExp(`\\bid=["']${id}["']`).test(tag)), `${id} is a native button`);
  }
  for (const chapter of ['0', '1', '2']) {
    assert.ok(buttons.some((tag) => new RegExp(`\\bdata-chapter-target=["']${chapter}["']`).test(tag)), `chapter ${chapter}`);
  }
  const announcement = (html.match(/<[^>]+>/g) ?? []).find((tag) => /\bid=["']chamber-announcement["']/.test(tag));
  assert.match(announcement, /\brole=["']status["']/);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=["'](?:https?:)?\/\//i, 'script dependencies stay local');
});

test('the fixed stage cannot become a scroll container when a control receives focus', async () => {
  const css = await readFile(new URL('chamber.css', prototypeRoot), 'utf8');
  const stageRules = [...css.matchAll(/#chamber-stage\s*\{([^}]+)\}/g)].map((match) => match[1]);
  assert.ok(stageRules.length > 0);
  assert.match(stageRules[0], /(?:^|;)\s*position\s*:\s*fixed\s*(?:;|$)/);
  assert.match(stageRules[0], /(?:^|;)\s*overflow\s*:\s*clip\s*(?:;|$)/);
  // overflow:hidden can still scroll programmatically when focused descendants
  // need revealing; browser QA reproduced the resulting fixed-scene drift.
  for (const rule of stageRules) {
    assert.doesNotMatch(rule, /(?:^|;)\s*overflow(?:-[xy])?\s*:\s*(?:hidden|auto|scroll)\b/);
  }
});
