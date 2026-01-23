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
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body: any = await request.json().catch(() => ({}));
    const missionIds: string[] = Array.isArray(body?.missionIds)
      ? body.missionIds.map((x: any) => String(x || '').trim()).filter(Boolean)
      : [];
    const ids: string[] = Array.from(new Set<string>(missionIds)).slice(0, 20);
    if (!ids.length) return NextResponse.json({ error: 'missionIds requis' }, { status: 400 });

    const claimed: Array<{ missionId: string; rewardInventoryId?: string | null }> = [];
    const errors: Array<{ missionId: string; error: string }> = [];

    for (const missionId of ids) {
      try {
        const [{ data: mission, error: mErr }, { data: um, error: uErr }] = await Promise.all([
          supabaseAdmin
            .from('missions')
            .select('id, reward_booster_id, threshold, cooldown_hours')
            .eq('id', missionId)
            .single(),
          supabaseAdmin
            .from('user_missions')
            .select('id, progress, completed_at, claimed')
            .eq('user_id', userId)
            .eq('mission_id', missionId)
            .maybeSingle(),
        ]);

        if (mErr || !mission) {
          errors.push({ missionId, error: 'Mission introuvable' });
          continue;
        }

        // Reset si déjà réclamée et cooldown passé
        if (um?.claimed && um?.completed_at && Number(mission.cooldown_hours || 0) > 0) {
          const cdMs = Number(mission.cooldown_hours || 0) * 3_600_000;
          const elapsed = Date.now() - new Date(um.completed_at).getTime();
          if (elapsed >= cdMs) {
            await supabaseAdmin
              .from('user_missions')
              .update({ progress: 0, completed_at: null, claimed: false, last_progress_at: null })
              .eq('user_id', userId)
              .eq('mission_id', missionId);
            errors.push({ missionId, error: 'Mission reset (cooldown). Recommence-la.' });
            continue;
          }
        }

        if (!um || um.progress < mission.threshold || um.claimed) {
          errors.push({ missionId, error: 'Mission non terminée ou déjà réclamée' });
          continue;
        }

        let rewardInventoryId: string | null = null;

        if (mission.reward_booster_id) {
          const [{ data: booster }, { data: inv, error: invErr }] = await Promise.all([
            supabaseAdmin
              .from('boosters')
              .select('id, key, rarity, type, multiplier, duration_hours')
              .eq('id', mission.reward_booster_id)
              .maybeSingle(),
            supabaseAdmin
              .from('user_boosters')
              .insert({ user_id: userId, booster_id: mission.reward_booster_id, status: 'owned', metadata: { source: 'mission' } })
              .select('id')
              .maybeSingle(),
          ]);
          if (invErr) {
            errors.push({ missionId, error: 'Erreur attribution récompense' });
            continue;
          }
          rewardInventoryId = (inv as any)?.id ?? null;

          // Historique best-effort
          try {
            await supabaseAdmin.from('user_booster_open_history').insert({
              user_id: userId,
              source: 'mission',
              booster_id: mission.reward_booster_id,
              booster_key: (booster as any)?.key ?? null,
              rarity: (booster as any)?.rarity ?? null,
              type: (booster as any)?.type ?? null,
              multiplier: (booster as any)?.multiplier ?? null,
              duration_hours: (booster as any)?.duration_hours ?? null,
            });
          } catch {}
        }

        const { error: updErr } = await supabaseAdmin
          .from('user_missions')
          .update({ claimed: true, completed_at: um.completed_at || new Date().toISOString() })
          .eq('user_id', userId)
          .eq('mission_id', missionId);
        if (updErr) {
          errors.push({ missionId, error: 'Erreur mise à jour claim' });
          continue;
        }

        claimed.push({ missionId, rewardInventoryId });
      } catch (e: any) {
        errors.push({ missionId, error: e?.message || 'Erreur' });
      }
    }

    return NextResponse.json({ ok: true, claimed, errors });
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

