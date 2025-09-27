import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const post_id = searchParams.get('post_id');

    if (!post_id) {
      return NextResponse.json({ error: 'ID du post requis' }, { status: 400 });
    }

    // Récupérer les likes du post
    const { data: likes, error } = await supabase
      .from('forum_post_likes')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          username,
          avatar_url
        )
      `)
      .eq('post_id', post_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des likes:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des likes' }, { status: 500 });
    }

    return NextResponse.json(likes || []);

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { post_id } = body;

    if (!post_id) {
      return NextResponse.json({ error: 'ID du post requis' }, { status: 400 });
    }

    // Vérifier si le post existe
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .select('id')
      .eq('id', post_id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post non trouvé' }, { status: 404 });
    }

    // Vérifier si l'utilisateur a déjà liké ce post
    const { data: existingLike, error: likeError } = await supabase
      .from('forum_post_likes')
      .select('id')
      .eq('post_id', post_id)
      .eq('user_id', session.user.id)
      .single();

    if (likeError && likeError.code !== 'PGRST116') {
      console.error('Erreur lors de la vérification du like:', likeError);
      return NextResponse.json({ error: 'Erreur lors de la vérification du like' }, { status: 500 });
    }

    if (existingLike) {
      return NextResponse.json({ error: 'Post déjà liké' }, { status: 400 });
    }

    // Ajouter le like
    const { data: like, error } = await supabase
      .from('forum_post_likes')
      .insert({
        post_id,
        user_id: session.user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de l\'ajout du like:', error);
      return NextResponse.json({ error: 'Erreur lors de l\'ajout du like' }, { status: 500 });
    }

    return NextResponse.json(like, { status: 201 });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const post_id = searchParams.get('post_id');

    if (!post_id) {
      return NextResponse.json({ error: 'ID du post requis' }, { status: 400 });
    }

    // Supprimer le like
    const { error } = await supabase
      .from('forum_post_likes')
      .delete()
      .eq('post_id', post_id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Erreur lors de la suppression du like:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression du like' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}