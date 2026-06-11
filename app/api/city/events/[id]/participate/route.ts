import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cityTableMissing(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('schema cache');
}

// Le son doit exister ET appartenir a l'utilisateur qui participe.
async function trackOwnedByUser(trackId: string, userId: string) {
  if (trackId.startsWith('ai-')) {
    const { data } = await supabaseAdmin
      .from('ai_tracks')
      .select('id, generation:ai_generations!inner(user_id)')
      .eq('id', trackId.replace(/^ai-/, ''))
      .maybeSingle();
    if (!data) return { exists: false, owned: false };
    const generation = Array.isArray((data as any).generation) ? (data as any).generation[0] : (data as any).generation;
    return { exists: true, owned: String(generation?.user_id || '') === userId };
  }
  const { data } = await supabaseAdmin.from('tracks').select('id, creator_id').eq('id', trackId).maybeSingle();
  if (!data) return { exists: false, owned: false };
  return { exists: true, owned: String((data as any).creator_id || '') === userId };
}

// Fallback sans migration: la participation vit dans profiles.preferences
// jusqu'a ce que les tables city_* soient creees.
async function writeLegacyParticipation(userId: string, eventId: string, trackId: string) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('preferences')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) throw profileError;

  const preferences = profile?.preferences && typeof profile.preferences === 'object' ? profile.preferences : {};
  const previous = preferences.cityParticipations && typeof preferences.cityParticipations === 'object'
    ? preferences.cityParticipations
    : {};
  const previousRewards = preferences.cityRewards && typeof preferences.cityRewards === 'object'
    ? preferences.cityRewards
    : {};
  const now = new Date().toISOString();
  const cityParticipations = { ...previous, [eventId]: { trackId, at: now } };
  const cityRewards = { ...previousRewards, [eventId]: { status: 'available', updatedAt: now } };
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ preferences: { ...preferences, cityParticipations, cityRewards }, updated_at: now })
    .eq('id', userId);
  if (error) throw error;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Connecte-toi pour participer.' }, { status: 401 });

    const eventId = decodeURIComponent(params.id || '');
    const body = await request.json().catch(() => ({}));
    const trackId = typeof body?.trackId === 'string' ? body.trackId.trim() : '';
    if (!eventId || !trackId || trackId.length > 180) {
      return NextResponse.json({ error: 'Participation invalide.' }, { status: 400 });
    }

    const ownership = await trackOwnedByUser(trackId, session.user.id);
    if (!ownership.exists) return NextResponse.json({ error: 'Son introuvable.' }, { status: 404 });
    if (!ownership.owned) return NextResponse.json({ error: 'Tu ne peux participer qu avec un de tes sons.' }, { status: 403 });

    const { data: event, error: eventError } = await supabaseAdmin
      .from('city_events')
      .select('id, kind, status, starts_at, ends_at, challenge_tag, theme')
      .eq('id', eventId)
      .maybeSingle();
    if (eventError) {
      if (cityTableMissing(eventError)) {
        await writeLegacyParticipation(session.user.id, eventId, trackId);
        return NextResponse.json({ success: true, eventId, trackId, legacy: true });
      }
      throw eventError;
    }
    if (!event) {
      // L'event est peut-etre genere dynamiquement et pas encore seede: fallback legacy.
      await writeLegacyParticipation(session.user.id, eventId, trackId);
      return NextResponse.json({ success: true, eventId, trackId, legacy: true });
    }
    if (event.kind === 'battle') return NextResponse.json({ error: 'Utilise le vote pour la battle.' }, { status: 400 });
    if (event.starts_at && Date.now() < new Date(event.starts_at).getTime()) {
      return NextResponse.json({ error: 'Cet event n a pas encore commence.' }, { status: 400 });
    }
    if (event.ends_at && Date.now() > new Date(event.ends_at).getTime()) {
      return NextResponse.json({ error: 'Cet event est termine.' }, { status: 400 });
    }

    const { data: participation, error } = await supabaseAdmin
      .from('city_event_participations')
      .upsert({
        event_id: eventId,
        user_id: session.user.id,
        track_id: trackId,
        status: 'submitted',
        metadata: {
          challengeTag: event.challenge_tag,
          theme: event.theme,
        },
      }, { onConflict: 'event_id,user_id,track_id' })
      .select('*')
      .maybeSingle();
    if (error) {
      if (cityTableMissing(error)) {
        await writeLegacyParticipation(session.user.id, eventId, trackId);
        return NextResponse.json({ success: true, eventId, trackId, legacy: true });
      }
      throw error;
    }

    await supabaseAdmin
      .from('city_event_tracks')
      .upsert({
        event_id: eventId,
        track_id: trackId,
        slot: 1000,
        source: 'submission',
        metadata: { submittedBy: session.user.id },
      }, { onConflict: 'event_id,track_id' });

    await supabaseAdmin
      .from('city_user_rewards')
      .upsert({
        event_id: eventId,
        user_id: session.user.id,
        reward_key: event.kind === 'friday_drop' ? 'friday-drop' : event.kind === 'seasonal' ? 'seasonal-spark' : 'challenge-drop',
        status: 'available',
        metadata: { source: 'participation', trackId },
      }, { onConflict: 'event_id,user_id,reward_key' });

    await writeLegacyParticipation(session.user.id, eventId, trackId).catch(() => {});

    return NextResponse.json({ success: true, participation });
  } catch (error) {
    console.error('city participate failed', error);
    return NextResponse.json({ error: 'Participation impossible.' }, { status: 500 });
  }
}
