import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getUserTrackIds(userId: string): Promise<string[]> {
  const ids: string[] = [];
  const { data, error } = await supabaseAdmin
    .from('tracks').select('id').or(`creator_id.eq.${userId},user_id.eq.${userId}`);
  if (!error && data) for (const r of data) ids.push(r.id);
  else {
    const { data: fb } = await supabaseAdmin.from('tracks').select('id').eq('creator_id', userId);
    if (fb) for (const r of fb) ids.push(r.id);
  }
  try {
    const { data: aiRows, error: aiErr } = await supabaseAdmin
      .from('ai_tracks').select('id, generation:ai_generations!inner(user_id)').eq('generation.user_id', userId);
    if (!aiErr && aiRows) for (const r of aiRows) ids.push(r.id);
  } catch {}
  return ids;
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
    const trackParam = searchParams.get('track');
    const startDate = getStartDate(range);
    const startMs = startDate.getTime();

    let trackIds = await getUserTrackIds(session.user.id);
    if (trackParam && trackParam !== 'all' && trackIds.includes(trackParam)) {
      trackIds = [trackParam];
    }
    if (trackIds.length === 0) return NextResponse.json({ matrix: empty() });

    /* ── Fetch views with both date columns ── */
    let views: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('track_views')
        .select('created_at, viewed_at, track_id')
        .in('track_id', trackIds)
        .limit(100000);
      if (!error && data) views = data;
      else if (error) {
        console.error('heatmap: views with viewed_at failed, retrying:', error.message);
        const { data: fb } = await supabaseAdmin
          .from('track_views')
          .select('created_at, track_id')
          .in('track_id', trackIds)
          .limit(100000);
        views = fb || [];
      }
    } catch (e) { console.error('heatmap: views exception:', e); }

    const matrix = empty();
    for (const v of views) {
      const d = viewDate(v);
      if (!d || d.getTime() < startMs) continue;
      matrix[d.getDay()][d.getHours()] += 1;
    }
    return NextResponse.json({ matrix });
  } catch {
    return NextResponse.json({ matrix: empty() });
  }
}

function getStartDate(range: string | null) {
  const d = new Date();
  if (range === '7d') d.setDate(d.getDate() - 6);
  else if (range === '30d') d.setDate(d.getDate() - 29);
  else if (range === '90d') d.setDate(d.getDate() - 89);
  else d.setDate(d.getDate() - 179);
  d.setHours(0, 0, 0, 0);
  return d;
}

function empty(): number[][] {
  return Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
}
