import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TasteAction = 'more' | 'less' | 'hide_artist' | 'show_artist';

const ALLOWED_ACTIONS = new Set<TasteAction>(['more', 'less', 'hide_artist', 'show_artist']);

function cleanIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean))).slice(-250);
}

async function readTaste(userId: string) {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('preferences')
    .eq('id', userId)
    .single();
  if (error) throw error;
  const preferences = profile?.preferences && typeof profile.preferences === 'object' ? profile.preferences : {};
  const taste = (preferences as any).taste && typeof (preferences as any).taste === 'object' ? (preferences as any).taste : {};
  return { preferences, taste, hiddenArtistIds: cleanIds(taste.hiddenArtistIds) };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    const userId = String(session?.user?.id || '');
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const { hiddenArtistIds } = await readTaste(userId);
    return NextResponse.json({ hiddenArtistIds, hiddenArtistsCount: hiddenArtistIds.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    const userId = String(session?.user?.id || '');
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '') as TasteAction;
    const trackId = String(body?.trackId || '').trim();
    const artistId = String(body?.artistId || '').trim();
    if (!ALLOWED_ACTIONS.has(action)) return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    if ((action === 'more' || action === 'less') && !trackId) return NextResponse.json({ error: 'trackId requis' }, { status: 400 });
    if ((action === 'hide_artist' || action === 'show_artist') && !artistId) return NextResponse.json({ error: 'artistId requis' }, { status: 400 });

    let hiddenArtistIds: string[] = [];
    if (action === 'hide_artist' || action === 'show_artist') {
      const { preferences: currentPreferences, taste: currentTaste, hiddenArtistIds: currentHidden } = await readTaste(userId);
      const hidden = new Set(currentHidden);
      if (action === 'hide_artist') hidden.add(artistId);
      else hidden.delete(artistId);
      hiddenArtistIds = Array.from(hidden).slice(-250);

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          preferences: {
            ...currentPreferences,
            taste: { ...currentTaste, hiddenArtistIds, updatedAt: new Date().toISOString() },
          },
        })
        .eq('id', userId);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (trackId && action !== 'show_artist') {
      const eventType = action === 'more' ? 'favorite' : 'skip';
      const { error: eventError } = await supabaseAdmin.from('track_events').insert({
        track_id: trackId,
        artist_id: artistId || null,
        user_id: userId,
        event_type: eventType,
        source: String(body?.source || 'taste-control').slice(0, 80),
        platform: request.headers.get('authorization')?.startsWith('Bearer ') ? 'mobile' : 'web',
        extra: { kind: 'explicit_taste', action },
      });
      if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, action, hiddenArtistIds });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    const userId = String(session?.user?.id || '');
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const { preferences, taste } = await readTaste(userId);
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ preferences: { ...preferences, taste: { ...taste, hiddenArtistIds: [], updatedAt: new Date().toISOString() } } })
      .eq('id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, hiddenArtistIds: [], hiddenArtistsCount: 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 });
  }
}
