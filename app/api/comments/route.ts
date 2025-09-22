import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { trackId, text } = await request.json();

    if (!trackId || !text || typeof text !== 'string') {
      return NextResponse.json({ error: 'trackId et text requis' }, { status: 400 });
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
      })
      .select(`
        id,
        text,
        likes_count,
        created_at,
        user_id,
        profiles (
          username,
          name,
          avatar_url
        )
      `)
      .single();

    if (commentError) {
      console.error('Erreur création commentaire:', commentError);
      return NextResponse.json({ error: 'Erreur lors de la création du commentaire' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        text: comment.text,
        likes: comment.likes_count,
        createdAt: new Date(comment.created_at).getTime(),
        authorName: comment.profiles?.[0]?.name || comment.profiles?.[0]?.username || 'Utilisateur',
        avatar: comment.profiles?.[0]?.avatar_url || '/default-avatar.jpg',
        isLiked: false,
      }
    });

  } catch (error) {
    console.error('Erreur API comments POST:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
