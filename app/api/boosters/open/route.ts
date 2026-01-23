import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BoosterRow = {
  id: string;
  key: string;
  name: string;
  description: string;
  type: 'track' | 'artist';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  multiplier: number;
  duration_hours: number;
};

function rarityRank(r: BoosterRow['rarity']): number {
  if (r === 'legendary') return 3;
  if (r === 'epic') return 2;
  if (r === 'rare') return 1;
  return 0;
}

function maxMinRarity(a: BoosterRow['rarity'], b: BoosterRow['rarity']): BoosterRow['rarity'] {
  return rarityRank(a) >= rarityRank(b) ? a : b;
}

function chooseBooster(
  available: BoosterRow[],
  opts?: { luck?: number; minRarity?: BoosterRow['rarity'] }
): BoosterRow | null {
  // Pondération par rareté (base): common 78%, rare 18%, epic 3%, legendary 1%
  // luck (0..1) : bonus abonnés (augmente epic/legendary, réduit common)
  const luck = Math.max(0, Math.min(1, Number(opts?.luck ?? 0)));
  const minRarity = (opts?.minRarity ?? 'common') as BoosterRow['rarity'];
  const common = available.filter(b => b.rarity === 'common');
  const rare = available.filter(b => b.rarity === 'rare');
  const epic = available.filter(b => b.rarity === 'epic');
  const legendary = available.filter(b => b.rarity === 'legendary');

  // Si on doit garantir une rareté minimale, on retire les pools inférieures.
  const allowCommon = rarityRank(minRarity) <= 0;
  const allowRare = rarityRank(minRarity) <= 1;
  const allowEpic = rarityRank(minRarity) <= 2;
  const allowLegendary = rarityRank(minRarity) <= 3;

  const roll = Math.random() * 100;
  let pool: BoosterRow[] = [];
  const legendaryCut = 1 + luck * 1.5; // up to 2.5%
  const epicCut = legendaryCut + (3 + luck * 4); // up to ~9.5%
  const rareCut = epicCut + 18; // keep rare stable

  if (allowLegendary && roll < legendaryCut && legendary.length) pool = legendary;
  else if ((allowEpic && roll < epicCut && epic.length) || (!allowLegendary && rarityRank(minRarity) >= 2)) pool = epic;
  else if ((allowRare && roll < rareCut && rare.length) || (!allowEpic && rarityRank(minRarity) >= 1)) pool = rare;
  else pool = allowCommon && common.length ? common : (rare.length ? rare : (epic.length ? epic : legendary));
  if (!pool.length) return null;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] || null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Bonus abonnés: cooldown réduit + meilleures chances
    let plan: 'free' | 'starter' | 'pro' | 'enterprise' = 'free';
    try {
      const { data: p } = await supabaseAdmin.from('profiles').select('plan').eq('id', userId).maybeSingle();
      if (p?.plan) plan = p.plan;
    } catch {}
    const isSubscriber = plan !== 'free';
    const cooldownMs = isSubscriber ? 12 * 3_600_000 : 24 * 3_600_000;
    const luck = isSubscriber ? (plan === 'pro' || plan === 'enterprise' ? 1 : 0.6) : 0;

    // Vérifier cooldown quotidien
    const { data: daily, error: dailyErr } = await supabaseAdmin
      .from('user_booster_daily')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (dailyErr) {
      return NextResponse.json({ error: 'Erreur lecture daily' }, { status: 500 });
    }

    const now = new Date();
    if (daily?.last_opened_at) {
      const last = new Date(daily.last_opened_at);
      const diffH = (now.getTime() - last.getTime()) / 3_600_000;
      if ((now.getTime() - last.getTime()) < cooldownMs) {
        const remainingMs = cooldownMs - (now.getTime() - last.getTime());
        return NextResponse.json({ error: 'Cooldown', remainingMs }, { status: 429 });
      }
    }

    // Calculer le streak AVANT le loot (sert aux garanties).
    const isConsecutive = daily?.last_opened_at
      ? ((now.getTime() - new Date(daily.last_opened_at).getTime()) / 3_600_000) <= 48
      : false;
    const newStreak = (daily?.streak || 0) + 1;
    const streak = isConsecutive ? newStreak : 1;

    // Charger pity (si la table n'existe pas encore, fallback silencieux)
    let pity = { opens_since_rare: 0, opens_since_epic: 0, opens_since_legendary: 0 };
    try {
      const { data: pityRow } = await supabaseAdmin
        .from('user_booster_pity')
        .select('opens_since_rare, opens_since_epic, opens_since_legendary')
        .eq('user_id', userId)
        .maybeSingle();
      if (pityRow) pity = pityRow as any;
    } catch {}

    // Garanties (pity + streak)
    let minRarity: BoosterRow['rarity'] = 'common';
    // Pity thresholds (tunable): 7 no-rare => rare, 25 no-epic => epic, 80 no-legendary => legendary
    if ((pity.opens_since_rare || 0) >= 6) minRarity = maxMinRarity(minRarity, 'rare');
    if ((pity.opens_since_epic || 0) >= 24) minRarity = maxMinRarity(minRarity, 'epic');
    if ((pity.opens_since_legendary || 0) >= 79) minRarity = maxMinRarity(minRarity, 'legendary');
    // Streak guarantees (fun milestones)
    if (streak > 0 && streak % 30 === 0) minRarity = maxMinRarity(minRarity, 'legendary');
    else if (streak > 0 && streak % 14 === 0) minRarity = maxMinRarity(minRarity, 'epic');
    else if (streak > 0 && streak % 7 === 0) minRarity = maxMinRarity(minRarity, 'rare');

    // Récupérer boosters actifs pour loot
    const { data: boosters, error: boostersErr } = await supabaseAdmin
      .from('boosters')
      .select('id, key, name, description, type, rarity, multiplier, duration_hours')
      .eq('enabled', true);
    if (boostersErr) {
      return NextResponse.json({ error: 'Erreur boosters' }, { status: 500 });
    }
    const picked = chooseBooster((boosters || []) as BoosterRow[], { luck, minRarity });
    if (!picked) {
      return NextResponse.json({ error: 'Aucun booster disponible' }, { status: 500 });
    }

    // Donner le booster à l'utilisateur
    const { data: inv, error: invErr } = await supabaseAdmin
      .from('user_boosters')
      .insert({ user_id: userId, booster_id: picked.id, status: 'owned' })
      .select('id')
      .single();
    if (invErr) {
      return NextResponse.json({ error: 'Erreur attribution booster' }, { status: 500 });
    }

    // Enregistrer historique (best-effort)
    try {
      await supabaseAdmin.from('user_booster_open_history').insert({
        user_id: userId,
        source: 'daily',
        booster_id: picked.id,
        booster_key: picked.key,
        rarity: picked.rarity,
        type: picked.type,
        multiplier: picked.multiplier,
        duration_hours: picked.duration_hours,
      });
    } catch {}

    // Mettre à jour pity (best-effort)
    try {
      const gotRare = rarityRank(picked.rarity) >= rarityRank('rare');
      const gotEpic = rarityRank(picked.rarity) >= rarityRank('epic');
      const gotLegendary = rarityRank(picked.rarity) >= rarityRank('legendary');
      const nextPity = {
        user_id: userId,
        opens_since_rare: gotRare ? 0 : (Number(pity.opens_since_rare || 0) + 1),
        opens_since_epic: gotEpic ? 0 : (Number(pity.opens_since_epic || 0) + 1),
        opens_since_legendary: gotLegendary ? 0 : (Number(pity.opens_since_legendary || 0) + 1),
        updated_at: new Date().toISOString(),
      };
      await supabaseAdmin.from('user_booster_pity').upsert(nextPity, { onConflict: 'user_id' });
    } catch {}

    // Mettre à jour daily + streak
    const upsertRow = { user_id: userId, last_opened_at: now.toISOString(), streak };
    const { error: upErr } = await supabaseAdmin
      .from('user_booster_daily')
      .upsert(upsertRow, { onConflict: 'user_id' });
    if (upErr) {
      return NextResponse.json({ error: 'Erreur mise à jour daily' }, { status: 500 });
    }

    return NextResponse.json({
      received: {
        inventory_id: inv?.id,
        booster: picked
      },
      cooldownMs,
      streak
    });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


