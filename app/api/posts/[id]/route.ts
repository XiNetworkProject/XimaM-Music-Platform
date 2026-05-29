import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const POST_SELECT = `
  id, post_type, content, image_url, track_id, original_post_id, include_original_track,
  likes_count, comments_count, is_public, created_at, creator_id,
  profiles!creator_posts_creator_id_fkey (
    id, username, name, avatar, is_verified
  )
`;

type EnrichedPost = {
  [key: string]: any;
  type: string;
  creator: any;
  track: any;
  original_post_id: string | null;
  include_original_track: boolean;
  original_post: EnrichedPost | null;
  isLiked: boolean;
};

async function loadTrack(trackId?: string | null) {
  if (!trackId) return null;

  const { data: t, error: trackErr } = await supabaseAdmin
    .from('tracks')
    .select('*')
    .eq('id', trackId)
    .maybeSingle();

  if (trackErr) {
    console.error('[posts/id] track fetch error:', trackErr);
    return null;
  }

  if (!t) return null;

  const artistName = (t as any).artist_name
    || (t as any).creator_name
    || 'Artiste inconnu';

  return {
    id: (t as any).id,
    title: (t as any).title,
    artist_name: artistName,
    cover_url: (t as any).cover_url,
    audio_url: (t as any).audio_url,
    duration: (t as any).duration,
  };
}

async function enrichPost(post: any, userId: string | null, seen = new Set<string>()): Promise<EnrichedPost> {
  let track: any = null;
  if (post.post_type === 'track_share' && post.track_id) {
    track = await loadTrack(post.track_id);
  }

  let originalPost: EnrichedPost | null = null;
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
      console.error('[posts/id] original post fetch error:', originalError);
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
    ...(post as any),
    type: (post as any).post_type,
    creator: (post as any).profiles,
    track,
    original_post_id: (post as any).original_post_id || null,
    include_original_track: (post as any).include_original_track !== false,
    original_post: originalPost,
    isLiked,
    profiles: undefined,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const session = await getApiSession(request);
    const userId = session?.user?.id || null;

    const { data: post, error } = await supabaseAdmin
      .from('creator_posts')
      .select(POST_SELECT)
      .eq('id', id)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Post introuvable' }, { status: 404 });
    }

    return NextResponse.json(await enrichPost(post, userId));
  } catch (e) {
    console.error('[posts/id] GET error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { content } = body;

    const { data: existing } = await supabaseAdmin
      .from('creator_posts')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (!existing || (existing as any).creator_id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('creator_posts')
      .update({ content: content?.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, content, updated_at')
      .single();

    if (error) return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('[posts/id] PUT error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = params;

    const { data: existing } = await supabaseAdmin
      .from('creator_posts')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (!existing || (existing as any).creator_id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('creator_posts')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[posts/id] DELETE error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
