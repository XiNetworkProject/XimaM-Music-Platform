import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

type Reward =
  | { kind: 'none'; label: string }
  | { kind: 'credits'; label: string; amount: number }
  | { kind: 'booster'; label: string; boosterKey: string };

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

// IMPORTANT: keep in sync with UI wheel ordering
const WHEEL: Array<{ key: string; reward: Reward; weight: number }> = [
  { key: 'lose', reward: { kind: 'none', label: 'Rien (perdu)' }, weight: 10 },
  { key: 'credits_10', reward: { kind: 'credits', label: '+10 credits IA', amount: 10 }, weight: 20 },
  { key: 'credits_25', reward: { kind: 'credits', label: '+25 credits IA', amount: 25 }, weight: 20 },
  { key: 'common_booster', reward: { kind: 'booster', label: 'Booster commun', boosterKey: 'track_boost_common' }, weight: 30 },
  { key: 'rare_booster', reward: { kind: 'booster', label: 'Booster rare', boosterKey: 'track_boost_rare' }, weight: 14 },
  { key: 'epic_booster', reward: { kind: 'booster', label: 'Booster épique', boosterKey: 'track_boost_epic' }, weight: 5 },
  { key: 'legendary_booster', reward: { kind: 'booster', label: 'Booster légendaire', boosterKey: 'track_boost_legendary' }, weight: 1 },
];

function pickWeightedIndex() {
  const total = WHEEL.reduce((s, x) => s + (x.weight || 0), 0) || 1;
  let r = Math.random() * total;
  for (let i = 0; i < WHEEL.length; i++) {
    r -= WHEEL[i]!.weight || 0;
    if (r <= 0) return i;
  }
  return WHEEL.length - 1;
}

async function getStatus(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_daily_spin')
    .select('last_spun_at, streak')
    .eq('user_id', userId)
    .maybeSingle();

  const last = data?.last_spun_at ? new Date(data.last_spun_at).getTime() : null;
  const now = Date.now();
  const nextAt = last != null ? last + COOLDOWN_MS : null;
  const canSpin = nextAt == null ? true : now >= nextAt;
  return {
    canSpin,
    lastSpunAt: last ? new Date(last).toISOString() : null,
    nextAvailableAt: nextAt ? new Date(nextAt).toISOString() : null,
    streak: Number(data?.streak || 0),
  };
}

async function grantCredits(userId: string, amount: number) {
  const { data } = await supabaseAdmin
    .from('ai_credit_balances')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();
  const current = Number(data?.balance || 0);
  const next = Math.max(0, current + Math.max(0, Math.floor(amount || 0)));
  await supabaseAdmin.from('ai_credit_balances').upsert({ user_id: userId, balance: next }, { onConflict: 'user_id' });
  return { before: current, after: next };
}

async function grantBooster(userId: string, boosterKey: string) {
  const { data: booster, error: bErr } = await supabaseAdmin
    .from('boosters')
    .select('id, key, rarity, type, multiplier, duration_hours, name')
    .eq('key', boosterKey)
    .maybeSingle();
  if (bErr || !booster?.id) throw new Error('Booster introuvable');

  const { data: inv, error: iErr } = await supabaseAdmin
    .from('user_boosters')
    .insert({
      user_id: userId,
      booster_id: booster.id,
      status: 'owned',
      metadata: { source: 'daily_spin', booster_key: booster.key },
    })
    .select('id')
    .single();
  if (iErr) throw new Error(iErr.message || 'Erreur inventaire booster');

  // log like other sources for history tab
  await supabaseAdmin.from('user_booster_open_history').insert({
    user_id: userId,
    source: 'spin',
    booster_id: booster.id,
    booster_key: booster.key,
    rarity: booster.rarity,
    type: booster.type,
    multiplier: booster.multiplier,
    duration_hours: booster.duration_hours,
  });

  return { inventoryId: inv?.id, booster };
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const status = await getStatus(session.user.id);
  return NextResponse.json(status);
}

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const userId = session.user.id;

  const status = await getStatus(userId);
  if (!status.canSpin) {
    return NextResponse.json(
      { error: 'COOLDOWN', ...status },
      { status: 429 },
    );
  }

  const index = pickWeightedIndex();
  const entry = WHEEL[index]!;
  const nowIso = new Date().toISOString();

  // streak (soft): if previous spin < 48h => +1 else reset to 1
  const prevTs = status.lastSpunAt ? new Date(status.lastSpunAt).getTime() : null;
  const nextStreak = prevTs != null && (Date.now() - prevTs) <= (48 * 60 * 60 * 1000) ? (status.streak + 1) : 1;

  await supabaseAdmin
    .from('user_daily_spin')
    .upsert({ user_id: userId, last_spun_at: nowIso, streak: nextStreak }, { onConflict: 'user_id' });

  let payload: any = null;
  try {
    if (entry.reward.kind === 'credits') {
      const delta = await grantCredits(userId, entry.reward.amount);
      payload = { kind: 'credits', amount: entry.reward.amount, ...delta };
    } else if (entry.reward.kind === 'booster') {
      const g = await grantBooster(userId, entry.reward.boosterKey);
      payload = { kind: 'booster', inventoryId: g.inventoryId, booster: g.booster };
    } else {
      payload = { kind: 'none' };
    }
  } catch (e: any) {
    // If reward granting fails, still return safe info (no retry abuse)
    payload = { kind: 'none', error: e?.message || 'Reward error' };
  }

  await supabaseAdmin.from('user_daily_spin_history').insert({
    user_id: userId,
    spun_at: nowIso,
    result_key: entry.key,
    reward_type: entry.reward.kind,
    reward_payload: payload,
  });

  const nextAvailableAt = new Date(Date.now() + COOLDOWN_MS).toISOString();
  return NextResponse.json({
    ok: true,
    index,
    resultKey: entry.key,
    reward: entry.reward,
    rewardPayload: payload,
    spunAt: nowIso,
    nextAvailableAt,
    streak: nextStreak,
  });
}

