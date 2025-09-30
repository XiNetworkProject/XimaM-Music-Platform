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
  rarity: 'common' | 'rare' | 'epic';
  multiplier: number;
  duration_hours: number;
};

function chooseBooster(available: BoosterRow[]): BoosterRow | null {
  // Pondération par rareté: common 80%, rare 18%, epic 2%
  const common = available.filter(b => b.rarity === 'common');
  const rare = available.filter(b => b.rarity === 'rare');
  const epic = available.filter(b => b.rarity === 'epic');

  const roll = Math.random() * 100;
  let pool: BoosterRow[] = [];
  if (roll < 2 && epic.length) pool = epic; else if (roll < 20 && rare.length) pool = rare; else pool = common.length ? common : (rare.length ? rare : epic);
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
      if (diffH < 24) {
        const remainingMs = 24 * 3_600_000 - (now.getTime() - last.getTime());
        return NextResponse.json({ error: 'Cooldown', remainingMs }, { status: 429 });
      }
    }

    // Récupérer boosters actifs pour loot
    const { data: boosters, error: boostersErr } = await supabaseAdmin
      .from('boosters')
      .select('id, key, name, description, type, rarity, multiplier, duration_hours')
      .eq('enabled', true);
    if (boostersErr) {
      return NextResponse.json({ error: 'Erreur boosters' }, { status: 500 });
    }
    const picked = chooseBooster((boosters || []) as BoosterRow[]);
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

    // Mettre à jour daily + streak
    const isConsecutive = daily?.last_opened_at ? ((now.getTime() - new Date(daily.last_opened_at).getTime())/3_600_000) <= 48 : false;
    const newStreak = (daily?.streak || 0) + 1;
    const streak = isConsecutive ? newStreak : 1;
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
      cooldownMs: 24 * 3_600_000,
      streak
    });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


