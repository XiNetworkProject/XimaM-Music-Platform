import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Comment from '@/models/Comment';
import Track from '@/models/Track';
import contentModerator from '@/lib/contentModeration';

// POST - Ajouter une réponse à un commentaire
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
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    }

    // Modération du contenu
    const moderationResult = contentModerator.analyzeContent(content.trim());
    
    if (!moderationResult.isClean) {
      return NextResponse.json({
        error: 'Contenu inapproprié détecté',
        details: {
          score: moderationResult.score,
          flags: moderationResult.flags,
          suggestions: moderationResult.suggestions,
          censoredText: moderationResult.censoredText
        }
      }, { status: 400 });
    }

    // Vérifier si la piste existe
    const track = await Track.findById(trackId);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    // Vérifier si le commentaire parent existe
    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      return NextResponse.json({ error: 'Commentaire non trouvé' }, { status: 404 });
    }

    // Créer la réponse
    const reply = new Comment({
      content: content.trim(),
      user: session.user.id,
      track: trackId,
      parentComment: commentId,
      moderationScore: moderationResult.score,
      isModerated: true,
    });

    await reply.save();

    // Ajouter la réponse au commentaire parent
    await Comment.findByIdAndUpdate(commentId, {
      $push: { replies: reply._id }
    });

    // Récupérer la réponse avec les infos utilisateur
    const populatedReply = await Comment.findById(reply._id)
      .populate('user', 'name username avatar');

    return NextResponse.json({
      success: true,
      reply: populatedReply
    });

  } catch (error) {
    console.error('Erreur ajout réponse:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout de la réponse' },
      { status: 500 }
    );
  }
} 