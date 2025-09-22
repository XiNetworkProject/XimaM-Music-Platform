import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { trackId } = params;
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'recent'; // 'recent' ou 'top'

    if (!trackId) {
      return NextResponse.json({ error: 'trackId requis' }, { status: 400 });
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

    // Construire la requête avec tri (sans jointure pour éviter l'erreur 500)
    let query = supabaseAdmin
      .from('comments')
      .select(`
        id,
        text,
        likes_count,
        created_at,
        user_id
      `)
      .eq('track_id', trackId);

    // Appliquer le tri
    if (sort === 'top') {
      query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: comments, error: commentsError } = await query;

    if (commentsError) {
      console.error('Erreur récupération commentaires:', commentsError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des commentaires' }, { status: 500 });
    }

    // Si l'utilisateur est connecté, récupérer ses likes
    let userLikes: string[] = [];
    if (session?.user?.id) {
      const { data: likes } = await supabaseAdmin
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', session.user.id)
        .in('comment_id', comments?.map(c => c.id) || []);

      userLikes = likes?.map(l => l.comment_id) || [];
    }

    // Récupérer les profils des utilisateurs
    const userIds = comments?.map(c => c.user_id) || [];
    let profiles: any[] = [];
    
    if (userIds.length > 0) {
      const { data: profilesData } = await supabaseAdmin
        .from('profiles')
        .select('id, username, name, avatar_url')
        .in('id', userIds);
      
      profiles = profilesData || [];
    }

    // Formater les commentaires avec les vraies données utilisateur
    const formattedComments = comments?.map(comment => {
      const profile = profiles.find(p => p.id === comment.user_id);
      return {
        id: comment.id,
        text: comment.text,
        likes: comment.likes_count,
        createdAt: new Date(comment.created_at).getTime(),
        authorName: profile?.name || profile?.username || 'Utilisateur',
        avatar: profile?.avatar_url || '/default-avatar.jpg',
        isLiked: userLikes.includes(comment.id),
      };
    }) || [];

    return NextResponse.json({
      success: true,
      comments: formattedComments,
      count: formattedComments.length
    });

  } catch (error) {
    console.error('Erreur API comments GET:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
