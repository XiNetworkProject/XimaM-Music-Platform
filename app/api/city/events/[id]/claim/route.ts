import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CITY_WINNER_MULTIPLIER = 1.35;
const CITY_WINNER_DURATION_MS = 24 * 60 * 60 * 1000;
const CITY_WINNER_MESSAGE = 'Boost x1,35 actif pendant 24 h.';

type CityWinnerBoost = {
  trackId: string;
  multiplier: number;
  expiresAt: string;
  source: 'city_winner';
};

function cityTableMissing(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('schema cache');
}

async function activateWinnerShowcase(userId: string, trackId?: string | null): Promise<CityWinnerBoost> {
  if (!trackId) throw new Error('Le morceau gagnant est introuvable.');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CITY_WINNER_DURATION_MS).toISOString();
  const { data: active, error: activeError } = await supabaseAdmin
    .from('active_track_boosts')
    .select('id, multiplier, expires_at')
    .eq('track_id', trackId)
    .eq('user_id', userId)
    .eq('source', 'city_winner')
    .gt('expires_at', now.toISOString())
    .order('multiplier', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeError) throw activeError;
  if (active?.id) {
    const mergedExpiresAt = new Date(Math.max(new Date(active.expires_at).getTime(), new Date(expiresAt).getTime())).toISOString();
    const mergedMultiplier = Math.max(CITY_WINNER_MULTIPLIER, Number(active.multiplier || 1));
    const { data: updated, error } = await supabaseAdmin.from('active_track_boosts').update({
      multiplier: mergedMultiplier,
      expires_at: mergedExpiresAt,
    }).eq('id', active.id).select('track_id, multiplier, expires_at').maybeSingle();
    if (error || !updated) throw error || new Error('Le boost City n a pas pu etre confirme.');
    return {
      trackId: String(updated.track_id),
      multiplier: Number(updated.multiplier || CITY_WINNER_MULTIPLIER),
      expiresAt: String(updated.expires_at),
      source: 'city_winner',
    };
  }

  let { data: booster, error: boosterError } = await supabaseAdmin
    .from('boosters')
    .select('id')
    .eq('key', 'city-winner-showcase')
    .eq('enabled', true)
    .maybeSingle();
  if (boosterError) throw boosterError;
  if (!booster?.id) {
    const fallback = await supabaseAdmin
      .from('boosters')
      .select('id')
      .eq('type', 'track')
      .eq('enabled', true)
      .order('multiplier', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fallback.error) throw fallback.error;
    booster = fallback.data;
  }
  if (!booster?.id) throw new Error('Le boost City n est pas configure.');

  const { data: inserted, error: insertError } = await supabaseAdmin.from('active_track_boosts').insert({
    track_id: trackId,
    user_id: userId,
    booster_id: booster.id,
    multiplier: CITY_WINNER_MULTIPLIER,
    started_at: now.toISOString(),
    expires_at: expiresAt,
    source: 'city_winner',
  }).select('track_id, multiplier, expires_at').maybeSingle();
  if (insertError || !inserted) throw insertError || new Error('Le boost City n a pas pu etre active.');
  return {
    trackId: String(inserted.track_id),
    multiplier: Number(inserted.multiplier || CITY_WINNER_MULTIPLIER),
    expiresAt: String(inserted.expires_at),
    source: 'city_winner',
  };
}

async function readLegacyReward(userId: string, eventId: string) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('preferences')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) throw profileError;

  const preferences = profile?.preferences && typeof profile.preferences === 'object' ? profile.preferences : {};
  const rewards = preferences.cityRewards && typeof preferences.cityRewards === 'object' ? preferences.cityRewards : {};
  const current = rewards[eventId];
  return current && current.status === 'available' && current.trackId && current.rewardKey ? current : null;
}

async function winnerHasARealVote(eventId: string, trackId: string) {
  const { data: event, error: eventError } = await supabaseAdmin
    .from('city_events')
    .select('kind')
    .eq('id', eventId)
    .maybeSingle();
  if (eventError) {
    if (cityTableMissing(eventError)) return true;
    throw eventError;
  }
  if (!event) return false;
  if (event.kind !== 'battle') return true;

  const { count, error: voteError } = await supabaseAdmin
    .from('city_event_votes')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('track_id', trackId);
  if (voteError) throw voteError;
  return Number(count || 0) > 0;
}

// Fallback sans migration: les recompenses vivent dans profiles.preferences.
async function claimLegacyReward(userId: string, eventId: string, boost: CityWinnerBoost) {
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
  const cityRewards = { ...rewards, [eventId]: { ...current, status: 'claimed', claimedAt: now, updatedAt: now, boost } };
  const cityWins = {
    ...(preferences.cityWins && typeof preferences.cityWins === 'object' ? preferences.cityWins : {}),
    [eventId]: { eventId, trackId: current.trackId || null, wonAt: current.createdAt || now, claimedAt: now },
  };
  const cityFeaturedTracks = current.trackId ? {
    ...(preferences.cityFeaturedTracks && typeof preferences.cityFeaturedTracks === 'object' ? preferences.cityFeaturedTracks : {}),
    [current.trackId]: { eventId, startsAt: now, endsAt: boost.expiresAt, multiplier: boost.multiplier },
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
  return { ...current, status: 'claimed', claimedAt: now, featuredUntil: boost.expiresAt, boost };
}

async function claimLegacyWinner(userId: string, eventId: string) {
  const available = await readLegacyReward(userId, eventId);
  if (!available) return null;
  if (!await winnerHasARealVote(eventId, String(available.trackId))) return null;
  const boost = await activateWinnerShowcase(userId, available.trackId);
  const claimed = await claimLegacyReward(userId, eventId, boost);
  return claimed ? { claimed, boost } : null;
}

async function notifyBoostActivated(userId: string, eventId: string, boost: CityWinnerBoost) {
  await createNotification({
    userId,
    type: 'general',
    title: 'Boost Synaura City active',
    message: CITY_WINNER_MESSAGE,
    actionUrl: '/city',
    relatedId: boost.trackId,
    data: { surface: 'city', eventId, kind: 'city_reward_claimed', boost },
    skipPrefCheck: true,
  }).catch(() => null);
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
        const legacyResult = await claimLegacyWinner(session.user.id, eventId);
        if (!legacyResult) return NextResponse.json({ error: 'Aucune recompense disponible.' }, { status: 404 });
        await notifyBoostActivated(session.user.id, eventId, legacyResult.boost);
        return NextResponse.json({ success: true, legacy: true, reward: legacyResult.claimed, boost: legacyResult.boost, message: CITY_WINNER_MESSAGE });
      }
      throw rewardError;
    }
    if (!reward || reward?.metadata?.source === 'vote' || reward?.metadata?.source === 'participation') {
      const legacyResult = await claimLegacyWinner(session.user.id, eventId);
      if (legacyResult) {
        await notifyBoostActivated(session.user.id, eventId, legacyResult.boost);
        return NextResponse.json({ success: true, legacy: true, reward: legacyResult.claimed, boost: legacyResult.boost, message: CITY_WINNER_MESSAGE });
      }
      return NextResponse.json({ error: 'Aucune recompense disponible.' }, { status: 404 });
    }

    const trackId = String(reward?.metadata?.trackId || reward?.metadata?.track_id || '');
    if (!trackId) return NextResponse.json({ error: 'Le morceau gagnant est introuvable.' }, { status: 409 });
    if (!await winnerHasARealVote(eventId, trackId)) {
      return NextResponse.json({ error: 'Ce boost ne peut pas etre active sans vote reel.' }, { status: 409 });
    }
    const boost = await activateWinnerShowcase(session.user.id, trackId);
    const claimedAt = new Date().toISOString();
    const { data: claimedReward, error } = await supabaseAdmin
      .from('city_user_rewards')
      .update({
        status: 'claimed',
        claimed_at: claimedAt,
        metadata: { ...(reward.metadata || {}), boost },
      })
      .eq('id', reward.id)
      .eq('status', 'available')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!claimedReward) return NextResponse.json({ error: 'Cette recompense a deja ete activee.' }, { status: 409 });

    await notifyBoostActivated(session.user.id, eventId, boost);

    return NextResponse.json({ success: true, reward: claimedReward, boost, message: CITY_WINNER_MESSAGE });
  } catch (error) {
    console.error('city claim failed', error);
    return NextResponse.json({ error: 'Recompense impossible a reclamer.' }, { status: 500 });
  }
}
