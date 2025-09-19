import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

type Point = { date: string; plays: number };

function startFromRange(range: string | null): Date {
  const now = new Date();
  const d = new Date(now);
  switch (range) {
    case '7d':
      d.setDate(d.getDate() - 6);
      break;
    case '30d':
      d.setDate(d.getDate() - 29);
      break;
    case '90d':
      d.setDate(d.getDate() - 89);
      break;
    case 'all':
    default:
      d.setDate(d.getDate() - 179);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
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

    // Récupérer les tracks de l’utilisateur
    // Tenter par creator_id puis fallback artist_id si nécessaire
    let allTrackIds: string[] = [];
    {
      const { data: rows, error } = await supabaseAdmin
        .from('tracks')
        .select('id')
        .eq('creator_id', userId);
      if (!error && rows) {
        allTrackIds = rows.map((r: any) => r.id);
      }
      if ((error || allTrackIds.length === 0)) {
        const { data: rows2, error: err2 } = await supabaseAdmin
          .from('tracks')
          .select('id')
          .eq('artist_id', userId);
        if (!err2 && rows2) {
          allTrackIds = rows2.map((r: any) => r.id);
        }
      }
    }

    // Filtrer sur une piste si demandée et valide
    let trackIds = allTrackIds;
    if (trackParam && trackParam !== 'all' && allTrackIds.includes(trackParam)) {
      trackIds = [trackParam];
    }

    if (trackIds.length === 0) {
      // Pas de données → renvoyer une série vide sur la plage
      const series = buildEmptySeries(startDate, new Date());
      return NextResponse.json(series);
    }

    // Récupérer les vues (écoutes) dans la période
    const { data: viewRows, error: viewsErr } = await supabaseAdmin
      .from('track_views')
      .select('created_at, track_id')
      .in('track_id', trackIds)
      .gte('created_at', startDate.toISOString());
    if (viewsErr) {
      // Table/colonnes possiblement manquantes: renvoyer série vide
      const series = buildEmptySeries(startDate, new Date());
      return NextResponse.json(series);
    }

    // Agréger par jour
    const counts = new Map<string, number>();
    for (const row of viewRows || []) {
      const d = new Date(row.created_at);
      d.setHours(0, 0, 0, 0);
      const key = formatDateISO(d);
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    // Construire série complète avec zéros
    const series: Point[] = [];
    const today = new Date();
    const cursor = new Date(startDate);
    while (cursor <= today) {
      const k = formatDateISO(cursor);
      series.push({ date: k, plays: counts.get(k) || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    return NextResponse.json(series);
  } catch (e) {
    // Défaut sécurisé: série vide
    const start = startFromRange('30d');
    const series = buildEmptySeries(start, new Date());
    return NextResponse.json(series);
  }
}

function buildEmptySeries(start: Date, end: Date): Point[] {
  const out: Point[] = [];
  const c = new Date(start);
  while (c <= end) {
    out.push({ date: formatDateISO(c), plays: 0 });
    c.setDate(c.getDate() + 1);
  }
  return out;
}


