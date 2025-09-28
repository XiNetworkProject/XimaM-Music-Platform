 

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get('track_id');
    const window = searchParams.get('window') || '30d'; // 'day' | '30d'

    if (!trackId) {
      return NextResponse.json({ error: 'track_id requis' }, { status: 400 });
    }

    // Daily series
    const { data: daily, error: dailyError } = await supabaseAdmin
      .from('track_stats_daily')
      .select('*')
      .eq('track_id', trackId)
      .order('day', { ascending: true });

    if (dailyError) {
      console.error('Erreur daily:', dailyError);
    }

    // Rolling 30d
    const { data: rolling, error: rollingError } = await supabaseAdmin
      .from('track_stats_rolling_30d')
      .select('*')
      .eq('track_id', trackId)
      .single();

    if (rollingError && rollingError.code !== 'PGRST116') {
      console.error('Erreur rolling 30d:', rollingError);
    }

    // Traffic sources 30d
    const { data: sources, error: sourcesError } = await supabaseAdmin
      .from('track_traffic_sources_30d')
      .select('*')
      .eq('track_id', trackId)
      .order('views', { ascending: false });

    if (sourcesError) {
      console.error('Erreur sources 30d:', sourcesError);
    }

    // Funnel rétention 30j (progress 25/50/75 et completions / starts)
    const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      startsQ,
      p25Q,
      p50Q,
      p75Q,
      completesQ,
    ] = await Promise.all([
      supabaseAdmin
        .from('track_events')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', trackId)
        .eq('event_type', 'play_start')
        .gte('created_at', sinceIso),
      supabaseAdmin
        .from('track_events')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', trackId)
        .eq('event_type', 'play_progress')
        .gte('progress_pct', 25)
        .gte('created_at', sinceIso),
      supabaseAdmin
        .from('track_events')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', trackId)
        .eq('event_type', 'play_progress')
        .gte('progress_pct', 50)
        .gte('created_at', sinceIso),
      supabaseAdmin
        .from('track_events')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', trackId)
        .eq('event_type', 'play_progress')
        .gte('progress_pct', 75)
        .gte('created_at', sinceIso),
      supabaseAdmin
        .from('track_events')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', trackId)
        .eq('event_type', 'play_complete')
        .gte('created_at', sinceIso),
    ]);

    const starts = (startsQ.count as number) || 0;
    const p25 = (p25Q.count as number) || 0;
    const p50 = (p50Q.count as number) || 0;
    const p75 = (p75Q.count as number) || 0;
    const completes = (completesQ.count as number) || 0;

    const safeRate = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

    return NextResponse.json({
      daily: daily || [],
      rolling: rolling || null,
      sources: sources || [],
      funnel: {
        starts,
        p25Rate: safeRate(p25, starts),
        p50Rate: safeRate(p50, starts),
        p75Rate: safeRate(p75, starts),
        completeRate: safeRate(completes, starts),
      },
    });
  } catch (error) {
    console.error('Erreur API stats tracks:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


