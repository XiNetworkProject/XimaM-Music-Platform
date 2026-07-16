import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getApiSession } from '@/lib/getApiSession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function viewDate(row: any): Date | null {
  const raw = row.created_at || row.viewed_at;
  return raw ? new Date(raw) : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get('track_id');
    if (!trackId) {
      return NextResponse.json({ error: 'track_id requis' }, { status: 400 });
    }

    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const userId = session.user.id;
    const normalOwner = await supabaseAdmin
      .from('tracks')
      .select('id')
      .eq('id', trackId)
      .or(`creator_id.eq.${userId},user_id.eq.${userId}`)
      .maybeSingle();
    if (normalOwner.error) throw normalOwner.error;

    let ownsTrack = Boolean(normalOwner.data);
    if (!ownsTrack && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trackId)) {
      const aiOwner = await supabaseAdmin
        .from('ai_tracks')
        .select('id, generation:ai_generations!inner(user_id)')
        .eq('id', trackId)
        .eq('generation.user_id', userId)
        .maybeSingle();
      if (aiOwner.error) throw aiOwner.error;
      ownsTrack = Boolean(aiOwner.data);
    }
    if (!ownsTrack) {
      return NextResponse.json({ error: 'Morceau introuvable' }, { status: 404 });
    }

    const sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sinceMs = sinceDate.getTime();
    const sinceIso = sinceDate.toISOString();

    /* ── Fetch views with both date columns ── */
    let viewRows: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('track_views')
        .select('created_at, viewed_at, user_id')
        .eq('track_id', trackId)
        .limit(50000);
      if (!error && data) viewRows = data;
      else if (error) {
        const { data: fb } = await supabaseAdmin
          .from('track_views')
          .select('created_at, user_id')
          .eq('track_id', trackId)
          .limit(50000);
        viewRows = fb || [];
      }
    } catch {}

    /* ── Likes & Events (use created_at, always set) ── */
    const [likesQ, eventsQ, startsQ, p25Q, p50Q, p75Q, completesQ] = await Promise.all([
      supabaseAdmin.from('track_likes').select('created_at').eq('track_id', trackId).gte('created_at', sinceIso).limit(50000),
      supabaseAdmin.from('track_events').select('created_at, event_type, duration_ms, source').eq('track_id', trackId).gte('created_at', sinceIso).limit(50000),
      supabaseAdmin.from('track_events').select('*', { count: 'exact', head: true }).eq('track_id', trackId).eq('event_type', 'play_start').gte('created_at', sinceIso),
      supabaseAdmin.from('track_events').select('*', { count: 'exact', head: true }).eq('track_id', trackId).eq('event_type', 'play_progress').gte('progress_pct', 25).gte('created_at', sinceIso),
      supabaseAdmin.from('track_events').select('*', { count: 'exact', head: true }).eq('track_id', trackId).eq('event_type', 'play_progress').gte('progress_pct', 50).gte('created_at', sinceIso),
      supabaseAdmin.from('track_events').select('*', { count: 'exact', head: true }).eq('track_id', trackId).eq('event_type', 'play_progress').gte('progress_pct', 75).gte('created_at', sinceIso),
      supabaseAdmin.from('track_events').select('*', { count: 'exact', head: true }).eq('track_id', trackId).eq('event_type', 'play_complete').gte('created_at', sinceIso),
    ]);

    const likeRows = likesQ.data || [];
    const eventRows = eventsQ.data || [];

    const dailyMap = new Map<string, { views: number; plays: number; completes: number; likes: number; total_listen_ms: number; retention_complete_rate: number }>();
    const mkDay = () => ({ views: 0, plays: 0, completes: 0, likes: 0, total_listen_ms: 0, retention_complete_rate: 0 });

    for (const v of viewRows) {
      const d = viewDate(v);
      if (!d || d.getTime() < sinceMs) continue;
      const day = d.toISOString().slice(0, 10);
      if (!dailyMap.has(day)) dailyMap.set(day, mkDay());
      dailyMap.get(day)!.views += 1;
    }

    for (const l of likeRows) {
      if (!l.created_at) continue;
      const day = new Date(l.created_at).toISOString().slice(0, 10);
      if (!dailyMap.has(day)) dailyMap.set(day, mkDay());
      dailyMap.get(day)!.likes += 1;
    }

    const sourcesMap = new Map<string, { plays: number; completes: number }>();

    for (const e of eventRows) {
      if (!e.created_at) continue;
      const day = new Date(e.created_at).toISOString().slice(0, 10);
      if (!dailyMap.has(day)) dailyMap.set(day, mkDay());
      const entry = dailyMap.get(day)!;

      if (e.event_type === 'play_start') {
        entry.plays += 1;
      } else if (e.event_type === 'play_complete') {
        entry.completes += 1;
        entry.total_listen_ms += Number(e.duration_ms) || 0;
      }

      const src = e.source || 'direct';
      if (!sourcesMap.has(src)) sourcesMap.set(src, { plays: 0, completes: 0 });
      if (e.event_type === 'play_start') sourcesMap.get(src)!.plays += 1;
      if (e.event_type === 'play_complete') sourcesMap.get(src)!.completes += 1;
    }

    dailyMap.forEach((entry) => {
      entry.retention_complete_rate = entry.plays > 0 ? Math.round((entry.completes / entry.plays) * 1000) / 10 : 0;
    });

    const daily = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, d]) => ({ day, ...d }));

    const sources = Array.from(sourcesMap.entries())
      .sort(([, a], [, b]) => b.plays - a.plays)
      .map(([source, d]) => ({ source, ...d }));

    const starts = (startsQ.count as number) || 0;
    const safeRate = (num: number, den: number) => den > 0 ? Math.round((num / den) * 1000) / 10 : 0;

    return NextResponse.json({
      daily,
      sources,
      funnel: {
        starts,
        p25Rate: safeRate((p25Q.count as number) || 0, starts),
        p50Rate: safeRate((p50Q.count as number) || 0, starts),
        p75Rate: safeRate((p75Q.count as number) || 0, starts),
        completeRate: safeRate((completesQ.count as number) || 0, starts),
      },
    });
  } catch (error) {
    console.error('Erreur API stats tracks:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
