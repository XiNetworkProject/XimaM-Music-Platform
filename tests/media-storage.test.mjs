import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const mediaRoot = await mkdtemp(path.join(tmpdir(), 'synaura-media-test-'));
process.env.SYNAURA_MEDIA_ROOT = mediaRoot;
process.env.MEDIA_BASE_URL = 'https://media.synaura.fr';
process.env.MEDIA_STORAGE_SECRET = 'test-only-storage-secret';

const storage = await import('../lib/localMediaStorage.ts');
const urls = await import('../lib/mediaUrls.ts');

test.after(async () => {
  await rm(mediaRoot, { recursive: true, force: true });
});

test('rewrites historical provider URLs to the Freebox mirror and exposes a fallback', () => {
  const legacy = 'https://res.cloudinary.com/demo/image/upload/v42/covers/%C3%A9t%C3%A9.jpg?x=1';
  const local = urls.toPublicMediaUrl(legacy);
  assert.equal(local, 'https://media.synaura.fr/cloudinary/demo/image/upload/v42/covers/%C3%A9t%C3%A9.jpg?x=1');
  assert.equal(urls.toLegacyMediaFallback(local), legacy);
  assert.deepEqual(urls.mediaUrlCandidates(legacy), [local, legacy]);
});

test('accepts safe local identifiers and rejects traversal attempts', () => {
  assert.equal(storage.isLocalMediaPublicId('local/audio/tracks/audio_123.mp3'), true);
  assert.equal(storage.isLocalMediaPublicId('local/../secrets.txt'), false);
  assert.equal(storage.isLocalMediaPublicId('local/audio/tracks/../../secrets.txt'), false);
  assert.equal(storage.isLocalMediaPublicId('local/audio\\..\\secrets.txt'), false);
  assert.equal(storage.localPublicIdFromUrl('https://media.synaura.fr/audio/tracks/audio_123.mp3'), 'local/audio/tracks/audio_123.mp3');
  assert.equal(storage.localPublicIdFromUrl('https://media.synaura.fr/%2e%2e/secrets.txt'), null);
});

test('streams an image to disk, validates its signature, and deletes it safely', async () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(png);
      controller.close();
    },
  });
  const stored = await storage.storeRequestBody({
    kind: 'avatar',
    originalName: '../../unsafe name.png',
    contentType: 'image/png',
    contentLength: png.length,
    body,
    ownerId: 'user-123',
  });

  assert.match(stored.public_id, /^local\/profiles\/avatars\/avatar_u[0-9a-f]{20}_\d+_[0-9a-f]{24}\.png$/);
  assert.equal(storage.isLocalMediaOwnedBy(stored.public_id, 'user-123'), true);
  assert.equal(storage.isLocalMediaOwnedBy(stored.public_id, 'other-user'), false);
  const relative = stored.public_id.slice('local/'.length).split('/');
  assert.deepEqual(await readFile(path.join(mediaRoot, ...relative)), png);
  assert.equal(await storage.deleteLocalMedia(stored.public_id), true);
  await assert.rejects(readFile(path.join(mediaRoot, ...relative)), /ENOENT/);
});

test('rejects MIME and extension mismatches before writing', async () => {
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1])); controller.close(); } });
  await assert.rejects(
    storage.storeRequestBody({
      kind: 'avatar',
      originalName: 'avatar.png',
      contentType: 'image/jpeg',
      contentLength: 1,
      body,
    }),
    /MIME/,
  );
});
