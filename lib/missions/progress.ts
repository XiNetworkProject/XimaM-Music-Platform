import { supabaseAdmin } from '@/lib/supabase';

type GoalType = 'plays' | 'likes' | 'shares';

type MissionRow = {
  id: string;
  goal_type: GoalType;
  threshold: number;
  cooldown_hours: number;
  enabled: boolean;
};

type UserMissionRow = {
  id: string;
  mission_id: string;
  progress: number;
  completed_at: string | null;
  claimed: boolean;
  last_progress_at: string | null;
};

function hoursBetween(aIso: string, bIso: string) {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  if (!isFinite(a) || !isFinite(b)) return Infinity;
  return Math.abs(b - a) / 3_600_000;
}

function shouldReset(um: UserMissionRow | null | undefined, mission: MissionRow, nowIso: string) {
  const cd = Number(mission.cooldown_hours || 0);
  if (!um) return false;
  if (!cd || cd <= 0) return false;
  if (!um.completed_at) return false;
  // On considère la mission “terminée” quand elle a été réclamée ou au moins complétée,
  // et on autorise un reset après cooldown.
  if (!um.claimed && !um.completed_at) return false;
  return hoursBetween(um.completed_at, nowIso) >= cd;
}

async function resetUserMission(userId: string, missionId: string) {
  await supabaseAdmin
    .from('user_missions')
    .update({ progress: 0, completed_at: null, claimed: false, last_progress_at: null })
    .eq('user_id', userId)
    .eq('mission_id', missionId);
}

async function markCompletedIfNeeded(userId: string, mission: MissionRow, um: UserMissionRow | null | undefined, progress: number, nowIso: string) {
  if (progress < Number(mission.threshold || 0)) return;
  if (um?.completed_at) return;
  await supabaseAdmin
    .from('user_missions')
    .update({ completed_at: nowIso })
    .eq('user_id', userId)
    .eq('mission_id', mission.id);
}

/**
 * Met à jour la progression des missions "enabled" selon des increments d'événements.
 * - Ignore les missions déjà réclamées (jusqu'au reset cooldown)
 * - Applique le reset si cooldown dépassé
 * - Marque completed_at quand progress >= threshold
 */
export async function applyMissionProgress(opts: {
  userId: string;
  inc: Partial<Record<GoalType, number>>;
}) {
  const { userId, inc } = opts;
  const plays = Number(inc.plays || 0);
  const likes = Number(inc.likes || 0);
  const shares = Number(inc.shares || 0);
  if (!userId) return;
  if (!plays && !likes && !shares) return;

  const nowIso = new Date().toISOString();

  const { data: missions } = await supabaseAdmin
    .from('missions')
    .select('id, goal_type, threshold, cooldown_hours, enabled')
    .eq('enabled', true);

  const list = (missions || []) as MissionRow[];
  if (!list.length) return;

  const missionIds = list.map((m) => m.id);
  const { data: rows } = await supabaseAdmin
    .from('user_missions')
    .select('id, mission_id, progress, completed_at, claimed, last_progress_at')
    .eq('user_id', userId)
    .in('mission_id', missionIds);

  const byMissionId = new Map<string, UserMissionRow>();
  for (const r of (rows || []) as any[]) {
    if (r?.mission_id) byMissionId.set(String(r.mission_id), r as UserMissionRow);
  }

  for (const m of list) {
    const delta =
      m.goal_type === 'plays' ? plays :
      m.goal_type === 'likes' ? likes :
      m.goal_type === 'shares' ? shares : 0;
    if (!delta) continue;

    const um = byMissionId.get(m.id);

    // reset si cooldown passé
    if (shouldReset(um, m, nowIso)) {
      await resetUserMission(userId, m.id);
      byMissionId.delete(m.id);
    }

    const current = (um?.progress || 0);
    const next = current + delta;

    if (!um) {
      const { data: inserted } = await supabaseAdmin
        .from('user_missions')
        .insert({ user_id: userId, mission_id: m.id, progress: next, last_progress_at: nowIso })
        .select('id, mission_id, progress, completed_at, claimed, last_progress_at')
        .maybeSingle();
      const insertedRow = inserted as any as UserMissionRow | null;
      if (insertedRow?.mission_id) byMissionId.set(m.id, insertedRow);
    } else {
      // si déjà réclamée (et pas encore reset), on n'augmente pas
      if (um.claimed) continue;
      await supabaseAdmin
        .from('user_missions')
        .update({ progress: next, last_progress_at: nowIso })
        .eq('id', um.id);
      byMissionId.set(m.id, { ...um, progress: next, last_progress_at: nowIso });
    }

    await markCompletedIfNeeded(userId, m, byMissionId.get(m.id), next, nowIso);
  }
}

