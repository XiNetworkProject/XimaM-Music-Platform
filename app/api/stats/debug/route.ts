import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    const result: Record<string, any> = { userId, checks: {} };

    // 1. Tracks by creator_id
    try {
      const { data, error, count } = await supabaseAdmin
        .from('tracks').select('id, title, creator_id, duration', { count: 'exact' })
        .eq('creator_id', userId || '__none__').limit(5);
      result.checks.tracks_by_creator_id = { count, error: error?.message || null, sample: (data || []).map((t: any) => ({ id: t.id, title: t.title, duration: t.duration })) };
    } catch (e: any) { result.checks.tracks_by_creator_id = { error: e.message }; }

    // 2. Tracks by user_id
    try {
      const { data, error, count } = await supabaseAdmin
        .from('tracks').select('id, title, duration', { count: 'exact' })
        .eq('user_id', userId || '__none__').limit(5);
      result.checks.tracks_by_user_id = { count, error: error?.message || null, sample: (data || []).map((t: any) => ({ id: t.id, title: t.title, duration: t.duration })) };
    } catch (e: any) { result.checks.tracks_by_user_id = { error: e.message }; }

    // 3. Tracks with OR query
    try {
      const { data, error, count } = await supabaseAdmin
        .from('tracks').select('id, title', { count: 'exact' })
        .or(`creator_id.eq.${userId},user_id.eq.${userId}`).limit(5);
      result.checks.tracks_by_or = { count, error: error?.message || null, sample: (data || []).map((t: any) => ({ id: t.id, title: t.title })) };
    } catch (e: any) { result.checks.tracks_by_or = { error: e.message }; }

    // 4. Track_views columns
    try {
      const { data, error } = await supabaseAdmin.from('track_views').select('*').limit(1);
      result.checks.track_views_columns = {
        error: error?.message || null,
        columns: data?.[0] ? Object.keys(data[0]) : [],
        hasViewedAt: data?.[0] ? 'viewed_at' in data[0] : false,
        hasCreatedAt: data?.[0] ? 'created_at' in data[0] : false,
        sampleDates: data?.[0] ? { created_at: data[0].created_at, viewed_at: (data[0] as any).viewed_at } : null,
      };
    } catch (e: any) { result.checks.track_views_columns = { error: e.message }; }

    // 5. AI tracks
    try {
      const { data, error } = await supabaseAdmin
        .from('ai_tracks').select('id, title, duration, generation:ai_generations!inner(user_id)')
        .eq('generation.user_id', userId || '__none__').limit(5);
      result.checks.ai_tracks = { count: data?.length || 0, error: error?.message || null, sample: (data || []).map((t: any) => ({ id: t.id, title: t.title, duration: t.duration })) };
    } catch (e: any) { result.checks.ai_tracks = { error: e.message }; }

    // 6. Track views count for user's tracks
    try {
      const { data: userTracks } = await supabaseAdmin
        .from('tracks').select('id').or(`creator_id.eq.${userId},user_id.eq.${userId}`);
      const ids = (userTracks || []).map((t: any) => t.id);
      if (ids.length > 0) {
        const { count, error } = await supabaseAdmin
          .from('track_views').select('*', { count: 'exact', head: true }).in('track_id', ids);
        result.checks.track_views_for_user = { trackCount: ids.length, viewsCount: count, error: error?.message || null };
      } else {
        result.checks.track_views_for_user = { trackCount: 0, viewsCount: 0 };
      }
    } catch (e: any) { result.checks.track_views_for_user = { error: e.message }; }

    // 7. Track events summary
    try {
      const { data: userTracks } = await supabaseAdmin
        .from('tracks').select('id').or(`creator_id.eq.${userId},user_id.eq.${userId}`);
      const ids = (userTracks || []).map((t: any) => t.id);

      const { data: aiRows } = await supabaseAdmin
        .from('ai_tracks').select('id, generation:ai_generations!inner(user_id)')
        .eq('generation.user_id', userId || '__none__');
      if (aiRows) for (const r of aiRows) ids.push(r.id);

      if (ids.length > 0) {
        const eventTypes = ['play_start', 'play_complete', 'play_progress', 'view', 'like', 'share'];
        const counts: Record<string, number> = {};
        for (const et of eventTypes) {
          const { count } = await supabaseAdmin
            .from('track_events').select('*', { count: 'exact', head: true })
            .in('track_id', ids).eq('event_type', et);
          counts[et] = (count as number) || 0;
        }
        result.checks.track_events = { trackCount: ids.length, byType: counts };

        const { data: sampleEvents } = await supabaseAdmin
          .from('track_events').select('event_type, duration_ms, position_ms, created_at')
          .in('track_id', ids).limit(5);
        result.checks.track_events_sample = sampleEvents;
      } else {
        result.checks.track_events = { trackCount: 0, byType: {} };
      }
    } catch (e: any) { result.checks.track_events = { error: e.message }; }

    // 8. Followers
    try {
      const { count, error } = await supabaseAdmin
        .from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId || '__none__');
      result.checks.user_follows = { count, error: error?.message || null };
    } catch (e: any) {
      result.checks.user_follows = { error: e.message };
      try {
        const { count, error } = await supabaseAdmin
          .from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId || '__none__');
        result.checks.follows_fallback = { count, error: error?.message || null };
      } catch (e2: any) { result.checks.follows_fallback = { error: e2.message }; }
    }

    // 9. Track_likes count
    try {
      const { data: userTracks } = await supabaseAdmin
        .from('tracks').select('id').or(`creator_id.eq.${userId},user_id.eq.${userId}`);
      const ids = (userTracks || []).map((t: any) => t.id);
      if (ids.length > 0) {
        const { count } = await supabaseAdmin
          .from('track_likes').select('*', { count: 'exact', head: true }).in('track_id', ids);
        result.checks.track_likes_for_user = { trackCount: ids.length, likesCount: count };
      }
    } catch (e: any) { result.checks.track_likes_for_user = { error: e.message }; }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
