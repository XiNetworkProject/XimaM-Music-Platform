import { createWriteStream } from 'node:fs';
import { mkdir, open, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createHmac, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type LocalMediaKind =
  | 'audio'
  | 'cover'
  | 'cover-video'
  | 'avatar'
  | 'banner'
  | 'post-image'
  | 'message-image'
  | 'message-audio'
  | 'message-video'
  | 'clip-video'
  | 'ai-audio'
  | 'ai-cover'
  | 'star-academy-audio'
  | 'editorial-audio'
  | 'editorial-image'
  | 'weather-image';

type MediaClass = 'audio' | 'image' | 'video';

type KindConfig = {
  folder: string;
  maxBytes: number;
  mediaClass: MediaClass;
  createPoster?: boolean;
  allowVideoContainerAsAudio?: boolean;
};

const MB = 1024 * 1024;
const DEFAULT_MEDIA_ROOT = '/mnt/Synaura-SSD/apps/synaura/media';
const DEFAULT_MEDIA_BASE_URL = 'https://media.synaura.fr';

const MEDIA_ROOT = process.env.SYNAURA_MEDIA_ROOT || DEFAULT_MEDIA_ROOT;
const MEDIA_BASE_URL = (
  process.env.MEDIA_BASE_URL ||
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
  DEFAULT_MEDIA_BASE_URL
).replace(/\/+$/, '');

const KIND_CONFIG: Record<LocalMediaKind, KindConfig> = {
  audio: { folder: 'audio/tracks', maxBytes: 500 * MB, mediaClass: 'audio', allowVideoContainerAsAudio: true },
  cover: { folder: 'covers', maxBytes: 25 * MB, mediaClass: 'image' },
  'cover-video': { folder: 'covers/videos', maxBytes: 250 * MB, mediaClass: 'video', createPoster: true },
  avatar: { folder: 'profiles/avatars', maxBytes: 10 * MB, mediaClass: 'image' },
  banner: { folder: 'profiles/banners', maxBytes: 20 * MB, mediaClass: 'image' },
  'post-image': { folder: 'posts/images', maxBytes: 5 * MB, mediaClass: 'image' },
  'message-image': { folder: 'messages/images', maxBytes: 25 * MB, mediaClass: 'image' },
  'message-audio': { folder: 'messages/audio', maxBytes: 25 * MB, mediaClass: 'audio', allowVideoContainerAsAudio: true },
  'message-video': { folder: 'messages/videos', maxBytes: 25 * MB, mediaClass: 'video', createPoster: true },
  'clip-video': { folder: 'clips/videos', maxBytes: 95 * MB, mediaClass: 'video', createPoster: true },
  'ai-audio': { folder: 'ai/audio', maxBytes: 500 * MB, mediaClass: 'audio', allowVideoContainerAsAudio: true },
  'ai-cover': { folder: 'ai/covers', maxBytes: 25 * MB, mediaClass: 'image' },
  'star-academy-audio': { folder: 'star-academy/audio', maxBytes: 30 * MB, mediaClass: 'audio', allowVideoContainerAsAudio: true },
  'editorial-audio': { folder: 'editorial/audio', maxBytes: 500 * MB, mediaClass: 'audio', allowVideoContainerAsAudio: true },
  'editorial-image': { folder: 'editorial/images', maxBytes: 25 * MB, mediaClass: 'image' },
  'weather-image': { folder: 'weather/images', maxBytes: 10 * MB, mediaClass: 'image' },
};

export const LOCAL_MEDIA_KINDS = Object.freeze(Object.keys(KIND_CONFIG) as LocalMediaKind[]);

const CLASS_EXTENSIONS: Record<MediaClass, Set<string>> = {
  audio: new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.aiff', '.aif', '.opus', '.wma', '.mp4', '.mov', '.webm']),
  image: new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']),
  video: new Set(['.mp4', '.webm', '.mov', '.m4v']),
};

const MIME_EXTENSIONS: Record<string, string[]> = {
  'audio/mpeg': ['.mp3'],
  'audio/mp3': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/x-wav': ['.wav'],
  'audio/mp4': ['.m4a', '.mp4'],
  'audio/x-m4a': ['.m4a'],
  'audio/aac': ['.aac'],
  'audio/ogg': ['.ogg', '.opus'],
  'audio/webm': ['.webm'],
  'audio/flac': ['.flac'],
  'audio/x-flac': ['.flac'],
  'audio/aiff': ['.aiff', '.aif'],
  'audio/x-aiff': ['.aiff', '.aif'],
  'audio/opus': ['.opus'],
  'audio/x-ms-wma': ['.wma'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif'],
  'video/mp4': ['.mp4', '.m4v', '.m4a'],
  'video/x-m4v': ['.m4v'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
};

const VIDEO_CONTAINER_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']);

function cleanContentType(value: string) {
  return String(value || '').split(';', 1)[0]!.trim().toLowerCase();
}

function validateFileMetadata(kind: LocalMediaKind, originalName: string, rawContentType: string) {
  const config = KIND_CONFIG[kind];
  const contentType = cleanContentType(rawContentType) || 'application/octet-stream';
  const candidate = path.extname(path.basename(originalName || '')).toLowerCase();
  const allowedExtensions = CLASS_EXTENSIONS[config.mediaClass];
  const mimeExtensions = MIME_EXTENSIONS[contentType];

  if (candidate && !allowedExtensions.has(candidate)) {
    throw new Error('Extension de fichier non supportee');
  }

  const videoContainerAllowed = config.mediaClass === 'audio' && config.allowVideoContainerAsAudio && VIDEO_CONTAINER_MIMES.has(contentType);
  if (contentType !== 'application/octet-stream') {
    if (!mimeExtensions || (!mimeExtensions.some((extension) => allowedExtensions.has(extension)) && !videoContainerAllowed)) {
      throw new Error(`Type MIME non supporte: ${contentType || 'inconnu'}`);
    }
    if (candidate && !mimeExtensions.includes(candidate) && !videoContainerAllowed) {
      throw new Error('Le type MIME ne correspond pas a l extension du fichier');
    }
  }

  const extension = candidate || mimeExtensions?.find((value) => allowedExtensions.has(value));
  if (!extension) throw new Error('Extension de fichier requise');
  return { contentType, extension, config };
}

function encodeRelativePath(relativePath: string) {
  return relativePath.split('/').map(encodeURIComponent).join('/');
}

export function localMediaPublicUrl(relativePath: string) {
  return `${MEDIA_BASE_URL}/${encodeRelativePath(relativePath)}`;
}

export function localMediaPublicId(relativePath: string) {
  return `local/${relativePath}`;
}

export interface StoredLocalMedia {
  secure_url: string;
  public_id: string;
  bytes: number;
  duration?: number;
  poster_url?: string | null;
  poster_public_id?: string | null;
}

type ProbeResult = { duration?: number; streams: Set<string> };

async function probeMedia(filePath: string): Promise<ProbeResult> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=codec_type',
    '-of', 'json',
    filePath,
  ], { timeout: 45_000, maxBuffer: 1024 * 1024 });
  const parsed = JSON.parse(String(stdout || '{}'));
  const duration = Number.parseFloat(String(parsed?.format?.duration ?? ''));
  return {
    duration: Number.isFinite(duration) && duration >= 0 ? duration : undefined,
    streams: new Set((Array.isArray(parsed?.streams) ? parsed.streams : []).map((stream: any) => String(stream?.codec_type || ''))),
  };
}

async function assertImageSignature(filePath: string, extension: string) {
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(32);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const head = buffer.subarray(0, bytesRead);
    const ascii = head.toString('ascii');
    const valid =
      ((extension === '.jpg' || extension === '.jpeg') && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) ||
      (extension === '.png' && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
      (extension === '.gif' && (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a'))) ||
      (extension === '.webp' && ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') ||
      (extension === '.avif' && ascii.slice(4, 12).includes('ftyp') && /avif|avis/.test(ascii.slice(8, 24)));
    if (!valid) throw new Error('Le contenu du fichier image est invalide');
  } finally {
    await handle.close();
  }
}

async function validateStoredContent(filePath: string, mediaClass: MediaClass, extension: string) {
  if (mediaClass === 'image') {
    await assertImageSignature(filePath, extension);
    return {} as ProbeResult;
  }
  try {
    const probe = await probeMedia(filePath);
    if (!probe.streams.has(mediaClass)) {
      throw new Error(mediaClass === 'audio' ? 'Le fichier ne contient aucune piste audio' : 'Le fichier ne contient aucune piste video');
    }
    return probe;
  } catch (error) {
    if (error instanceof Error && /aucune piste/.test(error.message)) throw error;
    throw new Error('Le contenu audio ou video est invalide');
  }
}

async function createVideoPoster(filePath: string, relativePath: string) {
  const relativeDir = path.posix.dirname(relativePath);
  const baseName = path.posix.basename(relativePath, path.posix.extname(relativePath));
  const posterRelative = path.posix.join(relativeDir, 'posters', `${baseName}.jpg`);
  const posterAbsolute = path.join(MEDIA_ROOT, ...posterRelative.split('/'));
  await mkdir(path.dirname(posterAbsolute), { recursive: true });

  try {
    await execFileAsync('ffmpeg', [
      '-y', '-ss', '0', '-i', filePath,
      '-frames:v', '1',
      '-vf', 'scale=800:-2:force_original_aspect_ratio=decrease',
      '-q:v', '2',
      posterAbsolute,
    ], { timeout: 120_000, maxBuffer: 1024 * 1024 });

    return { poster_url: localMediaPublicUrl(posterRelative), poster_public_id: localMediaPublicId(posterRelative) };
  } catch (error) {
    await unlink(posterAbsolute).catch(() => {});
    console.error('Impossible de generer le poster video local:', error);
    return { poster_url: null, poster_public_id: null };
  }
}

export async function storeRequestBody(params: {
  kind: LocalMediaKind;
  originalName: string;
  contentType: string;
  body: ReadableStream<Uint8Array>;
  contentLength?: number | null;
  maxBytes?: number;
  ownerId?: string | null;
}): Promise<StoredLocalMedia> {
  const { kind, originalName, contentType, body } = params;
  if (!isLocalMediaKind(kind)) throw new Error('Type de media invalide');
  const { extension, config } = validateFileMetadata(kind, originalName, contentType);
  const maxBytes = Math.min(config.maxBytes, params.maxBytes || config.maxBytes);
  if (params.contentLength && params.contentLength > maxBytes) {
    throw new Error(`Fichier trop volumineux (limite ${Math.round(maxBytes / MB)} MB)`);
  }

  const destinationDir = path.join(MEDIA_ROOT, ...config.folder.split('/'));
  await mkdir(destinationDir, { recursive: true });
  const ownerTag = params.ownerId ? `u${mediaOwnerTag(params.ownerId)}_` : '';
  const stem = `${kind.replace(/[^a-z0-9-]/gi, '-')}_${ownerTag}${Date.now()}_${randomBytes(12).toString('hex')}`;
  const fileName = `${stem}${extension}`;
  const relativePath = path.posix.join(config.folder, fileName);
  const finalPath = path.join(destinationDir, fileName);
  const tempPath = `${finalPath}.part`;
  let bytes = 0;

  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += Buffer.byteLength(chunk);
      if (bytes > maxBytes) return callback(new Error(`Fichier trop volumineux (limite ${Math.round(maxBytes / MB)} MB)`));
      callback(null, chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(body as any), limiter, createWriteStream(tempPath, { flags: 'wx', mode: 0o644 }));
    if (bytes === 0) throw new Error('Le fichier est vide');
    await rename(tempPath, finalPath);
    const probe = await validateStoredContent(finalPath, config.mediaClass, extension);
    const result: StoredLocalMedia = {
      secure_url: localMediaPublicUrl(relativePath),
      public_id: localMediaPublicId(relativePath),
      bytes,
      ...(probe.duration !== undefined ? { duration: probe.duration } : {}),
    };
    if (config.createPoster) Object.assign(result, await createVideoPoster(finalPath, relativePath));
    return result;
  } catch (error) {
    await Promise.all([unlink(tempPath).catch(() => {}), unlink(finalPath).catch(() => {})]);
    throw error;
  }
}

export async function storeWebFile(file: File, kind: LocalMediaKind, maxBytes?: number, ownerId?: string | null) {
  return storeRequestBody({
    kind,
    originalName: file.name || 'upload.bin',
    contentType: file.type || 'application/octet-stream',
    body: file.stream(),
    contentLength: file.size,
    maxBytes,
    ownerId,
  });
}

function isPrivateIp(address: string) {
  if (address === '::1' || address === '0:0:0:0:0:0:0:1') return true;
  if (address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:')) return true;
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168);
}

async function assertPublicRemoteUrl(value: string) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('URL media distante invalide');
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local')) throw new Error('Hote media distant interdit');
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) throw new Error('Hote media distant prive interdit');
  return url;
}

async function fetchPublicMedia(url: string, redirects = 0): Promise<Response> {
  if (redirects > 3) throw new Error('Trop de redirections media');
  const parsed = await assertPublicRemoteUrl(url);
  const response = await fetch(parsed, { redirect: 'manual', signal: AbortSignal.timeout(60_000) });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get('location');
    if (!location) throw new Error('Redirection media invalide');
    return fetchPublicMedia(new URL(location, parsed).toString(), redirects + 1);
  }
  return response;
}

export async function storeRemoteMedia(sourceUrl: string, kind: LocalMediaKind): Promise<StoredLocalMedia> {
  const response = await fetchPublicMedia(sourceUrl);
  if (!response.ok || !response.body) throw new Error(`Telechargement media impossible (${response.status})`);
  const parsed = new URL(sourceUrl);
  const originalName = decodeURIComponent(path.posix.basename(parsed.pathname)) || 'remote-media.bin';
  const contentLength = Number(response.headers.get('content-length') || 0) || null;
  return storeRequestBody({
    kind,
    originalName,
    contentType: response.headers.get('content-type') || 'application/octet-stream',
    contentLength,
    body: response.body,
  });
}

function safeRelativePathFromPublicId(localPublicId: string) {
  if (!localPublicId.startsWith('local/')) return null;
  const relative = localPublicId.slice('local/'.length);
  if (!relative || relative.includes('\\') || relative.includes('\0') || path.posix.isAbsolute(relative)) return null;
  const segments = relative.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return null;
  const normalized = path.posix.normalize(relative);
  if (normalized !== relative) return null;
  const absolute = path.resolve(MEDIA_ROOT, ...segments);
  const root = path.resolve(MEDIA_ROOT);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) return null;
  return { relative, absolute };
}

export async function deleteLocalMedia(localPublicId: string) {
  const safe = safeRelativePathFromPublicId(localPublicId);
  if (!safe) return false;
  const extension = path.posix.extname(safe.relative);
  const posterRelative = path.posix.join(path.posix.dirname(safe.relative), 'posters', `${path.posix.basename(safe.relative, extension)}.jpg`);
  const posterSafe = safeRelativePathFromPublicId(localMediaPublicId(posterRelative));
  await unlink(safe.absolute).catch((error: NodeJS.ErrnoException) => {
    if (error?.code !== 'ENOENT') throw error;
  });
  if (posterSafe) await unlink(posterSafe.absolute).catch(() => {});
  return true;
}

export function isLocalMediaKind(value: unknown): value is LocalMediaKind {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(KIND_CONFIG, value);
}

export function isLocalMediaPublicId(value?: string | null) {
  return Boolean(value && safeRelativePathFromPublicId(value));
}

function mediaOwnerTag(ownerId: string) {
  const secret = process.env.MEDIA_STORAGE_SECRET || process.env.NEXTAUTH_SECRET || 'synaura-local-development-only';
  return createHmac('sha256', secret).update(ownerId).digest('hex').slice(0, 20);
}

export function isLocalMediaOwnedBy(publicId: unknown, ownerId: string) {
  if (typeof publicId !== 'string' || !isLocalMediaPublicId(publicId) || !ownerId) return false;
  const fileName = path.posix.basename(publicId);
  return fileName.includes(`_u${mediaOwnerTag(ownerId)}_`);
}

export function isLocalMediaReference(url: unknown, publicId: unknown, expectedKind?: LocalMediaKind) {
  if (typeof url !== 'string' || typeof publicId !== 'string') return false;
  const safe = safeRelativePathFromPublicId(publicId);
  if (!safe) return false;
  if (expectedKind && !safe.relative.startsWith(`${KIND_CONFIG[expectedKind].folder}/`)) return false;
  return localMediaPublicUrl(safe.relative) === url;
}

export function localPublicIdFromUrl(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  try {
    let decodedInput = value;
    for (let pass = 0; pass < 2; pass += 1) {
      decodedInput = decodeURIComponent(decodedInput);
      const rawPath = decodedInput.split(/[?#]/, 1)[0] || '';
      if (rawPath.split('/').some((segment) => segment === '.' || segment === '..')) return null;
    }
    const url = new URL(value);
    const base = new URL(MEDIA_BASE_URL);
    if (url.origin !== base.origin || url.search || url.hash) return null;
    const basePath = base.pathname.replace(/\/+$/, '');
    if (basePath && !url.pathname.startsWith(`${basePath}/`)) return null;
    const encodedRelative = url.pathname.slice(basePath.length).replace(/^\/+/, '');
    const relative = encodedRelative.split('/').map(decodeURIComponent).join('/');
    const publicId = localMediaPublicId(relative);
    return safeRelativePathFromPublicId(publicId) ? publicId : null;
  } catch {
    return null;
  }
}

export function isLocalMediaUrl(value: unknown, expectedKind?: LocalMediaKind) {
  const publicId = localPublicIdFromUrl(value);
  if (!publicId) return false;
  if (!expectedKind) return true;
  const safe = safeRelativePathFromPublicId(publicId);
  return Boolean(safe?.relative.startsWith(`${KIND_CONFIG[expectedKind].folder}/`));
}
