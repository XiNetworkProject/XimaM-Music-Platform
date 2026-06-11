import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('preferences')
      .eq('id', session.user.id)
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
      .eq('id', session.user.id);
    if (error) throw error;

    return NextResponse.json({ success: true, battleId, trackId });
  } catch (error) {
    console.error('city vote failed', error);
    return NextResponse.json({ error: 'Le vote n a pas pu etre enregistre.' }, { status: 500 });
  }
}
