import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function countsByTrack(rows: any[] = []) {
  return rows.reduce((acc, row) => {
    const trackId = String(row.track_id || '');
    if (trackId) acc[trackId] = (acc[trackId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = decodeURIComponent(params.id || '');
    if (!eventId) return NextResponse.json({ error: 'Event invalide.' }, { status: 400 });

    const session = await getApiSession(request).catch(() => null);
    const userId = session?.user?.id || null;

    const [eventRes, tracksRes, votesRes, participationsRes, winnersRes, rewardsRes] = await Promise.all([
      supabaseAdmin.from('city_events').select('*').eq('id', eventId).maybeSingle(),
      supabaseAdmin.from('city_event_tracks').select('*').eq('event_id', eventId).order('slot', { ascending: true }),
      supabaseAdmin.from('city_event_votes').select('track_id, user_id, created_at').eq('event_id', eventId),
      supabaseAdmin.from('city_event_participations').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
      supabaseAdmin.from('city_event_winners').select('*').eq('event_id', eventId).order('rank', { ascending: true }),
      userId ? supabaseAdmin.from('city_user_rewards').select('*').eq('event_id', eventId).eq('user_id', userId) : Promise.resolve({ data: [] } as any),
    ]);

    if (eventRes.error) throw eventRes.error;
    if (!eventRes.data) return NextResponse.json({ error: 'Event introuvable.' }, { status: 404 });
    for (const result of [tracksRes, votesRes, participationsRes, winnersRes, rewardsRes]) {
      if ((result as any).error) throw (result as any).error;
    }

    const votes = votesRes.data || [];
    const participations = participationsRes.data || [];
    const userVote = userId ? votes.find((vote: any) => String(vote.user_id) === userId) : null;
    const userParticipation = userId ? participations.find((entry: any) => String(entry.user_id) === userId) : null;
    const reward = (rewardsRes.data || [])[0] || null;

    return NextResponse.json({
      event: eventRes.data,
      tracks: tracksRes.data || [],
      voteCounts: countsByTrack(votes),
      totalVotes: votes.length,
      selectedTrackId: userVote?.track_id || null,
      participations,
      participationCount: participations.length,
      userParticipation,
      winners: winnersRes.data || [],
      claimStatus: reward?.status || 'none',
      reward,
      activeBoost: reward?.metadata?.boost || null,
    });
  } catch (error) {
    console.error('city event detail failed', error);
    return NextResponse.json({ error: 'Impossible de charger cet event.' }, { status: 500 });
  }
}
