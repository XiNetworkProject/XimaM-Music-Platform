import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { uploadAudio } from '@/lib/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Étape 2: Ajouter une piste à un album
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const formData = await request.formData();
    
    const albumId = formData.get('albumId') as string;
    const trackFile = formData.get('trackFile') as File;
    const trackTitle = formData.get('trackTitle') as string;
    const trackNumber = parseInt(formData.get('trackNumber') as string);
    const genre = JSON.parse(formData.get('genre') as string || '[]');
    const isExplicit = formData.get('isExplicit') === 'true';
    const isPublic = formData.get('isPublic') === 'true';
    const coverUrl = formData.get('coverUrl') as string | null;
    const coverPublicId = formData.get('coverPublicId') as string | null;

    if (!albumId || !trackFile || !trackTitle) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Vérifier que l'album appartient à l'utilisateur
    const { data: album, error: albumCheckError } = await supabaseAdmin
      .from('albums')
      .select('id, creator_id')
      .eq('id', albumId)
      .single();

    if (albumCheckError || !album || album.creator_id !== session.user.id) {
      return NextResponse.json({ error: 'Album non trouvé ou accès refusé' }, { status: 403 });
    }

    // Upload de l'audio
    const audioBytes = await trackFile.arrayBuffer();
    const audioBuffer = Buffer.from(audioBytes);
    
    const audioUploadResult = await uploadAudio(audioBuffer, {
      folder: 'ximam/audio',
      public_id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    const duration = audioUploadResult.duration || 0;

    // Créer la piste dans la base
    const { data: track, error: trackError } = await supabaseAdmin
      .from('tracks')
      .insert({
        title: trackTitle,
        creator_id: session.user.id,
        album_id: albumId,
        track_number: trackNumber,
        audio_url: audioUploadResult.secure_url,
        audio_public_id: audioUploadResult.public_id,
        cover_url: coverUrl,
        cover_public_id: coverPublicId,
        duration: Math.floor(duration),
        genre,
        is_explicit: isExplicit,
        is_public: isPublic
      })
      .select()
      .single();

    if (trackError) {
      console.error('❌ Erreur création piste:', trackError);
      return NextResponse.json({ 
        error: 'Erreur lors de la création de la piste',
        details: trackError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      track
    });

  } catch (error) {
    console.error('❌ Erreur API add-track:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

