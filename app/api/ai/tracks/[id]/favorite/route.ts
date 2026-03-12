import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: trackId } = await params;
    const userId = session.user.id;
    const body = await request.json().catch(() => ({}));
    const checkOnly = body?.check_only === true;
    const desiredState = typeof body?.is_favorite === 'boolean' ? body.is_favorite : null;

    const { data: existing } = await supabaseAdmin
      .from('ai_track_likes')
      .select('id')
      .eq('track_id', trackId)
      .eq('user_id', userId)
      .maybeSingle();

    const currentlyLiked = !!existing;

    if (checkOnly) {
      return NextResponse.json({ is_favorite: currentlyLiked, track_id: trackId });
    }

    const { data: track, error: fetchError } = await supabaseAdmin
      .from('ai_tracks')
      .select('id')
      .eq('id', trackId)
      .single();

    if (fetchError || !track) {
      return NextResponse.json({ error: 'Piste introuvable' }, { status: 404 });
    }

    const newState = desiredState !== null ? desiredState : !currentlyLiked;

    if (newState && !currentlyLiked) {
      const { error } = await supabaseAdmin
        .from('ai_track_likes')
        .insert({ track_id: trackId, user_id: userId });
      if (error && error.code !== '23505') {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else if (!newState && currentlyLiked) {
      const { error } = await supabaseAdmin
        .from('ai_track_likes')
        .delete()
        .eq('track_id', trackId)
        .eq('user_id', userId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ is_favorite: newState, track_id: trackId });
  } catch (e: any) {
    console.error('Erreur toggle favori track:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}
