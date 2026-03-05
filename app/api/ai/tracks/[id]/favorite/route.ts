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
    const body = await request.json().catch(() => ({}));
    const desiredState = typeof body?.is_favorite === 'boolean' ? body.is_favorite : null;

    const { data: track, error: fetchError } = await supabaseAdmin
      .from('ai_tracks')
      .select('id, generation_id')
      .eq('id', trackId)
      .single();

    if (fetchError || !track) {
      return NextResponse.json({ error: 'Piste introuvable' }, { status: 404 });
    }

    const generationId = track.generation_id;
    if (!generationId) {
      return NextResponse.json({ error: 'Génération parente introuvable' }, { status: 404 });
    }

    const { data: generation, error: genError } = await supabaseAdmin
      .from('ai_generations')
      .select('id, is_favorite')
      .eq('id', generationId)
      .single();

    if (genError || !generation) {
      return NextResponse.json({ error: 'Génération introuvable' }, { status: 404 });
    }

    const newState = desiredState !== null ? desiredState : !generation.is_favorite;

    const { error } = await supabaseAdmin
      .from('ai_generations')
      .update({ is_favorite: newState })
      .eq('id', generationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ is_favorite: newState, generation_id: generationId });
  } catch (e: any) {
    console.error('Erreur toggle favori track:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}
