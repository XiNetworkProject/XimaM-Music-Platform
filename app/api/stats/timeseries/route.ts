import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Point = {
  date: string;
  plays: number;
  uniques: number;
  likes: number;
  starts: number;
  completes: number;
  retention: number | null;
  listenMs: number;
  dataQuality: 'real' | 'insufficient';
};

function startFromRange(range: string | null): Date {
  const d = new Date();
  switch (range) {
    case '7d': d.setDate(d.getDate() - 6); break;
    case '30d': d.setDate(d.getDate() - 29); break;
    case '90d': d.setDate(d.getDate() - 89); break;
    default: d.setDate(d.getDate() - 179);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtDate(date: Date): string { return date.toISOString().slice(0, 10); }

function viewDate(row: any): Date | null {
  const raw = row.created_at || row.viewed_at;
  return raw ? new Date(raw) : null;
}

async function getUserTrackIds(userId: string): Promise<string[]> {
  const ids: string[] = [];
  const { data, error } = await supabaseAdmin
    .from('tracks').select('id').or(`creator_id.eq.${userId},user_id.eq.${userId}`);
  if (!error && data) for (const r of data) ids.push(r.id);
  else {
    console.error('timeseries: tracks query failed:', error?.message);
    const { data: fb } = await supabaseAdmin.from('tracks').select('id').eq('creator_id', userId);
    if (fb) for (const r of fb) ids.push(r.id);
  }
  try {
    const { data: aiRows, error: aiErr } = await supabaseAdmin
      .from('ai_tracks')
      .select('id, generation:ai_generations!inner(user_id)')
      .eq('generation.user_id', userId);
    if (!aiErr && aiRows) for (const r of aiRows) ids.push(r.id);
  } catch {}
  return ids;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range');
    const trackParam = searchParams.get('track');
    const userId = session.user.id;
    const startDate = startFromRange(range);
    const startMs = startDate.getTime();

    let trackIds = await getUserTrackIds(userId);
    if (trackParam && trackParam !== 'all' && trackIds.includes(trackParam)) {
      trackIds = [trackParam];
    }
    if (trackIds.length === 0) {
      return NextResponse.json(buildEmptySeries(startDate, new Date()));
    }

    /* ── Fetch ALL views with both date columns ── */
    let viewRows: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('track_views')
        .select('created_at, viewed_at, track_id, user_id')
        .in('track_id', trackIds)
        .limit(100000);
      if (!error && data) {
        viewRows = data;
      } else if (error) {
        console.error('timeseries: views with viewed_at failed, retrying:', error.message);
        const { data: fb } = await supabaseAdmin
          .from('track_views')
          .select('created_at, track_id, user_id')
          .in('track_id', trackIds)
          .limit(100000);
        viewRows = fb || [];
      }
    } catch (e) { console.error('timeseries: views exception:', e); }

    const counts = new Map<string, number>();
    const uniqueSets = new Map<string, Set<string>>();

    for (const row of viewRows) {
      const d = viewDate(row);
      if (!d || d.getTime() < startMs) continue;
      const key = fmtDate(d);
      counts.set(key, (counts.get(key) || 0) + 1);
      if (!uniqueSets.has(key)) uniqueSets.set(key, new Set());
      if (row.user_id) uniqueSets.get(key)!.add(row.user_id);
    }

    const series: Point[] = [];
    const today = new Date();
    const cursor = new Date(startDate);
    while (cursor <= today) {
      const k = fmtDate(cursor);
      series.push({
        date: k,
        plays: counts.get(k) || 0,
        uniques: uniqueSets.get(k)?.size || 0,
        likes: 0,
        starts: 0,
        completes: 0,
        retention: null,
        listenMs: 0,
        dataQuality: 'insufficient',
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    /* ── Likes ── */
    try {
      const { data: likeRows } = await supabaseAdmin
        .from('track_likes')
        .select('created_at')
        .in('track_id', trackIds)
        .gte('created_at', startDate.toISOString())
        .limit(100000);

      if (likeRows) {
        const likeCounts = new Map<string, number>();
        for (const row of likeRows) {
          if (!row.created_at) continue;
          const key = fmtDate(new Date(row.created_at));
          likeCounts.set(key, (likeCounts.get(key) || 0) + 1);
        }
        for (const p of series) p.likes = likeCounts.get(p.date) || 0;
      }
    } catch (e) { console.error('timeseries: likes error:', e); }

    /* ── Playback events: real retention and listening time ── */
    try {
      const { data: eventRows } = await supabaseAdmin
        .from('track_events')
        .select('created_at, event_type, duration_ms')
        .in('track_id', trackIds)
        .in('event_type', ['play_start', 'play_complete'])
        .gte('created_at', startDate.toISOString())
        .limit(100000);

      if (eventRows) {
        const byDate = new Map(series.map((point) => [point.date, point]));
        for (const row of eventRows) {
          if (!row.created_at) continue;
          const key = fmtDate(new Date(row.created_at));
          const point = byDate.get(key);
          if (!point) continue;
          if (row.event_type === 'play_start') point.starts += 1;
          if (row.event_type === 'play_complete') {
            point.completes += 1;
            point.listenMs += Number(row.duration_ms) || 0;
          }
        }
        for (const point of series) {
          if (point.starts > 0) {
            point.retention = Math.round((point.completes / point.starts) * 1000) / 10;
            point.dataQuality = 'real';
          }
        }
      }
    } catch (e) { console.error('timeseries: events error:', e); }

    return NextResponse.json(series);
  } catch (e) {
    console.error('timeseries error:', e);
    return NextResponse.json(buildEmptySeries(startFromRange('30d'), new Date()));
  }
}

function buildEmptySeries(start: Date, end: Date): Point[] {
  const out: Point[] = [];
  const c = new Date(start);
  while (c <= end) {
    out.push({
      date: fmtDate(c),
      plays: 0,
      uniques: 0,
      likes: 0,
      starts: 0,
      completes: 0,
      retention: null,
      listenMs: 0,
      dataQuality: 'insufficient',
    });
    c.setDate(c.getDate() + 1);
  }
  return out;
}
