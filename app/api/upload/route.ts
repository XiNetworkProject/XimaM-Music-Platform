import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Récupérer la session utilisateur
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Utilisateur non authentifié' },
        { status: 401 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    
    // Accepter à la fois JSON et multipart/form-data
    if (contentType.includes('application/json')) {
      // Traitement des données JSON (pour la sauvegarde après upload Cloudinary)
      const jsonData = await request.json();
      
      const {
        audioUrl,
        audioPublicId,
        coverUrl,
        coverPublicId,
        trackData,
        duration
      } = jsonData;

      // Validation des champs requis
      if (!audioUrl || !trackData?.title) {
        return NextResponse.json(
          { error: 'URL audio et titre requis' },
          { status: 400 }
        );
      }

      // Sauvegarder en base Supabase (maintenant avec RLS corrigé)
      console.log('🔍 Tentative de sauvegarde en base avec les données:', {
        title: trackData.title,
        description: trackData.description || '',
        genre: trackData.genre || [],
        audio_url: audioUrl,
        cover_url: coverUrl || null,
        duration: duration || 0,
        creator_id: session.user.id,
        is_public: trackData.isPublic !== false
      });

      const { data: track, error } = await supabase
        .from('tracks')
        .insert({
          id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: trackData.title,
          description: trackData.description || '',
          genre: trackData.genre || [],
          audio_url: audioUrl,
          cover_url: coverUrl || null,
          duration: duration || 0,
          creator_id: session.user.id,
          is_public: trackData.isPublic !== false,
          plays: 0,
          likes: 0,
          is_featured: false
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur détaillée lors de la sauvegarde en base:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return NextResponse.json(
          { error: `Erreur lors de la sauvegarde en base de données: ${error.message}` },
          { status: 500 }
        );
      }

      console.log('✅ Piste sauvegardée en base:', {
        userId: session.user.id,
        trackId: track.id,
        title: trackData.title,
        audioUrl,
        coverUrl,
        duration
      });

      return NextResponse.json({
        success: true,
        trackId: track.id,
        message: 'Piste sauvegardée avec succès',
        data: {
          title: trackData.title,
          audioUrl,
          coverUrl,
          duration
        }
      });

    } else if (contentType.includes('multipart/form-data')) {
      // Traitement des fichiers multipart (pour upload direct)
      const formData = await request.formData();
      
      // Extraire les champs
      const title = formData.get('title') as string;
      const description = formData.get('description') as string;
      const genre = formData.get('genre') as string;
      const audioFile = formData.get('audio') as File;
      const coverFile = formData.get('cover') as File;

      // Validation des champs requis
      if (!title || !audioFile) {
        return NextResponse.json(
          { error: 'Titre et fichier audio requis' },
          { status: 400 }
        );
      }

      // Validation du fichier audio
      if (!audioFile.type.startsWith('audio/')) {
        return NextResponse.json(
          { error: 'Le fichier doit être un fichier audio' },
          { status: 400 }
        );
      }

      // Validation de la taille du fichier (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (audioFile.size > maxSize) {
        return NextResponse.json(
          { error: 'Le fichier audio est trop volumineux (max 50MB)' },
          { status: 400 }
        );
      }

      // Validation du fichier de couverture (optionnel)
      if (coverFile && !coverFile.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Le fichier de couverture doit être une image' },
          { status: 400 }
        );
      }

      // Pour l'upload direct, on simule pour l'instant
      // En production, vous uploaderiez vers Supabase Storage
      const trackId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('✅ Upload de piste (simulé):', {
        userId: session.user.id,
        trackId,
        title,
        description,
        genre,
        audioSize: audioFile.size,
        coverSize: coverFile?.size || 0
      });

      return NextResponse.json({
        success: true,
        trackId,
        message: 'Piste uploadée avec succès (simulation)',
        data: {
          title,
          description,
          genre,
          audioFile: {
            name: audioFile.name,
            size: audioFile.size,
            type: audioFile.type
          },
          coverFile: coverFile ? {
            name: coverFile.name,
            size: coverFile.size,
            type: coverFile.type
          } : null
        }
      });

    } else {
      return NextResponse.json(
        { error: 'Content-Type non supporté. Utilisez application/json ou multipart/form-data' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'upload:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload de la piste' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Méthode GET non supportée pour cet endpoint' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Méthode PUT non supportée pour cet endpoint' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Méthode DELETE non supportée pour cet endpoint' },
    { status: 405 }
  );
}
