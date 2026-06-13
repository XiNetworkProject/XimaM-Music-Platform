import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cityTableMissing(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('schema cache');
}

async function activateWinnerShowcase(userId: string, trackId?: string | null) {
  if (!trackId) return null;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const { data: active } = await supabaseAdmin
    .from('active_track_boosts')
    .select('id, multiplier, expires_at')
    .eq('track_id', trackId)
    .gt('expires_at', now.toISOString())
    .order('multiplier', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (active?.id) {
    await supabaseAdmin.from('active_track_boosts').update({
      multiplier: Math.max(1.35, Number(active.multiplier || 1)),
      expires_at: new Date(Math.max(new Date(active.expires_at).getTime(), new Date(expiresAt).getTime())).toISOString(),
      source: 'city_winner',
    }).eq('id', active.id);
    return expiresAt;
  }
  const { data: booster } = await supabaseAdmin.from('boosters').select('id').eq('type', 'track').order('multiplier', { ascending: false }).limit(1).maybeSingle();
  if (!booster?.id) return null;
  await supabaseAdmin.from('active_track_boosts').insert({
    track_id: trackId,
    user_id: userId,
    booster_id: booster.id,
    multiplier: 1.35,
    started_at: now.toISOString(),
    expires_at: expiresAt,
    source: 'city_winner',
  });
  return expiresAt;
}

// Fallback sans migration: les recompenses vivent dans profiles.preferences.
async function claimLegacyReward(userId: string, eventId: string) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('preferences')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) throw profileError;

  const preferences = profile?.preferences && typeof profile.preferences === 'object' ? profile.preferences : {};
  const rewards = preferences.cityRewards && typeof preferences.cityRewards === 'object' ? preferences.cityRewards : {};
  const current = rewards[eventId];
  if (!current || current.status !== 'available' || !current.trackId || !current.rewardKey) return null;

  const now = new Date().toISOString();
  const featuredUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const cityRewards = { ...rewards, [eventId]: { ...current, status: 'claimed', claimedAt: now, updatedAt: now } };
  const cityWins = {
    ...(preferences.cityWins && typeof preferences.cityWins === 'object' ? preferences.cityWins : {}),
    [eventId]: { eventId, trackId: current.trackId || null, wonAt: current.createdAt || now, claimedAt: now },
  };
  const cityFeaturedTracks = current.trackId ? {
    ...(preferences.cityFeaturedTracks && typeof preferences.cityFeaturedTracks === 'object' ? preferences.cityFeaturedTracks : {}),
    [current.trackId]: { eventId, startsAt: now, endsAt: featuredUntil },
  } : preferences.cityFeaturedTracks;
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      preferences: {
        ...preferences,
        cityRewards,
        cityWins,
        cityFeaturedTracks,
        cityXp: Number(preferences.cityXp || 0) + Number(current?.reward?.amount || 250),
      },
      updated_at: now,
    })
    .eq('id', userId);
  if (error) throw error;
  return { ...current, status: 'claimed', claimedAt: now, featuredUntil };
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Connecte-toi pour reclamer cette recompense.' }, { status: 401 });

    const eventId = decodeURIComponent(params.id || '');
    if (!eventId) return NextResponse.json({ error: 'Event invalide.' }, { status: 400 });

    const { data: reward, error: rewardError } = await supabaseAdmin
      .from('city_user_rewards')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', session.user.id)
      .eq('status', 'available')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (rewardError) {
      if (cityTableMissing(rewardError)) {
        const claimed = await claimLegacyReward(session.user.id, eventId);
        if (!claimed) return NextResponse.json({ error: 'Aucune recompense disponible.' }, { status: 404 });
        await activateWinnerShowcase(session.user.id, claimed.trackId).catch(() => null);
        await createNotification({
          userId: session.user.id,
          type: 'general',
          title: 'Recompense Event activee',
          message: 'Ton titre profite maintenant de 24 h de mise en avant dans Synaura Pulse.',
          actionUrl: '/city',
          relatedId: claimed.trackId || undefined,
          data: { surface: 'city', eventId, kind: 'city_reward_claimed', featuredUntil: claimed.featuredUntil },
          skipPrefCheck: true,
        }).catch(() => null);
        return NextResponse.json({ success: true, legacy: true, reward: claimed });
      }
      throw rewardError;
    }
    if (!reward || reward?.metadata?.source === 'vote' || reward?.metadata?.source === 'participation') {
      const claimed = await claimLegacyReward(session.user.id, eventId).catch(() => false);
      if (claimed) {
        await activateWinnerShowcase(session.user.id, (claimed as any).trackId).catch(() => null);
        return NextResponse.json({ success: true, legacy: true, reward: claimed });
      }
      return NextResponse.json({ error: 'Aucune recompense disponible.' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('city_user_rewards')
      .update({ status: 'claimed', claimed_at: new Date().toISOString() })
      .eq('id', reward.id);
    if (error) throw error;

    await claimLegacyReward(session.user.id, eventId).catch(() => {});
    await activateWinnerShowcase(session.user.id, reward?.metadata?.trackId || reward?.metadata?.track_id).catch(() => null);

    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: session.user.id,
        type: 'city_reward',
        title: 'Recompense Synaura Events',
        message: 'Ta recompense City a ete reclamee.',
        category: 'city',
        data: { eventId, rewardKey: reward.reward_key },
      });
    } catch {}

    return NextResponse.json({ success: true, reward: { ...reward, status: 'claimed', claimed_at: new Date().toISOString() } });
  } catch (error) {
    console.error('city claim failed', error);
    return NextResponse.json({ error: 'Recompense impossible a reclamer.' }, { status: 500 });
  }
}
