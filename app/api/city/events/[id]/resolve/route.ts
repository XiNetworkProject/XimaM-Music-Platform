import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function countVotes(rows: any[] = []) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const trackId = String(row.track_id || '');
    if (trackId) counts.set(trackId, (counts.get(trackId) || 0) + 1);
  });
  return counts;
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

    const voteCounts = countVotes(votesRes.data || []);
    const participationRows = participationsRes.data || [];
    const trackRows = tracksRes.data || [];
    const candidateRows = event.kind === 'battle'
      ? trackRows
      : (participationRows.length ? participationRows : trackRows);
    const winner = [...candidateRows].sort((a: any, b: any) => {
      const aVotes = voteCounts.get(String(a.track_id)) || 0;
      const bVotes = voteCounts.get(String(b.track_id)) || 0;
      return bVotes - aVotes;
    })[0];

    if (!winner?.track_id) return NextResponse.json({ error: 'Aucun gagnant possible.' }, { status: 400 });

    const { data: winnerRow, error: winnerError } = await supabaseAdmin
      .from('city_event_winners')
      .upsert({
        event_id: eventId,
        track_id: winner.track_id,
        user_id: winner.user_id || null,
        rank: 1,
        reason: event.kind === 'battle' ? 'Vote de la communaute' : 'Selection City',
        showcase_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        metadata: { resolvedBy: session.user.id },
      }, { onConflict: 'event_id,rank' })
      .select('*')
      .maybeSingle();
    if (winnerError) throw winnerError;

    await supabaseAdmin.from('city_events').update({ status: 'resolved' }).eq('id', eventId);
    if (winner.user_id) {
      await supabaseAdmin.from('city_user_rewards').upsert({
        event_id: eventId,
        user_id: winner.user_id,
        reward_key: 'city-winner',
        status: 'available',
        metadata: { trackId: winner.track_id, rank: 1 },
      }, { onConflict: 'event_id,user_id,reward_key' });
    }

    return NextResponse.json({ success: true, winner: winnerRow });
  } catch (error) {
    console.error('city resolve failed', error);
    return NextResponse.json({ error: 'Resolution impossible.' }, { status: 500 });
  }
}
