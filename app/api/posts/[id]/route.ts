import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { isAiTrackPublic, isTrackPublic } from '@/lib/publicTracks';
import { normalizeRemixTrackRef } from '@/lib/remixServer';

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
    console.error('[posts/id] ai track fetch error:', error);
    return null;
  }

  // Le morceau IA attaché a pu devenir privé (ou sa génération dépubliée) depuis la
  // publication du post : dans ce cas le post ne doit plus exposer ce morceau
  // (règle identique à publicTracks.ts / posts/route.ts).
  if (!t || !isAiTrackPublic(t)) return null;

  const creatorId = String((t as any).generation?.user_id || '');
  const { data: profile } = creatorId
    ? await supabaseAdmin.from('profiles').select('name, username').eq('id', creatorId).maybeSingle()
    : { data: null as any };

  return {
    id: `ai-${(t as any).id}`,
    title: (t as any).title || 'Création IA',
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
    console.error('[posts/id] track fetch error:', trackErr);
    return null;
  }

  // Le morceau attaché a pu devenir privé depuis la publication du post : dans ce
  // cas le post ne doit plus exposer ce morceau (règle identique à posts/route.ts).
  if (!t || !isTrackPublic(t)) return null;
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
