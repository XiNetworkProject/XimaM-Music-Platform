import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getUserNormalTracks(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('tracks')
    .select('id, title, cover_url, duration, created_at, plays, likes')
    .or(`creator_id.eq.${userId},user_id.eq.${userId}`);
  if (error) {
    console.error('all-tracks: or query failed, fallback:', error.message);
    const { data: fb } = await supabaseAdmin
      .from('tracks')
      .select('id, title, cover_url, duration, created_at, plays, likes')
      .eq('creator_id', userId);
    return fb || [];
  }
  return data || [];
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

    const userId = session.user.id;
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysMs = sevenDaysAgo.getTime();

    const normalTracks = await getUserNormalTracks(userId);

    let aiTracks: any[] = [];
    try {
      const { data: aiRows, error } = await supabaseAdmin
        .from('ai_tracks')
        .select('id, title, image_url, duration, created_at, play_count, like_count, prompt, model_name, tags, generation:ai_generations!inner(user_id)')
        .eq('generation.user_id', userId);
      if (!error && aiRows) aiTracks = aiRows;
    } catch {}

    const normalIds = normalTracks.map((t: any) => t.id);
    const aiIds = aiTracks.map((t: any) => t.id);
    const allIds = [...normalIds, ...aiIds];

    const trend7d = new Map<string, number>();
    const viewCounts = new Map<string, number>();
    const likeCounts = new Map<string, number>();
    const retentionMap = new Map<string, number>();

    if (allIds.length) {
      /* ── Fetch ALL views with both date columns ── */
      let allViewRows: any[] = [];
      try {
        const { data, error } = await supabaseAdmin
          .from('track_views')
          .select('track_id, created_at, viewed_at')
          .in('track_id', allIds)
          .limit(100000);
        if (!error && data) allViewRows = data;
        else if (error) {
          const { data: fb } = await supabaseAdmin
            .from('track_views')
            .select('track_id, created_at')
            .in('track_id', allIds)
            .limit(100000);
          allViewRows = fb || [];
        }
      } catch {}

      for (const v of allViewRows) {
        viewCounts.set(v.track_id, (viewCounts.get(v.track_id) || 0) + 1);
        const d = viewDate(v);
        if (d && d.getTime() >= sevenDaysMs) {
          trend7d.set(v.track_id, (trend7d.get(v.track_id) || 0) + 1);
        }
      }

      /* ── Likes ── */
      try {
        const { data: allLikesQ } = await supabaseAdmin
          .from('track_likes')
          .select('track_id')
          .in('track_id', allIds)
          .limit(100000);
        if (allLikesQ) {
          for (const v of allLikesQ) likeCounts.set(v.track_id, (likeCounts.get(v.track_id) || 0) + 1);
        }
      } catch {}

      /* ── Retention from events ── */
      try {
        const { data: eventsQ } = await supabaseAdmin
          .from('track_events')
          .select('track_id, event_type')
          .in('track_id', allIds)
          .in('event_type', ['play_start', 'play_complete'])
          .limit(100000);
        if (eventsQ) {
          const starts = new Map<string, number>();
          const completes = new Map<string, number>();
          for (const e of eventsQ) {
            if (e.event_type === 'play_start') starts.set(e.track_id, (starts.get(e.track_id) || 0) + 1);
            else completes.set(e.track_id, (completes.get(e.track_id) || 0) + 1);
          }
          starts.forEach((s, id) => {
            retentionMap.set(id, s > 0 ? Math.round(((completes.get(id) || 0) / s) * 1000) / 10 : 0);
          });
        }
      } catch {}
    }

    type UnifiedTrack = {
      id: string; title: string; coverUrl: string; duration: number;
      createdAt: string; plays: number; likes: number;
      isAI: boolean; isRemix: boolean; retention: number; trend7d: number;
    };

    const unified: UnifiedTrack[] = [];

    for (const t of normalTracks) {
      unified.push({
        id: t.id,
        title: t.title || 'Sans titre',
        coverUrl: t.cover_url || '/default-cover.svg',
        duration: t.duration || 0,
        createdAt: t.created_at || '',
        plays: viewCounts.get(t.id) || t.plays || 0,
        likes: likeCounts.get(t.id) || t.likes || 0,
        isAI: false,
        isRemix: false,
        retention: retentionMap.get(t.id) || 0,
        trend7d: trend7d.get(t.id) || 0,
      });
    }

    for (const t of aiTracks) {
      const isRemix = (t.tags || []).some((tag: string) =>
        ['remix', 'mashup', 'cover'].includes(tag?.toLowerCase?.() || '')
      ) || (t.prompt || '').toLowerCase().includes('remix');
      unified.push({
        id: t.id,
        title: t.title || 'Sans titre',
        coverUrl: t.image_url || '/default-cover.svg',
        duration: t.duration || 0,
        createdAt: t.created_at || '',
        plays: viewCounts.get(t.id) || t.play_count || 0,
        likes: likeCounts.get(t.id) || t.like_count || 0,
        isAI: true,
        isRemix,
        retention: retentionMap.get(t.id) || 0,
        trend7d: trend7d.get(t.id) || 0,
      });
    }

    unified.sort((a, b) => b.plays - a.plays);

    return NextResponse.json({ tracks: unified, debug: { normalCount: normalTracks.length, aiCount: aiTracks.length } });
  } catch (e) {
    console.error('Erreur API stats all-tracks:', e);
    return NextResponse.json({ error: 'Erreur interne', tracks: [] }, { status: 500 });
  }
}
