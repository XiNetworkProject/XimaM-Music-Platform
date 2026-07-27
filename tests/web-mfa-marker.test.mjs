import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createWebMfaMarker,
  verifyWebMfaMarker,
} from '../lib/webMfaMarker.ts';

const NOW = Date.UTC(2026, 6, 27, 16, 0, 0);
const SECRET = 'unit-test-next-auth-secret';
const IDENTITY = {
  userId: 'user-123',
  sessionId: 'session-456',
};

test('accepte uniquement le marqueur signe de la session courante', async () => {
  const marker = await createWebMfaMarker(
    IDENTITY.userId,
    IDENTITY.sessionId,
    SECRET,
    NOW,
  );

  assert.equal(await verifyWebMfaMarker(marker, IDENTITY, SECRET, NOW), true);
  assert.equal(
    await verifyWebMfaMarker(marker, { ...IDENTITY, userId: 'other-user' }, SECRET, NOW),
    false,
  );
  assert.equal(
    await verifyWebMfaMarker(marker, { ...IDENTITY, sessionId: 'other-session' }, SECRET, NOW),
    false,
  );
  assert.equal(await verifyWebMfaMarker(marker, IDENTITY, 'wrong-secret', NOW), false);
});

test('refuse un marqueur falsifie, malforme ou expire', async () => {
  const marker = await createWebMfaMarker(
    IDENTITY.userId,
    IDENTITY.sessionId,
    SECRET,
    NOW,
  );
  const [payload, signature] = marker.split('.');

  assert.equal(
    await verifyWebMfaMarker(`${payload}x.${signature}`, IDENTITY, SECRET, NOW),
    false,
  );
  assert.equal(await verifyWebMfaMarker(`${marker}.extra`, IDENTITY, SECRET, NOW), false);
  assert.equal(await verifyWebMfaMarker('', IDENTITY, SECRET, NOW), false);
  assert.equal(
    await verifyWebMfaMarker(marker, IDENTITY, SECRET, NOW + 31 * 24 * 60 * 60 * 1000),
    false,
  );
});
