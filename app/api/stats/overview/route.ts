import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function rangeDays(range: string | null): number {
  switch (range) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case 'all': return 365;
    default: return 30;
  }
}

async function getUserNormalTrackIds(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('tracks')
    .select('id')
    .or(`creator_id.eq.${userId},user_id.eq.${userId}`);
  if (error) {
    console.error('overview: or query failed, fallback:', error.message);
    const { data: fb } = await supabaseAdmin.from('tracks').select('id').eq('creator_id', userId);
    return (fb || []).map((r: any) => r.id);
  }
  return (data || []).map((r: any) => r.id);
}

function viewDate(row: any): Date | null {
  const raw = row.created_at || row.viewed_at;
  return raw ? new Date(raw) : null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range');
    const userId = session.user.id;
    const days = rangeDays(range);

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - days);
    periodStart.setHours(0, 0, 0, 0);
    const prevStart = new Date(periodStart);
    prevStart.setDate(prevStart.getDate() - days);

    const periodMs = periodStart.getTime();
    const prevMs = prevStart.getTime();
    const periodISO = periodStart.toISOString();

    const normalTrackIds = await getUserNormalTrackIds(userId);

    let aiTrackIds: string[] = [];
    let aiTrackCount = 0;
    try {
      const { data: aiRows, error } = await supabaseAdmin
        .from('ai_tracks')
        .select('id, duration, play_count, like_count, generation:ai_generations!inner(user_id)')
        .eq('generation.user_id', userId);
      if (!error && aiRows) {
        aiTrackIds = aiRows.map((r: any) => r.id);
        aiTrackCount = aiRows.length;
      }
    } catch {}

    const allTrackIds = [...normalTrackIds, ...aiTrackIds];
    const totalTracks = allTrackIds.length;
    if (totalTracks === 0) {
      return NextResponse.json({
        plays: 0, playsVariation: 0, likes: 0, likesVariation: 0,
        followers: 0, totalTracks: 0, normalTracks: 0, aiTracks: 0,
        listenHours: 0, listenHoursEstimated: false,
        avgRetention: 0, avgRetentionEstimated: false,
        bestTrack: null,
        ai: { count: 0, plays: 0, likes: 0 },
      });
    }

    /* ── 1. Fetch ALL views for user's tracks (handles both created_at & viewed_at) ── */
    let allViews: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('track_views')
        .select('track_id, user_id, created_at, viewed_at')
        .in('track_id', allTrackIds)
        .limit(100000);
      if (!error && data) allViews = data;
      else if (error) {
        console.error('overview: views query with viewed_at failed, retrying:', error.message);
        const { data: fb } = await supabaseAdmin
          .from('track_views')
          .select('track_id, user_id, created_at')
          .in('track_id', allTrackIds)
          .limit(100000);
        allViews = fb || [];
      }
    } catch (e) { console.error('overview: views fetch exception:', e); }

    let curPlays = 0, prvPlays = 0;
    const curViewsByTrack = new Map<string, number>();
    for (const v of allViews) {
      const d = viewDate(v);
      if (!d) continue;
      const ts = d.getTime();
      if (ts >= periodMs) {
        curPlays++;
        curViewsByTrack.set(v.track_id, (curViewsByTrack.get(v.track_id) || 0) + 1);
      } else if (ts >= prevMs) {
        prvPlays++;
      }
    }

    /* ── 2. Likes (track_likes always has created_at) ── */
    const [currentLikesQ, prevLikesQ] = await Promise.all([
      supabaseAdmin.from('track_likes').select('*', { count: 'exact', head: true })
        .in('track_id', allTrackIds).gte('created_at', periodISO),
      supabaseAdmin.from('track_likes').select('*', { count: 'exact', head: true })
        .in('track_id', allTrackIds).gte('created_at', prevStart.toISOString()).lt('created_at', periodISO),
    ]);
    const curLikes = (currentLikesQ.count as number) || 0;
    const prvLikes = (prevLikesQ.count as number) || 0;

    /* ── 3. Events for listen hours & retention ── */
    const [completeEventsQ, startsCountQ, completesCountQ] = await Promise.all([
      supabaseAdmin.from('track_events')
        .select('duration_ms, track_id')
        .in('track_id', allTrackIds)
        .eq('event_type', 'play_complete')
        .gte('created_at', periodISO)
        .limit(50000),
      supabaseAdmin.from('track_events')
        .select('*', { count: 'exact', head: true })
        .in('track_id', allTrackIds)
        .eq('event_type', 'play_start')
        .gte('created_at', periodISO),
      supabaseAdmin.from('track_events')
        .select('*', { count: 'exact', head: true })
        .in('track_id', allTrackIds)
        .eq('event_type', 'play_complete')
        .gte('created_at', periodISO),
    ]);

    let totalListenMs = 0;
    let listenHoursEstimated = false;
    if (completeEventsQ.data) {
      for (const row of completeEventsQ.data) totalListenMs += Number(row.duration_ms) || 0;
    }

    if (totalListenMs === 0 && curPlays > 0) {
      listenHoursEstimated = true;
      let avgDurationSec = 180;
      try {
        const durations: number[] = [];
        if (normalTrackIds.length) {
          const { data: nt } = await supabaseAdmin.from('tracks').select('duration').in('id', normalTrackIds);
          if (nt) for (const t of nt) { const d = Number(t.duration); if (d > 0) durations.push(d); }
        }
        if (aiTrackIds.length) {
          const { data: at } = await supabaseAdmin.from('ai_tracks').select('duration').in('id', aiTrackIds);
          if (at) for (const t of at) { const d = Number(t.duration); if (d > 0) durations.push(d); }
        }
        if (durations.length > 0) avgDurationSec = durations.reduce((a, b) => a + b, 0) / durations.length;
      } catch {}
      totalListenMs = curPlays * avgDurationSec * 1000 * 0.65;
    }
    const listenHours = Math.round((totalListenMs / 3600000) * 10) / 10;

    const starts = (startsCountQ.count as number) || 0;
    const completes = (completesCountQ.count as number) || 0;
    let avgRetention = 0;
    let avgRetentionEstimated = false;
    if (starts > 0) {
      avgRetention = Math.round((completes / starts) * 1000) / 10;
    } else if (curPlays > 0) {
      avgRetentionEstimated = true;
      avgRetention = 65;
    }

    /* ── 4. Followers ── */
    let followers = 0;
    try {
      const { count, error } = await supabaseAdmin
        .from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId);
      if (!error) followers = (count as number) || 0;
      else {
        const { count: c2 } = await supabaseAdmin
          .from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId);
        followers = (c2 as number) || 0;
      }
    } catch {}

    /* ── 5. Best track ── */
    let bestTrack: { id: string; title: string; plays: number } | null = null;
    if (curViewsByTrack.size > 0) {
      let topId = '', topPlays = 0;
      curViewsByTrack.forEach((c, id) => { if (c > topPlays) { topId = id; topPlays = c; } });
      if (topId) {
        const { data: tData } = await supabaseAdmin.from('tracks').select('id, title').eq('id', topId).single();
        if (tData) bestTrack = { id: topId, title: tData.title, plays: topPlays };
        else {
          const { data: aiData } = await supabaseAdmin.from('ai_tracks').select('id, title').eq('id', topId).single();
          if (aiData) bestTrack = { id: topId, title: aiData.title, plays: topPlays };
        }
      }
    }

    /* ── 6. AI stats ── */
    let aiPlays = 0, aiLikes = 0;
    if (aiTrackIds.length) {
      for (const v of allViews) {
        if (aiTrackIds.includes(v.track_id)) {
          const d = viewDate(v);
          if (d && d.getTime() >= periodMs) aiPlays++;
        }
      }
      try {
        const { count } = await supabaseAdmin.from('track_likes')
          .select('*', { count: 'exact', head: true })
          .in('track_id', aiTrackIds).gte('created_at', periodISO);
        aiLikes = (count as number) || 0;
      } catch {}
    }

    const variation = (cur: number, prev: number) => {
      if (prev === 0) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 1000) / 10;
    };

    return NextResponse.json({
      plays: curPlays,
      playsVariation: variation(curPlays, prvPlays),
      likes: curLikes,
      likesVariation: variation(curLikes, prvLikes),
      followers,
      totalTracks,
      normalTracks: normalTrackIds.length,
      aiTracks: aiTrackCount,
      listenHours,
      listenHoursEstimated,
      avgRetention,
      avgRetentionEstimated,
      bestTrack,
      ai: { count: aiTrackCount, plays: aiPlays, likes: aiLikes },
    });
  } catch (e) {
    console.error('Erreur API stats overview:', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
