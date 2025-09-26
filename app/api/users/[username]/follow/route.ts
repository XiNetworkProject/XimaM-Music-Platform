import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    console.log('🔍 POST /api/users/[username]/follow - Début');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('❌ Non authentifié');
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { username } = params;
    const followerId = session.user.id;
    
    console.log('👤 Follower ID:', followerId, 'Username cible:', username);

    // Récupérer l'ID de l'utilisateur à suivre
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (userError) {
      console.error('❌ Erreur récupération utilisateur:', userError);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }

    if (!targetUser) {
      console.log('❌ Utilisateur introuvable:', username);
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const followingId = targetUser.id;
    console.log('✅ Utilisateur trouvé - ID:', followingId);

    // Vérifier si l'utilisateur se suit lui-même
    if (followerId === followingId) {
      console.log('❌ Tentative de se suivre soi-même');
      return NextResponse.json({ error: 'Impossible de se suivre soi-même' }, { status: 400 });
    }

    // Vérifier l'état actuel du suivi
    const { data: existingFollow, error: followCheckError } = await supabaseAdmin
      .from('user_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    let action: 'followed' | 'unfollowed';

    if (existingFollow) {
      // Unfollow
      const { error: unfollowError } = await supabaseAdmin
        .from('user_follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);

      if (unfollowError) {
        console.error('Erreur unfollow:', unfollowError);
        return NextResponse.json({ error: 'Erreur lors du désabonnement' }, { status: 500 });
      }

      action = 'unfollowed';
    } else {
      // Follow
      const { error: followError } = await supabaseAdmin
        .from('user_follows')
        .insert({
          follower_id: followerId,
          following_id: followingId
        });

      if (followError) {
        console.error('Erreur follow:', followError);
        return NextResponse.json({ error: 'Erreur lors de l\'abonnement' }, { status: 500 });
      }

      action = 'followed';
    }

    // Mettre à jour les compteurs pour les deux utilisateurs
    try {
      // Mettre à jour les compteurs pour l'utilisateur suivi (follower_count)
      const { error: updateFollowingError } = await supabaseAdmin.rpc('update_follow_counts', {
        user_id: followingId
      });

      // Mettre à jour les compteurs pour l'utilisateur qui suit (following_count)
      const { error: updateFollowerError } = await supabaseAdmin.rpc('update_follow_counts', {
        user_id: followerId
      });

      if (updateFollowingError) {
        console.error('Erreur mise à jour compteurs following:', updateFollowingError);
      }
      if (updateFollowerError) {
        console.error('Erreur mise à jour compteurs follower:', updateFollowerError);
      }
    } catch (error) {
      console.log('Fonction update_follow_counts non disponible, ignorée');
    }

    console.log('✅ Action terminée:', action);
    
    return NextResponse.json({ 
      success: true, 
      action,
      message: action === 'followed' ? 'Abonnement effectué' : 'Désabonnement effectué'
    });

  } catch (error) {
    console.error('Erreur API follow:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { username } = params;
    const followerId = session.user.id;

    // Récupérer l'ID de l'utilisateur à vérifier
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (userError) {
      console.error('Erreur récupération utilisateur:', userError);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const followingId = targetUser.id;

    // Vérifier l'état du suivi
    const { data: followStatus, error: followError } = await supabaseAdmin
      .from('user_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (followError) {
      console.error('Erreur vérification follow:', followError);
      return NextResponse.json({ error: 'Erreur lors de la vérification' }, { status: 500 });
    }

    const isFollowing = !!followStatus;

    return NextResponse.json({ 
      isFollowing,
      followerId,
      followingId
    });

  } catch (error) {
    console.error('Erreur API follow check:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
