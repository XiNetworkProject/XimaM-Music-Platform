import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { db } from '@/lib/database';
import {
  attachAuthors,
  attachTracks,
  insertForumPost,
  shouldFallbackSelect,
  withTrackRef,
  validateAttachedTrack,
} from '@/lib/communityPosts';
import { communityPage, communityPostInput } from '@/lib/communityValidation';

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.trim().slice(0, 120).replace(/[(),%_*\\]/g, '');
    const sort = searchParams.get('sort') || 'recent';
    const page = communityPage(searchParams.get('page'), 1);
    const limit = communityPage(searchParams.get('limit'), 10, 50);
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
      next = next.order('id', { ascending: false }).range(offset, offset + limit - 1);
      if (category && category !== 'all') next = next.eq('category', category);
      if (search) next = next.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
      return next;
    };

    // user_id references auth.users, not profiles. Resolve public profiles in
    // one batch below via their shared auth ID, without a legacy relation select.
    let query = applyFiltersAndSort(
      db.from('forum_posts').select('*'),
      sort,
    );

    let { data: posts, error } = await query;

    if (error && shouldFallbackSelect(error)) {
      const retry = await applyFiltersAndSort(
        db.from('forum_posts').select('*'),
        sort,
      );
      posts = retry.data;
      error = retry.error;
    }

    if (error && sort !== 'recent' && shouldFallbackSelect(error)) {
      const retry = await applyFiltersAndSort(
        db.from('forum_posts').select('*'),
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
    let countQuery = db
      .from('forum_posts')
      .select('*', { count: 'exact', head: true });

    if (category && category !== 'all') {
      countQuery = countQuery.eq('category', category);
    }

    if (search) {
      countQuery = countQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    const postsWithAuthors = await attachAuthors(posts || []);
    let hydratedPosts = await attachTracks(postsWithAuthors || [], session?.user?.id || null);

    if (session?.user?.id && hydratedPosts.length) {
      const postIds = hydratedPosts.map((post: any) => post.id).filter(Boolean);
      const { data: ownLikes, error: ownLikesError } = await db
        .from('forum_post_likes')
        .select('post_id')
        .eq('user_id', session.user.id)
        .in('post_id', postIds);
      if (ownLikesError) throw ownLikesError;
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
    }, { headers: { 'Cache-Control': 'private, no-store' } });

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

    const body = await request.json().catch(() => null);
    const input = communityPostInput(body);
    if (!input.value) return NextResponse.json({ error: input.error }, { status: 400 });
    const { title, content, category, tags } = input.value;

    const requestedTrackId = typeof body.track_id === 'string' && body.track_id.trim() ? body.track_id.trim() : null;
    if (!(await validateAttachedTrack(requestedTrackId, session.user.id))) return NextResponse.json({ error: 'Son indisponible ou privé.' }, { status: 400 });
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

    if (error?.code === '23514') return NextResponse.json({ error: 'Ce thème est temporairement indisponible. Ton brouillon est conservé.' }, { status: 503 });
    if (error) {
      console.error('Erreur lors de la création du post:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création du post' },
        { status: 500 },
      );
    }

    // A committed publication must not fail because optional hydration failed afterwards.
    return NextResponse.json(post, { status: 201 });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
