import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

// Retourne une matrice 7x24: jours (0=dimanche) x heures (0..23)
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

    // Pistes de l'utilisateur
    let trackIds: string[] = [];
    const { data: rows } = await supabaseAdmin.from('tracks').select('id').eq('creator_id', session.user.id);
    if (rows) trackIds = rows.map((r: any) => r.id);
    if (trackIds.length === 0) {
      const { data: rows2 } = await supabaseAdmin.from('tracks').select('id').eq('artist_id', session.user.id);
      if (rows2) trackIds = rows2.map((r: any) => r.id);
    }
    if (trackParam && trackParam !== 'all' && trackIds.includes(trackParam)) {
      trackIds = [trackParam];
    }
    if (trackIds.length === 0) {
      return NextResponse.json({ matrix: buildEmptyHeatmap() });
    }

    const { data: views } = await supabaseAdmin
      .from('track_views')
      .select('created_at, track_id')
      .in('track_id', trackIds)
      .gte('created_at', startDate.toISOString());

    const matrix = buildEmptyHeatmap();
    for (const v of views || []) {
      const d = new Date(v.created_at);
      const day = d.getDay();
      const hour = d.getHours();
      matrix[day][hour] += 1;
    }

    return NextResponse.json({ matrix });
  } catch {
    return NextResponse.json({ matrix: buildEmptyHeatmap() });
  }
}

function getStartDate(range: string | null) {
  const now = new Date();
  const d = new Date(now);
  if (range === '7d') d.setDate(d.getDate() - 6);
  else if (range === '30d') d.setDate(d.getDate() - 29);
  else if (range === '90d') d.setDate(d.getDate() - 89);
  else d.setDate(d.getDate() - 179);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildEmptyHeatmap(): number[][] {
  return Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
}


