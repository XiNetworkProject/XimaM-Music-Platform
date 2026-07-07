import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabase } from '@/lib/supabase';
import {
  attachAuthors,
  attachTracks,
  insertForumPost,
  shouldFallbackSelect,
  withTrackRef,
} from '@/lib/communityPosts';

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
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
    let hydratedPosts = await attachTracks(postsWithAuthors || [], session?.user?.id || null);

    if (session?.user?.id && hydratedPosts.length) {
      const postIds = hydratedPosts.map((post: any) => post.id).filter(Boolean);
      const { data: ownLikes } = await supabase
        .from('forum_post_likes')
        .select('post_id')
        .eq('user_id', session.user.id)
        .in('post_id', postIds);
      const likedPostIds = new Set((ownLikes || []).map((like: any) => like.post_id));
      hydratedPosts = hydratedPosts.map((post: any) => ({
        ...post,
        is_liked: likedPostIds.has(post.id),
      }));
    }

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
    const session = await getApiSession(request);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, category, tags } = body;

    if (!title || !content || !category) {
      return NextResponse.json({ error: 'Titre, contenu et catégorie requis' }, { status: 400 });
    }

    const validCategories = ['feedback', 'collab', 'remix', 'prompts', 'weekly-top', 'ai_prompt', 'top_tracks', 'question', 'announcement', 'suggestion', 'bug', 'general'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 });
    }

    const requestedTrackId = typeof body.track_id === 'string' && body.track_id.trim() ? body.track_id.trim() : null;
    const insertPayload: any = {
      user_id: session.user.id,
      title: title.trim(),
      content: withTrackRef(content.trim(), requestedTrackId),
      category,
      tags: tags || []
    };
    if (requestedTrackId) {
      insertPayload.track_id = requestedTrackId;
    }

    const { post, error } = await insertForumPost(insertPayload);

    if (error) {
      console.error('Erreur lors de la création du post:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création du post', details: error.message || error.details || error.code },
        { status: 500 },
      );
    }

    const [postWithAuthor] = await attachAuthors([post]);
    const [hydratedPost] = await attachTracks([postWithAuthor], session.user.id);
    return NextResponse.json(hydratedPost || post, { status: 201 });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
