import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer missions actives et progression utilisateur
    const { data: missions, error } = await supabaseAdmin
      .from('missions')
      .select('id, key, title, goal_type, threshold, cooldown_hours, reward_booster_id, enabled')
      .eq('enabled', true);
    if (error) {
      return NextResponse.json({ error: 'Erreur missions' }, { status: 500 });
    }

    const missionIds = (missions || []).map(m => m.id);
    let progress: any[] = [];
    if (missionIds.length) {
      const { data: p, error: pErr } = await supabaseAdmin
        .from('user_missions')
        .select('mission_id, progress, completed_at, claimed')
        .eq('user_id', userId)
        .in('mission_id', missionIds);
      if (!pErr && Array.isArray(p)) progress = p;
    }

    const map = new Map(progress.map(r => [r.mission_id, r]));
    const enriched = (missions || []).map(m => ({
      ...m,
      progress: map.get(m.id)?.progress || 0,
      completed: Boolean(map.get(m.id)?.completed_at),
      claimed: Boolean(map.get(m.id)?.claimed)
    }));

    return NextResponse.json({ missions: enriched });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


