import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { applyPublicTrackFilter } from '@/lib/publicTracks';
import {
  buildRecommendationSignals,
  loadGlobalTrackCandidates,
  parseRecommendationExclusions,
  rerankPosts,
  rerankTracks,
  type RecommendedPost,
  type RecommendedTrack,
} from '@/lib/recommendation';

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

function profileOf(row: any) {
  return Array.isArray(row?.profiles) ? row.profiles[0] : row?.profiles;
}

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

async function loadTrackCandidates(_limit: number) {
  return loadGlobalTrackCandidates(false);
}

async function loadPostCandidates(limit: number, userId: string | null) {
  const { data: posts } = await supabaseAdmin
    .from('creator_posts')
    .select(POST_SELECT)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(Math.max(80, limit * 6));

  const trackIds = (posts || []).map((post: any) => post.track_id).filter(Boolean);
  const trackMap = new Map<string, any>();
  if (trackIds.length) {
    const { data: tracks } = await applyPublicTrackFilter(supabaseAdmin
      .from('tracks')
      .select('*, profiles:profiles!tracks_creator_id_fkey ( username, name )')
      .in('id', Array.from(new Set(trackIds))));
    for (const track of tracks || []) {
      const profile = profileOf(track);
      const data = readTrackData(track.data);
      trackMap.set(String(track.id), {
        id: track.id,
        title: track.title,
        creator_id: track.creator_id,
        artist_name: profile?.name || profile?.username || 'Artiste',
        cover_url: track.cover_url,
        coverVideoUrl: track.cover_video_url || data.cover_video_url || data.coverVideoUrl || null,
        cover_video_url: track.cover_video_url || data.cover_video_url || data.coverVideoUrl || null,
        coverVideoPosterUrl: track.cover_video_poster_url || data.cover_video_poster_url || data.coverVideoPosterUrl || null,
        cover_video_poster_url: track.cover_video_poster_url || data.cover_video_poster_url || data.coverVideoPosterUrl || null,
        audio_url: track.audio_url,
        duration: track.duration || 0,
        genre: track.genre || [],
      });
    }
  }

  const liked = new Set<string>();
  if (userId && posts?.length) {
    const { data: likes } = await supabaseAdmin
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', posts.map((post: any) => post.id));
    for (const like of likes || []) {
      if (like.post_id) liked.add(String(like.post_id));
    }
  }

  return (posts || []).map((post: any) => ({
    ...post,
    type: post.post_type,
    creator: post.profiles,
    track: post.track_id ? trackMap.get(String(post.track_id)) || null : null,
    profiles: undefined,
    isLiked: liked.has(String(post.id)),
  })) as RecommendedPost[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '24', 10) || 24, 1), 60);
    const cursor = Math.max(parseInt(searchParams.get('cursor') || '0', 10) || 0, 0);
    const debug = searchParams.get('debug') === '1';
    const recommendationSessionId = searchParams.get('session')?.slice(0, 120) || null;
    const excludedTrackIds = parseRecommendationExclusions(searchParams.get('excludeTracks'));
    const excludedPostIds = parseRecommendationExclusions(searchParams.get('excludePosts'));
    const session = await getApiSession(request).catch(() => null);
    const userId = (session?.user as any)?.id || searchParams.get('userId') || null;

    const [trackCandidates, postCandidates] = await Promise.all([
      loadTrackCandidates(limit),
      loadPostCandidates(limit, userId),
    ]);

    const signals = await buildRecommendationSignals({
      supabase: supabaseAdmin,
      userId,
      candidateTracks: trackCandidates,
      sessionId: recommendationSessionId,
    });

    const allRankedTracks = rerankTracks(trackCandidates, signals, {
      strategy: 'reco',
      debug,
      maxConsecutiveArtists: 1,
      sessionSeed: recommendationSessionId || `${userId || 'anonymous'}:${new Date().toISOString().slice(0, 10)}:home`,
    });
    const allRankedPosts = rerankPosts(postCandidates, signals, { debug });
    const tracks = excludedTrackIds.size
      ? allRankedTracks.filter((track) => !excludedTrackIds.has(String(track._id)))
      : allRankedTracks;
    const posts = excludedPostIds.size
      ? allRankedPosts.filter((post) => !excludedPostIds.has(String(post.id)))
      : allRankedPosts;
    const dailyMix = allRankedTracks.slice(0, 12);
    const weeklyTop = [...trackCandidates]
      .sort((a: any, b: any) => (b.rankingScore || 0) - (a.rankingScore || 0))
      .slice(0, 12);
    const mixed: Array<{ id: string; type: 'track' | 'post'; score: number; track?: RecommendedTrack; post?: RecommendedPost }> = [];
    let ti = 0;
    let pi = 0;
    while ((ti < tracks.length || pi < posts.length) && mixed.length < Math.max(180, limit * 8)) {
      if (tracks[ti]) {
        mixed.push({ id: `track-${tracks[ti]._id}`, type: 'track', score: tracks[ti].recommendationScore || 0, track: tracks[ti] });
        ti += 1;
      }
      if (posts[pi] && mixed.length % 4 !== 3) {
        mixed.push({ id: `post-${posts[pi].id}`, type: 'post', score: posts[pi].recommendationScore || 0, post: posts[pi] });
        pi += 1;
      } else if (posts[pi] && ti % 3 === 0) {
        mixed.push({ id: `post-${posts[pi].id}`, type: 'post', score: posts[pi].recommendationScore || 0, post: posts[pi] });
        pi += 1;
      }
    }

    const page = mixed.slice(cursor, cursor + limit);
    const nextCursor = cursor + page.length;

    return NextResponse.json(
      {
        items: page,
        tracks: page.filter((item) => item.type === 'track').map((item) => item.track),
        posts: page.filter((item) => item.type === 'post').map((item) => item.post),
        dailyMix,
        weeklyTop,
        nextCursor: nextCursor < mixed.length ? String(nextCursor) : null,
        hasMore: nextCursor < mixed.length,
        engineVersion: 'discovery-v4',
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } },
    );
  } catch (error) {
    console.error('recommendations feed error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
