import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// POST /api/tracks/[id]/comments/[commentId]/like - toggle like (counter-based)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('id, likes')
      .eq('id', params.commentId)
      .eq('track_id', params.id)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 });
    }

    // Toggle basique via body { like: boolean } (fallback increment si absent)
    let like = true;
    try {
      const body = await request.json();
      if (typeof body?.like === 'boolean') like = body.like;
    } catch {}

    const currentLikes = typeof comment.likes === 'number' ? comment.likes : 0;
    const newLikes = Math.max(0, currentLikes + (like ? 1 : -1));

    const { error: updateError } = await supabaseAdmin
      .from('comments')
      .update({ likes: newLikes })
      .eq('id', params.commentId);

    if (updateError) {
      return NextResponse.json({ error: 'Erreur mise à jour like' }, { status: 500 });
    }

    return NextResponse.json({ success: true, isLiked: like, likesCount: newLikes });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}


