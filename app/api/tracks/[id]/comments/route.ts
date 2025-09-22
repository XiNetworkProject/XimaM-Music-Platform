import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/tracks/[id]/comments - Récupérer les commentaires d'une track
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trackId = params.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || 'recent'; // 'recent' ou 'top'

    // Récupérer les commentaires
    const { data: comments, error: commentsError } = await supabaseAdmin
      .from('comments')
      .select(`
        id,
        text,
        likes_count,
        created_at,
        user_id,
        track_id
      `)
      .eq('track_id', trackId)
      .order(sort === 'top' ? 'likes_count' : 'created_at', { 
        ascending: false 
      })
      .range(offset, offset + limit - 1);

    if (commentsError) {
      console.error('Erreur récupération commentaires:', commentsError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des commentaires' }, { status: 500 });
    }

    // Récupérer les profils des utilisateurs
    const userIds = Array.from(new Set(comments?.map(c => c.user_id) || []));
    let usersMap = new Map();
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, username, name, avatar_url')
        .in('id', userIds);
      
      if (profiles) {
        usersMap = new Map(profiles.map(p => [p.id, p]));
      }
    }

    // Formater les commentaires
    const formattedComments = (comments || []).map(comment => {
      const profile = usersMap.get(comment.user_id);
      return {
        id: comment.id,
        text: comment.text,
        likes: comment.likes_count || 0,
        createdAt: new Date(comment.created_at).getTime(),
        authorName: profile?.name || profile?.username || 'Utilisateur',
        avatar: profile?.avatar_url || '/default-avatar.jpg',
        isLiked: false, // TODO: vérifier si l'utilisateur connecté a liké
      };
    });

    return NextResponse.json({
      success: true,
      comments: formattedComments,
      total: formattedComments.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('Erreur API comments GET:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/tracks/[id]/comments - Créer un commentaire
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const trackId = params.id;
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text requis' }, { status: 400 });
    }

    if (text.trim().length === 0 || text.length > 500) {
      return NextResponse.json({ error: 'Le commentaire doit faire entre 1 et 500 caractères' }, { status: 400 });
    }

    // Vérifier que la track existe
    const { data: track, error: trackError } = await supabaseAdmin
      .from('tracks')
      .select('id')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      return NextResponse.json({ error: 'Track introuvable' }, { status: 404 });
    }

    // Créer le commentaire
    const { data: comment, error: commentError } = await supabaseAdmin
      .from('comments')
      .insert({
        track_id: trackId,
        user_id: session.user.id,
        text: text.trim(),
        likes_count: 0,
      })
      .select(`
        id,
        text,
        likes_count,
        created_at,
        user_id
      `)
      .single();

    if (commentError) {
      console.error('Erreur création commentaire:', commentError);
      return NextResponse.json({ error: 'Erreur lors de la création du commentaire' }, { status: 500 });
    }

    // Récupérer le profil de l'utilisateur connecté
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username, name, avatar_url')
      .eq('id', session.user.id)
      .single();

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        text: comment.text,
        likes: comment.likes_count || 0,
        createdAt: new Date(comment.created_at).getTime(),
        authorName: profile?.name || profile?.username || 'Vous',
        avatar: profile?.avatar_url || '/default-avatar.jpg',
        isLiked: false,
      }
    });

  } catch (error) {
    console.error('Erreur API comments POST:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
