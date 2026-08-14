import { createWriteStream } from 'node:fs';
import { mkdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type LocalMediaKind = 'audio' | 'cover' | 'cover-video';

const DEFAULT_MEDIA_ROOT = '/mnt/Synaura-SSD/apps/synaura/media';
const DEFAULT_MEDIA_BASE_URL = 'https://media.synaura.fr';

const MEDIA_ROOT = process.env.SYNAURA_MEDIA_ROOT || DEFAULT_MEDIA_ROOT;
const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL || process.env.NEXT_PUBLIC_MEDIA_BASE_URL || DEFAULT_MEDIA_BASE_URL).replace(/\/+$/, '');

const MAX_BYTES: Record<LocalMediaKind, number> = {
  audio: 1100 * 1024 * 1024,
  cover: 25 * 1024 * 1024,
  'cover-video': 250 * 1024 * 1024,
};

const FOLDERS: Record<LocalMediaKind, string> = {
  audio: 'audio',
  cover: 'covers',
  'cover-video': 'covers/videos',
};

const ALLOWED_EXTENSIONS: Record<LocalMediaKind, Set<string>> = {
  audio: new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.aiff', '.aif', '.opus', '.wma']),
  cover: new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']),
  'cover-video': new Set(['.mp4', '.webm', '.mov', '.m4v']),
};

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/mp4': '.m4a',
  'audio/aac': '.aac',
  'audio/ogg': '.ogg',
  'audio/flac': '.flac',
  'audio/opus': '.opus',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

function extensionFor(kind: LocalMediaKind, originalName: string, contentType: string) {
  const candidate = path.extname(originalName || '').toLowerCase();
  if (ALLOWED_EXTENSIONS[kind].has(candidate)) return candidate;
  const fromMime = CONTENT_TYPE_EXTENSIONS[contentType.toLowerCase()];
  if (fromMime && ALLOWED_EXTENSIONS[kind].has(fromMime)) return fromMime;
  throw new Error('Type de fichier non supporte');
}

function assertContentType(kind: LocalMediaKind, contentType: string) {
  const type = contentType.toLowerCase();
  if (kind === 'audio' && !type.startsWith('audio/') && type !== 'application/octet-stream') {
    throw new Error('Le fichier doit etre un audio');
  }
  if (kind === 'cover' && !type.startsWith('image/') && type !== 'application/octet-stream') {
    throw new Error('Le fichier doit etre une image');
  }
  if (kind === 'cover-video' && !type.startsWith('video/') && type !== 'application/octet-stream') {
    throw new Error('Le fichier doit etre une video');
  }
}

function publicUrl(relativePath: string) {
  return `${MEDIA_BASE_URL}/${relativePath.split(path.sep).map(encodeURIComponent).join('/')}`;
}

function publicId(relativePath: string) {
  return `local/${relativePath.split(path.sep).join('/')}`;
}

export interface StoredLocalMedia {
  secure_url: string;
  public_id: string;
  bytes: number;
  duration?: number;
  poster_url?: string | null;
  poster_public_id?: string | null;
}

async function probeDuration(filePath: string): Promise<number | undefined> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ], { timeout: 30_000 });
    const duration = Number.parseFloat(String(stdout).trim());
    return Number.isFinite(duration) && duration >= 0 ? duration : undefined;
  } catch {
    return undefined;
  }
}

async function createVideoPoster(filePath: string, relativePath: string) {
  try {
    const relativeDir = path.posix.dirname(relativePath);
    const baseName = path.posix.basename(relativePath, path.posix.extname(relativePath));
    const posterRelative = path.posix.join(relativeDir, 'posters', `${baseName}.jpg`);
    const posterAbsolute = path.join(MEDIA_ROOT, ...posterRelative.split('/'));
    await mkdir(path.dirname(posterAbsolute), { recursive: true });

    await execFileAsync('ffmpeg', [
      '-y',
      '-ss', '0',
      '-i', filePath,
      '-frames:v', '1',
      '-vf', 'scale=800:-2:force_original_aspect_ratio=decrease',
      '-q:v', '2',
      posterAbsolute,
    ], { timeout: 60_000, maxBuffer: 1024 * 1024 });

    return {
      poster_url: publicUrl(posterRelative),
      poster_public_id: publicId(posterRelative),
    };
  } catch (error) {
    console.error('Impossible de generer le poster video local:', error);
    return { poster_url: null, poster_public_id: null };
  }
}

export async function storeRequestBody(params: {
  kind: LocalMediaKind;
  originalName: string;
  contentType: string;
  body: ReadableStream<Uint8Array>;
}): Promise<StoredLocalMedia> {
  const { kind, originalName, contentType, body } = params;
  assertContentType(kind, contentType);

  const extension = extensionFor(kind, originalName, contentType);
  const folder = FOLDERS[kind];
  const destinationDir = path.join(MEDIA_ROOT, ...folder.split('/'));
  await mkdir(destinationDir, { recursive: true });

  const stem = `${kind.replace(/[^a-z0-9-]/gi, '-')}_${Date.now()}_${randomBytes(6).toString('hex')}`;
  const fileName = `${stem}${extension}`;
  const relativePath = path.posix.join(folder, fileName);
  const finalPath = path.join(destinationDir, fileName);
  const tempPath = `${finalPath}.part`;
  const maxBytes = MAX_BYTES[kind];
  let bytes = 0;

  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += Buffer.byteLength(chunk);
      if (bytes > maxBytes) {
        callback(new Error(`Fichier trop volumineux (limite ${Math.round(maxBytes / 1024 / 1024)} MB)`));
        return;
      }
      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(body as any),
      limiter,
      createWriteStream(tempPath, { flags: 'wx', mode: 0o644 }),
    );
    await rename(tempPath, finalPath);
  } catch (error) {
    await unlink(tempPath).catch(() => {});
    throw error;
  }

  const result: StoredLocalMedia = {
    secure_url: publicUrl(relativePath),
    public_id: publicId(relativePath),
    bytes,
  };

  if (kind === 'audio' || kind === 'cover-video') {
    result.duration = await probeDuration(finalPath);
  }

  if (kind === 'cover-video') {
    Object.assign(result, await createVideoPoster(finalPath, relativePath));
  }

  return result;
}

export async function deleteLocalMedia(localPublicId: string) {
  if (!localPublicId.startsWith('local/')) return false;
  const relative = localPublicId.slice('local/'.length);
  if (!relative || relative.includes('..') || path.isAbsolute(relative)) return false;

  const absolute = path.resolve(MEDIA_ROOT, ...relative.split('/'));
  const root = path.resolve(MEDIA_ROOT) + path.sep;
  if (!absolute.startsWith(root)) return false;

  await unlink(absolute).catch((error: NodeJS.ErrnoException) => {
    if (error?.code !== 'ENOENT') throw error;
  });
  return true;
}

export function isLocalMediaPublicId(value?: string | null) {
  return Boolean(value && value.startsWith('local/'));
}
