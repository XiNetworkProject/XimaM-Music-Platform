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
      const cd = 24 * 3_600_000;
      remainingMs = Math.max(0, cd - elapsed);
    }

    return NextResponse.json({
      inventory: inv || [],
      cooldownMs: 24 * 3_600_000,
      remainingMs,
      streak: daily?.streak || 0
    });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


