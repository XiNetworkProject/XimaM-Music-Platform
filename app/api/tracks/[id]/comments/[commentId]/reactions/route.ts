import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Comment from '@/models/Comment';

// POST - Ajouter/Modifier une réaction à un commentaire
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
    const { id: trackId, commentId } = params;
    const { reactionType } = await request.json();

    if (!reactionType) {
      return NextResponse.json({ error: 'Type de réaction requis' }, { status: 400 });
    }

    // Vérifier si le commentaire existe
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return NextResponse.json({ error: 'Commentaire non trouvé' }, { status: 404 });
    }

    // Initialiser les réactions si elles n'existent pas
    if (!comment.reactions) {
      comment.reactions = {};
    }

    // Initialiser le type de réaction s'il n'existe pas
    if (!comment.reactions[reactionType]) {
      comment.reactions[reactionType] = {
        count: 0,
        users: []
      };
    }

    const userId = session.user.id;
    const userReactions = comment.reactions[reactionType];

    // Vérifier si l'utilisateur a déjà réagi
    const userIndex = userReactions.users.indexOf(userId);
    
    if (userIndex === -1) {
      // Ajouter la réaction
      userReactions.users.push(userId);
      userReactions.count++;
    } else {
      // Retirer la réaction (toggle)
      userReactions.users.splice(userIndex, 1);
      userReactions.count--;
      
      // Supprimer le type de réaction s'il n'y a plus de réactions
      if (userReactions.count === 0) {
        delete comment.reactions[reactionType];
      }
    }

    await comment.save();

    // Retourner les réactions mises à jour
    const updatedReactions = Object.entries(comment.reactions || {}).map(([type, data]: [string, any]) => ({
      type,
      count: data.count,
      users: data.users
    }));

    return NextResponse.json({
      success: true,
      updatedReactions
    });

  } catch (error) {
    console.error('Erreur réaction:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout de la réaction' },
      { status: 500 }
    );
  }
}

// GET - Récupérer les réactions d'un commentaire
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    await dbConnect();
    const { commentId } = params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return NextResponse.json({ error: 'Commentaire non trouvé' }, { status: 404 });
    }

    const reactions = Object.entries(comment.reactions || {}).map(([type, data]: [string, any]) => ({
      type,
      count: data.count,
      users: data.users
    }));

    return NextResponse.json({
      reactions
    });

  } catch (error) {
    console.error('Erreur récupération réactions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des réactions' },
      { status: 500 }
    );
  }
} 