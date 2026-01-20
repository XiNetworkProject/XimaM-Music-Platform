import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const rawInventoryId = (body?.inventoryId ?? '').toString().trim();
    const rawTargetTrackId = (body?.targetTrackId ?? '').toString().trim();
    const inventoryId = rawInventoryId;
    const targetTrackId = rawTargetTrackId;
    if (!inventoryId) {
      return NextResponse.json({ error: 'inventoryId requis' }, { status: 400 });
    }
    if (targetTrackId === 'radio-mixx-party' || targetTrackId === 'radio-ximam') {
      return NextResponse.json({ error: 'La radio ne peut pas être boostée' }, { status: 400 });
    }

    // Lire l'item d'inventaire
    const { data: inv, error: invErr } = await supabaseAdmin
      .from('user_boosters')
      .select('id, status, booster:boosters(id, type, multiplier, duration_hours, enabled)')
      .eq('id', inventoryId)
      .eq('user_id', userId)
      .single();
    if (invErr || !inv) {
      return NextResponse.json({ error: 'Booster introuvable' }, { status: 404 });
    }
    // Normaliser la jointure (peut revenir sous forme de tableau)
    const booster: any = Array.isArray((inv as any).booster) ? (inv as any).booster[0] : (inv as any).booster;
    if (!booster) {
      return NextResponse.json({ error: 'Données booster invalides' }, { status: 400 });
    }

    if (inv.status !== 'owned' || booster?.enabled === false) {
      return NextResponse.json({ error: 'Booster non utilisable' }, { status: 400 });
    }
    if (booster?.type === 'artist') {
      // Activer un boost artiste sur le propriétaire (l'artiste = userId)
      const now = new Date();
      const expires = new Date(now.getTime() + (booster.duration_hours * 3_600_000));
      const nowIso = now.toISOString();
      const expiresIso = expires.toISOString();

      // Fusionner éventuels boosts actifs artiste
      const { data: existing, error: existingErr } = await supabaseAdmin
        .from('active_artist_boosts')
        .select('id, multiplier, expires_at')
        .eq('artist_id', userId)
        .gt('expires_at', nowIso);
      if (existingErr) {
        return NextResponse.json({ error: 'Erreur lecture boost artiste' }, { status: 500 });
      }

      if (Array.isArray(existing) && existing.length > 0) {
        const keepId = existing[0].id;
        const mergedMultiplier = existing.reduce((m, b) => Math.max(m, Number(b.multiplier) || 1), Number(booster.multiplier) || 1);
        const mergedExpires = new Date(Math.max(
          ...existing.map((b) => new Date(b.expires_at).getTime()),
          expires.getTime()
        )).toISOString();

        const { error: upd } = await supabaseAdmin
          .from('active_artist_boosts')
          .update({ multiplier: mergedMultiplier, expires_at: mergedExpires })
          .eq('id', keepId);
        if (upd) return NextResponse.json({ error: 'Erreur maj boost artiste' }, { status: 500 });
      } else {
        const { error: ins } = await supabaseAdmin
          .from('active_artist_boosts')
          .insert({ artist_id: userId, user_id: userId, booster_id: booster.id, multiplier: booster.multiplier, started_at: nowIso, expires_at: expiresIso, source: 'booster' });
        if (ins) return NextResponse.json({ error: 'Erreur activation artiste' }, { status: 500 });
      }

      // Consommer l’inventaire
      const { error: updErr2 } = await supabaseAdmin
        .from('user_boosters')
        .update({ status: 'used', used_at: new Date().toISOString() })
        .eq('id', inventoryId)
        .eq('user_id', userId);
      if (updErr2) return NextResponse.json({ error: 'Erreur maj inventaire' }, { status: 500 });

      return NextResponse.json({ ok: true, boost: { artistId: userId, type: 'artist' } });
    }

    if (booster?.type !== 'track') {
      return NextResponse.json({ error: 'Ce booster ne cible pas une piste' }, { status: 400 });
    }

    // Pour booster de type piste, targetTrackId est requis
    if (!targetTrackId) {
      return NextResponse.json({ error: 'targetTrackId requis pour booster de piste' }, { status: 400 });
    }

    // Interdire les pistes IA
    if (String(targetTrackId).startsWith('ai-')) {
      return NextResponse.json({ error: 'Les pistes IA ne peuvent pas être boostées' }, { status: 400 });
    }

    // Vérifier que la piste existe et appartient à l'utilisateur
    const { data: trackRow, error: trackErr } = await supabaseAdmin
      .from('tracks')
      .select('id, creator_id')
      .eq('id', targetTrackId)
      .maybeSingle();
    if (trackErr) {
      return NextResponse.json({ error: 'Erreur vérification piste' }, { status: 500 });
    }
    if (!trackRow) {
      return NextResponse.json({ error: 'Piste introuvable' }, { status: 404 });
    }
    if (trackRow.creator_id !== userId) {
      return NextResponse.json({ error: 'Vous ne pouvez booster que vos propres pistes' }, { status: 403 });
    }

    const now = new Date();
    const expires = new Date(now.getTime() + (booster.duration_hours * 3_600_000));
    const nowIso = now.toISOString();

    // Chercher un boost actif déjà présent pour cette piste et fusionner au besoin
    const { data: existingBoosts, error: existingErr } = await supabaseAdmin
      .from('active_track_boosts')
      .select('id, multiplier, expires_at')
      .eq('track_id', targetTrackId)
      .gt('expires_at', nowIso);
    if (existingErr) {
      return NextResponse.json({ error: 'Erreur lecture boost actif' }, { status: 500 });
    }

    let effectiveMultiplier = booster.multiplier;
    let effectiveExpires = expires.toISOString();

    if (Array.isArray(existingBoosts) && existingBoosts.length > 0) {
      // Fusionner tous les boosts actifs existants avec le nouveau
      const currentMaxMult = existingBoosts.reduce((m, b) => Math.max(m, Number(b.multiplier) || 1), 1);
      const currentMaxExp = existingBoosts.reduce((m, b) => Math.max(m, new Date(b.expires_at).getTime()), 0);
      const mergedMultiplier = Math.max(currentMaxMult, booster.multiplier || 1);
      const mergedExpires = new Date(Math.max(currentMaxExp, expires.getTime())).toISOString();

      // Conserver le premier, mettre à jour sa valeur, supprimer les doublons restants
      const keepId = existingBoosts[0].id;
      const deleteIds = existingBoosts.slice(1).map(b => b.id);

      const { error: updBoostErr } = await supabaseAdmin
        .from('active_track_boosts')
        .update({ multiplier: mergedMultiplier, expires_at: mergedExpires })
        .eq('id', keepId);
      if (updBoostErr) {
        return NextResponse.json({ error: 'Erreur mise à jour boost' }, { status: 500 });
      }
      if (deleteIds.length) {
        await supabaseAdmin
          .from('active_track_boosts')
          .delete()
          .in('id', deleteIds);
      }

      effectiveMultiplier = mergedMultiplier;
      effectiveExpires = mergedExpires;
    } else {
      // Créer le boost
      const { error: actErr } = await supabaseAdmin
        .from('active_track_boosts')
        .insert({
          track_id: targetTrackId,
          user_id: userId,
          booster_id: booster.id,
          multiplier: booster.multiplier,
          started_at: nowIso,
          expires_at: effectiveExpires,
          source: 'booster'
        });
      if (actErr) {
        return NextResponse.json({ error: 'Erreur activation' }, { status: 500 });
      }
    }

    // Marquer l'inventaire comme utilisé
    const { error: updErr } = await supabaseAdmin
      .from('user_boosters')
      .update({ status: 'used', used_at: now.toISOString() })
      .eq('id', inventoryId)
      .eq('user_id', userId);
    if (updErr) {
      return NextResponse.json({ error: 'Erreur mise à jour inventaire' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, boost: { trackId: targetTrackId, multiplier: effectiveMultiplier, expiresAt: effectiveExpires }, inventory: { id: inventoryId, status: 'used' } });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


