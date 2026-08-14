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
const mobileUrls = await import('../synaura-app/src/media/mediaUrls.ts');

test.after(async () => {
  await rm(mediaRoot, { recursive: true, force: true });
});

test('rewrites historical Cloudinary paths identically on web and mobile', () => {
  const cases = [
    {
      label: 'image avec version',
      legacy: 'https://res.cloudinary.com/demo/image/upload/v123456/ximam/covers/file.png',
      local: 'https://media.synaura.fr/cloudinary/image/ximam/covers/file.png',
    },
    {
      label: 'audio video avec version et query string',
      legacy: 'https://res.cloudinary.com/demo/video/upload/v123456/ximam/audio/file.mp3?download=1',
      local: 'https://media.synaura.fr/cloudinary/video/ximam/audio/file.mp3?download=1',
    },
    {
      label: 'raw sans version',
      legacy: 'https://res.cloudinary.com/demo/raw/upload/ximam/documents/archive.zip',
      local: 'https://media.synaura.fr/cloudinary/raw/ximam/documents/archive.zip',
    },
    {
      label: 'transformations chainees avant version',
      legacy: 'https://res.cloudinary.com/demo/image/upload/c_fill,w_800/e_sharpen:80/q_auto/v987654/ximam/covers/transformed.jpg',
      local: 'https://media.synaura.fr/cloudinary/image/ximam/covers/transformed.jpg',
    },
    {
      label: 'private avec transformation sans version',
      legacy: 'https://res.cloudinary.com/demo/video/private/e_volume:40,q_auto/ximam/audio/private.mp3',
      local: 'https://media.synaura.fr/cloudinary/video/ximam/audio/private.mp3',
    },
    {
      label: 'authenticated raw',
      legacy: 'https://res.cloudinary.com/demo/raw/authenticated/v7/ximam/private/data.bin?token=abc',
      local: 'https://media.synaura.fr/cloudinary/raw/ximam/private/data.bin?token=abc',
    },
  ];

  for (const fixture of cases) {
    assert.equal(urls.toPublicMediaUrl(fixture.legacy), fixture.local, `web: ${fixture.label}`);
    assert.equal(mobileUrls.toPublicMediaUrl(fixture.legacy), fixture.local, `mobile: ${fixture.label}`);
    assert.equal(urls.toLegacyMediaFallback(fixture.legacy), fixture.legacy, `fallback: ${fixture.label}`);
    assert.deepEqual(urls.mediaUrlCandidates(fixture.legacy), [fixture.local, fixture.legacy], `candidates: ${fixture.label}`);
  }
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
