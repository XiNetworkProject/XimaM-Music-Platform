import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { isAiTrackPublic, isTrackPublic } from '@/lib/publicTracks';
import { normalizeRemixTrackRef } from '@/lib/remixServer';

export const dynamic = 'force-dynamic';

const POST_TYPES = ['text', 'photo', 'track_share', 'repost'] as const;
type EnrichedPost = {
  [key: string]: any;
  type: (typeof POST_TYPES)[number];
  creator: any;
  track: any;
  original_post_id: string | null;
  include_original_track: boolean;
  original_post: EnrichedPost | null;
  isLiked: boolean;
};

const POST_SELECT = `
  id,
  post_type,
  content,
  image_url,
  track_id,
  original_post_id,
  include_original_track,
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
`;

function readTrackData(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function loadAiTrack(id: string) {
  const { data: t, error } = await supabaseAdmin
    .from('ai_tracks')
    .select('*, generation:ai_generations!inner(user_id, is_public, status)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[posts] ai track fetch error:', error);
    return null;
  }
  if (!t || !isAiTrackPublic(t)) return null;

  const creatorId = String((t as any).generation?.user_id || '');
  const { data: profile } = creatorId
    ? await supabaseAdmin.from('profiles').select('name, username').eq('id', creatorId).maybeSingle()
    : { data: null as any };

  return {
    id: `ai-${(t as any).id}`,
    title: (t as any).title || 'Creation IA',
    artist_name: profile?.name || profile?.username || 'Artiste Synaura',
    cover_url: (t as any).image_url || null,
    cover_video_url: null,
    cover_video_poster_url: null,
    audio_url: (t as any).audio_url || (t as any).stream_audio_url,
    duration: (t as any).duration,
  };
}

async function loadClassicTrack(id: string) {
  const { data: t, error: trackErr } = await supabaseAdmin
    .from('tracks')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (trackErr) {
    console.error('[posts] track fetch error:', trackErr);
    return null;
  }

  if (!t) return null;
  // Le morceau attache a pu devenir prive depuis la publication du post : dans ce
  // cas le post ne doit plus exposer ce morceau (regle identique a publicTracks.ts).
  if (!isTrackPublic(t)) return null;
  const data = readTrackData((t as any).data);

  const artistName = (t as any).artist_name
    || (t as any).creator_name
    || 'Artiste inconnu';

  return {
    id: (t as any).id,
    title: (t as any).title,
    artist_name: artistName,
    cover_url: (t as any).cover_url,
    cover_video_url: (t as any).cover_video_url || data.cover_video_url || data.coverVideoUrl || null,
    cover_video_poster_url: (t as any).cover_video_poster_url || data.cover_video_poster_url || data.coverVideoPosterUrl || null,
    audio_url: (t as any).audio_url,
    duration: (t as any).duration,
  };
}

async function loadTrack(trackId?: string | null) {
  if (!trackId) return null;
  const ref = normalizeRemixTrackRef(trackId);
  return ref.type === 'ai_track' ? loadAiTrack(ref.id) : loadClassicTrack(ref.id);
}

async function isPostLiked(postId: string, userId: string | null) {
  if (!userId) return false;

  const { data: like } = await supabaseAdmin
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!like;
}

async function enrichPost(post: any, userId: string | null, seen = new Set<string>()): Promise<EnrichedPost> {
  let track = null;
  if (post.post_type === 'track_share' && post.track_id) {
    track = await loadTrack(post.track_id);
  }

  let originalPost = null;
  if (post.post_type === 'repost' && post.original_post_id && !seen.has(post.original_post_id)) {
    const nextSeen = new Set(seen);
    nextSeen.add(String(post.id));

    const { data: rawOriginal, error: originalError } = await supabaseAdmin
      .from('creator_posts')
      .select(POST_SELECT)
      .eq('id', post.original_post_id)
      .eq('is_public', true)
      .maybeSingle();

    if (originalError) {
      console.error('[posts] original post fetch error:', originalError);
    } else if (rawOriginal) {
      const enrichedOriginal: EnrichedPost = await enrichPost(rawOriginal, userId, nextSeen);
      const includeOriginalTrack = post.include_original_track !== false;

      originalPost = {
        ...enrichedOriginal,
        track: includeOriginalTrack ? enrichedOriginal.track : null,
        track_hidden: !includeOriginalTrack && Boolean(enrichedOriginal.track),
      };
    }
  }

  return {
    ...post,
    type: post.post_type,
    creator: post.profiles,
    track,
    original_post_id: post.original_post_id || null,
    include_original_track: post.include_original_track !== false,
    original_post: originalPost,
    isLiked: await isPostLiked(post.id, userId),
    profiles: undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creator_id');
    const trackId = searchParams.get('track_id');
    const cursor = searchParams.get('cursor');
    const q = (searchParams.get('query') || searchParams.get('q') || '').trim();
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
      .select(POST_SELECT)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (creatorId) {
      query = query.eq('creator_id', creatorId);
    }

    if (trackId) {
      const ref = normalizeRemixTrackRef(trackId);
      const normalizedTrackId = ref.type === 'ai_track' ? `ai-${ref.id}` : ref.id;
      query = query.eq('track_id', normalizedTrackId);
    }

    if (q) {
      query = query.ilike('content', `%${q.replace(/[%_]/g, '\\$&')}%`);
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

    const enrichedAll = await Promise.all((posts || []).map((post: any) => enrichPost(post, userId)));
    // Un post "track_share" dont le morceau attache n'est plus public ne doit
    // plus apparaitre nulle part (loadTrack renvoie alors track: null).
    const enriched = enrichedAll.filter((post) => post.type !== 'track_share' || Boolean(post.track));

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
    const { type, content, image_url, track_id, original_post_id, include_original_track } = body;

    if (!type || !POST_TYPES.includes(type)) {
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
    if (type === 'repost' && !original_post_id) {
      return NextResponse.json({ error: 'Post original requis' }, { status: 400 });
    }

    if (type === 'repost') {
      const { data: originalPost, error: originalPostError } = await supabaseAdmin
        .from('creator_posts')
        .select('id, is_public')
        .eq('id', original_post_id)
        .maybeSingle();

      if (originalPostError || !originalPost?.id || originalPost.is_public !== true) {
        return NextResponse.json({ error: 'Post original introuvable' }, { status: 404 });
      }
    }

    if (type === 'track_share') {
      const publicTrack = await loadTrack(track_id);
      if (!publicTrack?.id) {
        return NextResponse.json({ error: 'Morceau introuvable ou prive' }, { status: 404 });
      }
    }

    const { data: post, error } = await supabaseAdmin
      .from('creator_posts')
      .insert({
        creator_id: session.user.id,
        post_type: type,
        content: content?.trim() || null,
        image_url: image_url || null,
        track_id: track_id || null,
        original_post_id: type === 'repost' ? original_post_id : null,
        include_original_track: type === 'repost' ? include_original_track !== false : true,
        is_public: true,
      })
      .select(POST_SELECT)
      .single();

    if (error) {
      console.error('[posts] insert error:', error);
      return NextResponse.json({ error: 'Erreur création post' }, { status: 500 });
    }

    return NextResponse.json(await enrichPost(post, session.user.id), { status: 201 });
  } catch (e) {
    console.error('[posts] POST error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
