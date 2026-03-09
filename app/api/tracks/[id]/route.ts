import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import cloudinary from '@/lib/cloudinary';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de track requis' },
        { status: 400 }
      );
    }

    console.log(`🔍 Récupération de la track: ${id}`);

    // Récupérer la track depuis Supabase
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', id)
      .single();

    if (trackError || !track) {
      console.log(`❌ Track non trouvée: ${id}`);
      return NextResponse.json(
        { error: 'Track non trouvée' },
        { status: 404 }
      );
    }

    console.log(`✅ Track trouvée: ${track.title}`);

    // Formater la réponse pour l'interface
    const formattedTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist_name || track.creator_name || 'Artiste inconnu',
      coverUrl: track.cover_url,
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
      album: track.album || null
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
    const session = await getServerSession(authOptions);
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
    const { data: existingTrack, error: trackError } = await supabaseAdmin
      .from('tracks')
      .select('id, creator_id')
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

    // Mettre à jour la track
    const { data: updatedTrack, error: updateError } = await supabaseAdmin
      .from('tracks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

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
      updated_at: updatedTrack.updated_at
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
    const session = await getServerSession(authOptions);
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
