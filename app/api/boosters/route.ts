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

    const nowIso = new Date().toISOString();

    // Bonus abonnés: cooldown réduit
    let plan: 'free' | 'starter' | 'pro' | 'enterprise' = 'free';
    try {
      const { data: p } = await supabaseAdmin.from('profiles').select('plan').eq('id', userId).maybeSingle();
      if (p?.plan) plan = p.plan;
    } catch {}
    const cooldownMs = plan !== 'free' ? 12 * 3_600_000 : 24 * 3_600_000;

    const [{ data: inv, error: invErr }, { data: daily, error: dailyErr }] = await Promise.all([
      supabaseAdmin
        .from('user_boosters')
        .select('id, status, obtained_at, used_at, booster:boosters(id, key, name, description, type, rarity, multiplier, duration_hours)')
        .eq('user_id', userId)
        .order('obtained_at', { ascending: false }),
      supabaseAdmin
        .from('user_booster_daily')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
    ]);

    if (invErr || dailyErr) {
      return NextResponse.json({ error: 'Erreur inventaire' }, { status: 500 });
    }

    let remainingMs: number | null = null;
    if (daily?.last_opened_at) {
      const last = new Date(daily.last_opened_at).getTime();
      const now = new Date(nowIso).getTime();
      const elapsed = now - last;
      remainingMs = Math.max(0, cooldownMs - elapsed);
    }

    // Pity + pack claims (best-effort, tables may not exist yet)
    let pity = { opens_since_rare: 0, opens_since_epic: 0, opens_since_legendary: 0 };
    try {
      const { data: pityRow } = await supabaseAdmin
        .from('user_booster_pity')
        .select('opens_since_rare, opens_since_epic, opens_since_legendary')
        .eq('user_id', userId)
        .maybeSingle();
      if (pityRow) pity = pityRow as any;
    } catch {}

    const packs: Record<string, { periodStart: string; claimed: number; perWeek: number }> = {};
    try {
      // current week start (UTC Monday)
      const d = new Date();
      const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const day = dt.getUTCDay();
      const diff = (day + 6) % 7;
      dt.setUTCDate(dt.getUTCDate() - diff);
      const periodStart = dt.toISOString().slice(0, 10);
      const { data: rows } = await supabaseAdmin
        .from('user_booster_pack_claims')
        .select('pack_key, claimed_count')
        .eq('user_id', userId)
        .eq('period_start', periodStart);
      const byKey = new Map<string, number>();
      for (const r of (rows as any[]) || []) {
        byKey.set(String(r.pack_key), Number(r.claimed_count || 0));
      }
      // rules mirror API claim-pack
      const rules: Record<string, { perWeek: number }> = {
        starter_weekly: { perWeek: 1 },
        pro_weekly: { perWeek: 2 },
      };
      for (const k of Object.keys(rules)) {
        packs[k] = { periodStart, claimed: byKey.get(k) || 0, perWeek: rules[k].perWeek };
      }
    } catch {}

    return NextResponse.json({
      inventory: inv || [],
      cooldownMs,
      remainingMs,
      streak: daily?.streak || 0,
      plan,
      pity,
      packs,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


