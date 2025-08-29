import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';

// GET /api/tracks/[id]/comments/moderation - Récupérer les commentaires pour modération
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const trackId = params.id;

    // Gestion spéciale pour la radio
    if (trackId === 'radio-mixx-party') {
      return NextResponse.json({
        comments: [],
        total: 0,
        limit: 0,
        offset: 0,
        message: 'Radio - pas de commentaires à modérer'
      });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const includeFiltered = searchParams.get('includeFiltered') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';
    const view = searchParams.get('view') || 'public';

    // Vérifier d'abord si la table comments existe et a des données
    let comments: any[] = [];
    
    try {
      // Test simple pour vérifier l'existence de la table
      const { data: tableTest, error: tableError } = await supabase
        .from('comments')
        .select('id')
        .limit(1);

      if (tableError) {
        console.log('⚠️ Table comments non accessible, retour de données vides');
        // Retourner une réponse vide si la table n'existe pas
        return NextResponse.json({
          comments: [],
          total: 0,
          limit,
          offset,
          stats: {
            total: 0,
            pending: 0,
            approved: 0,
            flagged: 0,
            rejected: 0
          },
          permissions: {
            canModerate: false,
            canDelete: false,
            canFlag: false
          },
          message: 'Système de commentaires non disponible'
        });
      }

      // Si la table existe, récupérer les commentaires
      let query = supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          track_id,
          parent_id,
          likes
        `)
        .eq('track_id', trackId);

      // Note: Les filtres de modération ne sont pas encore implémentés
      // car les colonnes is_flagged et moderation_status n'existent pas dans le schéma actuel

      // Appliquer le tri et la pagination
      const { data: commentsData, error: commentsError } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (commentsError) {
        console.error('❌ Erreur récupération commentaires:', commentsError);
        return NextResponse.json(
          { error: 'Erreur lors de la récupération des commentaires' },
          { status: 500 }
        );
      }

      comments = commentsData || [];
    } catch (tableError) {
      console.log('⚠️ Erreur lors de la vérification de la table comments:', tableError);
      // Retourner une réponse vide en cas d'erreur
      return NextResponse.json({
        comments: [],
        total: 0,
        limit,
        offset,
        stats: {
          total: 0,
          pending: 0,
          approved: 0,
          flagged: 0,
          rejected: 0
        },
        permissions: {
          canModerate: false,
          canDelete: false,
          canFlag: false
        },
        message: 'Système de commentaires non disponible'
      });
    }

    // Récupérer les informations des utilisateurs pour ces commentaires
    let formattedComments: any[] = [];
    
    if (comments && comments.length > 0) {
      const userIds = Array.from(new Set(comments.map(comment => comment.user_id)));
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, name, avatar')
        .in('id', userIds);

      if (!usersError && usersData) {
        const usersMap = new Map(usersData.map(user => [user.id, user]));
        
                 formattedComments = comments.map(comment => {
           const user = usersMap.get(comment.user_id);
           return {
             id: comment.id,
             content: comment.content,
             createdAt: comment.created_at,
             userId: comment.user_id,
             trackId: comment.track_id,
             parentId: comment.parent_id,
             // Compatibilité avec l'interface MongoDB : likes comme tableau vide
             likes: [], // Tableau vide pour éviter l'erreur .includes()
             likesCount: comment.likes || 0, // Compteur numérique séparé
             // Valeurs par défaut pour la compatibilité avec l'UI
             isFlagged: false,
             moderationStatus: 'approved',
             user: {
               username: user?.username || 'Utilisateur inconnu',
               name: user?.name || user?.username || 'Utilisateur inconnu',
               avatar: user?.avatar || ''
             }
           };
         });
      } else {
                 // Fallback si erreur avec les utilisateurs
         formattedComments = comments.map(comment => ({
           id: comment.id,
           content: comment.content,
           createdAt: comment.created_at,
           userId: comment.user_id,
           trackId: comment.track_id,
           parentId: comment.parent_id,
           // Compatibilité avec l'interface MongoDB : likes comme tableau vide
           likes: [], // Tableau vide pour éviter l'erreur .includes()
           likesCount: comment.likes || 0, // Compteur numérique séparé
           // Valeurs par défaut pour la compatibilité avec l'UI
           isFlagged: false,
           moderationStatus: 'approved',
           user: {
             username: 'Utilisateur inconnu',
             name: 'Utilisateur inconnu',
             avatar: ''
           }
         }));
      }
    }

    // Préparer la réponse avec les données attendues par le composant
    const response: any = {
      comments: formattedComments,
      total: formattedComments.length,
      limit,
      offset
    };

    // Ajouter les statistiques si demandées
    if (includeStats) {
      const stats = {
        total: formattedComments.length,
        pending: formattedComments.filter(c => c.moderationStatus === 'pending').length,
        approved: formattedComments.filter(c => c.moderationStatus === 'approved').length,
        flagged: formattedComments.filter(c => c.moderationStatus === 'flagged').length,
        rejected: formattedComments.filter(c => c.moderationStatus === 'rejected').length
      };
      response.stats = stats;
    }

    // Ajouter les permissions (simplifiées pour l'instant)
    response.permissions = {
      canModerate: true,
      canDelete: true,
      canFlag: true
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Erreur modération commentaires:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

// POST /api/tracks/[id]/comments/moderation - Modérer un commentaire
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const trackId = params.id;

    // Gestion spéciale pour la radio
    if (trackId === 'radio-mixx-party') {
      return NextResponse.json({
        success: false,
        message: 'Radio - pas de modération possible'
      });
    }

    const { commentId, action, reason } = await request.json();

    if (!commentId || !action) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    // Actions de modération possibles
    const validActions = ['approve', 'reject', 'flag', 'delete'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Action de modération invalide' },
        { status: 400 }
      );
    }

    // Mettre à jour le statut de modération du commentaire
    const updateData: any = {
      moderation_status: action === 'approve' ? 'approved' : 
                         action === 'reject' ? 'rejected' : 
                         action === 'flag' ? 'flagged' : 'deleted',
      moderated_at: new Date().toISOString(),
      moderated_by: session.user.id
    };

    if (action === 'flag' && reason) {
      updateData.flag_reason = reason;
    }

    const { error: updateError } = await supabase
      .from('comments')
      .update(updateData)
      .eq('id', commentId)
      .eq('track_id', trackId);

    if (updateError) {
      console.error('❌ Erreur mise à jour commentaire:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du commentaire' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Commentaire ${action === 'approve' ? 'approuvé' : 
                               action === 'reject' ? 'rejeté' : 
                               action === 'flag' ? 'signalé' : 'supprimé'} avec succès`
    });

  } catch (error) {
    console.error('❌ Erreur modération commentaire:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
