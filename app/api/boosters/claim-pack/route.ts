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

function chooseBooster(available: BoosterRow[], opts?: { luck?: number; minRarity?: BoosterRow['rarity'] }): BoosterRow | null {
  const luck = Math.max(0, Math.min(1, Number(opts?.luck ?? 0)));
  const minRarity = (opts?.minRarity ?? 'common') as BoosterRow['rarity'];
  const common = available.filter((b) => b.rarity === 'common');
  const rare = available.filter((b) => b.rarity === 'rare');
  const epic = available.filter((b) => b.rarity === 'epic');
  const legendary = available.filter((b) => b.rarity === 'legendary');

  const allowCommon = rarityRank(minRarity) <= 0;
  const allowRare = rarityRank(minRarity) <= 1;
  const allowEpic = rarityRank(minRarity) <= 2;
  const allowLegendary = rarityRank(minRarity) <= 3;

  const roll = Math.random() * 100;
  let pool: BoosterRow[] = [];
  // Fair & safe: packs shouldn't massively outperform daily odds; keep it close.
  const legendaryCut = 1 + luck * 1.2;
  const epicCut = legendaryCut + (3 + luck * 3);
  const rareCut = epicCut + 20;

  if (allowLegendary && roll < legendaryCut && legendary.length) pool = legendary;
  else if (allowEpic && roll < epicCut && epic.length) pool = epic;
  else if (allowRare && roll < rareCut && rare.length) pool = rare;
  else pool = allowCommon && common.length ? common : (rare.length ? rare : (epic.length ? epic : legendary));

  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

function weekStartUTC(d: Date): string {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = dt.getUTCDay(); // 0..6 (Sun..Sat)
  const diff = (day + 6) % 7; // Monday as start
  dt.setUTCDate(dt.getUTCDate() - diff);
  return dt.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const packKey = String(body?.packKey || '').trim();
    if (!packKey) return NextResponse.json({ error: 'packKey requis' }, { status: 400 });

    // Plan
    let plan: 'free' | 'starter' | 'pro' | 'enterprise' = 'free';
    try {
      const { data: p } = await supabaseAdmin.from('profiles').select('plan').eq('id', userId).maybeSingle();
      if (p?.plan) plan = p.plan;
    } catch {}

    const isSubscriber = plan !== 'free';
    if (!isSubscriber) return NextResponse.json({ error: 'Abonnement requis' }, { status: 403 });

    // Pack rules
    const now = new Date();
    const periodStart = weekStartUTC(now);
    const rules: Record<string, { perWeek: number; size: number; luck: number; minRarity?: BoosterRow['rarity'] }> = {
      starter_weekly: { perWeek: 1, size: 3, luck: 0.3, minRarity: 'rare' },
      pro_weekly: { perWeek: 2, size: 5, luck: 0.5, minRarity: 'rare' },
    };
    const rule = rules[packKey];
    if (!rule) return NextResponse.json({ error: 'Pack inconnu' }, { status: 400 });

    if (plan === 'starter' && packKey !== 'starter_weekly') {
      return NextResponse.json({ error: 'Pack réservé au plan Pro' }, { status: 403 });
    }

    // Claim count (idempotent-ish)
    let claimed = 0;
    try {
      const { data: row } = await supabaseAdmin
        .from('user_booster_pack_claims')
        .select('claimed_count')
        .eq('user_id', userId)
        .eq('pack_key', packKey)
        .eq('period_start', periodStart)
        .maybeSingle();
      claimed = Number((row as any)?.claimed_count ?? 0);
    } catch {}

    if (claimed >= rule.perWeek) {
      return NextResponse.json({ error: 'Limite atteinte', claimed, perWeek: rule.perWeek, periodStart }, { status: 429 });
    }

    // Available boosters
    const { data: boosters, error: boostersErr } = await supabaseAdmin
      .from('boosters')
      .select('id, key, name, description, type, rarity, multiplier, duration_hours')
      .eq('enabled', true);
    if (boostersErr) return NextResponse.json({ error: 'Erreur boosters' }, { status: 500 });
    const list = (boosters || []) as BoosterRow[];

    const received: Array<{ inventory_id: string; booster: BoosterRow }> = [];

    // Draw N boosters, give to user
    for (let i = 0; i < rule.size; i++) {
      const picked = chooseBooster(list, { luck: rule.luck, minRarity: rule.minRarity });
      if (!picked) continue;
      const { data: inv, error: invErr } = await supabaseAdmin
        .from('user_boosters')
        .insert({ user_id: userId, booster_id: picked.id, status: 'owned', metadata: { source: `pack:${packKey}` } })
        .select('id')
        .single();
      if (invErr) continue;
      received.push({ inventory_id: inv.id, booster: picked });

      // history best-effort
      try {
        await supabaseAdmin.from('user_booster_open_history').insert({
          user_id: userId,
          source: `pack:${packKey}`,
          booster_id: picked.id,
          booster_key: picked.key,
          rarity: picked.rarity,
          type: picked.type,
          multiplier: picked.multiplier,
          duration_hours: picked.duration_hours,
        });
      } catch {}
    }

    // Upsert claim row
    try {
      await supabaseAdmin.from('user_booster_pack_claims').upsert(
        { user_id: userId, pack_key: packKey, period_start: periodStart, claimed_count: claimed + 1, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,pack_key,period_start' } as any,
      );
    } catch {}

    return NextResponse.json({
      ok: true,
      packKey,
      periodStart,
      claimed: claimed + 1,
      perWeek: rule.perWeek,
      received,
    });
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

