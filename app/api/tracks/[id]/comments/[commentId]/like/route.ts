import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { dbAdmin } from '@/lib/database';
import { canViewTrack } from '@/lib/publicTracks';

// POST /api/tracks/[id]/comments/[commentId]/like - toggle like/unlike
export async function POST(request: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const session = await getApiSession(request).catch(() => null);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const commentId = params.commentId;
  if (!commentId) return NextResponse.json({ error: 'CommentId manquant' }, { status: 400 });
  const { data: track } = await dbAdmin.from('tracks').select('id, creator_id, is_public, audio_url').eq('id', params.id).maybeSingle();
  if (!track || !canViewTrack(track, userId)) return NextResponse.json({ error: 'Morceau introuvable' }, { status: 404 });
  const { data: comment } = await dbAdmin.from('comments').select('id').eq('id', commentId).eq('track_id', params.id).maybeSingle();
  if (!comment) return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 });

  // Best-effort: table comment_likes (recommandée)
  try {
    const { data: existing } = await dbAdmin
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();

    let isLiked = false;
    if (existing?.id) {
      const { error } = await dbAdmin.from('comment_likes').delete().eq('id', existing.id);
      if (error) throw error;
      isLiked = false;
    } else {
      const { error } = await dbAdmin.from('comment_likes').insert({ comment_id: commentId, user_id: userId });
      if (error) throw error;
      isLiked = true;
    }

    const { data: likesRows } = await dbAdmin.from('comment_likes').select('id').eq('comment_id', commentId);
    const likesCount = (likesRows || []).length;

    return NextResponse.json({ isLiked, likesCount });
  } catch {
    // fallback: pas de table -> ne pas casser l'UI
    return NextResponse.json({ error: 'Impossible de modifier le like' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
