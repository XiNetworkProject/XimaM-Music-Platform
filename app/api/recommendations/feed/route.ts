import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { computeRankingScore } from '@/lib/ranking';
import { supabaseAdmin } from '@/lib/supabase';
import {
  buildAnonymousRecommendationSignals,
  buildUserRecommendationSignals,
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

function formatTrack(track: any, rankingScore: number): RecommendedTrack {
  const profile = profileOf(track);
  return {
    _id: String(track.id),
    title: track.title,
    artist: {
      _id: track.creator_id,
      username: profile?.username,
      name: profile?.name,
      avatar: profile?.avatar,
      isArtist: profile?.is_artist,
      artistName: profile?.artist_name,
    },
    duration: track.duration || 0,
    coverUrl: track.cover_url,
    coverVideoUrl: track.cover_video_url || track.data?.cover_video_url || null,
    coverVideoPosterUrl: track.cover_video_poster_url || track.data?.cover_video_poster_url || null,
    audioUrl: track.audio_url,
    album: track.album || null,
    genre: track.genre || [],
    lyrics: track.lyrics || null,
    likes: [],
    plays: track.plays || 0,
    createdAt: track.created_at,
    isFeatured: false,
    isVerified: Boolean(profile?.is_verified),
    rankingScore,
    isAI: false,
    isLiked: false,
  };
}

async function loadTrackCandidates(limit: number) {
  const now = Date.now();
  const { data: statsRows } = await supabaseAdmin.from('track_stats_rolling_30d').select('*').limit(500);
  const stats = (statsRows || []).filter((row: any) => !row.is_ai_track);
  const statIds = stats.map((row: any) => row.track_id).filter(Boolean);
  const statsMap = new Map(stats.map((row: any) => [String(row.track_id), row]));

  const trackIds = Array.from(new Set(statIds)).slice(0, Math.max(120, limit * 8));
  let rankedTracks: RecommendedTrack[] = [];

  if (trackIds.length) {
    const { data: tracks } = await supabaseAdmin
      .from('tracks')
      .select(`
        *,
        profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name, is_verified )
      `)
      .in('id', trackIds)
      .eq('is_public', true)
      .not('audio_url', 'is', null);

    rankedTracks = (tracks || []).map((track: any) => {
      const row = statsMap.get(String(track.id));
      const age = track.created_at ? Math.max(1, (now - new Date(track.created_at).getTime()) / 3_600_000) : 24;
      const score = computeRankingScore({
        plays_30d: row?.plays_30d || 0,
        completes_30d: row?.completes_30d || 0,
        likes_30d: row?.likes_30d || 0,
        shares_30d: row?.shares_30d || 0,
        favorites_30d: row?.favorites_30d || 0,
        listen_ms_30d: row?.listen_ms_30d || 0,
        unique_listeners_30d: row?.unique_listeners_30d || 0,
        retention_complete_rate_30d: row?.retention_complete_rate_30d || 0,
      }, age, 0);
      return formatTrack(track, score);
    });
  }

  const existingIds = new Set(rankedTracks.map((track) => String(track._id)));
  const { data: freshTracks } = await supabaseAdmin
    .from('tracks')
    .select(`
      *,
      profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name, is_verified )
    `)
    .eq('is_public', true)
    .not('audio_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(Math.max(80, limit * 6));

  const freshFormatted = (freshTracks || [])
    .filter((track: any) => !existingIds.has(String(track.id)))
    .map((track: any, index: number) => {
      const age = track.created_at ? Math.max(1, (now - new Date(track.created_at).getTime()) / 3_600_000) : 24;
      return { ...formatTrack(track, 12 * Math.exp(-age * Math.LN2 / 72) - index * 0.01), isFresh: true };
    });

  return [...rankedTracks, ...freshFormatted];
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
    const { data: tracks } = await supabaseAdmin
      .from('tracks')
      .select('*, profiles:profiles!tracks_creator_id_fkey ( username, name )')
      .in('id', Array.from(new Set(trackIds)));
    for (const track of tracks || []) {
      const profile = profileOf(track);
      trackMap.set(String(track.id), {
        id: track.id,
        title: track.title,
        creator_id: track.creator_id,
        artist_name: profile?.name || profile?.username || 'Artiste',
        cover_url: track.cover_url,
        coverVideoUrl: track.cover_video_url || track.data?.cover_video_url || null,
        cover_video_url: track.cover_video_url || track.data?.cover_video_url || null,
        coverVideoPosterUrl: track.cover_video_poster_url || track.data?.cover_video_poster_url || null,
        cover_video_poster_url: track.cover_video_poster_url || track.data?.cover_video_poster_url || null,
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
    const session = await getServerSession(authOptions).catch(() => null);
    const userId = (session?.user as any)?.id || searchParams.get('userId') || null;

    const [trackCandidates, postCandidates] = await Promise.all([
      loadTrackCandidates(limit),
      loadPostCandidates(limit, userId),
    ]);

    const signals = userId
      ? await buildUserRecommendationSignals({ supabase: supabaseAdmin, userId, candidateTracks: trackCandidates })
      : buildAnonymousRecommendationSignals();

    const tracks = rerankTracks(trackCandidates, signals, { strategy: 'reco', debug, maxConsecutiveArtists: 2 });
    const posts = rerankPosts(postCandidates, signals, { debug });
    const dailyMix = tracks.slice(0, 12);
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
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } },
    );
  } catch (error) {
    console.error('recommendations feed error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

