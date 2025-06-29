import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import User from '@/models/User';
import Track from '@/models/Track';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    if (!isConnected()) {
      await dbConnect();
    }

    // Essayer de trouver l'utilisateur par ID d'abord, puis par username
    let user = await User.findById(params.id);
    
    if (!user) {
      // Si pas trouvé par ID, essayer par username
      user = await User.findOne({ username: params.id });
    }

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Récupérer les pistes de l'utilisateur
    const tracks = await Track.find({ 
      artist: user._id, 
      isPublic: true 
    })
      .populate('artist', 'name username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Compter le total
    const total = await Track.countDocuments({ 
      artist: user._id, 
      isPublic: true 
    });

    // Formater les pistes
    const formattedTracks = tracks.map((track: any) => ({
      ...track,
      _id: track._id.toString(),
      artist: track.artist ? {
        ...track.artist,
        _id: track.artist._id.toString()
      } : null,
      likes: track.likes || [],
      comments: track.comments || [],
      genre: track.genre || [],
      tags: track.tags || [],
      plays: track.plays || 0,
      duration: track.duration || 0
    }));

    return NextResponse.json({
      tracks: formattedTracks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Erreur récupération tracks utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des pistes' },
      { status: 500 }
    );
  }
} 