import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  const { id } = await params;
  const trackId = String(id || '').trim();
  if (!trackId) {
    return NextResponse.json({ error: 'Track id requis' }, { status: 400 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { isPublic?: boolean };
    if (typeof body.isPublic !== 'boolean') {
      return NextResponse.json({ error: 'isPublic doit etre un booleen' }, { status: 400 });
    }

    const { data: track, error: fetchError } = await supabaseAdmin
      .from('ai_tracks')
      .select('id, generation_id, generation:ai_generations!inner(user_id)')
      .eq('id', trackId)
      .single();

    if (fetchError || !track) {
      return NextResponse.json({ error: 'Track introuvable' }, { status: 404 });
    }

    const gen = track.generation as any;
    if (String(gen?.user_id) !== String(session.user.id)) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('ai_tracks')
      .update({ is_public: body.isPublic })
      .eq('id', trackId)
      .select('id, is_public')
      .single();

    if (updateError) {
      console.error('Erreur update visibilite track:', updateError);
      return NextResponse.json({ error: updateError.message || 'Erreur update visibilite' }, { status: 500 });
    }

    return NextResponse.json({
      trackId: updated?.id || trackId,
      isPublic: body.isPublic,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur interne' }, { status: 500 });
  }
}
