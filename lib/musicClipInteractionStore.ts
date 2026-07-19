import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

const BUCKET = 'music-clip-interactions';
const PAGE_SIZE = 100;
let bucketReady: Promise<void> | null = null;

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
  if (!normalized || !/^[a-zA-Z0-9_-]+$/.test(normalized)) {
    throw new Error(`${label} invalide`);
  }
  return normalized;
}

async function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data, error } = await supabaseAdmin.storage.getBucket(BUCKET);
      if (data && !error) return;
      const created = await supabaseAdmin.storage.createBucket(BUCKET, {
        public: false,
        allowedMimeTypes: ['application/json'],
        fileSizeLimit: 64 * 1024,
      });
      if (created.error && !/already exists|duplicate/i.test(created.error.message || '')) {
        throw created.error;
      }
    })().catch((error) => {
      bucketReady = null;
      throw error;
    });
  }
  await bucketReady;
}

async function listAll(prefix: string) {
  await ensureBucket();
  const result: Array<{ name: string; created_at?: string | null }> = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'desc' },
    });
    if (error) throw error;
    const page = data || [];
    result.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += page.length;
  }
  return result;
}

function likePrefix(clipId: string) {
  return `likes/${safeSegment(clipId, 'Clip')}`;
}

function likePath(clipId: string, userId: string) {
  return `${likePrefix(clipId)}/${safeSegment(userId, 'Utilisateur')}.json`;
}

function commentPrefix(clipId: string) {
  return `comments/${safeSegment(clipId, 'Clip')}`;
}

function commentPath(clipId: string, commentId: string) {
  return `${commentPrefix(clipId)}/${safeSegment(commentId, 'Commentaire')}.json`;
}

export async function hasMusicClipLike(clipId: string, userId: string) {
  const prefix = likePrefix(clipId);
  const expected = `${safeSegment(userId, 'Utilisateur')}.json`;
  await ensureBucket();
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(prefix, {
    limit: 2,
    search: expected,
  });
  if (error) throw error;
  return (data || []).some((entry) => entry.name === expected);
}

export async function setMusicClipLikeStored(clipId: string, userId: string) {
  await ensureBucket();
  const payload = Buffer.from(JSON.stringify({ clipId, userId, createdAt: new Date().toISOString() }));
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(likePath(clipId, userId), payload, {
    contentType: 'application/json',
    upsert: false,
  });
  if (error && !/already exists|duplicate/i.test(error.message || '')) throw error;
}

export async function removeMusicClipLikeStored(clipId: string, userId: string) {
  await ensureBucket();
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([likePath(clipId, userId)]);
  if (error) throw error;
}

export async function countMusicClipLikesStored(clipId: string) {
  return (await listAll(likePrefix(clipId))).length;
}

export async function createMusicClipCommentStored(clipId: string, userId: string, content: string) {
  await ensureBucket();
  const now = new Date().toISOString();
  const comment: StoredClipComment = {
    id: `${Date.now()}-${randomUUID()}`,
    clipId,
    userId,
    content,
    createdAt: now,
    updatedAt: now,
  };
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(
    commentPath(clipId, comment.id),
    Buffer.from(JSON.stringify(comment)),
    { contentType: 'application/json', upsert: false },
  );
  if (error) throw error;
  return comment;
}

export async function getMusicClipCommentStored(clipId: string, commentId: string) {
  await ensureBucket();
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(commentPath(clipId, commentId));
  if (error || !data) return null;
  try {
    return JSON.parse(await data.text()) as StoredClipComment;
  } catch {
    return null;
  }
}

export async function listMusicClipCommentsStored(clipId: string, limit: number, offset: number) {
  await ensureBucket();
  const prefix = commentPrefix(clipId);
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(prefix, {
    limit,
    offset,
    sortBy: { column: 'name', order: 'desc' },
  });
  if (error) throw error;
  const comments = await Promise.all((data || []).map(async (entry) => {
    const id = entry.name.replace(/\.json$/i, '');
    return getMusicClipCommentStored(clipId, id);
  }));
  return comments.filter((comment): comment is StoredClipComment => Boolean(comment));
}

export async function countMusicClipCommentsStored(clipId: string) {
  return (await listAll(commentPrefix(clipId))).length;
}

export async function deleteMusicClipCommentStored(clipId: string, commentId: string) {
  await ensureBucket();
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([commentPath(clipId, commentId)]);
  if (error) throw error;
}
