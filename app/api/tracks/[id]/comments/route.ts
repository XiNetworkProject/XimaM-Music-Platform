import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';
import Comment from '@/models/Comment';
import User from '@/models/User';

// POST - Ajouter un commentaire
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

    const track = await Track.findById(params.id);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Contenu du commentaire requis' },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: 'Commentaire trop long (max 500 caractères)' },
        { status: 400 }
      );
    }

    // Créer le commentaire
    const comment = new Comment({
      content: content.trim(),
      user: session.user.id,
      track: params.id,
    });

    await comment.save();

    // Incrémenter le nombre de commentaires sur la piste
    await Track.findByIdAndUpdate(params.id, {
      $inc: { commentsCount: 1 }
    });

    // Récupérer le commentaire avec les infos utilisateur
    const populatedComment = await Comment.findById(comment._id)
      .populate('user', 'name username avatar');

    return NextResponse.json({
      success: true,
      comment: populatedComment
    });

  } catch (error) {
    console.error('Erreur ajout commentaire:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du commentaire' },
      { status: 500 }
    );
  }
}

// GET - Récupérer les commentaires d'une piste
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const track = await Track.findById(params.id);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ track: params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name username avatar');

    const total = await Comment.countDocuments({ track: params.id });

    return NextResponse.json({
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Erreur récupération commentaires:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
} 