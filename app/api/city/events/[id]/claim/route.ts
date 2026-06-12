import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cityTableMissing(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('schema cache');
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
  if (!current || current.status !== 'available') return false;

  const now = new Date().toISOString();
  const cityRewards = { ...rewards, [eventId]: { ...current, status: 'claimed', claimedAt: now, updatedAt: now } };
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ preferences: { ...preferences, cityRewards }, updated_at: now })
    .eq('id', userId);
  if (error) throw error;
  return true;
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
        return NextResponse.json({ success: true, legacy: true });
      }
      throw rewardError;
    }
    if (!reward) {
      const claimed = await claimLegacyReward(session.user.id, eventId).catch(() => false);
      if (claimed) return NextResponse.json({ success: true, legacy: true });
      return NextResponse.json({ error: 'Aucune recompense disponible.' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('city_user_rewards')
      .update({ status: 'claimed', claimed_at: new Date().toISOString() })
      .eq('id', reward.id);
    if (error) throw error;

    await claimLegacyReward(session.user.id, eventId).catch(() => {});

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
