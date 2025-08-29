import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

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

    // Vérifier que c'est une requête multipart/form-data
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type doit être multipart/form-data' },
        { status: 400 }
      );
    }

    // Récupérer les données du formulaire
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

    // Simuler le traitement de l'upload
    // En production, vous uploaderiez vers Supabase Storage ou Cloudinary
    const trackId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('✅ Upload de piste:', {
      userId: session.user.id,
      trackId,
      title,
      description,
      genre,
      audioSize: audioFile.size,
      coverSize: coverFile?.size || 0
    });

    // Retourner la réponse de succès
    return NextResponse.json({
      success: true,
      trackId,
      message: 'Piste uploadée avec succès',
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
