import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';

function normalizeAttachedTrack(track: any) {
  if (!track) return null;
  return {
    id: track.id,
    _id: track.id,
    title: track.title,
    artist_id: track.creator_id || track.user_id || '',
    artist_name: track.artist_name || track.profiles?.name || track.profiles?.username || 'Artiste',
    artist_username: track.profiles?.username || '',
    coverUrl: track.cover_url || track.coverUrl || null,
    cover_url: track.cover_url || track.coverUrl || null,
    audioUrl: track.audio_url || track.audioUrl || null,
    audio_url: track.audio_url || track.audioUrl || null,
    duration: track.duration || 0,
    genre: track.genre || [],
    plays: track.plays || 0,
    likes: track.likes || 0,
    style: Array.isArray(track.genre) ? track.genre.slice(0, 2).join(', ') : track.genre || '',
  };
}

async function attachTracks(posts: any[]) {
  const trackIds = Array.from(new Set((posts || []).map((post) => post.track_id).filter(Boolean)));
  if (!trackIds.length) return posts || [];

  const { data: tracks } = await supabase
    .from('tracks')
    .select(`
      id,
      title,
      cover_url,
      audio_url,
      duration,
      genre,
      plays,
      likes,
      creator_id,
      profiles:creator_id (
        id,
        name,
        username,
        avatar
      )
    `)
    .in('id', trackIds);

  const tracksById = new Map((tracks || []).map((track: any) => [track.id, normalizeAttachedTrack(track)]));
  return (posts || []).map((post) => ({
    ...post,
    author: post.profiles
      ? {
          id: post.profiles.id,
          name: post.profiles.name,
          username: post.profiles.username,
          avatar: post.profiles.avatar,
        }
      : undefined,
    track: post.track_id ? tracksById.get(post.track_id) || null : null,
  }));
}

function legacyCategory(category: string) {
  if (category === 'feedback') return 'question';
  if (category === 'collab' || category === 'remix' || category === 'prompts' || category === 'weekly-top') return 'suggestion';
  return category;
}

function shouldRetryWithoutOptionalColumns(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return (
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    message.includes('could not find') ||
    message.includes('column') ||
    message.includes('schema cache')
  );
}

function shouldRetryLegacyCategory(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return (
    error?.code === '23514' ||
    message.includes('category') ||
    message.includes('check constraint')
  );
}

async function insertForumPost(insertPayload: any) {
  const attempts: any[] = [insertPayload];
  if ('track_id' in insertPayload) {
    const withoutTrack = { ...insertPayload };
    delete withoutTrack.track_id;
    attempts.push(withoutTrack);
  }
  if ('tags' in insertPayload) {
    const withoutTags = { ...insertPayload };
    delete withoutTags.tags;
    attempts.push(withoutTags);
  }
  if ('track_id' in insertPayload || 'tags' in insertPayload) {
    const minimal = { ...insertPayload };
    delete minimal.track_id;
    delete minimal.tags;
    attempts.push(minimal);
  }

  let lastError: any = null;
  for (const payload of attempts) {
    const { data, error } = await supabase
      .from('forum_posts')
      .insert(payload)
      .select('*')
      .single();

    if (!error) return { post: data, error: null };
    lastError = error;
    if (!shouldRetryWithoutOptionalColumns(error) && !shouldRetryLegacyCategory(error)) break;
  }

  const fallbackCategory = legacyCategory(insertPayload.category);
  if (fallbackCategory !== insertPayload.category && shouldRetryLegacyCategory(lastError)) {
    const legacyPayload = { ...insertPayload, category: fallbackCategory };
    delete legacyPayload.track_id;
    delete legacyPayload.tags;
    const { data, error } = await supabase
      .from('forum_posts')
      .insert(legacyPayload)
      .select('*')
      .single();
    if (!error) return { post: { ...data, category: insertPayload.category }, error: null };
    lastError = error;
  }

  return { post: null, error: lastError };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'recent';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('forum_posts')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          username,
          avatar
        )
      `);

    // Appliquer le tri selon le paramètre sort
    switch (sort) {
      case 'recent':
        query = query.order('created_at', { ascending: false });
        break;
      case 'popular':
        query = query.order('likes_count', { ascending: false });
        break;
      case 'most_replied':
        query = query.order('replies_count', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    // Filtrer par catégorie
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Recherche dans le titre et le contenu
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('Erreur lors de la récupération des posts:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des posts' }, { status: 500 });
    }

    // Compter le total pour la pagination
    let countQuery = supabase
      .from('forum_posts')
      .select('*', { count: 'exact', head: true });

    if (category && category !== 'all') {
      countQuery = countQuery.eq('category', category);
    }

    if (search) {
      countQuery = countQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { count } = await countQuery;

    const hydratedPosts = await attachTracks(posts || []);

    return NextResponse.json({
      posts: hydratedPosts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

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
    const { title, content, category, tags } = body;

    if (!title || !content || !category) {
      return NextResponse.json({ error: 'Titre, contenu et catégorie requis' }, { status: 400 });
    }

    const validCategories = ['feedback', 'collab', 'remix', 'prompts', 'weekly-top', 'question', 'suggestion', 'bug', 'general'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 });
    }

    const insertPayload: any = {
      user_id: session.user.id,
      title: title.trim(),
      content: content.trim(),
      category,
      tags: tags || []
    };
    if (typeof body.track_id === 'string' && body.track_id.trim()) {
      insertPayload.track_id = body.track_id.trim();
    }

    const { post, error } = await insertForumPost(insertPayload);

    if (error) {
      console.error('Erreur lors de la création du post:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création du post', details: error.message || error.details || error.code },
        { status: 500 },
      );
    }

    return NextResponse.json(post, { status: 201 });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
