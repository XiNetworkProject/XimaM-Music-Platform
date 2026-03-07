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
  // Use creator_id OR user_id (both columns exist)
  const { data, error } = await supabaseAdmin
    .from('tracks')
    .select('id')
    .or(`creator_id.eq.${userId},user_id.eq.${userId}`);

  if (error) {
    console.error('overview: or query failed, fallback:', error.message);
    const { data: fallback } = await supabaseAdmin
      .from('tracks').select('id').eq('creator_id', userId);
    return (fallback || []).map((r: any) => r.id);
  }

  return (data || []).map((r: any) => r.id);
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
    const periodISO = periodStart.toISOString();
    const prevISO = prevStart.toISOString();

    const normalTrackIds = await getUserNormalTrackIds(userId);

    let aiTrackIds: string[] = [];
    let aiTrackCount = 0;
    try {
      const { data: aiRows, error } = await supabaseAdmin
        .from('ai_tracks')
        .select('id, play_count, like_count, generation:ai_generations!inner(user_id)')
        .eq('generation.user_id', userId);
      if (!error && aiRows) {
        aiTrackIds = aiRows.map((r: any) => r.id);
        aiTrackCount = aiRows.length;
      }
    } catch {}

    const allTrackIds = [...normalTrackIds, ...aiTrackIds];
    const totalTracks = allTrackIds.length;
    const safeIds = allTrackIds.length ? allTrackIds : ['__none__'];

    const [currentViews, prevViews, currentLikes, prevLikes, totalListenEvents] = await Promise.all([
      supabaseAdmin.from('track_views').select('*', { count: 'exact', head: true }).in('track_id', safeIds).gte('created_at', periodISO),
      supabaseAdmin.from('track_views').select('*', { count: 'exact', head: true }).in('track_id', safeIds).gte('created_at', prevISO).lt('created_at', periodISO),
      supabaseAdmin.from('track_likes').select('*', { count: 'exact', head: true }).in('track_id', safeIds).gte('created_at', periodISO),
      supabaseAdmin.from('track_likes').select('*', { count: 'exact', head: true }).in('track_id', safeIds).gte('created_at', prevISO).lt('created_at', periodISO),
      supabaseAdmin.from('track_events').select('duration_ms').in('track_id', safeIds).eq('event_type', 'play_complete').gte('created_at', periodISO),
    ]);

    const curPlays = (currentViews.count as number) || 0;
    const prvPlays = (prevViews.count as number) || 0;
    const curLikes = (currentLikes.count as number) || 0;
    const prvLikes = (prevLikes.count as number) || 0;

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

    let totalListenMs = 0;
    if (totalListenEvents.data) {
      for (const row of totalListenEvents.data) totalListenMs += Number(row.duration_ms) || 0;
    }
    const listenHours = Math.round((totalListenMs / 3600000) * 10) / 10;

    let avgRetention = 0;
    try {
      const [startsQ, completesQ] = await Promise.all([
        supabaseAdmin.from('track_events').select('*', { count: 'exact', head: true }).in('track_id', safeIds).eq('event_type', 'play_start').gte('created_at', periodISO),
        supabaseAdmin.from('track_events').select('*', { count: 'exact', head: true }).in('track_id', safeIds).eq('event_type', 'play_complete').gte('created_at', periodISO),
      ]);
      const starts = (startsQ.count as number) || 0;
      const completes = (completesQ.count as number) || 0;
      if (starts > 0) avgRetention = Math.round((completes / starts) * 1000) / 10;
    } catch {}

    let bestTrack: { id: string; title: string; plays: number } | null = null;
    if (allTrackIds.length) {
      try {
        const { data: viewRows } = await supabaseAdmin
          .from('track_views').select('track_id').in('track_id', allTrackIds).gte('created_at', periodISO);
        if (viewRows?.length) {
          const countMap = new Map<string, number>();
          for (const r of viewRows) countMap.set(r.track_id, (countMap.get(r.track_id) || 0) + 1);
          let topId = ''; let topPlays = 0;
          countMap.forEach((c, id) => { if (c > topPlays) { topId = id; topPlays = c; } });
          if (topId) {
            const { data: tData } = await supabaseAdmin.from('tracks').select('id, title').eq('id', topId).single();
            if (tData) bestTrack = { id: topId, title: tData.title, plays: topPlays };
            else {
              const { data: aiData } = await supabaseAdmin.from('ai_tracks').select('id, title').eq('id', topId).single();
              if (aiData) bestTrack = { id: topId, title: aiData.title, plays: topPlays };
            }
          }
        }
      } catch {}
    }

    let aiPlays = 0, aiLikes = 0;
    if (aiTrackIds.length) {
      try {
        const [aiPlaysQ, aiLikesQ] = await Promise.all([
          supabaseAdmin.from('track_views').select('*', { count: 'exact', head: true }).in('track_id', aiTrackIds).gte('created_at', periodISO),
          supabaseAdmin.from('track_likes').select('*', { count: 'exact', head: true }).in('track_id', aiTrackIds).gte('created_at', periodISO),
        ]);
        aiPlays = (aiPlaysQ.count as number) || 0;
        aiLikes = (aiLikesQ.count as number) || 0;
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
      avgRetention,
      bestTrack,
      ai: { count: aiTrackCount, plays: aiPlays, likes: aiLikes },
    });
  } catch (e) {
    console.error('Erreur API stats overview:', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
