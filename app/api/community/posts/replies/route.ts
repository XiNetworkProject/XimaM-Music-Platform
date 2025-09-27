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
      .select('*')
      .eq('post_id', post_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur lors de la récupération des réponses:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des réponses' }, { status: 500 });
    }

    // Récupérer les profils des utilisateurs
    const userIds = Array.from(new Set(replies?.map(reply => reply.user_id) || []));
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, username, avatar')
      .in('id', userIds);

    if (profilesError) {
      console.error('Erreur lors de la récupération des profils:', profilesError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des profils' }, { status: 500 });
    }

    // Combiner les réponses avec les profils
    const repliesWithProfiles = replies?.map(reply => {
      const profile = profiles?.find(p => p.id === reply.user_id);
      return {
        ...reply,
        profiles: profile || { id: reply.user_id, name: 'Utilisateur inconnu', username: 'unknown', avatar: null }
      };
    }) || [];

    return NextResponse.json(repliesWithProfiles);

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
      .select('*')
      .single();

    if (error) {
      console.error('Erreur lors de la création de la réponse:', error);
      return NextResponse.json({ error: 'Erreur lors de la création de la réponse' }, { status: 500 });
    }

    // Récupérer le profil de l'utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, username, avatar')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Erreur lors de la récupération du profil:', profileError);
      return NextResponse.json({ error: 'Erreur lors de la récupération du profil' }, { status: 500 });
    }

    // Combiner la réponse avec le profil
    const replyWithProfile = {
      ...reply,
      profiles: profile || { id: session.user.id, name: 'Utilisateur', username: 'user', avatar: null }
    };

    return NextResponse.json(replyWithProfile, { status: 201 });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
