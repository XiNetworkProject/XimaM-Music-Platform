import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { db, dbAdmin } from '@/lib/database';
import { deleteLocalMedia, isLocalMediaOwnedBy, isLocalMediaReference } from '@/lib/localMediaStorage';
import { remixPermissionsFromRow, remixPermissionsToRow, sanitizeRemixPermissions } from '@/lib/remixPermissions';
import { getPublishedVariationCounts, getRemixAttributionForChildren, getRemixSourceSummary, normalizeRemixTrackRef } from '@/lib/remixServer';
import { getPublishedClipCounts } from '@/lib/musicClips';
import { canViewAiTrack, canViewTrack } from '@/lib/publicTracks';
import { getLinkedChallengeForSource } from '@/lib/musicChallenges';
import { toPublicMediaUrl } from '@/lib/mediaUrls';

function readTrackData(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const session = await getApiSession(request).catch(() => null);
    const userId = (session?.user as any)?.id || null;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de track requis' },
        { status: 400 }
      );
    }

    console.log(`🔍 Récupération de la track: ${id}`);

    // Récupérer la track depuis PostgreSQL
    const ref = normalizeRemixTrackRef(id);
    if (ref.type === 'ai_track') {
      const { data: aiTrack, error: aiError } = await dbAdmin
        .from('ai_tracks')
        .select('*, generation:ai_generations!inner(id, user_id, prompt, metadata, is_public, status)')
        .eq('id', ref.id)
        .maybeSingle();
      if (aiError || !aiTrack || !canViewAiTrack(aiTrack, userId)) {
        return NextResponse.json({ error: 'Track non trouvÃ©e' }, { status: 404 });
      }
      const source = await getRemixSourceSummary({ sourceTrackId: id, userId });
      const [attributions, counts] = await Promise.all([
        getRemixAttributionForChildren([{ id: ref.id, type: ref.type }]),
        getPublishedVariationCounts([{ id: ref.id, type: ref.type }]),
      ]);
      const clipCounts = await getPublishedClipCounts([{ id: ref.id, type: ref.type }]);
      const linkedChallenge = await getLinkedChallengeForSource(ref.id, 'ai_track');
      return NextResponse.json({
        id: `ai-${aiTrack.id}`,
        _id: `ai-${aiTrack.id}`,
        title: aiTrack.title || 'Creation IA',
        artist: {
          _id: source?.artistId || (aiTrack as any).generation?.user_id || '',
          name: source?.artist || 'Artiste Synaura',
          username: source?.artistUsername || '',
          artistName: source?.artist || 'Artiste Synaura',
        },
        artistUsername: source?.artistUsername || '',
        coverUrl: toPublicMediaUrl(aiTrack.image_url),
        audioUrl: toPublicMediaUrl(aiTrack.audio_url || aiTrack.stream_audio_url),
        duration: aiTrack.duration || 0,
        genre: Array.isArray(aiTrack.tags) ? aiTrack.tags : [],
        plays: aiTrack.play_count || 0,
        likes: aiTrack.like_count || 0,
        isPublic: aiTrack.is_public === true,
        createdAt: aiTrack.created_at,
        lyrics: aiTrack.lyrics || null,
        isAI: true,
        ...remixPermissionsFromRow(aiTrack),
        canRemixAiVariation: source?.canRemixAiVariation || false,
        remixAttribution: attributions.get(`${ref.type}:${ref.id}`) || null,
        variationsCount: counts.get(`${ref.type}:${ref.id}`) || 0,
        musicClipsCount: clipCounts.get(`${ref.type}:${ref.id}`) || 0,
        linkedChallenge: linkedChallenge ? { id: linkedChallenge.id, title: linkedChallenge.title, status: linkedChallenge.status } : null,
      });
    }

    const { data: track, error: trackError } = await db
      .from('tracks')
      .select('*')
      .eq('id', id)
      .single();

    if (trackError || !track || !canViewTrack(track, userId)) {
      console.log(`❌ Track non trouvée ou non visible: ${id}`);
      return NextResponse.json(
        { error: 'Track non trouvée' },
        { status: 404 }
      );
    }

    console.log(`✅ Track trouvée: ${track.title}`);

    const trackData = readTrackData(track.data);
    const source = await getRemixSourceSummary({ sourceTrackId: id, sourceTrackType: 'track', userId });
    const [attributions, counts] = await Promise.all([
      getRemixAttributionForChildren([{ id, type: 'track' }]),
      getPublishedVariationCounts([{ id, type: 'track' }]),
    ]);
    const clipCounts = await getPublishedClipCounts([{ id, type: 'track' }]);
    const linkedChallenge = await getLinkedChallengeForSource(id, 'track');

    // Formater la réponse pour l'interface
    const formattedTrack = {
      id: track.id,
      _id: track.id,
      title: track.title,
      artist: {
        _id: track.creator_id || '',
        name: source?.artist || track.artist_name || track.creator_name || 'Artiste inconnu',
        username: source?.artistUsername || '',
        artistName: source?.artist || track.artist_name || track.creator_name || 'Artiste inconnu',
      },
      artistUsername: source?.artistUsername || '',
      coverUrl: toPublicMediaUrl(track.cover_url),
      coverVideoUrl: toPublicMediaUrl(track.cover_video_url || trackData.cover_video_url || trackData.coverVideoUrl),
      coverVideoPosterUrl: toPublicMediaUrl(track.cover_video_poster_url || trackData.cover_video_poster_url || trackData.coverVideoPosterUrl),
      visualUrl: toPublicMediaUrl(trackData.visual_url || trackData.visualUrl),
      visualType: trackData.visual_type || trackData.visualType || null,
      dominantColors: Array.isArray(trackData.dominant_colors) ? trackData.dominant_colors : Array.isArray(trackData.dominantColors) ? trackData.dominantColors : [],
      auraVisualEnabled: trackData.aura_visual_enabled !== false && trackData.auraVisualEnabled !== false,
      audioUrl: toPublicMediaUrl(track.audio_url),
      duration: track.duration,
      genre: track.genre || [],
      plays: track.plays || 0,
      likes: track.likes || 0,
      isFeatured: track.is_featured || false,
      isPublic: track.is_public !== false,
      createdAt: track.created_at,
      updatedAt: track.updated_at,
      lyrics: track.lyrics || null,
      album: track.album || null,
      ...remixPermissionsFromRow(track),
      canRemixAiVariation: source?.canRemixAiVariation || false,
      remixAttribution: attributions.get(`track:${id}`) || null,
      variationsCount: counts.get(`track:${id}`) || 0,
      musicClipsCount: clipCounts.get(`track:${id}`) || 0,
      linkedChallenge: linkedChallenge ? { id: linkedChallenge.id, title: linkedChallenge.title, status: linkedChallenge.status } : null,
    };

    return NextResponse.json(formattedTrack);

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la track:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID de track requis' },
        { status: 400 }
      );
    }

    console.log(`🔄 Mise à jour de la track: ${id}`, body);

    // Vérifier que la track existe et que l'utilisateur est le propriétaire
    // (select * plutôt qu'une liste de colonnes : reste valide même si la migration
    // des droits de création n'a pas encore été appliquée sur cet environnement)
    const { data: existingTrack, error: trackError } = await dbAdmin
      .from('tracks')
      .select('*')
      .eq('id', id)
      .single();

    if (trackError || !existingTrack) {
      console.error('❌ Track non trouvée:', {
        id,
        trackError: trackError?.message || trackError,
        existingTrack
      });
      
      // Ajouter une recherche de debug pour voir quelles tracks existent
      const { data: allTracks } = await dbAdmin
        .from('tracks')
        .select('id, title, creator_id')
        .limit(5);
      console.log('🔍 Exemples de tracks existantes:', allTracks);
      
      return NextResponse.json(
        { error: `Track non trouvée avec ID: ${id}` },
        { status: 404 }
      );
    }

    // Vérifier les droits de propriété
    if (existingTrack.creator_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Non autorisé - vous n\'êtes pas le propriétaire de cette track' },
        { status: 403 }
      );
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (body.title) updateData.title = body.title;
    if (typeof body.description === 'string') updateData.description = body.description;
    if (body.genre) updateData.genre = Array.isArray(body.genre) ? body.genre : [body.genre];
    if (body.tags) updateData.tags = Array.isArray(body.tags) ? body.tags : [body.tags];
    if (typeof body.isPublic === 'boolean') updateData.is_public = body.isPublic;
    if (typeof body.isFeatured === 'boolean') updateData.is_featured = body.isFeatured;

    // Droits de creation : seul le propriétaire (déjà vérifié ci-dessus) peut les modifier.
    if (body.remixPermissions !== undefined) {
      const currentPermissions = remixPermissionsFromRow(existingTrack);
      const nextPermissions = sanitizeRemixPermissions(body.remixPermissions, currentPermissions);
      Object.assign(updateData, remixPermissionsToRow(nextPermissions));
    }

    let oldCoverPublicIdToDelete: string | null = null;
    if (body.coverUrl) {
      if (!isLocalMediaReference(body.coverUrl, body.coverPublicId, 'cover') || !isLocalMediaOwnedBy(body.coverPublicId, session.user.id)) {
        if (body.coverPublicId) await deleteLocalMedia(body.coverPublicId).catch(() => false);
        return NextResponse.json({ error: 'La cover doit provenir du stockage Synaura' }, { status: 422 });
      }
      oldCoverPublicIdToDelete = existingTrack.cover_public_id;
      updateData.cover_url = body.coverUrl;
      updateData.cover_public_id = body.coverPublicId || null;
    }

    // Mettre à jour la track
    let updatedTrack: any = null;
    let updateError: any = null;
    {
      const result = await dbAdmin.from('tracks').update(updateData).eq('id', id).select().single();
      updatedTrack = result.data;
      updateError = result.error;
    }

    // Si la migration des droits de creation n'a pas encore ete appliquee, on retente sans ces colonnes.
    if (updateError) {
      const msg = String(updateError?.message || updateError?.details || '');
      const isMissingRemixColumn = ['allow_clips', 'allow_audio_remix', 'allow_ai_variation', 'remix_approval_required', 'remix_visibility', 'Could not find', 'schema cache'].some((needle) => msg.includes(needle));
      if (isMissingRemixColumn) {
        const { allow_clips, allow_audio_remix, allow_ai_variation, remix_approval_required, remix_visibility, ...rest } = updateData;
        const retry = await dbAdmin.from('tracks').update(rest).eq('id', id).select().single();
        updatedTrack = retry.data;
        updateError = retry.error;
      }
    }

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError);
      if (body.coverPublicId) await deleteLocalMedia(body.coverPublicId).catch(() => false);
      return NextResponse.json(
        { error: `Erreur lors de la mise à jour: ${updateError.message}` },
        { status: 500 }
      );
    }

    if (oldCoverPublicIdToDelete && oldCoverPublicIdToDelete !== body.coverPublicId) {
      await deleteLocalMedia(oldCoverPublicIdToDelete).catch(() => false);
    }

    console.log(`✅ Track mise à jour: ${id}`);
    
    // Retourner la track mise à jour avec format cohérent
    const formattedTrack = {
      id: updatedTrack.id,
      title: updatedTrack.title,
      description: updatedTrack.description || '',
      genre: updatedTrack.genre || [],
      tags: updatedTrack.tags || [],
      is_featured: updatedTrack.is_featured,
      is_public: updatedTrack.is_public,
      cover_url: toPublicMediaUrl(updatedTrack.cover_url),
      audio_url: toPublicMediaUrl(updatedTrack.audio_url),
      duration: updatedTrack.duration,
      plays: updatedTrack.plays || 0,
      likes: updatedTrack.likes || 0,
      created_at: updatedTrack.created_at,
      updated_at: updatedTrack.updated_at,
      ...remixPermissionsFromRow(updatedTrack)
    };

    return NextResponse.json(formattedTrack);

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de la track:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de track requis' },
        { status: 400 }
      );
    }

    console.log(`🗑️  Suppression de la track: ${id}`);

    // Récupérer les references locales avant suppression et verifier le propriétaire.
    const { data: existing, error: fetchErr } = await dbAdmin
      .from('tracks')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    console.log('🔍 Données track avant suppression:', existing);
    
    if (fetchErr) {
      console.warn('⚠️ Impossible de récupérer les données avant suppression:', fetchErr.message);
    }

    // Vérifier les droits de propriété
    if (fetchErr) {
      return NextResponse.json({ error: 'Impossible de verifier la piste avant suppression' }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: 'Track non trouvee' }, { status: 404 });
    }
    if (existing.creator_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Non autorisé - vous n\'êtes pas le propriétaire de cette track' },
        { status: 403 }
      );
    }

    // Supprimer la track en base
    const { error: deleteError } = await dbAdmin
      .from('tracks')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ Erreur lors de la suppression:', deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression' },
        { status: 500 }
      );
    }

    console.log(`✅ Track supprimée: ${id}`);

    // Les references historiques distantes sont volontairement conservees comme fallback.
    if (existing) {
      await Promise.all([
        existing.audio_public_id,
        existing.cover_public_id,
        existing.cover_video_public_id,
      ].filter((value): value is string => Boolean(value)).map((value) => deleteLocalMedia(value).catch(() => false)));
    } else {
      console.warn('⚠️ Aucune donnée track trouvée pour suppression des medias locaux');
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Erreur lors de la suppression de la track:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
