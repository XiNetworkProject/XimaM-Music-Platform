import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'ID du post requis' }, { status: 400 });
    }

    // Récupérer le post avec l'auteur
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          username,
          avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post non trouvé' }, { status: 404 });
    }

    // Incrémenter le compteur de vues
    await supabase
      .from('forum_posts')
      .update({ views_count: post.views_count + 1 })
      .eq('id', id);

    // Récupérer les réponses
    const { data: replies, error: repliesError } = await supabase
      .from('forum_replies')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          username,
          avatar_url
        )
      `)
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    if (repliesError) {
      console.error('Erreur lors de la récupération des réponses:', repliesError);
    }

    return NextResponse.json({
      post: {
        ...post,
        views_count: post.views_count + 1
      },
      replies: replies || []
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { title, content, category, tags } = body;

    if (!title || !content || !category) {
      return NextResponse.json({ error: 'Titre, contenu et catégorie requis' }, { status: 400 });
    }

    const validCategories = ['question', 'suggestion', 'bug', 'general'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 });
    }

    // Vérifier que l'utilisateur est le propriétaire du post
    const { data: existingPost, error: checkError } = await supabase
      .from('forum_posts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !existingPost) {
      return NextResponse.json({ error: 'Post non trouvé' }, { status: 404 });
    }

    if (existingPost.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { data: post, error } = await supabase
      .from('forum_posts')
      .update({
        title: title.trim(),
        content: content.trim(),
        category,
        tags: tags || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          username,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Erreur lors de la mise à jour du post:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du post' }, { status: 500 });
    }

    return NextResponse.json(post);

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = params;

    // Vérifier que l'utilisateur est le propriétaire du post
    const { data: existingPost, error: checkError } = await supabase
      .from('forum_posts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !existingPost) {
      return NextResponse.json({ error: 'Post non trouvé' }, { status: 404 });
    }

    if (existingPost.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur lors de la suppression du post:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression du post' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
