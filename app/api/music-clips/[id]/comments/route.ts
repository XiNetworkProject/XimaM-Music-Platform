import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import contentModerator from '@/lib/contentModeration';
import {
  countMusicClipCommentsStored,
  createMusicClipCommentStored,
  listMusicClipCommentsStored,
  type StoredClipComment,
} from '@/lib/musicClipInteractionStore';

async function getPublishedClip(clipId: string) {
  const { data, error } = await supabaseAdmin
    .from('music_clips')
    .select('id, creator_id, visibility, comments_count')
    .eq('id', clipId)
    .eq('visibility', 'published')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function syncCommentCount(clipId: string) {
  const commentsCount = await countMusicClipCommentsStored(clipId);
  await supabaseAdmin.from('music_clips').update({ comments_count: commentsCount }).eq('id', clipId);
  return commentsCount;
}

function formatComment(row: StoredClipComment, user: any) {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    likes: [],
    likesCount: 0,
    isLiked: false,
    user: {
      id: row.userId,
      username: user?.username || 'utilisateur',
      name: user?.name || user?.username || 'Membre Synaura',
      avatar: user?.avatar || '',
    },
    replies: [],
  };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const clip = await getPublishedClip(params.id);
    if (!clip) return NextResponse.json({ error: 'Clip introuvable' }, { status: 404 });
    const limit = Math.min(30, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 8)));
    const offset = Math.max(0, Number(request.nextUrl.searchParams.get('offset') || 0));
    const rows = await listMusicClipCommentsStored(params.id, limit, offset);
    const userIds = Array.from(new Set(rows.map((row) => row.userId).filter(Boolean)));
    const { data: users, error: usersError } = userIds.length
      ? await supabaseAdmin.from('profiles').select('id, username, name, avatar').in('id', userIds)
      : { data: [], error: null };
    if (usersError) throw usersError;
    const usersById = new Map((users || []).map((user: any) => [String(user.id), user]));

    return NextResponse.json({
      comments: rows.map((row) => formatComment(row, usersById.get(row.userId))),
      hasMore: rows.length === limit,
      nextOffset: offset + rows.length,
      commentsCount: await syncCommentCount(params.id),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Impossible de charger les commentaires' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getApiSession(request);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    const clip = await getPublishedClip(params.id);
    if (!clip) return NextResponse.json({ error: 'Clip introuvable' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const content = String(body?.content || '').trim().slice(0, 1000);
    if (!content) return NextResponse.json({ error: 'Commentaire vide' }, { status: 400 });
    const moderation = contentModerator.analyzeContent(content);
    if (!moderation.isClean) {
      return NextResponse.json({ error: 'Contenu refuse', details: moderation }, { status: 400 });
    }

    const inserted = await createMusicClipCommentStored(params.id, userId, content);

    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('id, username, name, avatar')
      .eq('id', userId)
      .maybeSingle();
    const commentsCount = await syncCommentCount(params.id);
    return NextResponse.json({ comment: formatComment(inserted, user), commentsCount }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Impossible de publier le commentaire' }, { status: 500 });
  }
}
