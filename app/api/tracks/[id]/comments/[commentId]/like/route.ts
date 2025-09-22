import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/tracks/[id]/comments/[commentId]/like - Liker/Unliker un commentaire
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: trackId, commentId } = params;
    const userId = session.user.id;

    // Vérifier que le commentaire existe
    const { data: comment, error: commentError } = await supabaseAdmin
      .from('comments')
      .select('id, likes_count')
      .eq('id', commentId)
      .eq('track_id', trackId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 });
    }

    // Vérifier si l'utilisateur a déjà liké ce commentaire
    const { data: existingLike, error: likeError } = await supabaseAdmin
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single();

    let isLiked = false;
    let newLikesCount = comment.likes_count || 0;

    if (existingLike) {
      // Unliker - supprimer le like
      const { error: deleteError } = await supabaseAdmin
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Erreur suppression like:', deleteError);
        return NextResponse.json({ error: 'Erreur lors de la suppression du like' }, { status: 500 });
      }

      newLikesCount = Math.max(0, newLikesCount - 1);
    } else {
      // Liker - ajouter le like
      const { error: insertError } = await supabaseAdmin
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: userId,
        });

      if (insertError) {
        console.error('Erreur ajout like:', insertError);
        return NextResponse.json({ error: 'Erreur lors de l\'ajout du like' }, { status: 500 });
      }

      newLikesCount += 1;
      isLiked = true;
    }

    // Mettre à jour le compteur de likes du commentaire
    const { error: updateError } = await supabaseAdmin
      .from('comments')
      .update({ likes_count: newLikesCount })
      .eq('id', commentId);

    if (updateError) {
      console.error('Erreur mise à jour compteur likes:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du compteur' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      isLiked,
      likesCount: newLikesCount
    });

  } catch (error) {
    console.error('Erreur API comment like:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
