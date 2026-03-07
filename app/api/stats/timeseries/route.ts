import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

type Point = { date: string; plays: number; uniques?: number; likes?: number };

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

async function getUserTrackIds(userId: string): Promise<string[]> {
  const ids: string[] = [];

  const { data, error } = await supabaseAdmin
    .from('tracks').select('id').or(`creator_id.eq.${userId},user_id.eq.${userId}`);
  if (!error && data) {
    for (const r of data) ids.push(r.id);
  } else {
    console.error('timeseries: tracks or query failed:', error?.message);
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range');
    const trackParam = searchParams.get('track');
    const userId = session.user.id;
    const startDate = startFromRange(range);

    let trackIds = await getUserTrackIds(userId);

    if (trackParam && trackParam !== 'all' && trackIds.includes(trackParam)) {
      trackIds = [trackParam];
    }

    if (trackIds.length === 0) {
      return NextResponse.json(buildEmptySeries(startDate, new Date()));
    }

    const { data: viewRows, error: viewsErr } = await supabaseAdmin
      .from('track_views')
      .select('created_at, track_id, user_id')
      .in('track_id', trackIds)
      .gte('created_at', startDate.toISOString());

    if (viewsErr) {
      console.error('timeseries track_views error:', viewsErr.message);
      return NextResponse.json(buildEmptySeries(startDate, new Date()));
    }

    const counts = new Map<string, number>();
    const uniqueSets = new Map<string, Set<string>>();
    for (const row of viewRows || []) {
      const d = new Date(row.created_at);
      d.setHours(0, 0, 0, 0);
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
      series.push({ date: k, plays: counts.get(k) || 0, uniques: uniqueSets.get(k)?.size || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    try {
      const { data: likeRows } = await supabaseAdmin
        .from('track_likes').select('created_at, track_id').in('track_id', trackIds).gte('created_at', startDate.toISOString());
      const likeCounts = new Map<string, number>();
      for (const row of likeRows || []) {
        const d = new Date(row.created_at);
        d.setHours(0, 0, 0, 0);
        likeCounts.set(fmtDate(d), (likeCounts.get(fmtDate(d)) || 0) + 1);
      }
      for (const p of series) p.likes = likeCounts.get(p.date) || 0;
    } catch {}

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
    out.push({ date: fmtDate(c), plays: 0, uniques: 0, likes: 0 });
    c.setDate(c.getDate() + 1);
  }
  return out;
}
