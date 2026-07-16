import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { countCityVotes, selectCityBattleWinner } from '@/lib/cityVoting';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveTrackOwnerId(trackId: string, candidate: any) {
  const metadata = candidate?.metadata && typeof candidate.metadata === 'object' ? candidate.metadata : {};
  const embeddedOwner = String(candidate?.user_id || candidate?.creator_id || metadata.creatorId || metadata.submittedBy || '');
  if (embeddedOwner) return embeddedOwner;

  if (trackId.startsWith('ai-')) {
    const { data } = await supabaseAdmin
      .from('ai_tracks')
      .select('generation:ai_generations!inner(user_id)')
      .eq('id', trackId.slice(3))
      .maybeSingle();
    const generation = Array.isArray((data as any)?.generation) ? (data as any).generation[0] : (data as any)?.generation;
    return generation?.user_id ? String(generation.user_id) : null;
  }

  const { data } = await supabaseAdmin
    .from('tracks')
    .select('creator_id, user_id')
    .eq('id', trackId)
    .maybeSingle();
  return (data as any)?.creator_id || (data as any)?.user_id || null;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie.' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();
    if (!['admin', 'moderator'].includes(String(profile?.role || ''))) {
      return NextResponse.json({ error: 'Reserve a l equipe Synaura.' }, { status: 403 });
    }

    const eventId = decodeURIComponent(params.id || '');
    const { data: event, error: eventError } = await supabaseAdmin
      .from('city_events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event) return NextResponse.json({ error: 'Event introuvable.' }, { status: 404 });

    const [tracksRes, votesRes, participationsRes] = await Promise.all([
      supabaseAdmin.from('city_event_tracks').select('*').eq('event_id', eventId),
      supabaseAdmin.from('city_event_votes').select('*').eq('event_id', eventId),
      supabaseAdmin.from('city_event_participations').select('*').eq('event_id', eventId),
    ]);
    for (const result of [tracksRes, votesRes, participationsRes]) {
      if ((result as any).error) throw (result as any).error;
    }

    const voteCounts = countCityVotes(votesRes.data || []);
    const participationRows = participationsRes.data || [];
    const trackRows = tracksRes.data || [];
    const candidateRows = event.kind === 'battle' ? trackRows : (participationRows.length ? participationRows : trackRows);
    const winningTrack = event.kind === 'battle'
      ? selectCityBattleWinner(
          trackRows.map((row: any) => ({ _id: String(row.track_id), pulse: Number(row.score || 0) })),
          voteCounts,
        )
      : candidateRows[0] ? { _id: String(candidateRows[0].track_id) } : null;
    const winner = winningTrack
      ? candidateRows.find((row: any) => String(row.track_id) === winningTrack._id)
      : null;

    if (!winner?.track_id) {
      const error = event.kind === 'battle' ? 'Aucun vote reel enregistre pour cette battle.' : 'Aucun gagnant possible.';
      return NextResponse.json({ error }, { status: 400 });
    }
    const winnerUserId = await resolveTrackOwnerId(String(winner.track_id), winner);
    if (!winnerUserId) return NextResponse.json({ error: 'Le proprietaire du morceau gagnant est introuvable.' }, { status: 409 });

    const { data: winnerRow, error: winnerError } = await supabaseAdmin
      .from('city_event_winners')
      .upsert({
        event_id: eventId,
        track_id: winner.track_id,
        user_id: winnerUserId,
        rank: 1,
        reason: event.kind === 'battle' ? 'Vote de la communaute' : 'Selection City',
        showcase_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        metadata: { resolvedBy: session.user.id, voteCount: Number(voteCounts[String(winner.track_id)] || 0) },
      }, { onConflict: 'event_id,rank' })
      .select('*')
      .maybeSingle();
    if (winnerError) throw winnerError;

    await supabaseAdmin.from('city_events').update({ status: 'resolved' }).eq('id', eventId);
    if (winnerUserId) {
      const { error: rewardError } = await supabaseAdmin.from('city_user_rewards').upsert({
        event_id: eventId,
        user_id: winnerUserId,
        reward_key: 'city-winner',
        status: 'available',
        metadata: { trackId: winner.track_id, rank: 1 },
      }, { onConflict: 'event_id,user_id,reward_key' });
      if (rewardError) throw rewardError;
    }

    return NextResponse.json({ success: true, winner: winnerRow });
  } catch (error) {
    console.error('city resolve failed', error);
    return NextResponse.json({ error: 'Resolution impossible.' }, { status: 500 });
  }
}
