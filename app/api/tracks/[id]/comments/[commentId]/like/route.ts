import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/tracks/[id]/comments/[commentId]/like - toggle like/unlike
export async function POST(_req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const commentId = params.commentId;
  if (!commentId) return NextResponse.json({ error: 'CommentId manquant' }, { status: 400 });

  // Best-effort: table comment_likes (recommandée)
  try {
    const { data: existing } = await supabaseAdmin
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();

    let isLiked = false;
    if (existing?.id) {
      await supabaseAdmin.from('comment_likes').delete().eq('id', existing.id);
      isLiked = false;
    } else {
      await supabaseAdmin.from('comment_likes').insert({ comment_id: commentId, user_id: userId });
      isLiked = true;
    }

    const { data: likesRows } = await supabaseAdmin.from('comment_likes').select('id').eq('comment_id', commentId);
    const likesCount = (likesRows || []).length;

    return NextResponse.json({ isLiked, likesCount });
  } catch {
    // fallback: pas de table -> ne pas casser l'UI
    return NextResponse.json({ isLiked: false, likesCount: 0 });
  }
}

