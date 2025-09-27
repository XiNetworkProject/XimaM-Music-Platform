import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const post_id = searchParams.get('post_id');

    if (!post_id) {
      return NextResponse.json({ error: 'ID du post requis' }, { status: 400 });
    }

    // Récupérer les réponses du post
    const { data: replies, error } = await supabase
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
      .eq('post_id', post_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur lors de la récupération des réponses:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des réponses' }, { status: 500 });
    }

    return NextResponse.json(replies || []);

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
    const { post_id, content } = body;

    if (!post_id || !content) {
      return NextResponse.json({ error: 'ID du post et contenu requis' }, { status: 400 });
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

    // Créer la réponse
    const { data: reply, error } = await supabase
      .from('forum_replies')
      .insert({
        post_id,
        user_id: session.user.id,
        content: content.trim()
      })
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
      console.error('Erreur lors de la création de la réponse:', error);
      return NextResponse.json({ error: 'Erreur lors de la création de la réponse' }, { status: 500 });
    }

    return NextResponse.json(reply, { status: 201 });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
