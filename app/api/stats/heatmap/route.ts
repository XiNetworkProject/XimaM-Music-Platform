import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

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

    let trackIds = await getUserTrackIds(session.user.id);
    if (trackParam && trackParam !== 'all' && trackIds.includes(trackParam)) {
      trackIds = [trackParam];
    }
    if (trackIds.length === 0) return NextResponse.json({ matrix: empty() });

    const { data: views, error } = await supabaseAdmin
      .from('track_views').select('created_at, track_id').in('track_id', trackIds).gte('created_at', startDate.toISOString());

    if (error) return NextResponse.json({ matrix: empty() });

    const matrix = empty();
    for (const v of views || []) {
      const d = new Date(v.created_at);
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
