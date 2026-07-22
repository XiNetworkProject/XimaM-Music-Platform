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

    const [profileResult, dailyResult, spinResult] = await Promise.all([
      supabaseAdmin.from('profiles').select('plan').eq('id', userId).maybeSingle(),
      supabaseAdmin
        .from('user_booster_daily')
        .select('last_opened_at')
        .eq('user_id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('user_daily_spin')
        .select('last_spun_at')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    // 1. Check daily booster availability. Keep this calculation aligned with
    // /api/boosters: subscribers receive a 12-hour cooldown, others 24 hours.
    const plan = String(profileResult.data?.plan || 'free');
    const boosterCooldownMs = plan !== 'free' ? 12 * 3_600_000 : 24 * 3_600_000;
    const daily = dailyResult.data;
    if (!dailyResult.error && daily) {
      const lastOpened = daily.last_opened_at ? new Date(daily.last_opened_at).getTime() : 0;
      const nextAvailable = lastOpened + boosterCooldownMs;
      if (now.getTime() >= nextAvailable) {
        notifications.push({
          type: 'daily_available',
          title: 'Booster quotidien disponible',
          body: 'Ton booster quotidien est pret a ouvrir !',
          key: `daily-${now.toISOString().slice(0, 10)}`,
        });
      }
    } else if (!dailyResult.error) {
      notifications.push({
        type: 'daily_available',
        title: 'Booster quotidien disponible',
        body: 'Ouvre ton premier booster quotidien !',
        key: `daily-first`,
      });
    }

    // 2. Check daily spin availability
    const spin = spinResult.data;
    const spinAvailableAt = spin?.last_spun_at
      ? new Date(spin.last_spun_at).getTime() + 24 * 3_600_000
      : 0;
    if (!spinResult.error && now.getTime() >= spinAvailableAt) {
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
