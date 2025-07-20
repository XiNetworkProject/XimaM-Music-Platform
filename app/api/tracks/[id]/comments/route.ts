import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';
import Comment from '@/models/Comment';
import subscriptionService from '@/lib/subscriptionService';
import contentModerator from '@/lib/contentModeration';

// S'assurer que tous les modèles sont enregistrés
import '@/models/Track';
import '@/models/Comment';
import '@/models/Subscription';
import '@/models/UserSubscription';

// POST - Ajouter un commentaire
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();
    const trackId = params.id;
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

    // Vérifier les limites d'abonnement
    const commentCheck = await subscriptionService.canPerformAction(session.user.id, 'comments');
    if (!commentCheck.allowed) {
      return NextResponse.json(
        { 
          error: commentCheck.reason || 'Limite de commentaires atteinte',
          usage: commentCheck.usage
        },
        { status: 403 }
      );
    }

    // Vérifier si la piste existe
    const track = await Track.findById(trackId);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    // Créer le commentaire
    const comment = new Comment({
      content: content.trim(),
      user: session.user.id,
      track: trackId,
      moderationScore: moderationResult.score,
      isModerated: true,
    });

    await comment.save();

    // Ajouter le commentaire à la piste (seulement les commentaires parents)
    if (!comment.parentComment) {
      await Track.findByIdAndUpdate(trackId, {
        $push: { comments: comment._id }
      });
    }

    // Incrémenter l'utilisation de commentaires
    await subscriptionService.incrementUsage(session.user.id, 'comments');

    // Récupérer le commentaire avec les infos utilisateur
    const populatedComment = await Comment.findById(comment._id)
      .populate('user', 'name username avatar');

    return NextResponse.json({
      success: true,
      comment: populatedComment
    });

  } catch (error) {
    console.error('Erreur ajout commentaire:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du commentaire' },
      { status: 500 }
    );
  }
}

// GET - Récupérer les commentaires d'une piste
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const trackId = params.id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Vérifier si la piste existe
    const track = await Track.findById(trackId);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    // Construire la requête de base (exclure les commentaires supprimés et filtrés)
    const baseQuery = { 
      track: trackId, 
      parentComment: { $exists: false },
      isDeleted: { $ne: true },
      customFiltered: { $ne: true }
    };

    // Récupérer les commentaires avec leurs réponses
    const comments = await Comment.find(baseQuery)
      .populate('user', 'name username avatar')
      .populate({
        path: 'replies',
        match: { isDeleted: { $ne: true }, customFiltered: { $ne: true } },
        populate: {
          path: 'user',
          select: 'name username avatar'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Compter tous les commentaires visibles (parents + réponses)
    const totalComments = await Comment.countDocuments(baseQuery);
    const totalReplies = await Comment.countDocuments({ 
      track: trackId, 
      parentComment: { $exists: true },
      isDeleted: { $ne: true },
      customFiltered: { $ne: true }
    });
    const total = totalComments + totalReplies;

    return NextResponse.json({
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Erreur récupération commentaires:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commentaires' },
      { status: 500 }
    );
  }
} 