import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';

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
    coverUrl: track.cover_url || track.coverUrl || null,
    cover_url: track.cover_url || track.coverUrl || null,
    coverVideoUrl: track.cover_video_url || track.coverVideoUrl || track.data?.cover_video_url || null,
    cover_video_url: track.cover_video_url || track.coverVideoUrl || track.data?.cover_video_url || null,
    coverVideoPosterUrl: track.cover_video_poster_url || track.coverVideoPosterUrl || track.data?.cover_video_poster_url || null,
    cover_video_poster_url: track.cover_video_poster_url || track.coverVideoPosterUrl || track.data?.cover_video_poster_url || null,
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

  let { data: tracks, error } = await supabase
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
    .in('id', trackIds);

  if (error) {
    const fallback = await supabase
      .from('tracks')
      .select('*')
      .in('id', trackIds);
    tracks = fallback.data || [];

    const creatorIds = Array.from(new Set((tracks || []).map((track: any) => track.creator_id).filter(Boolean)));
    if (creatorIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, username, avatar')
        .in('id', creatorIds);
      const profilesById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));
      tracks = (tracks || []).map((track: any) => ({ ...track, profiles: profilesById.get(track.creator_id) || null }));
    }
  }

  const tracksById = new Map((tracks || []).map((track: any) => [track.id, normalizeAttachedTrack(track)]));
  return (posts || []).map((post) => ({
    ...post,
    author: post.author || post.profiles
      ? {
          id: (post.author || post.profiles).id,
          name: (post.author || post.profiles).name,
          username: (post.author || post.profiles).username,
          avatar: (post.author || post.profiles).avatar,
        }
      : undefined,
    track: post.track_id ? tracksById.get(post.track_id) || null : null,
  }));
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

async function attachAuthors(posts: any[]) {
  const userIds = Array.from(new Set((posts || []).map((post) => post.user_id).filter(Boolean)));
  if (!userIds.length) return posts || [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, username, avatar')
    .in('id', userIds);
  const profilesById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));

  return (posts || []).map((post) => ({
    ...post,
    author: post.profiles
      ? {
          id: post.profiles.id,
          name: post.profiles.name,
          username: post.profiles.username,
          avatar: post.profiles.avatar,
        }
      : profilesById.get(post.user_id)
        ? {
            id: profilesById.get(post.user_id).id,
            name: profilesById.get(post.user_id).name,
            username: profilesById.get(post.user_id).username,
            avatar: profilesById.get(post.user_id).avatar,
          }
        : undefined,
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

    const applyFiltersAndSort = (baseQuery: any, sortKey: string) => {
      let next = baseQuery;
      switch (sortKey) {
        case 'popular':
          next = next.order('likes_count', { ascending: false });
          break;
        case 'most_replied':
          next = next.order('replies_count', { ascending: false });
          break;
        case 'recent':
        default:
          next = next.order('created_at', { ascending: false });
          break;
      }
      next = next.range(offset, offset + limit - 1);
      if (category && category !== 'all') next = next.eq('category', category);
      if (search) next = next.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
      return next;
    };

    let query = applyFiltersAndSort(
      supabase
        .from('forum_posts')
        .select(`
          *,
          profiles:user_id (
            id,
            name,
            username,
            avatar
          )
        `),
      sort,
    );

    let { data: posts, error } = await query;

    if (error && shouldFallbackSelect(error)) {
      const retry = await applyFiltersAndSort(
        supabase.from('forum_posts').select('*'),
        sort,
      );
      posts = retry.data;
      error = retry.error;
    }

    if (error && sort !== 'recent' && shouldFallbackSelect(error)) {
      const retry = await applyFiltersAndSort(
        supabase.from('forum_posts').select('*'),
        'recent',
      );
      posts = retry.data;
      error = retry.error;
    }

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

    const postsWithAuthors = await attachAuthors(posts || []);
    const hydratedPosts = await attachTracks(postsWithAuthors || []);

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
