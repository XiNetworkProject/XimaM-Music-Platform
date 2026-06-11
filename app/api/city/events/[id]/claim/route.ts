import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    if (rewardError) throw rewardError;
    if (!reward) return NextResponse.json({ error: 'Aucune recompense disponible.' }, { status: 404 });

    const { error } = await supabaseAdmin
      .from('city_user_rewards')
      .update({ status: 'claimed', claimed_at: new Date().toISOString() })
      .eq('id', reward.id);
    if (error) throw error;

    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: session.user.id,
        type: 'city_reward',
        title: 'Recompense Synaura City',
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
