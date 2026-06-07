import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { buildAnonymousRecommendationSignals, buildUserRecommendationSignals, rerankPosts } from '@/lib/recommendation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

async function loadTracks(trackIds: string[]) {
  const ids = Array.from(new Set(trackIds.filter(Boolean)));
  if (!ids.length) return new Map<string, any>();
  const { data } = await supabaseAdmin
    .from('tracks')
    .select('id, title, creator_id, cover_url, audio_url, duration, genre, profiles:profiles!tracks_creator_id_fkey ( username, name )')
    .in('id', ids);

  const map = new Map<string, any>();
  for (const track of data || []) {
    const profile = Array.isArray(track.profiles) ? track.profiles[0] : track.profiles;
    map.set(String(track.id), {
      id: track.id,
      title: track.title,
      creator_id: track.creator_id,
      artist_name: profile?.name || profile?.username || 'Artiste',
      cover_url: track.cover_url,
      audio_url: track.audio_url,
      duration: track.duration || 0,
      genre: track.genre || [],
    });
  }
  return map;
}

async function likedPostIds(userId: string | null, postIds: string[]) {
  const ids = new Set<string>();
  if (!userId || !postIds.length) return ids;
  const { data } = await supabaseAdmin
    .from('post_likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds);
  for (const row of data || []) {
    if (row.post_id) ids.add(String(row.post_id));
  }
  return ids;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '12', 10) || 12, 1), 40);
    const cursor = Math.max(parseInt(searchParams.get('cursor') || '0', 10) || 0, 0);
    const debug = searchParams.get('debug') === '1';

    const session = await getApiSession(request).catch(() => null);
    const userId = (session?.user as any)?.id || searchParams.get('userId') || null;

    const { data: rawPosts, error } = await supabaseAdmin
      .from('creator_posts')
      .select(POST_SELECT)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(Math.max(80, limit * 8));

    if (error) {
      console.error('recommendations mixed: posts query failed', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const trackMap = await loadTracks((rawPosts || []).map((post: any) => post.track_id).filter(Boolean));
    const liked = await likedPostIds(userId, (rawPosts || []).map((post: any) => post.id).filter(Boolean));
    const candidateTracks = Array.from(trackMap.values()).map((track: any) => ({
      _id: track.id,
      genre: track.genre,
      creator_id: track.creator_id,
    }));
    const signals = userId
      ? await buildUserRecommendationSignals({ supabase: supabaseAdmin, userId, candidateTracks })
      : buildAnonymousRecommendationSignals();

    const posts = (rawPosts || []).map((post: any) => ({
      ...post,
      type: post.post_type,
      creator: post.profiles,
      track: post.track_id ? trackMap.get(String(post.track_id)) || null : null,
      profiles: undefined,
      isLiked: liked.has(String(post.id)),
    }));

    const ranked = rerankPosts(posts, signals, { debug });
    const page = ranked.slice(cursor, cursor + limit);
    const nextCursor = cursor + page.length;

    return NextResponse.json(
      {
        posts: page,
        nextCursor: nextCursor < ranked.length ? String(nextCursor) : null,
        hasMore: nextCursor < ranked.length,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } },
    );
  } catch (error) {
    console.error('recommendations mixed error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
