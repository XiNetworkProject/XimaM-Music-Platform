import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function cityTableMissing(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('schema cache');
}

async function writeLegacyVote(userId: string, battleId: string, trackId: string) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('preferences')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) throw profileError;

  const preferences = profile?.preferences && typeof profile.preferences === 'object' ? profile.preferences : {};
  const previousVotes = preferences.cityBattleVotes && typeof preferences.cityBattleVotes === 'object'
    ? preferences.cityBattleVotes
    : {};
  const cityBattleVotes = { ...previousVotes, [battleId]: trackId };
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ preferences: { ...preferences, cityBattleVotes }, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Connecte-toi pour voter.' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const battleId = typeof body?.battleId === 'string' ? body.battleId.trim() : '';
    const trackId = typeof body?.trackId === 'string' ? body.trackId.trim() : '';
    if (!battleId || !trackId || battleId.length > 32 || trackId.length > 180) {
      return NextResponse.json({ error: 'Vote invalide.' }, { status: 400 });
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from('city_events')
      .select('id, kind, status, starts_at, ends_at')
      .eq('id', battleId)
      .maybeSingle();
    if (eventError) {
      if (cityTableMissing(eventError)) {
        await writeLegacyVote(session.user.id, battleId, trackId);
        return NextResponse.json({ success: true, battleId, trackId, legacy: true });
      }
      throw eventError;
    }
    if (!event || event.kind !== 'battle') return NextResponse.json({ error: 'Battle introuvable.' }, { status: 404 });
    if (event.starts_at && Date.now() < new Date(event.starts_at).getTime()) {
      return NextResponse.json({ error: 'Ce vote n est pas encore ouvert.' }, { status: 400 });
    }
    if (event.ends_at && Date.now() > new Date(event.ends_at).getTime()) {
      return NextResponse.json({ error: 'Cette battle est terminee.' }, { status: 400 });
    }

    const { data: eventTrack, error: trackError } = await supabaseAdmin
      .from('city_event_tracks')
      .select('track_id')
      .eq('event_id', battleId)
      .eq('track_id', trackId)
      .maybeSingle();
    if (trackError) throw trackError;
    if (!eventTrack) return NextResponse.json({ error: 'Ce son ne participe pas a cette battle.' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('city_event_votes')
      .upsert({
        event_id: battleId,
        track_id: trackId,
        user_id: session.user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'event_id,user_id' });
    if (error) throw error;

    await writeLegacyVote(session.user.id, battleId, trackId).catch(() => {});

    return NextResponse.json({ success: true, battleId, trackId });
  } catch (error) {
    console.error('city vote failed', error);
    return NextResponse.json({ error: 'Le vote n a pas pu etre enregistre.' }, { status: 500 });
  }
}
