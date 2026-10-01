import type { DatabaseExecutor } from '../postgres';
import { BoosterError, lockBoosters } from './service.ts';
import { nextStreak } from './policy.ts';

// Index order is part of the existing wheel's rendering contract.
const WHEEL = [
  { key: 'lose', reward: { kind: 'none', label: 'À demain !' }, weight: 10 },
  {
    key: 'credits_10',
    reward: { kind: 'credits', label: '+10 crédits IA', amount: 10 },
    weight: 20,
  },
  {
    key: 'credits_25',
    reward: { kind: 'credits', label: '+25 crédits IA', amount: 25 },
    weight: 20,
  },
  {
    key: 'common_booster',
    reward: {
      kind: 'booster',
      label: 'Booster commun',
      boosterKey: 'track_boost_common',
    },
    weight: 30,
  },
  {
    key: 'rare_booster',
    reward: {
      kind: 'booster',
      label: 'Booster rare',
      boosterKey: 'track_boost_rare',
    },
    weight: 14,
  },
  {
    key: 'epic_booster',
    reward: {
      kind: 'booster',
      label: 'Booster épique',
      boosterKey: 'track_boost_epic',
    },
    weight: 5,
  },
  {
    key: 'legendary_booster',
    reward: {
      kind: 'booster',
      label: 'Booster légendaire',
      boosterKey: 'track_boost_legendary',
    },
    weight: 1,
  },
];
export async function spinStatus(
  db: DatabaseExecutor,
  userId: string,
  now = Date.now()
) {
  const row = (
    await db.query(
      'SELECT last_spun_at,streak FROM public.user_daily_spin WHERE user_id = $1',
      [userId]
    )
  ).rows[0];
  const nextAt = row?.last_spun_at
    ? new Date(row.last_spun_at).getTime() + 86_400_000
    : null;
  return {
    canSpin: nextAt === null || now >= nextAt,
    lastSpunAt: row?.last_spun_at || null,
    nextAvailableAt: nextAt === null ? null : new Date(nextAt).toISOString(),
    streak: Number(row?.streak || 0),
  };
}
export async function spinDaily(
  db: DatabaseExecutor,
  userId: string,
  random = Math.random
) {
  await lockBoosters(db, userId);
  const status = await spinStatus(db, userId);
  if (!status.canSpin)
    throw new BoosterError(
      'Le prochain tour sera disponible demain.',
      429,
      status
    );
  let roll = random() * 100,
    index = WHEEL.length - 1;
  for (let i = 0; i < WHEEL.length; i++) {
    roll -= WHEEL[i].weight;
    if (roll < 0) {
      index = i;
      break;
    }
  }
  const entry = WHEEL[index],
    now = Date.now(),
    nowIso = new Date(now).toISOString();
  let payload: Record<string, unknown> = { kind: 'none' };
  if (entry.reward.kind === 'credits') {
    const before = Number(
      (
        await db.query(
          'SELECT balance FROM public.ai_credit_balances WHERE user_id = $1',
          [userId]
        )
      ).rows[0]?.balance || 0
    );
    await db.query(
      "SELECT public.ai_add_credits($1::uuid,$2::integer,'daily_spin'::text,$3::text)",
      [
        userId,
        entry.reward.amount,
        `Roue quotidienne (+${entry.reward.amount} crédits)`,
      ]
    );
    const after = Number(
      (
        await db.query(
          'SELECT balance FROM public.ai_credit_balances WHERE user_id = $1',
          [userId]
        )
      ).rows[0]?.balance || 0
    );
    payload = { kind: 'credits', amount: entry.reward.amount, before, after };
  } else if (entry.reward.kind === 'booster') {
    const pool = (
      await db.query(
        'SELECT * FROM public.boosters WHERE rarity = $1 AND enabled = true ORDER BY key',
        [entry.reward.boosterKey?.split('_').at(-1)]
      )
    ).rows;
    const booster = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
    if (!booster)
      throw new BoosterError(
        'Récompense indisponible. Ton tour n’a pas été consommé.',
        503
      );
    const inv = (
      await db.query(
        'INSERT INTO public.user_boosters(user_id,booster_id,status,metadata) VALUES ($1,$2,\'owned\',\'{"source":"daily_spin"}\'::jsonb) RETURNING id',
        [userId, booster.id]
      )
    ).rows[0];
    await db.query(
      "INSERT INTO public.user_booster_open_history(user_id,source,booster_id,booster_key,rarity,type,multiplier,duration_hours) VALUES ($1,'spin',$2,$3,$4,$5,$6,$7)",
      [
        userId,
        booster.id,
        booster.key,
        booster.rarity,
        booster.type,
        booster.multiplier,
        booster.duration_hours,
      ]
    );
    payload = { kind: 'booster', inventoryId: inv.id, booster };
  }
  const streak = nextStreak(status.lastSpunAt, status.streak, now);
  await db.query(
    'INSERT INTO public.user_daily_spin(user_id,last_spun_at,streak) VALUES ($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET last_spun_at = EXCLUDED.last_spun_at, streak = EXCLUDED.streak',
    [userId, nowIso, streak]
  );
  await db.query(
    'INSERT INTO public.user_daily_spin_history(user_id,spun_at,result_key,reward_type,reward_payload) VALUES ($1,$2,$3,$4,$5::jsonb)',
    [userId, nowIso, entry.key, entry.reward.kind, JSON.stringify(payload)]
  );
  return {
    ok: true,
    index,
    resultKey: entry.key,
    reward: entry.reward,
    rewardPayload: payload,
    spunAt: nowIso,
    nextAvailableAt: new Date(now + 86_400_000).toISOString(),
    streak,
  };
}
