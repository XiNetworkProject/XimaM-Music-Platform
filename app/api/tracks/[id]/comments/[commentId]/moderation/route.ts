import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Comment from '@/models/Comment';
import Track from '@/models/Track';
import creatorModeration from '@/lib/creatorModeration';

// POST - Actions de modération (supprimer, adorer, filtrer)
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
    const { action, reason } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action requise' }, { status: 400 });
    }

    // Vérifier les permissions
    const permissions = await creatorModeration.checkModerationPermissions(trackId, session.user.id);
    
    let success = false;
    let result: any = {};

    switch (action) {
      case 'delete':
        if (!permissions.canDelete) {
          return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
        }
        success = await creatorModeration.deleteComment(commentId, session.user.id, reason || 'user');
        break;

      case 'favorite':
        if (!permissions.canFavorite) {
          return NextResponse.json({ error: 'Seul le créateur peut adorer les commentaires' }, { status: 403 });
        }
        success = await creatorModeration.favoriteComment(commentId, session.user.id);
        break;

      case 'filter':
        if (!permissions.canFilter) {
          return NextResponse.json({ error: 'Seul le créateur peut filtrer les commentaires' }, { status: 403 });
        }
        if (!reason) {
          return NextResponse.json({ error: 'Raison de filtrage requise' }, { status: 400 });
        }
        success = await creatorModeration.filterComment(commentId, session.user.id, reason);
        break;

      case 'unfilter':
        if (!permissions.canFilter) {
          return NextResponse.json({ error: 'Seul le créateur peut défiltrer les commentaires' }, { status: 403 });
        }
        success = await creatorModeration.unfilterComment(commentId, session.user.id);
        break;

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
    }

    if (!success) {
      return NextResponse.json({ error: 'Échec de l\'action de modération' }, { status: 500 });
    }

    // Récupérer le commentaire mis à jour
    const updatedComment = await Comment.findById(commentId)
      .populate('user', 'name username avatar');

    return NextResponse.json({
      success: true,
      action,
      comment: updatedComment,
      permissions
    });

  } catch (error) {
    console.error('Erreur modération commentaire:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modération' },
      { status: 500 }
    );
  }
}

// GET - Récupérer les statistiques de modération
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();
    const { id: trackId } = params;

    // Vérifier que c'est le créateur
    const permissions = await creatorModeration.checkModerationPermissions(trackId, session.user.id);
    if (!permissions.isCreator) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Récupérer les statistiques
    const stats = await creatorModeration.getModerationStats(trackId, session.user.id);

    return NextResponse.json({
      success: true,
      stats,
      permissions
    });

  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
} 