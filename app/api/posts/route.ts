import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creator_id');
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 30);

    const session = await getApiSession(request);
    const userId = session?.user?.id || null;

    let postIds: string[] | null = null;

    if (!creatorId && userId) {
      // Feed personnalisé : posts des créateurs suivis en priorité
      const { data: follows } = await supabaseAdmin
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);

      const followedIds = follows?.map((f: any) => f.following_id) || [];

      if (followedIds.length > 0) {
        // Récupérer d'abord les posts des suivis
        const { data: followedPosts } = await supabaseAdmin
          .from('creator_posts')
          .select('id')
          .eq('is_public', true)
          .in('creator_id', followedIds)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (followedPosts && followedPosts.length > 0) {
          postIds = followedPosts.map((p: any) => p.id);
        }
      }
    }

    // Construction de la requête principale
    let query = supabaseAdmin
      .from('creator_posts')
      .select(`
        id,
        type,
        content,
        image_url,
        track_id,
        likes_count,
        comments_count,
        is_public,
        created_at,
        creator_id,
        profiles!creator_posts_creator_id_fkey (
          id,
          username,
          name,
          avatar,
          is_verified
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (creatorId) {
      query = query.eq('creator_id', creatorId);
    }

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    if (postIds && postIds.length > 0 && !creatorId) {
      // Combiner posts des suivis + posts publics populaires
      query = query.limit(limit);
    } else {
      query = query.limit(limit);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('[posts] fetch error:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    // Enrichir avec les tracks partagées et le statut "liké par l'utilisateur"
    const enriched = await Promise.all((posts || []).map(async (post: any) => {
      let track = null;
      if (post.type === 'track_share' && post.track_id) {
        const { data: t } = await supabaseAdmin
          .from('tracks')
          .select('id, title, artist_name, cover_url, audio_url, duration')
          .eq('id', post.track_id)
          .single();
        if (t) track = t;
      }

      let isLiked = false;
      if (userId) {
        const { data: like } = await supabaseAdmin
          .from('post_likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', userId)
          .maybeSingle();
        isLiked = !!like;
      }

      return {
        ...post,
        creator: post.profiles,
        track,
        isLiked,
        profiles: undefined,
      };
    }));

    const nextCursor = enriched.length === limit
      ? enriched[enriched.length - 1]?.created_at
      : null;

    return NextResponse.json({ posts: enriched, nextCursor, hasMore: !!nextCursor });
  } catch (e) {
    console.error('[posts] GET error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { type, content, image_url, track_id } = body;

    if (!type || !['text', 'photo', 'track_share'].includes(type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
    }
    if (type === 'text' && !content?.trim()) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    }
    if (type === 'photo' && !image_url) {
      return NextResponse.json({ error: 'Image requise' }, { status: 400 });
    }
    if (type === 'track_share' && !track_id) {
      return NextResponse.json({ error: 'Track requise' }, { status: 400 });
    }

    const { data: post, error } = await supabaseAdmin
      .from('creator_posts')
      .insert({
        creator_id: session.user.id,
        type,
        content: content?.trim() || null,
        image_url: image_url || null,
        track_id: track_id || null,
        is_public: true,
      })
      .select(`
        id, type, content, image_url, track_id,
        likes_count, comments_count, is_public, created_at, creator_id,
        profiles!creator_posts_creator_id_fkey (
          id, username, name, avatar, is_verified
        )
      `)
      .single();

    if (error) {
      console.error('[posts] insert error:', error);
      return NextResponse.json({ error: 'Erreur création post' }, { status: 500 });
    }

    let track = null;
    if (type === 'track_share' && track_id) {
      const { data: t } = await supabaseAdmin
        .from('tracks')
        .select('id, title, artist_name, cover_url, audio_url, duration')
        .eq('id', track_id)
        .single();
      if (t) track = t;
    }

    return NextResponse.json({
      ...(post as any),
      creator: (post as any).profiles,
      track,
      isLiked: false,
      profiles: undefined,
    }, { status: 201 });
  } catch (e) {
    console.error('[posts] POST error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
