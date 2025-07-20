import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import creatorModeration from '@/lib/creatorModeration';

// GET - Récupérer les commentaires avec filtres de modération
export async function GET(
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

    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const includeFiltered = searchParams.get('includeFiltered') === 'true';
    const view = searchParams.get('view') || 'public'; // public, creator, all

    // Vérifier les permissions
    const permissions = await creatorModeration.checkModerationPermissions(trackId, session.user.id);
    
    let comments;
    let stats = null;

    if (permissions.isCreator) {
      // Vue créateur avec options de filtrage
      comments = await creatorModeration.getFilteredComments(
        trackId, 
        session.user.id, 
        includeDeleted, 
        includeFiltered
      );

      // Récupérer les statistiques si demandé
      if (searchParams.get('includeStats') === 'true') {
        stats = await creatorModeration.getModerationStats(trackId, session.user.id);
      }
    } else {
      // Vue publique (commentaires non supprimés et non filtrés)
      comments = await creatorModeration.getFilteredComments(trackId, session.user.id, false, false);
    }

    return NextResponse.json({
      success: true,
      comments,
      stats,
      permissions,
      view,
      filters: {
        includeDeleted,
        includeFiltered
      }
    });

  } catch (error) {
    console.error('Erreur récupération commentaires modérés:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commentaires' },
      { status: 500 }
    );
  }
} 