import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { uploadImage, uploadAudio } from '@/lib/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const formData = await request.formData();
    
    // Récupérer les informations de l'album
    const title = formData.get('title') as string;
    const artist = formData.get('artist') as string;
    const releaseDate = formData.get('releaseDate') as string;
    const genre = JSON.parse(formData.get('genre') as string || '[]');
    const description = formData.get('description') as string;
    const isExplicit = formData.get('isExplicit') === 'true';
    const isPublic = formData.get('isPublic') === 'true';
    const copyrightOwner = formData.get('copyrightOwner') as string;
    const copyrightYear = parseInt(formData.get('copyrightYear') as string);
    const copyrightRights = formData.get('copyrightRights') as string;
    
    const coverFile = formData.get('cover') as File | null;
    const trackCount = parseInt(formData.get('trackCount') as string || '0');

    if (!title || !artist || trackCount === 0) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Upload de la cover de l'album si fournie
    let coverUrl = null;
    let coverPublicId = null;
    
    if (coverFile) {
      const bytes = await coverFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadResult = await uploadImage(buffer, {
        folder: 'ximam/albums',
        public_id: `album_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        width: 800,
        height: 800,
        crop: 'fill',
        quality: 'auto'
      });
      coverUrl = uploadResult.secure_url;
      coverPublicId = uploadResult.public_id;
    }

    // Créer l'album dans la base de données
    const { data: album, error: albumError } = await supabaseAdmin
      .from('albums')
      .insert({
        title,
        artist,
        creator_id: session.user.id,
        release_date: releaseDate || null,
        genre,
        description: description || null,
        cover_url: coverUrl,
        cover_public_id: coverPublicId,
        is_explicit: isExplicit,
        is_public: isPublic,
        copyright_owner: copyrightOwner || artist,
        copyright_year: copyrightYear || new Date().getFullYear(),
        copyright_rights: copyrightRights || 'Tous droits réservés'
      })
      .select()
      .single();

    if (albumError) {
      console.error('❌ Erreur création album:', albumError);
      return NextResponse.json({ 
        error: 'Erreur lors de la création de l\'album',
        details: albumError.message 
      }, { status: 500 });
    }

    // Uploader et créer chaque piste
    const tracks = [];
    const trackErrors = [];
    
    for (let i = 0; i < trackCount; i++) {
      const trackFile = formData.get(`track_${i}_file`) as File | null;
      const trackTitle = formData.get(`track_${i}_title`) as string;
      const trackNumber = parseInt(formData.get(`track_${i}_number`) as string);
      
      if (!trackFile || !trackTitle) {
        trackErrors.push(`Piste ${i + 1}: fichier ou titre manquant`);
        continue;
      }

      try {
        // Upload de l'audio
        const audioBytes = await trackFile.arrayBuffer();
        const audioBuffer = Buffer.from(audioBytes);
        const audioUploadResult = await uploadAudio(audioBuffer, {
          folder: 'ximam/audio',
          public_id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          resource_type: 'video'
        });

        // Récupérer la durée depuis Cloudinary (plus fiable côté serveur)
        const duration = audioUploadResult.duration || 0;

        // Créer la piste dans la base
        const { data: track, error: trackError } = await supabaseAdmin
          .from('tracks')
          .insert({
            title: trackTitle,
            creator_id: session.user.id,
            album_id: album.id,
            track_number: trackNumber,
            audio_url: audioUploadResult.secure_url,
            audio_public_id: audioUploadResult.public_id,
            cover_url: coverUrl, // Utiliser la cover de l'album
            cover_public_id: coverPublicId,
            duration: Math.floor(duration),
            genre,
            is_explicit: isExplicit,
            is_public: isPublic,
            copyright_owner: copyrightOwner || artist,
            copyright_year: copyrightYear || new Date().getFullYear(),
            copyright_rights: copyrightRights || 'Tous droits réservés'
          })
          .select()
          .single();

        if (trackError) {
          console.error(`❌ Erreur création piste ${i + 1}:`, trackError);
          trackErrors.push(`Piste ${i + 1}: ${trackError.message}`);
        } else {
          tracks.push(track);
        }
      } catch (error) {
        console.error(`❌ Erreur upload piste ${i + 1}:`, error);
        trackErrors.push(`Piste ${i + 1}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }

    if (tracks.length === 0) {
      return NextResponse.json({ 
        error: 'Aucune piste n\'a pu être uploadée',
        details: trackErrors 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      album,
      tracks,
      errors: trackErrors.length > 0 ? trackErrors : null,
      message: `Album créé avec ${tracks.length} piste(s)${trackErrors.length > 0 ? ` (${trackErrors.length} erreur(s))` : ''}`
    });

  } catch (error) {
    console.error('❌ Erreur API albums:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const creatorId = searchParams.get('creator_id');

    let query = supabaseAdmin
      .from('albums')
      .select(`
        *,
        profiles:creator_id (
          id,
          username,
          name,
          avatar,
          is_artist,
          artist_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (creatorId) {
      query = query.eq('creator_id', creatorId);
    } else {
      // Par défaut, ne montrer que les albums publics
      query = query.eq('is_public', true);
    }

    const { data: albums, error } = await query;

    if (error) {
      console.error('❌ Erreur Supabase albums:', error);
      return NextResponse.json({ 
        error: 'Erreur lors de la récupération des albums' 
      }, { status: 500 });
    }

    return NextResponse.json({ albums: albums || [] });

  } catch (error) {
    console.error('❌ Erreur serveur albums GET:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur' 
    }, { status: 500 });
  }
}

