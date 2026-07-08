import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { getRemixSourceSummary } from '@/lib/remixServer';
import { notifyRemixApproved, notifyRemixRejected } from '@/lib/notifications';

// Decision (approve/reject) du proprietaire du morceau source sur une variation
// IA en attente. Revalide tout cote serveur : proprietaire reel, statut actuel,
// et (pour l'acceptation) que la source autorise toujours les variations.
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
  const remixId = String(id || '').trim();
  if (!remixId) {
    return NextResponse.json({ error: 'Identifiant de variation requis' }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { decision?: string };
  const decision = body.decision === 'approve' || body.decision === 'reject' ? body.decision : null;
  if (!decision) {
    return NextResponse.json({ error: "decision doit etre 'approve' ou 'reject'" }, { status: 400 });
  }

  try {
    const { data: remix, error: remixError } = await supabaseAdmin
      .from('track_remixes')
      .select('*')
      .eq('id', remixId)
      .maybeSingle();

    if (remixError) throw remixError;
    if (!remix) return NextResponse.json({ error: 'Variation introuvable' }, { status: 404 });

    // Seul le proprietaire reel du morceau source peut decider - jamais le
    // createur de la variation, jamais un tiers.
    const source = await getRemixSourceSummary({
      sourceTrackId: remix.source_track_id,
      sourceTrackType: remix.source_track_type,
      userId: session.user.id,
    });
    if (!source) return NextResponse.json({ error: 'Morceau source introuvable' }, { status: 404 });
    if (!source.artistId || String(source.artistId) !== String(session.user.id)) {
      return NextResponse.json({ error: 'Seul le proprietaire du morceau source peut decider' }, { status: 403 });
    }

    if (remix.status !== 'pending_approval') {
      return NextResponse.json({ error: "Cette variation n'est plus en attente d'approbation" }, { status: 409 });
    }

    const now = new Date().toISOString();

    // Pour notifier le createur de la variation sur "Mes variations" (jamais un
    // titre/statut prive dans le texte, juste un lien vers son propre profil).
    const { data: creatorProfile } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('id', remix.creator_id)
      .maybeSingle();
    const creatorActionUrl = creatorProfile?.username
      ? `/profile/${encodeURIComponent(creatorProfile.username)}?tab=variations`
      : null;

    if (decision === 'reject') {
      // Statut 'rejected' uniquement : le brouillon du createur n'est jamais
      // supprime, et is_public reste tel quel (deja prive).
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('track_remixes')
        .update({ status: 'rejected', decided_by: session.user.id, decided_at: now, updated_at: now })
        .eq('id', remixId)
        .eq('status', 'pending_approval')
        .select('id, status')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return NextResponse.json({ error: "Cette variation n'est plus en attente d'approbation" }, { status: 409 });

      if (creatorActionUrl) {
        notifyRemixRejected(remix.creator_id, remixId, creatorActionUrl).catch((error) =>
          console.error('[notifications] remix_rejected failed', error),
        );
      }

      return NextResponse.json({ remixId, status: 'rejected' });
    }

    // decision === 'approve' : revalider que la source autorise encore les
    // variations IA au moment precis de la decision (elle a pu redevenir
    // privee ou desactiver les variations depuis la creation du brouillon).
    if (!source.isPublic || !source.allowAiVariation || source.remixVisibility === 'disabled') {
      return NextResponse.json(
        { error: "Ce morceau n'autorise plus les variations IA pour le moment" },
        { status: 409 },
      );
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('track_remixes')
      .update({ status: 'published', decided_by: session.user.id, decided_at: now, updated_at: now })
      .eq('id', remixId)
      .eq('status', 'pending_approval')
      .select('id, status, child_track_id')
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) return NextResponse.json({ error: "Cette variation n'est plus en attente d'approbation" }, { status: 409 });

    const { data: childTrack, error: childError } = await supabaseAdmin
      .from('ai_tracks')
      .update({ is_public: true })
      .eq('id', remix.child_track_id)
      .select('id, generation_id')
      .maybeSingle();
    if (childError) throw childError;

    if (childTrack?.generation_id) {
      await supabaseAdmin.from('ai_generations').update({ is_public: true }).eq('id', childTrack.generation_id);
    }

    if (creatorActionUrl) {
      notifyRemixApproved(remix.creator_id, remixId, creatorActionUrl).catch((error) =>
        console.error('[notifications] remix_approved failed', error),
      );
    }

    return NextResponse.json({ remixId, status: 'published', childTrackId: remix.child_track_id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Impossible de traiter la decision' }, { status: 500 });
  }
}
