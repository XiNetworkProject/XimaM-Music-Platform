import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    // Vérifier existence track_views via un select simple
    let hasTrackViews = false;
    let recentViews = 0;
    let sample: any[] = [];
    try {
      const since = new Date();
      since.setDate(since.getDate() - 2);
      const { data, error, count } = await supabaseAdmin
        .from('track_views')
        .select('*', { count: 'exact' })
        .gte('created_at', since.toISOString())
        .limit(5);
      if (!error) {
        hasTrackViews = true;
        recentViews = count || 0;
        sample = data || [];
      }
    } catch {}

    // Récupérer ids de pistes de l'utilisateur
    let trackIds: string[] = [];
    if (userId) {
      try {
        const { data: rows } = await supabaseAdmin
          .from('tracks')
          .select('id')
          .eq('creator_id', userId);
        if (rows) trackIds = rows.map((r: any) => r.id);
        if (trackIds.length === 0) {
          const { data: rows2 } = await supabaseAdmin
            .from('tracks')
            .select('id')
            .eq('artist_id', userId);
          if (rows2) trackIds = rows2.map((r: any) => r.id);
        }
      } catch {}
    }

    return NextResponse.json({
      userId,
      hasTrackViews,
      recentViews,
      sample,
      trackIdsCount: trackIds.length,
      trackIds: trackIds.slice(0, 5),
    });
  } catch (e) {
    return NextResponse.json({ ok: false });
  }
}


