import { randomUUID } from 'crypto';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_ROOT = path.resolve(process.env.SYNAURA_DATA_ROOT || '/mnt/Synaura-SSD/apps/synaura/data');
const STORE_ROOT = path.resolve(DATA_ROOT, 'music-clip-interactions');

export type StoredClipComment = {
  id: string;
  clipId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

function safeSegment(value: string, label: string) {
  const normalized = String(value || '').trim();
  if (!normalized || !/^[a-zA-Z0-9_-]+$/.test(normalized)) throw new Error(`${label} invalide`);
  return normalized;
}

function safeStorePath(...segments: string[]) {
  const target = path.resolve(STORE_ROOT, ...segments.map((segment) => safeSegment(segment, 'Segment')));
  if (!target.startsWith(`${STORE_ROOT}${path.sep}`)) throw new Error('Chemin interactions invalide');
  return target;
}

function likeDirectory(clipId: string) {
  return safeStorePath('likes', safeSegment(clipId, 'Clip'));
}

function likeFile(clipId: string, userId: string) {
  return path.join(likeDirectory(clipId), `${safeSegment(userId, 'Utilisateur')}.json`);
}

function commentDirectory(clipId: string) {
  return safeStorePath('comments', safeSegment(clipId, 'Clip'));
}

function commentFile(clipId: string, commentId: string) {
  return path.join(commentDirectory(clipId), `${safeSegment(commentId, 'Commentaire')}.json`);
}

async function jsonFileNames(directory: string) {
  try {
    return (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left));
  } catch (error: any) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

export async function hasMusicClipLike(clipId: string, userId: string) {
  try {
    await readFile(likeFile(clipId, userId));
    return true;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

export async function setMusicClipLikeStored(clipId: string, userId: string) {
  const target = likeFile(clipId, userId);
  await mkdir(path.dirname(target), { recursive: true });
  try {
    await writeFile(target, JSON.stringify({ clipId, userId, createdAt: new Date().toISOString() }), {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
  } catch (error: any) {
    if (error?.code !== 'EEXIST') throw error;
  }
}

export async function removeMusicClipLikeStored(clipId: string, userId: string) {
  await unlink(likeFile(clipId, userId)).catch((error: any) => {
    if (error?.code !== 'ENOENT') throw error;
  });
}

export async function countMusicClipLikesStored(clipId: string) {
  return (await jsonFileNames(likeDirectory(clipId))).length;
}

export async function createMusicClipCommentStored(clipId: string, userId: string, content: string) {
  const now = new Date().toISOString();
  const comment: StoredClipComment = {
    id: `${Date.now()}-${randomUUID()}`,
    clipId: safeSegment(clipId, 'Clip'),
    userId: safeSegment(userId, 'Utilisateur'),
    content,
    createdAt: now,
    updatedAt: now,
  };
  const target = commentFile(clipId, comment.id);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(comment), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  return comment;
}

export async function getMusicClipCommentStored(clipId: string, commentId: string) {
  try {
    const parsed = JSON.parse(await readFile(commentFile(clipId, commentId), 'utf8')) as StoredClipComment;
    return parsed?.id && parsed.clipId === clipId ? parsed : null;
  } catch (error: any) {
    if (error?.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
  }
}

export async function listMusicClipCommentsStored(clipId: string, limit: number, offset: number) {
  const names = (await jsonFileNames(commentDirectory(clipId))).slice(offset, offset + limit);
  const comments = await Promise.all(names.map((name) => getMusicClipCommentStored(clipId, name.replace(/\.json$/i, ''))));
  return comments.filter((comment): comment is StoredClipComment => Boolean(comment));
}

export async function countMusicClipCommentsStored(clipId: string) {
  return (await jsonFileNames(commentDirectory(clipId))).length;
}

export async function deleteMusicClipCommentStored(clipId: string, commentId: string) {
  await unlink(commentFile(clipId, commentId)).catch((error: any) => {
    if (error?.code !== 'ENOENT') throw error;
  });
}
