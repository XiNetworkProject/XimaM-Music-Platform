import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SeriesPoint = { date: string; posts: number; likes: number; comments: number };

function startFromRange(range: string | null): Date {
  const d = new Date();
  switch (range) {
    case '7d':
      d.setDate(d.getDate() - 6);
      break;
    case '30d':
      d.setDate(d.getDate() - 29);
      break;
    case '90d':
      d.setDate(d.getDate() - 89);
      break;
    default:
      d.setDate(d.getDate() - 179);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildEmptySeries(start: Date, end: Date): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    out.push({ date: fmtDate(cursor), posts: 0, likes: 0, comments: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function postTypeLabel(type: string) {
  if (type === 'track_share') return 'Son partagé';
  if (type === 'photo') return 'Photo';
  if (type === 'repost') return 'Repost';
  return 'Texte';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = startFromRange(searchParams.get('range'));
    const startMs = startDate.getTime();
    const userId = session.user.id;

    const { data: posts, error } = await supabaseAdmin
      .from('creator_posts')
      .select('id, post_type, content, image_url, track_id, likes_count, comments_count, is_public, created_at')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('stats posts: posts query failed:', error.message);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const allPosts = posts || [];
    const postIds = allPosts.map((post: any) => post.id).filter(Boolean);
    const periodPosts = allPosts.filter((post: any) => {
      const d = post.created_at ? new Date(post.created_at) : null;
      return d && d.getTime() >= startMs;
    });

    const likesByPost = new Map<string, number>();
    const commentsByPost = new Map<string, number>();
    const periodLikesByDate = new Map<string, number>();
    const periodCommentsByDate = new Map<string, number>();

    if (postIds.length) {
      try {
        const { data: likeRows } = await supabaseAdmin
          .from('post_likes')
          .select('post_id, created_at')
          .in('post_id', postIds)
          .limit(100000);

        for (const row of likeRows || []) {
          likesByPost.set(row.post_id, (likesByPost.get(row.post_id) || 0) + 1);
          const d = row.created_at ? new Date(row.created_at) : null;
          if (d && d.getTime() >= startMs) {
            const key = fmtDate(d);
            periodLikesByDate.set(key, (periodLikesByDate.get(key) || 0) + 1);
          }
        }
      } catch (e) {
        console.error('stats posts: likes query failed:', e);
      }

      try {
        const { data: commentRows } = await supabaseAdmin
          .from('post_comments')
          .select('post_id, created_at')
          .in('post_id', postIds)
          .limit(100000);

        for (const row of commentRows || []) {
          commentsByPost.set(row.post_id, (commentsByPost.get(row.post_id) || 0) + 1);
          const d = row.created_at ? new Date(row.created_at) : null;
          if (d && d.getTime() >= startMs) {
            const key = fmtDate(d);
            periodCommentsByDate.set(key, (periodCommentsByDate.get(key) || 0) + 1);
          }
        }
      } catch (e) {
        console.error('stats posts: comments query failed:', e);
      }
    }

    const trackIds = Array.from(new Set(allPosts.map((post: any) => post.track_id).filter(Boolean)));
    const trackTitles = new Map<string, string>();
    if (trackIds.length) {
      try {
        const { data: tracks } = await supabaseAdmin.from('tracks').select('id, title').in('id', trackIds);
        for (const track of tracks || []) trackTitles.set(track.id, track.title || 'Son partagé');
      } catch {}
    }

    const series = buildEmptySeries(startDate, new Date());
    const seriesByDate = new Map(series.map((point) => [point.date, point]));

    for (const post of periodPosts) {
      const d = post.created_at ? new Date(post.created_at) : null;
      if (!d) continue;
      const point = seriesByDate.get(fmtDate(d));
      if (point) point.posts += 1;
    }
    periodLikesByDate.forEach((count, date) => {
      const point = seriesByDate.get(date);
      if (point) point.likes = count;
    });
    periodCommentsByDate.forEach((count, date) => {
      const point = seriesByDate.get(date);
      if (point) point.comments = count;
    });

    const byType: Record<string, number> = {};
    for (const post of allPosts) {
      const label = postTypeLabel(post.post_type);
      byType[label] = (byType[label] || 0) + 1;
    }

    const enrichedPosts = allPosts.map((post: any) => {
      const likes = likesByPost.get(post.id) ?? Number(post.likes_count || 0);
      const comments = commentsByPost.get(post.id) ?? Number(post.comments_count || 0);
      const score = likes * 2 + comments * 3;
      return {
        id: post.id,
        type: post.post_type || 'text',
        typeLabel: postTypeLabel(post.post_type),
        content: post.content || '',
        imageUrl: post.image_url || null,
        trackTitle: post.track_id ? trackTitles.get(post.track_id) || 'Son partagé' : null,
        isPublic: post.is_public !== false,
        createdAt: post.created_at || '',
        likes,
        comments,
        score,
      };
    });

    enrichedPosts.sort((a, b) => b.score - a.score || b.likes - a.likes || b.comments - a.comments);

    const periodLikes = Array.from(periodLikesByDate.values()).reduce((acc, value) => acc + value, 0);
    const periodComments = Array.from(periodCommentsByDate.values()).reduce((acc, value) => acc + value, 0);
    const engagement = periodPosts.length > 0 ? Math.round(((periodLikes + periodComments) / periodPosts.length) * 10) / 10 : 0;

    return NextResponse.json({
      totalPosts: allPosts.length,
      postsInRange: periodPosts.length,
      likes: periodLikes,
      comments: periodComments,
      engagement,
      byType,
      series,
      bestPost: enrichedPosts[0] || null,
      posts: enrichedPosts.slice(0, 12),
    });
  } catch (e) {
    console.error('stats posts error:', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
