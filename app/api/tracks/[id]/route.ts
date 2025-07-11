import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';
import User from '@/models/User';

// GET - Récupérer une piste
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('API Track - ID reçu:', params.id);
    console.log('API Track - URL:', request.url);
    
    // Nettoyer l'ID (enlever les slashes et espaces)
    const trackId = params.id.replace(/[\/\s]/g, '');
    console.log('API Track - ID nettoyé:', trackId);

    // Valider que l'ID est un ObjectId MongoDB valide
    if (!trackId || trackId.length !== 24) {
      console.error('API Track - ID invalide:', trackId);
      return NextResponse.json({ error: 'ID de piste invalide' }, { status: 400 });
    }

    // Connexion à la base de données
    console.log('API Track - Connexion à la base de données...');
    await dbConnect();
    console.log('API Track - Connexion réussie');
    
    const session = await getServerSession(authOptions);
    console.log('API Track - Session:', session ? 'Connecté' : 'Non connecté');

    // Test simple de récupération
    console.log('API Track - Recherche de la piste...');
    const track = await Track.findById(trackId);
    
    if (!track) {
      console.error('API Track - Piste non trouvée:', trackId);
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    console.log('API Track - Piste trouvée:', track.title);

    // Vérifier si l'utilisateur connecté a liké cette piste
    let isLiked = false;
    if (session?.user?.id) {
      isLiked = track.likes.includes(session.user.id);
    }

    console.log('API Track - Réponse envoyée avec succès');
    return NextResponse.json({
      track: {
        ...track.toObject(),
        isLiked
      }
    });

  } catch (error) {
    console.error('Erreur récupération piste - Détails:', error);
    console.error('Erreur récupération piste - Stack:', error instanceof Error ? error.stack : 'Pas de stack');
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la piste', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour une piste
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();

    const track = await Track.findById(params.id);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (track.artist.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, genre, tags, isPublic } = body;

    const updatedTrack = await Track.findByIdAndUpdate(
      params.id,
      {
        title: title || track.title,
        description: description || track.description,
        genre: genre || track.genre,
        tags: tags || track.tags,
        isPublic: isPublic !== undefined ? isPublic : track.isPublic,
      },
      { new: true }
    ).populate('artist', 'name username avatar');

    return NextResponse.json({ track: updatedTrack });

  } catch (error) {
    console.error('Erreur mise à jour piste:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une piste
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();

    const track = await Track.findById(params.id);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (track.artist.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Supprimer les fichiers Cloudinary
    if (track.audioPublicId) {
      // Importer deleteFile ici pour éviter les erreurs circulaires
      const { deleteFile } = await import('@/lib/cloudinary');
      await deleteFile(track.audioPublicId, 'video');
    }

    if (track.coverPublicId) {
      const { deleteFile } = await import('@/lib/cloudinary');
      await deleteFile(track.coverPublicId, 'image');
    }

    // Supprimer la piste
    await Track.findByIdAndDelete(params.id);

    // Mettre à jour les statistiques de l'utilisateur
    await User.findByIdAndUpdate(session.user.id, {
      $inc: { trackCount: -1 },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erreur suppression piste:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
} 