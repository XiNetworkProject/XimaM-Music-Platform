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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { username } = params;
    const followerId = session.user.id;

    // Récupérer l'ID de l'utilisateur à suivre
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const followingId = targetUser.id;

    // Vérifier si l'utilisateur se suit lui-même
    if (followerId === followingId) {
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

    // Mettre à jour les compteurs (optionnel, peut ne pas exister)
    try {
      const { error: updateError } = await supabaseAdmin.rpc('update_follow_counts', {
        user_id: followingId
      });

      if (updateError) {
        console.error('Erreur mise à jour compteurs:', updateError);
      }
    } catch (error) {
      console.log('Fonction update_follow_counts non disponible, ignorée');
    }

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
      .single();

    if (userError || !targetUser) {
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
