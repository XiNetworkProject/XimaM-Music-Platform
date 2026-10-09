import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { dbAdmin, createDatabaseClient } from '@/lib/database';
import { withDatabaseTransaction } from '@/lib/postgres';
import { enforceRequestRateLimit, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';
import { remixPermissionsFromRow, remixPermissionsToRow, sanitizeRemixPermissions } from '@/lib/remixPermissions';
import { applyRemixPublicationGuard } from '@/lib/remixServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = rejectUntrustedMutationOrigin(req);
  if (originError) return originError;
  const session = await getApiSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }
  const limited = enforceRequestRateLimit(req, 'ai-track-publication', 20, 60_000, session.user.id);
  if (limited) return limited;

  const { id } = await params;
  const trackId = String(id || '').trim();
  if (!trackId) {
    return NextResponse.json({ error: 'Track id requis' }, { status: 400 });
  }

  try {
    const parsed = await readLimitedJson<{ isPublic?: boolean; remixPermissions?: unknown }>(req, 8 * 1024);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;
    if (!body || typeof body.isPublic !== 'boolean') {
      return NextResponse.json({ error: 'isPublic doit etre un booleen' }, { status: 400 });
    }

    const { data: track, error: fetchError } = await dbAdmin
      .from('ai_tracks')
      .select('*, generation:ai_generations!inner(user_id, status, is_public, is_trashed)')
      .eq('id', trackId)
      .single();

    if (fetchError || !track) {
      return NextResponse.json({ error: 'Track introuvable' }, { status: 404 });
    }

    const gen = track.generation as any;
    if (String(gen?.user_id) !== String(session.user.id)) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 });
    }
    if (body.isPublic && (gen.status !== 'completed' || gen.is_trashed || !track.audio_url)) {
      return NextResponse.json({ error: 'La piste doit être terminée et hors de la corbeille avant publication.' }, { status: 409 });
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

    const updated = await withDatabaseTransaction(async client => {
      const locked = await client.query('SELECT id, is_public, status, is_trashed FROM ai_generations WHERE id = $1 AND user_id = $2 FOR UPDATE', [track.generation_id, session.user.id]);
      const parent = locked.rows[0];
      if (!parent || (effectivePublic && (parent.status !== 'completed' || parent.is_trashed))) throw new Error('Génération indisponible');
      const database = createDatabaseClient(client);
      if (effectivePublic) {
        // Public readers require BOTH flags. Opening this gate must never publish
        // the other version implicitly, including legacy NULL visibility flags.
        if (parent.is_public !== true) {
          const siblings = await database.from('ai_tracks').update({ is_public: false }).eq('generation_id', track.generation_id);
          if (siblings.error) throw new Error('Publication impossible');
        }
        const parentUpdate = await database.from('ai_generations').update({ is_public: true }).eq('id', track.generation_id);
        if (parentUpdate.error) throw new Error('Publication impossible');
      }
      const result = await database.from('ai_tracks').update({ is_public: effectivePublic, ...remixPermissionsToRow(nextPermissions) }).eq('id', trackId).select('*').single();
      if (result.error || !result.data) throw new Error('Publication impossible');
      return result.data;
    });

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
