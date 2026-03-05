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

    const { id: generationId } = await params;
    const userId = session.user.id;
    const body = await request.json().catch(() => ({}));
    const desiredState = typeof body?.is_trashed === 'boolean' ? body.is_trashed : null;

    const { data: gen, error: fetchError } = await supabaseAdmin
      .from('ai_generations')
      .select('*')
      .eq('id', generationId)
      .single();

    if (fetchError || !gen) {
      return NextResponse.json({ error: 'Génération introuvable' }, { status: 404 });
    }

    if (gen.user_id !== userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const newState = desiredState !== null ? desiredState : !((gen as any).is_trashed ?? false);

    const { error } = await supabaseAdmin
      .from('ai_generations')
      .update({ is_trashed: newState } as any)
      .eq('id', generationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ is_trashed: newState, generation_id: generationId });
  } catch (e: any) {
    console.error('Erreur toggle corbeille:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}
