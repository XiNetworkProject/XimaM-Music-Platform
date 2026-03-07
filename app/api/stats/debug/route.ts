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

    // 1. Check tracks by creator_id
    try {
      const { data, error, count } = await supabaseAdmin
        .from('tracks')
        .select('id, title, creator_id', { count: 'exact' })
        .eq('creator_id', userId || '__none__')
        .limit(5);
      result.checks.tracks_by_creator_id = { count, error: error?.message || null, sample: (data || []).map((t: any) => ({ id: t.id, title: t.title })) };
    } catch (e: any) { result.checks.tracks_by_creator_id = { error: e.message }; }

    // 2. Check tracks by artist_id (may not exist)
    try {
      const { data, error, count } = await supabaseAdmin
        .from('tracks')
        .select('id, title', { count: 'exact' })
        .eq('artist_id', userId || '__none__')
        .limit(5);
      result.checks.tracks_by_artist_id = { count, error: error?.message || null, sample: (data || []).map((t: any) => ({ id: t.id, title: t.title })) };
    } catch (e: any) { result.checks.tracks_by_artist_id = { error: e.message }; }

    // 3. Check tracks with .or() (the all-tracks way)
    try {
      const { data, error, count } = await supabaseAdmin
        .from('tracks')
        .select('id, title', { count: 'exact' })
        .or(`creator_id.eq.${userId}`)
        .limit(5);
      result.checks.tracks_by_or_creator = { count, error: error?.message || null, sample: (data || []).map((t: any) => ({ id: t.id, title: t.title })) };
    } catch (e: any) { result.checks.tracks_by_or_creator = { error: e.message }; }

    // 4. Check tracks columns
    try {
      const { data, error } = await supabaseAdmin
        .from('tracks')
        .select('*')
        .limit(1);
      result.checks.tracks_columns = { error: error?.message || null, columns: data?.[0] ? Object.keys(data[0]) : [] };
    } catch (e: any) { result.checks.tracks_columns = { error: e.message }; }

    // 5. Check AI tracks
    try {
      const { data, error } = await supabaseAdmin
        .from('ai_tracks')
        .select('id, title, generation:ai_generations!inner(user_id)')
        .eq('generation.user_id', userId || '__none__')
        .limit(5);
      result.checks.ai_tracks = { count: data?.length || 0, error: error?.message || null, sample: (data || []).map((t: any) => ({ id: t.id, title: t.title })) };
    } catch (e: any) { result.checks.ai_tracks = { error: e.message }; }

    // 6. Check track_views for user's tracks
    try {
      const { data: userTracks } = await supabaseAdmin
        .from('tracks')
        .select('id')
        .eq('creator_id', userId || '__none__');
      const ids = (userTracks || []).map((t: any) => t.id);
      if (ids.length > 0) {
        const { count, error } = await supabaseAdmin
          .from('track_views')
          .select('*', { count: 'exact', head: true })
          .in('track_id', ids);
        result.checks.track_views_for_user = { trackCount: ids.length, viewsCount: count, error: error?.message || null };
      } else {
        result.checks.track_views_for_user = { trackCount: 0, viewsCount: 0, note: 'No tracks found' };
      }
    } catch (e: any) { result.checks.track_views_for_user = { error: e.message }; }

    // 7. Check track_views columns
    try {
      const { data, error } = await supabaseAdmin
        .from('track_views')
        .select('*')
        .limit(1);
      result.checks.track_views_columns = { error: error?.message || null, columns: data?.[0] ? Object.keys(data[0]) : [] };
    } catch (e: any) { result.checks.track_views_columns = { error: e.message }; }

    // 8. Check track_events
    try {
      const { count, error } = await supabaseAdmin
        .from('track_events')
        .select('*', { count: 'exact', head: true });
      result.checks.track_events = { total: count, error: error?.message || null };
    } catch (e: any) { result.checks.track_events = { error: e.message }; }

    // 9. Check followers
    try {
      const { count, error } = await supabaseAdmin
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId || '__none__');
      result.checks.user_follows = { count, error: error?.message || null };
    } catch (e: any) {
      result.checks.user_follows = { error: e.message };
      try {
        const { count, error } = await supabaseAdmin
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId || '__none__');
        result.checks.follows_fallback = { count, error: error?.message || null };
      } catch (e2: any) { result.checks.follows_fallback = { error: e2.message }; }
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
