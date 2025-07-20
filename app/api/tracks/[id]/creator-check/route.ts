import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';

// GET - Vérifier si l'utilisateur est le créateur de la piste
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
    const trackId = params.id;

    // Vérifier si la piste existe
    const track = await Track.findById(trackId);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    // Vérifier si l'utilisateur est le créateur
    const isCreator = track.artist.toString() === session.user.id;

    return NextResponse.json({
      success: true,
      isCreator,
      trackId,
      userId: session.user.id
    });

  } catch (error) {
    console.error('Erreur vérification créateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du créateur' },
      { status: 500 }
    );
  }
} 