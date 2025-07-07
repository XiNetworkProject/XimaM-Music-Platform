import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Comment from '@/models/Comment';
import Track from '@/models/Track';

// PUT - Modifier un commentaire
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    }

    // Vérifier si le commentaire existe et appartient à l'utilisateur
    const comment = await Comment.findById(params.commentId);
    if (!comment) {
      return NextResponse.json({ error: 'Commentaire non trouvé' }, { status: 404 });
    }

    if (comment.user.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Mettre à jour le commentaire
    const updatedComment = await Comment.findByIdAndUpdate(
      params.commentId,
      { content: content.trim() },
      { new: true }
    ).populate('user', 'name username avatar');

    return NextResponse.json({
      success: true,
      comment: updatedComment
    });

  } catch (error) {
    console.error('Erreur modification commentaire:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification du commentaire' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un commentaire
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();

    // Vérifier si le commentaire existe et appartient à l'utilisateur
    const comment = await Comment.findById(params.commentId);
    if (!comment) {
      return NextResponse.json({ error: 'Commentaire non trouvé' }, { status: 404 });
    }

    if (comment.user.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Supprimer le commentaire
    await Comment.findByIdAndDelete(params.commentId);

    // Retirer le commentaire de la piste
    await Track.findByIdAndUpdate(params.id, {
      $pull: { comments: params.commentId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erreur suppression commentaire:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du commentaire' },
      { status: 500 }
    );
  }
} 