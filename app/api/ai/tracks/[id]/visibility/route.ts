import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { remixPermissionsFromRow, remixPermissionsToRow, sanitizeRemixPermissions } from '@/lib/remixPermissions';
import { applyRemixPublicationGuard } from '@/lib/remixServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  const { id } = await params;
  const trackId = String(id || '').trim();
  if (!trackId) {
    return NextResponse.json({ error: 'Track id requis' }, { status: 400 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { isPublic?: boolean; remixPermissions?: unknown };
    if (typeof body.isPublic !== 'boolean') {
      return NextResponse.json({ error: 'isPublic doit etre un booleen' }, { status: 400 });
    }

    const { data: track, error: fetchError } = await supabaseAdmin
      .from('ai_tracks')
      .select('*, generation:ai_generations!inner(user_id)')
      .eq('id', trackId)
      .single();

    if (fetchError || !track) {
      return NextResponse.json({ error: 'Track introuvable' }, { status: 404 });
    }

    const gen = track.generation as any;
    if (String(gen?.user_id) !== String(session.user.id)) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 });
    }

    // Le createur choisit explicitement les droits de creation avant publication ;
    // sans choix (ou si le morceau redevient prive), on reste sur "remix desactive".
    const currentPermissions = remixPermissionsFromRow(track);
    const nextPermissions = body.isPublic
      ? sanitizeRemixPermissions(body.remixPermissions, currentPermissions)
      : currentPermissions;

    const publicationGuard = await applyRemixPublicationGuard({
      childTrackIds: [trackId],
      userId: session.user.id,
      requestedPublic: body.isPublic,
    });
    const effectivePublic = publicationGuard.effectivePublic;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('ai_tracks')
      .update({ is_public: effectivePublic, ...remixPermissionsToRow(nextPermissions) })
      .eq('id', trackId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Erreur update visibilite track:', updateError);
      return NextResponse.json({ error: updateError.message || 'Erreur update visibilite' }, { status: 500 });
    }

    return NextResponse.json({
      trackId: updated?.id || trackId,
      isPublic: effectivePublic,
      remixStatus: publicationGuard.remixStatus,
      ...remixPermissionsFromRow(updated),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur interne' }, { status: 500 });
  }
}
