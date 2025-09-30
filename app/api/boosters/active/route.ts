import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('trackIds') || '';
    const trackIds = idsParam.split(',').map((s) => s.trim()).filter(Boolean);

    if (!trackIds.length) {
      return NextResponse.json({ boosts: [] });
    }

    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('active_track_boosts')
      .select('track_id, multiplier, expires_at')
      .in('track_id', trackIds)
      .gt('expires_at', nowIso);

    if (error) {
      return NextResponse.json({ error: 'Erreur récupération boosts' }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];
    // Regrouper par piste: prendre le multiplicateur max et l'expiration la plus tardive
    const byTrack = new Map<string, { track_id: string; multiplier: number; expires_at: string }>();
    for (const r of rows) {
      const id = r.track_id as string;
      const mult = Number((r as any).multiplier) || 1;
      const exp = new Date((r as any).expires_at).getTime();
      if (!byTrack.has(id)) {
        byTrack.set(id, { track_id: id, multiplier: mult, expires_at: (r as any).expires_at });
      } else {
        const curr = byTrack.get(id)!;
        curr.multiplier = Math.max(curr.multiplier, mult);
        const currExp = new Date(curr.expires_at).getTime();
        if (exp > currExp) curr.expires_at = (r as any).expires_at;
        byTrack.set(id, curr);
      }
    }
    const boosts = Array.from(byTrack.values());
    return NextResponse.json({ boosts });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


