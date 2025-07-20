import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';
import Comment from '@/models/Comment';

// GET - Compter tous les commentaires d'une piste (parents + réponses)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const trackId = params.id;

    // Vérifier si la piste existe
    const track = await Track.findById(trackId);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    // Compter les commentaires parents
    const parentComments = await Comment.countDocuments({ 
      track: trackId, 
      parentComment: { $exists: false } 
    });

    // Compter les réponses
    const replies = await Comment.countDocuments({ 
      track: trackId, 
      parentComment: { $exists: true } 
    });

    const total = parentComments + replies;

    return NextResponse.json({
      count: total,
      parentComments,
      replies
    });

  } catch (error) {
    console.error('Erreur comptage commentaires:', error);
    return NextResponse.json(
      { error: 'Erreur lors du comptage des commentaires' },
      { status: 500 }
    );
  }
} 