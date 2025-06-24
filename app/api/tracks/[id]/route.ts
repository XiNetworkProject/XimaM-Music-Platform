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
    await dbConnect();

    const track = await Track.findById(params.id)
      .populate('artist', 'name username avatar bio')
      .populate('comments.user', 'name username avatar');

    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    // Incrémenter le nombre de lectures
    await Track.findByIdAndUpdate(params.id, { $inc: { plays: 1 } });

    return NextResponse.json({ track });

  } catch (error) {
    console.error('Erreur récupération piste:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
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