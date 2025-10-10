import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playlistId = params?.id;
    if (!playlistId) {
      return NextResponse.json({ error: 'playlist_id requis' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const orderedTrackIds: string[] = Array.isArray(body?.orderedTrackIds) ? body.orderedTrackIds : [];
    if (!orderedTrackIds.length) {
      return NextResponse.json({ error: 'orderedTrackIds requis' }, { status: 400 });
    }

    // Mettre à jour les positions séquentiellement
    for (let index = 0; index < orderedTrackIds.length; index++) {
      const trackId = orderedTrackIds[index];
      const { error } = await supabase
        .from('playlist_tracks')
        .update({ position: index })
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId);
      if (error) {
        console.error('reorder error:', error);
        return NextResponse.json({ error: 'Erreur de mise à jour des positions' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur reorder:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


