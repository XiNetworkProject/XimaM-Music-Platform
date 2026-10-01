import type { DatabaseExecutor } from '../postgres';
import { isTrackPublic } from '../publicTracks.ts';
import {
  activationFamily,
  campaignDefinition,
  campaignEligibility,
  campaignExpiry,
} from './campaigns.ts';
import {
  PACKS,
  RARITIES,
  canClaimPack,
  chooseBooster,
  cooldownFor,
  drawOdds,
  effectiveBoost,
  guaranteedRarity,
  luckFor,
  missionHasReset,
  nextStreak,
  normalizePlan,
  weekStartUTC,
  type Booster,
  type Pity,
} from './policy.ts';

export class BoosterError extends Error {
  status: number;
  details: Record<string, unknown>;
  constructor(
    message: string,
    status = 400,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
const EMPTY_PITY: Pity = {
  opens_since_rare: 0,
  opens_since_epic: 0,
  opens_since_legendary: 0,
};
export async function boosterTargets(db: DatabaseExecutor, userId: string) {
  const rows = (
    await db.query(
      'SELECT id,title,cover_url,is_public,audio_url,created_at FROM public.tracks WHERE creator_id = $1 AND is_public = true ORDER BY created_at DESC,id DESC',
      [userId]
    )
  ).rows;
  return {
    tracks: rows
      .filter(
        (track) =>
          isTrackPublic(track) &&
          !track.id.startsWith('ai-') &&
          !track.id.startsWith('radio-')
      )
      .map((track) => ({
        id: track.id,
        title: track.title,
        coverUrl: track.cover_url,
        createdAt: track.created_at,
      })),
  };
}
// Every mutation acquires this lock inside the SAME short database transaction.
// Covers multiple tabs/processes, including the first-ever daily/pack claim.
export async function lockBoosters(db: DatabaseExecutor, userId: string) {
  await db.query(
    "SELECT pg_advisory_xact_lock(hashtextextended('boosters:' || $1::text, 0))",
    [userId]
  );
}
async function planFor(db: DatabaseExecutor, userId: string) {
  return normalizePlan(
    (await db.query('SELECT plan FROM public.profiles WHERE id = $1', [userId]))
      .rows[0]?.plan
  );
}
async function catalogFor(db: DatabaseExecutor): Promise<Booster[]> {
  return (
    await db.query(
      'SELECT id, key, name, description, type, rarity, multiplier, duration_hours FROM public.boosters WHERE enabled = true'
    )
  ).rows as Booster[];
}
async function grant(
  db: DatabaseExecutor,
  userId: string,
  booster: Booster,
  source: string
) {
  const inv = (
    await db.query(
      "INSERT INTO public.user_boosters(user_id, booster_id, status, metadata) VALUES ($1, $2, 'owned', $3::jsonb) RETURNING id",
      [userId, booster.id, JSON.stringify({ source })]
    )
  ).rows[0];
  await db.query(
    'INSERT INTO public.user_booster_open_history(user_id, source, booster_id, booster_key, rarity, type, multiplier, duration_hours) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [
      userId,
      source,
      booster.id,
      booster.key,
      booster.rarity,
      booster.type,
      booster.multiplier,
      booster.duration_hours,
    ]
  );
  return { inventory_id: inv.id as string, booster };
}
export async function boosterInventory(
  db: DatabaseExecutor,
  userId: string,
  now = Date.now()
) {
  const plan = await planFor(db, userId);
  const cooldownMs = cooldownFor(plan);
  const inventory = (
    await db.query(
      'SELECT i.id, i.status, i.obtained_at, i.used_at, i.metadata, to_jsonb(b) AS booster FROM public.user_boosters i JOIN public.boosters b ON b.id = i.booster_id WHERE i.user_id = $1 ORDER BY i.obtained_at DESC, i.id DESC',
      [userId]
    )
  ).rows;
  const daily = (
    await db.query(
      'SELECT * FROM public.user_booster_daily WHERE user_id = $1',
      [userId]
    )
  ).rows[0];
  const pity = ((
    await db.query(
      'SELECT * FROM public.user_booster_pity WHERE user_id = $1',
      [userId]
    )
  ).rows[0] || EMPTY_PITY) as Pity;
  const periodStart = weekStartUTC(new Date(now));
  const claims = (
    await db.query(
      'SELECT pack_key, claimed_count FROM public.user_booster_pack_claims WHERE user_id = $1 AND period_start = $2',
      [userId, periodStart]
    )
  ).rows;
  const packs = Object.fromEntries(
    Object.entries(PACKS).map(([key, rule]) => [
      key,
      {
        periodStart,
        claimed: Number(
          claims.find((c) => c.pack_key === key)?.claimed_count || 0
        ),
        perWeek: rule.perWeek,
        size: rule.size,
        eligible: canClaimPack(plan, key),
      },
    ])
  );
  const floor = guaranteedRarity(
    pity,
    nextStreak(daily?.last_opened_at, daily?.streak, now)
  );
  const remainingMs = daily?.last_opened_at
    ? Math.max(0, new Date(daily.last_opened_at).getTime() + cooldownMs - now)
    : 0;
  const catalog = await catalogFor(db);
  return {
    catalog,
    inventory,
    cooldownMs,
    remainingMs,
    streak:
      nextStreak(daily?.last_opened_at, daily?.streak, now) === 1
        ? 0
        : daily.streak,
    plan,
    pity,
    packs,
    nextRarity: floor,
    odds: drawOdds(catalog, luckFor(plan), floor),
  };
}
export async function boosterHistory(
  db: DatabaseExecutor,
  userId: string,
  options: { limit?: number; cursor?: string | null; sourcePrefix?: string }
) {
  const limit = Math.max(
    1,
    Math.min(
      50,
      Math.floor(Number.isFinite(options.limit) ? options.limit! : 30)
    )
  );
  let at: string | null = null,
    id: string | null = null;
  if (options.cursor) {
    if (options.cursor.startsWith('v2.')) {
      try {
        [at, id] = JSON.parse(
          Buffer.from(options.cursor.slice(3), 'base64url').toString('utf8')
        );
      } catch {
        throw new BoosterError('Curseur invalide.');
      }
      if (
        typeof at !== 'string' ||
        typeof id !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(id)
      )
        throw new BoosterError('Curseur invalide.');
    } else at = options.cursor; // Accept historical ISO cursors for older clients.
    if (!Number.isFinite(new Date(at!).getTime()))
      throw new BoosterError('Curseur invalide.');
  }
  const rows = (
    await db.query(
      'SELECT id,opened_at,source,booster_key,rarity,type,multiplier,duration_hours FROM public.user_booster_open_history WHERE user_id = $1 AND ($2::timestamptz IS NULL OR opened_at < $2::timestamptz OR (opened_at = $2::timestamptz AND id < $3::uuid)) AND source ILIKE $4 ORDER BY opened_at DESC,id DESC LIMIT $5',
      [userId, at, id, `${options.sourcePrefix || ''}%`, limit + 1]
    )
  ).rows;
  const items = rows.slice(0, limit),
    last = items.at(-1);
  return {
    items,
    nextCursor:
      rows.length > limit && last
        ? `v2.${Buffer.from(JSON.stringify([last.opened_at, last.id])).toString(
            'base64url'
          )}`
        : null,
  };
}
export async function openDaily(
  db: DatabaseExecutor,
  userId: string,
  random = Math.random
) {
  await lockBoosters(db, userId);
  const now = Date.now();
  const plan = await planFor(db, userId),
    cooldownMs = cooldownFor(plan);
  const daily = (
    await db.query(
      'SELECT * FROM public.user_booster_daily WHERE user_id = $1',
      [userId]
    )
  ).rows[0];
  const remainingMs = daily?.last_opened_at
    ? new Date(daily.last_opened_at).getTime() + cooldownMs - now
    : 0;
  if (remainingMs > 0)
    throw new BoosterError('Ton prochain booster arrive bientôt.', 429, {
      remainingMs,
    });
  const pity = ((
    await db.query(
      'SELECT * FROM public.user_booster_pity WHERE user_id = $1',
      [userId]
    )
  ).rows[0] || EMPTY_PITY) as Pity;
  const streak = nextStreak(daily?.last_opened_at, daily?.streak, now);
  const picked = chooseBooster(
    await catalogFor(db),
    luckFor(plan),
    guaranteedRarity(pity, streak),
    false,
    random
  );
  if (!picked)
    throw new BoosterError(
      'Aucun booster compatible avec ta garantie. Réessaie plus tard : rien n’a été consommé.',
      503
    );
  const received = await grant(db, userId, picked, 'daily');
  const rank = RARITIES.indexOf(picked.rarity);
  await db.query(
    'INSERT INTO public.user_booster_pity(user_id, opens_since_rare, opens_since_epic, opens_since_legendary) VALUES ($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET opens_since_rare = EXCLUDED.opens_since_rare, opens_since_epic = EXCLUDED.opens_since_epic, opens_since_legendary = EXCLUDED.opens_since_legendary, updated_at = now()',
    [
      userId,
      rank >= 1 ? 0 : pity.opens_since_rare + 1,
      rank >= 2 ? 0 : pity.opens_since_epic + 1,
      rank >= 3 ? 0 : pity.opens_since_legendary + 1,
    ]
  );
  await db.query(
    'INSERT INTO public.user_booster_daily(user_id,last_opened_at,streak) VALUES ($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET last_opened_at = EXCLUDED.last_opened_at, streak = EXCLUDED.streak',
    [userId, new Date(now).toISOString(), streak]
  );
  return { received, cooldownMs, streak };
}
export async function claimPack(
  db: DatabaseExecutor,
  userId: string,
  packKey: string,
  random = Math.random
) {
  await lockBoosters(db, userId);
  if (!Object.prototype.hasOwnProperty.call(PACKS, packKey))
    throw new BoosterError('Pack inconnu.');
  const rule = PACKS[packKey as keyof typeof PACKS];
  if (!canClaimPack(await planFor(db, userId), packKey))
    throw new BoosterError(
      'Ce pack n’est pas inclus dans ton abonnement.',
      403
    );
  const periodStart = weekStartUTC(new Date());
  const claimed = Number(
    (
      await db.query(
        'SELECT claimed_count FROM public.user_booster_pack_claims WHERE user_id = $1 AND pack_key = $2 AND period_start = $3',
        [userId, packKey, periodStart]
      )
    ).rows[0]?.claimed_count || 0
  );
  if (claimed >= rule.perWeek)
    throw new BoosterError(
      'Tous les packs de cette semaine ont été récupérés.',
      429
    );
  const catalog = await catalogFor(db),
    received = [];
  for (let i = 0; i < rule.size; i++) {
    // Preserve existing pack entitlement: every draw has a rare floor.
    const picked = chooseBooster(catalog, rule.luck, 'rare', true, random);
    if (!picked)
      throw new BoosterError(
        'Pack momentanément indisponible. Rien n’a été consommé.',
        503
      );
    received.push(await grant(db, userId, picked, `pack:${packKey}`));
  }
  await db.query(
    'INSERT INTO public.user_booster_pack_claims(user_id,pack_key,period_start,claimed_count) VALUES ($1,$2,$3,$4) ON CONFLICT(user_id,pack_key,period_start) DO UPDATE SET claimed_count = EXCLUDED.claimed_count, updated_at = now()',
    [userId, packKey, periodStart, claimed + 1]
  );
  return {
    ok: true,
    packKey,
    periodStart,
    claimed: claimed + 1,
    perWeek: rule.perWeek,
    received,
  };
}
export async function activateBooster(
  db: DatabaseExecutor,
  userId: string,
  inventoryId: string,
  targetTrackId: string
) {
  await lockBoosters(db, userId);
  const inv = (
    await db.query(
      'SELECT i.id, i.status, to_jsonb(b) AS booster FROM public.user_boosters i JOIN public.boosters b ON b.id = i.booster_id WHERE i.id = $1 AND i.user_id = $2 FOR UPDATE OF i',
      [inventoryId, userId]
    )
  ).rows[0];
  if (!inv) throw new BoosterError('Booster introuvable.', 404);
  const booster = inv.booster as Booster;
  if (inv.status !== 'owned' || booster.enabled === false)
    throw new BoosterError('Ce booster n’est plus disponible.', 409);
  const definition = campaignDefinition(booster.key);
  if (definition && definition.type !== booster.type)
    throw new BoosterError(
      'Contrat de booster invalide. Rien n’a été consommé.',
      409
    );
  if (booster.type === 'credits') {
    if (!definition?.credits) throw new BoosterError('Recharge inconnue.', 409);
    const amount = definition.credits;
    // Credit ledger and inventory consumption share the same transaction/owner lock.
    await db.query('SELECT public.ai_add_credits($1,$2,$3,$4)', [
      userId,
      amount,
      'booster_creation',
      `Booster ${inventoryId}`,
    ]);
    await db.query(
      "UPDATE public.user_boosters SET status = 'used', used_at = now(), metadata = COALESCE(metadata,'{}'::jsonb) || $1::jsonb WHERE id = $2 AND user_id = $3 AND status = 'owned'",
      [
        JSON.stringify({
          activation: { type: 'credits', amount, targetId: userId },
        }),
        inventoryId,
        userId,
      ]
    );
    await progressMissions(db, userId, { boosts: 1 }, false);
    return {
      ok: true,
      credits: { amount },
      inventory: { id: inventoryId, status: 'used' },
    };
  }
  const artist = booster.type === 'artist';
  let targetCreatedAt: string | undefined;
  if (!artist) {
    if (
      !targetTrackId ||
      targetTrackId.startsWith('ai-') ||
      targetTrackId.startsWith('radio-')
    )
      throw new BoosterError('Choisis un de tes morceaux originaux.');
    const track = (
      await db.query(
        'SELECT creator_id,is_public,audio_url,created_at FROM public.tracks WHERE id = $1 FOR SHARE',
        [targetTrackId]
      )
    ).rows[0];
    if (!track || track.creator_id !== userId)
      throw new BoosterError(
        'Tu peux uniquement booster tes propres morceaux.',
        403
      );
    if (!isTrackPublic(track))
      throw new BoosterError(
        'Publie d’abord ce morceau avec son fichier audio. Ton boost reste dans ta réserve.'
      );
    const eligibilityError = campaignEligibility(
      booster.key,
      track.created_at,
      Date.now()
    );
    if (eligibilityError) throw new BoosterError(eligibilityError);
    targetCreatedAt = track.created_at;
  }
  // Identifiers come only from this fixed allowlist, never from the request.
  const table = artist ? 'active_artist_boosts' : 'active_track_boosts',
    column = artist ? 'artist_id' : 'track_id',
    target = artist ? userId : targetTrackId;
  const now = Date.now(),
    nowIso = new Date(now).toISOString();
  const existing = (
    await db.query(
      `SELECT a.id,a.multiplier,a.expires_at,b.key AS booster_key FROM public.${table} a JOIN public.boosters b ON b.id = a.booster_id WHERE a.${column} = $1 AND a.expires_at > $2 ORDER BY a.started_at, a.id FOR UPDATE OF a`,
      [target, nowIso]
    )
  ).rows.filter(
    (row) => activationFamily(row.booster_key) === activationFamily(booster.key)
  );
  const effective = effectiveBoost(
    existing as { multiplier: number; expires_at: string }[],
    booster,
    now
  );
  effective.expiresAt = campaignExpiry(booster.key, targetCreatedAt, effective.expiresAt);
  if (
    existing.length &&
    existing.some(
      (b) =>
        Number(b.multiplier) >= effective.multiplier &&
        new Date(b.expires_at).getTime() >=
          new Date(effective.expiresAt).getTime()
    )
  )
    throw new BoosterError(
      'Un boost au moins aussi puissant couvre déjà cette durée. Garde celui-ci pour plus tard.',
      409
    );
  if (existing.length) {
    await db.query(
      `UPDATE public.${table} SET multiplier = $1, expires_at = $2, booster_id = $4 WHERE id = $3`,
      [effective.multiplier, effective.expiresAt, existing[0].id, booster.id]
    );
    if (existing.length > 1)
      await db.query(`DELETE FROM public.${table} WHERE id = ANY($1::uuid[])`, [
        existing.slice(1).map((b) => b.id),
      ]);
  } else
    await db.query(
      `INSERT INTO public.${table}(${column},user_id,booster_id,multiplier,started_at,expires_at,source) VALUES ($1,$2,$3,$4,$5,$6,'booster')`,
      [
        target,
        userId,
        booster.id,
        effective.multiplier,
        nowIso,
        effective.expiresAt,
      ]
    );
  await db.query(
    "UPDATE public.user_boosters SET status = 'used', used_at = $1, metadata = COALESCE(metadata,'{}'::jsonb) || $2::jsonb WHERE id = $3 AND user_id = $4 AND status = 'owned'",
    [
      nowIso,
      JSON.stringify({
        activation: { type: booster.type, targetId: target, ...effective },
      }),
      inventoryId,
      userId,
    ]
  );
  await progressMissions(db, userId, { boosts: 1 }, false);
  return {
    ok: true,
    boost: {
      type: booster.type,
      ...(artist ? { artistId: userId } : { trackId: targetTrackId }),
      ...effective,
    },
    inventory: { id: inventoryId, status: 'used' },
  };
}
export async function claimMission(
  db: DatabaseExecutor,
  userId: string,
  missionId: string
) {
  await lockBoosters(db, userId);
  const mission = (
    await db.query(
      'SELECT * FROM public.missions WHERE id = $1 AND enabled = true',
      [missionId]
    )
  ).rows[0];
  if (!mission) throw new BoosterError('Mission indisponible.', 404);
  const progress = (
    await db.query(
      'SELECT * FROM public.user_missions WHERE user_id = $1 AND mission_id = $2 FOR UPDATE',
      [userId, missionId]
    )
  ).rows[0];
  if (!progress || progress.claimed || progress.progress < mission.threshold)
    throw new BoosterError(
      'Récompense déjà récupérée ou mission non terminée.',
      409
    );
  let received = null;
  if (mission.reward_booster_id) {
    const booster = (
      await db.query(
        'SELECT * FROM public.boosters WHERE id = $1 AND enabled = true',
        [mission.reward_booster_id]
      )
    ).rows[0] as Booster | undefined;
    if (!booster)
      throw new BoosterError('Récompense momentanément indisponible.', 503);
    received = await grant(db, userId, booster, 'mission');
  }
  await db.query(
    'UPDATE public.user_missions SET claimed = true, completed_at = COALESCE(completed_at, now()) WHERE user_id = $1 AND mission_id = $2',
    [userId, missionId]
  );
  return {
    ok: true,
    received,
    missionId,
    rewardInventoryId: received?.inventory_id || null,
  };
}
export async function progressMissions(
  db: DatabaseExecutor,
  userId: string,
  increments: Partial<Record<'plays' | 'likes' | 'shares' | 'boosts', number>>,
  lock = true
) {
  if (lock) await lockBoosters(db, userId);
  const now = Date.now(),
    nowIso = new Date(now).toISOString();
  const missions = (
    await db.query(
      'SELECT * FROM public.missions WHERE enabled = true ORDER BY id'
    )
  ).rows;
  for (const m of missions) {
    const delta = Number(
      increments[m.goal_type as keyof typeof increments] || 0
    );
    if (!Number.isFinite(delta) || delta <= 0) continue;
    const row = (
      await db.query(
        'SELECT * FROM public.user_missions WHERE user_id = $1 AND mission_id = $2 FOR UPDATE',
        [userId, m.id]
      )
    ).rows[0];
    const reset = missionHasReset(
      m as { cooldown_hours: number },
      row as { claimed: boolean; completed_at: string | null },
      now
    );
    if (row?.claimed && !reset) continue;
    const progress = Math.min(
      Number(m.threshold),
      (reset ? 0 : Number(row?.progress || 0)) + Math.floor(delta)
    );
    const completedAt =
      !reset && row?.completed_at
        ? row.completed_at
        : progress >= m.threshold
        ? nowIso
        : null;
    await db.query(
      'INSERT INTO public.user_missions(user_id,mission_id,progress,completed_at,last_progress_at,claimed) VALUES ($1,$2,$3,$4,$5,false) ON CONFLICT(user_id,mission_id) DO UPDATE SET progress = EXCLUDED.progress, completed_at = EXCLUDED.completed_at, last_progress_at = EXCLUDED.last_progress_at, claimed = false',
      [userId, m.id, progress, completedAt, nowIso]
    );
  }
}
