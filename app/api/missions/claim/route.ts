import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { missionId } = body || {};
    if (!missionId) {
      return NextResponse.json({ error: 'missionId requis' }, { status: 400 });
    }

    // Lire mission + progression
    const [{ data: mission, error: mErr }, { data: um, error: uErr }] = await Promise.all([
      supabaseAdmin.from('missions').select('id, reward_booster_id, threshold').eq('id', missionId).single(),
      supabaseAdmin.from('user_missions').select('id, progress, completed_at, claimed').eq('user_id', userId).eq('mission_id', missionId).maybeSingle(),
    ]);
    if (mErr || !mission) {
      return NextResponse.json({ error: 'Mission introuvable' }, { status: 404 });
    }
    if (!um || um.progress < mission.threshold || um.claimed) {
      return NextResponse.json({ error: 'Mission non terminée ou déjà réclamée' }, { status: 400 });
    }

    // Attribuer booster si dispo
    if (mission.reward_booster_id) {
      const { error: invErr } = await supabaseAdmin
        .from('user_boosters')
        .insert({ user_id: userId, booster_id: mission.reward_booster_id, status: 'owned' });
      if (invErr) {
        return NextResponse.json({ error: 'Erreur attribution récompense' }, { status: 500 });
      }
    }

    // Marquer claim
    const { error: updErr } = await supabaseAdmin
      .from('user_missions')
      .update({ claimed: true, completed_at: um.completed_at || new Date().toISOString() })
      .eq('user_id', userId)
      .eq('mission_id', missionId);
    if (updErr) {
      return NextResponse.json({ error: 'Erreur mise à jour claim' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


