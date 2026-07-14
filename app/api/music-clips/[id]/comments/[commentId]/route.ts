import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import {
  countMusicClipCommentsStored,
  deleteMusicClipCommentStored,
  getMusicClipCommentStored,
} from '@/lib/musicClipInteractionStore';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } },
) {
  try {
    const session = await getApiSession(request);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const comment = await getMusicClipCommentStored(params.id, params.commentId);
    if (!comment) return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 });
    if (String(comment.userId) !== String(userId)) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    await deleteMusicClipCommentStored(params.id, params.commentId);
    const commentsCount = await countMusicClipCommentsStored(params.id);
    await supabaseAdmin.from('music_clips').update({ comments_count: commentsCount }).eq('id', params.id);

    return NextResponse.json({ success: true, commentsCount });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Impossible de supprimer le commentaire' }, { status: 500 });
  }
}
