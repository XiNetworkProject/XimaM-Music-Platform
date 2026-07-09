import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import cloudinary from '@/lib/cloudinary';
import { remixPermissionsFromRow, remixPermissionsToRow, sanitizeRemixPermissions } from '@/lib/remixPermissions';
import { getPublishedVariationCounts, getRemixAttributionForChildren, getRemixSourceSummary, normalizeRemixTrackRef } from '@/lib/remixServer';
import { getPublishedClipCounts } from '@/lib/musicClips';
import { canViewAiTrack, canViewTrack } from '@/lib/publicTracks';
import { getLinkedChallengeForSource } from '@/lib/musicChallenges';

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

    // Récupérer la track depuis Supabase
    const ref = normalizeRemixTrackRef(id);
    if (ref.type === 'ai_track') {
      const { data: aiTrack, error: aiError } = await supabaseAdmin
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
        coverUrl: aiTrack.image_url || null,
        audioUrl: aiTrack.audio_url || aiTrack.stream_audio_url,
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

    const { data: track, error: trackError } = await supabase
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
      coverUrl: track.cover_url,
      coverVideoUrl: track.cover_video_url || trackData.cover_video_url || trackData.coverVideoUrl || null,
      coverVideoPosterUrl: track.cover_video_poster_url || trackData.cover_video_poster_url || trackData.coverVideoPosterUrl || null,
      visualUrl: trackData.visual_url || trackData.visualUrl || null,
      visualType: trackData.visual_type || trackData.visualType || null,
      dominantColors: Array.isArray(trackData.dominant_colors) ? trackData.dominant_colors : Array.isArray(trackData.dominantColors) ? trackData.dominantColors : [],
      auraVisualEnabled: trackData.aura_visual_enabled !== false && trackData.auraVisualEnabled !== false,
      audioUrl: track.audio_url,
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
    const { data: existingTrack, error: trackError } = await supabaseAdmin
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
      const { data: allTracks } = await supabaseAdmin
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

    if (body.coverUrl) {
      const oldCoverPublicId = existingTrack.cover_public_id;
      updateData.cover_url = body.coverUrl;
      updateData.cover_public_id = body.coverPublicId || null;

      if (oldCoverPublicId && oldCoverPublicId !== body.coverPublicId) {
        try {
          await cloudinary.uploader.destroy(oldCoverPublicId, { resource_type: 'image' });
          console.log('🗑️ Ancienne cover supprimee:', oldCoverPublicId);
        } catch (e) {
          console.warn('Echec suppression ancienne cover:', e);
        }
      }
    }

    // Mettre à jour la track
    let updatedTrack: any = null;
    let updateError: any = null;
    {
      const result = await supabaseAdmin.from('tracks').update(updateData).eq('id', id).select().single();
      updatedTrack = result.data;
      updateError = result.error;
    }

    // Si la migration des droits de creation n'a pas encore ete appliquee, on retente sans ces colonnes.
    if (updateError) {
      const msg = String(updateError?.message || updateError?.details || '');
      const isMissingRemixColumn = ['allow_clips', 'allow_audio_remix', 'allow_ai_variation', 'remix_approval_required', 'remix_visibility', 'Could not find', 'schema cache'].some((needle) => msg.includes(needle));
      if (isMissingRemixColumn) {
        const { allow_clips, allow_audio_remix, allow_ai_variation, remix_approval_required, remix_visibility, ...rest } = updateData;
        const retry = await supabaseAdmin.from('tracks').update(rest).eq('id', id).select().single();
        updatedTrack = retry.data;
        updateError = retry.error;
      }
    }

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError);
      return NextResponse.json(
        { error: `Erreur lors de la mise à jour: ${updateError.message}` },
        { status: 500 }
      );
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
      cover_url: updatedTrack.cover_url,
      audio_url: updatedTrack.audio_url,
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

    // Récupérer d'abord les URLs et public_id Cloudinary pour suppression + vérifier propriétaire
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('tracks')
      .select('audio_url, cover_url, audio_public_id, cover_public_id, creator_id')
      .eq('id', id)
      .maybeSingle();
    
    console.log('🔍 Données track avant suppression:', existing);
    
    if (fetchErr) {
      console.warn('⚠️ Impossible de récupérer les données avant suppression:', fetchErr.message);
    }

    // Vérifier les droits de propriété
    if (existing && existing.creator_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Non autorisé - vous n\'êtes pas le propriétaire de cette track' },
        { status: 403 }
      );
    }

    // Supprimer la track en base
    const { error: deleteError } = await supabaseAdmin
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

    // Supprimer les fichiers Cloudinary associés
    if (existing) {
      console.log('🗑️ Tentative suppression Cloudinary:', {
        audio_public_id: existing.audio_public_id,
        cover_public_id: existing.cover_public_id,
        audio_url: existing.audio_url,
        cover_url: existing.cover_url
      });
      
      try {
        // Supprimer l'audio
        if (existing.audio_public_id) {
          console.log('🎵 Suppression audio Cloudinary:', existing.audio_public_id);
          const audioResult = await cloudinary.uploader.destroy(existing.audio_public_id, { resource_type: 'video' });
          console.log('✅ Résultat suppression audio:', audioResult);
        } else if (existing.audio_url && existing.audio_url.includes('cloudinary.com')) {
          // Extraire public_id depuis l'URL Cloudinary
          // URL format: https://res.cloudinary.com/dtgglgtfx/video/upload/v1234567890/ximam/audio/filename.mp3
          // Public_id = ximam/audio/filename
          
          const url = existing.audio_url;
          const uploadIndex = url.indexOf('/upload/');
          if (uploadIndex !== -1) {
            const afterUpload = url.substring(uploadIndex + 8); // Après "/upload/"
            const versionRemoved = afterUpload.replace(/^v\d+\//, ''); // Supprimer v1234567890/
            const publicIdWithExt = versionRemoved; // ximam/audio/filename.mp3
            const publicId = publicIdWithExt.split('.')[0]; // ximam/audio/filename
            
            console.log('🎵 Extraction public_id audio:', {
              url,
              afterUpload,
              versionRemoved,
              publicId
            });
            
            const audioResult = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
            console.log('✅ Résultat suppression audio:', audioResult);
          }
        }
        
        // Supprimer la cover
        if (existing.cover_public_id) {
          console.log('🖼️ Suppression cover Cloudinary:', existing.cover_public_id);
          const coverResult = await cloudinary.uploader.destroy(existing.cover_public_id, { resource_type: 'image' });
          console.log('✅ Résultat suppression cover:', coverResult);
        } else if (existing.cover_url && existing.cover_url.includes('cloudinary.com')) {
          // Extraire public_id depuis l'URL Cloudinary
          // URL format: https://res.cloudinary.com/dtgglgtfx/image/upload/v1234567890/ximam/images/filename.jpg
          // Public_id = ximam/images/filename
          
          const url = existing.cover_url;
          const uploadIndex = url.indexOf('/upload/');
          if (uploadIndex !== -1) {
            const afterUpload = url.substring(uploadIndex + 8); // Après "/upload/"
            const versionRemoved = afterUpload.replace(/^v\d+\//, ''); // Supprimer v1234567890/
            const publicIdWithExt = versionRemoved; // ximam/images/filename.jpg
            const publicId = publicIdWithExt.split('.')[0]; // ximam/images/filename
            
            console.log('🖼️ Extraction public_id cover:', {
              url,
              afterUpload,
              versionRemoved,
              publicId
            });
            
            const coverResult = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
            console.log('✅ Résultat suppression cover:', coverResult);
          }
        }
      } catch (e) {
        console.error('❌ Erreur suppression Cloudinary:', (e as any)?.message || e);
      }
    } else {
      console.warn('⚠️ Aucune donnée track trouvée pour suppression Cloudinary');
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
