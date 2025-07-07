import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Comment from '@/models/Comment';

// POST - Liker/Unliker un commentaire
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();
    const { commentId } = params;

    // Vérifier si le commentaire existe
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return NextResponse.json({ error: 'Commentaire non trouvé' }, { status: 404 });
    }

    // Vérifier si l'utilisateur a déjà liké
    const isLiked = comment.likes.includes(session.user.id);

    if (isLiked) {
      // Retirer le like
      await Comment.findByIdAndUpdate(commentId, {
        $pull: { likes: session.user.id }
      });
    } else {
      // Ajouter le like
      await Comment.findByIdAndUpdate(commentId, {
        $addToSet: { likes: session.user.id }
      });
    }

    // Récupérer le commentaire mis à jour
    const updatedComment = await Comment.findById(commentId)
      .populate('user', 'name username avatar');

    return NextResponse.json({
      success: true,
      isLiked: !isLiked,
      likesCount: updatedComment.likes.length,
      comment: updatedComment
    });

  } catch (error) {
    console.error('Erreur like/unlike commentaire:', error);
    return NextResponse.json(
      { error: 'Erreur lors du like/unlike' },
      { status: 500 }
    );
  }
} 