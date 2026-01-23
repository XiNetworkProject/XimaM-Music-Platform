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
      .select(`
        id, key, title, goal_type, threshold, cooldown_hours, reward_booster_id, enabled,
        reward:boosters!missions_reward_booster_id_fkey ( id, key, name, rarity, type, multiplier, duration_hours )
      `)
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
    const nowIso = new Date().toISOString();

    // Cooldown/reset: si mission réclamée et cooldown passé => reset
    for (const m of missions || []) {
      const um = map.get(m.id);
      const cd = Number(m.cooldown_hours || 0);
      if (!um || !cd || cd <= 0) continue;
      if (!um.completed_at) continue;
      if (!um.claimed) continue;
      const hours = Math.abs(new Date(nowIso).getTime() - new Date(um.completed_at).getTime()) / 3_600_000;
      if (hours >= cd) {
        try {
          await supabaseAdmin
            .from('user_missions')
            .update({ progress: 0, completed_at: null, claimed: false, last_progress_at: null })
            .eq('user_id', userId)
            .eq('mission_id', m.id);
          map.set(m.id, { ...um, progress: 0, completed_at: null, claimed: false, last_progress_at: null });
        } catch {}
      }
    }

    const enriched = (missions || []).map(m => {
      const um = map.get(m.id);
      const p = um?.progress || 0;
      const completed = Boolean(um?.completed_at) || p >= Number(m.threshold || 0);
      const claimed = Boolean(um?.claimed);
      const canClaim = completed && !claimed;
      const cd = Number(m.cooldown_hours || 0);
      const resetsAt = (claimed && cd > 0 && um?.completed_at)
        ? new Date(new Date(um.completed_at).getTime() + cd * 3_600_000).toISOString()
        : null;

      return {
        ...m,
        progress: p,
        completed,
        claimed,
        canClaim,
        resetsAt,
      };
    });

    return NextResponse.json({ missions: enriched });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


