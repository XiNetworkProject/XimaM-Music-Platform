import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ notifications: [] });

    const now = new Date();
    const notifications: Array<{ type: string; title: string; body: string; key: string; expiresAt?: string }> = [];

    // 1. Check daily booster availability
    const { data: daily } = await supabaseAdmin
      .from('user_booster_daily')
      .select('last_opened_at, cooldown_ms')
      .eq('user_id', userId)
      .maybeSingle();

    if (daily) {
      const cooldownMs = Number(daily.cooldown_ms) || 24 * 3600000;
      const lastOpened = daily.last_opened_at ? new Date(daily.last_opened_at).getTime() : 0;
      const nextAvailable = lastOpened + cooldownMs;
      if (now.getTime() >= nextAvailable) {
        notifications.push({
          type: 'daily_available',
          title: 'Booster quotidien disponible',
          body: 'Ton booster quotidien est pret a ouvrir !',
          key: `daily-${now.toISOString().slice(0, 10)}`,
        });
      }
    } else {
      notifications.push({
        type: 'daily_available',
        title: 'Booster quotidien disponible',
        body: 'Ouvre ton premier booster quotidien !',
        key: `daily-first`,
      });
    }

    // 2. Check daily spin availability
    const { data: spin } = await supabaseAdmin
      .from('user_daily_spin')
      .select('last_spun_at, next_available_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!spin || !spin.next_available_at || new Date(spin.next_available_at).getTime() <= now.getTime()) {
      notifications.push({
        type: 'spin_available',
        title: 'Roue quotidienne disponible',
        body: 'Tourne la roue pour gagner des boosters !',
        key: `spin-${now.toISOString().slice(0, 10)}`,
      });
    }

    // 3. Check boosts expiring within 1 hour
    const oneHourFromNow = new Date(now.getTime() + 3600000).toISOString();
    const { data: expiringTrack } = await supabaseAdmin
      .from('active_track_boosts')
      .select('id, track_id, multiplier, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', now.toISOString())
      .lte('expires_at', oneHourFromNow);

    for (const boost of (expiringTrack || [])) {
      notifications.push({
        type: 'boost_expiring',
        title: 'Boost bientot expire',
        body: `Ton boost x${Number(boost.multiplier).toFixed(1)} expire dans moins d'une heure`,
        key: `expiring-${boost.id}`,
        expiresAt: boost.expires_at,
      });
    }

    const { data: expiringArtist } = await supabaseAdmin
      .from('active_artist_boosts')
      .select('id, multiplier, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', now.toISOString())
      .lte('expires_at', oneHourFromNow);

    for (const boost of (expiringArtist || [])) {
      notifications.push({
        type: 'boost_expiring',
        title: 'Boost artiste bientot expire',
        body: `Ton boost profil x${Number(boost.multiplier).toFixed(1)} expire bientot`,
        key: `expiring-artist-${boost.id}`,
        expiresAt: boost.expires_at,
      });
    }

    return NextResponse.json({ notifications });
  } catch (err: any) {
    console.error('Boost notifications error:', err);
    return NextResponse.json({ notifications: [], error: err?.message }, { status: 500 });
  }
}
