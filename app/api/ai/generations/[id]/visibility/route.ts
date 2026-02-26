import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  const { id } = await params;
  const generationId = String(id || '').trim();
  if (!generationId) {
    return NextResponse.json({ error: 'Generation id requis' }, { status: 400 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { isPublic?: boolean };
    if (typeof body.isPublic !== 'boolean') {
      return NextResponse.json({ error: 'isPublic doit etre un booleen' }, { status: 400 });
    }

    const { data: current, error: fetchError } = await supabaseAdmin
      .from('ai_generations')
      .select('id, user_id, is_public')
      .eq('id', generationId)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Generation introuvable' }, { status: 404 });
    }

    if (String(current.user_id) !== String(session.user.id)) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('ai_generations')
      .update({ is_public: body.isPublic })
      .eq('id', generationId)
      .eq('user_id', session.user.id)
      .select('id, is_public')
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: updateError?.message || 'Erreur update visibilite' }, { status: 500 });
    }

    return NextResponse.json({
      generationId: updated.id,
      isPublic: Boolean(updated.is_public),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur interne' }, { status: 500 });
  }
}

