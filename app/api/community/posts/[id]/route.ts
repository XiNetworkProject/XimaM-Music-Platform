import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';

const TRACK_REF_RE = /<!--\s*synaura-track:([^>\s]+)\s*-->/i;

function stripTrackRef(content?: string | null) {
  return String(content || '').replace(TRACK_REF_RE, '').trim();
}

function getPostTrackId(post: any) {
  return post?.track_id || String(post?.content || '').match(TRACK_REF_RE)?.[1] || null;
}

function normalizeAttachedTrack(track: any) {
  if (!track) return null;
  const profile = Array.isArray(track.profiles) ? track.profiles[0] : track.profiles;
  return {
    id: track.id,
    _id: track.id,
    title: track.title,
    artist_id: track.creator_id || track.user_id || '',
    artist_name: track.artist_name || profile?.name || profile?.username || 'Artiste',
    artist_username: profile?.username || '',
    coverUrl: track.cover_url || null,
    cover_url: track.cover_url || null,
    coverVideoUrl: track.cover_video_url || track.data?.cover_video_url || null,
    cover_video_url: track.cover_video_url || track.data?.cover_video_url || null,
    coverVideoPosterUrl: track.cover_video_poster_url || track.data?.cover_video_poster_url || null,
    cover_video_poster_url: track.cover_video_poster_url || track.data?.cover_video_poster_url || null,
    audioUrl: track.audio_url || null,
    audio_url: track.audio_url || null,
    duration: track.duration || 0,
    genre: track.genre || [],
    plays: track.plays || 0,
    likes: track.likes || 0,
    style: Array.isArray(track.genre) ? track.genre.slice(0, 2).join(', ') : track.genre || '',
  };
}

function shouldFallbackSelect(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return (
    error?.code === 'PGRST200' ||
    error?.code === 'PGRST201' ||
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    message.includes('relationship') ||
    message.includes('schema cache') ||
    message.includes('could not find') ||
    message.includes('column')
  );
}

async function attachAuthor(post: any) {
  if (!post || post.profiles) return post;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, username, avatar')
    .eq('id', post.user_id)
    .maybeSingle();
  return profile ? { ...post, profiles: profile } : post;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'ID du post requis' }, { status: 400 });
    }

    // Récupérer le post avec l'auteur. Fallback sans relation embarquée si le
    // cache PostgREST de prod ne connaît pas la FK user_id -> profiles.
    let { data: post, error: postError } = await supabase
      .from('forum_posts')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          username,
          avatar
        )
      `)
      .eq('id', id)
      .single();

    if (postError && shouldFallbackSelect(postError)) {
      const retry = await supabase
        .from('forum_posts')
        .select('*')
        .eq('id', id)
        .single();
      post = retry.data;
      postError = retry.error;
      if (post) post = await attachAuthor(post);
    }

    if (postError || !post) {
      return NextResponse.json({ error: 'Post non trouvé' }, { status: 404 });
    }

    const attachedTrackId = getPostTrackId(post);
    let attachedTrack = null;
    if (attachedTrackId) {
      let { data: track, error: trackError } = await supabase
        .from('tracks')
        .select(`
          *,
          profiles:creator_id (
            id,
            name,
            username,
            avatar
          )
        `)
        .eq('id', attachedTrackId)
        .maybeSingle();

      if (trackError && shouldFallbackSelect(trackError)) {
        const retry = await supabase
          .from('tracks')
          .select('*')
          .eq('id', attachedTrackId)
          .maybeSingle();
        track = retry.data;
        if (track?.creator_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, name, username, avatar')
            .eq('id', track.creator_id)
            .maybeSingle();
          track = { ...track, profiles: profile || null };
        }
      }
      attachedTrack = normalizeAttachedTrack(track);
    }

    // Incrémenter le compteur de vues
    const nextViewsCount = Number(post.views_count || 0) + 1;
    await supabase
      .from('forum_posts')
      .update({ views_count: nextViewsCount })
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
          avatar
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
        content: stripTrackRef(post.content),
        track_id: post.track_id || attachedTrackId,
        track: attachedTrack,
        views_count: nextViewsCount
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

    const validCategories = ['feedback', 'collab', 'remix', 'prompts', 'weekly-top', 'question', 'suggestion', 'bug', 'general'];
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

    const updatePayload: any = {
      title: title.trim(),
      content: content.trim(),
      category,
      tags: tags || [],
      updated_at: new Date().toISOString()
    };
    if (typeof body.track_id === 'string') {
      updatePayload.track_id = body.track_id.trim() || null;
    }

    let { data: post, error } = await supabase
      .from('forum_posts')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          username,
          avatar
        )
      `)
      .single();

    if (error && 'track_id' in updatePayload) {
      delete updatePayload.track_id;
      const retry = await supabase
        .from('forum_posts')
        .update(updatePayload)
        .eq('id', id)
        .select(`
          *,
          profiles:user_id (
            id,
            name,
            username,
            avatar
          )
        `)
        .single();
      post = retry.data;
      error = retry.error;
    }

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
