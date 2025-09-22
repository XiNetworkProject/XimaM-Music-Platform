import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: commentId } = params;

    if (!commentId) {
      return NextResponse.json({ error: 'ID du commentaire requis' }, { status: 400 });
    }

    console.log('Like commentaire - ID reçu:', commentId);

    // Vérifier que le commentaire existe
    const { data: comment, error: commentError } = await supabaseAdmin
      .from('comments')
      .select('id, likes_count')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 });
    }

    // Vérifier si l'utilisateur a déjà liké ce commentaire
    const { data: existingLike, error: likeError } = await supabaseAdmin
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', session.user.id)
      .single();

    if (likeError && likeError.code !== 'PGRST116') {
      console.error('Erreur vérification like:', likeError);
      return NextResponse.json({ error: 'Erreur lors de la vérification du like' }, { status: 500 });
    }

    const isLiked = !!existingLike;

    if (isLiked) {
      // Supprimer le like
      const { error: deleteError } = await supabaseAdmin
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', session.user.id);

      if (deleteError) {
        console.error('Erreur suppression like:', deleteError);
        return NextResponse.json({ error: 'Erreur lors de la suppression du like' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        isLiked: false,
        likesCount: Math.max(0, comment.likes_count - 1)
      });
    } else {
      // Ajouter le like
      const { error: insertError } = await supabaseAdmin
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: session.user.id,
        });

      if (insertError) {
        console.error('Erreur ajout like:', insertError);
        return NextResponse.json({ error: 'Erreur lors de l\'ajout du like' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        isLiked: true,
        likesCount: comment.likes_count + 1
      });
    }

  } catch (error) {
    console.error('Erreur API comment like:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
