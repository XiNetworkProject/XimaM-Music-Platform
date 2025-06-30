import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';

// POST - Mettre en avant une piste avec une banderole personnalisée
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();
    const trackId = params.id;

    // Vérifier si la piste existe
    const track = await Track.findById(trackId);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (track.artist.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { isFeatured, featuredBanner } = body;

    // Mettre à jour la piste
    const updatedTrack = await Track.findByIdAndUpdate(
      trackId,
      {
        isFeatured: isFeatured !== undefined ? isFeatured : track.isFeatured,
        featuredBanner: featuredBanner || track.featuredBanner,
      },
      { new: true }
    ).populate('artist', 'name username avatar');

    return NextResponse.json({
      success: true,
      track: updatedTrack
    });

  } catch (error) {
    console.error('Erreur mise en avant:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise en avant' },
      { status: 500 }
    );
  }
}

// GET - Récupérer l'état de mise en avant d'une piste
export async function GET(
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

    return NextResponse.json({ 
      isFeatured: track.isFeatured,
      featuredBanner: track.featuredBanner
    });

  } catch (error) {
    console.error('Erreur récupération mise en avant:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
} 