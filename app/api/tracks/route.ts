import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import Track from '@/models/Track';

// GET - Récupérer toutes les pistes publiques
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    if (!isConnected()) {
      await dbConnect();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const genre = searchParams.get('genre');
    const search = searchParams.get('search');
    const trending = searchParams.get('trending');
    const recent = searchParams.get('recent');
    const liked = searchParams.get('liked');
    const skip = (page - 1) * limit;

    // Construire la requête
    let query: any = { isPublic: true };

    // Filtrer par genre
    if (genre && genre !== 'all') {
      query.genre = { $in: [genre] };
    }

    // Recherche par texte
    if (search) {
      query.$text = { $search: search };
    }

    // Tri selon les paramètres
    let sortOptions: any = { createdAt: -1 };
    
    if (trending === 'true') {
      sortOptions = { plays: -1, likes: -1 };
    }
    
    if (recent === 'true') {
      sortOptions = { createdAt: -1 };
    }

    // Récupérer les pistes avec les informations de l'artiste
    const tracks = await Track.find(query)
      .populate('artist', 'name username avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Compter le total
    const total = await Track.countDocuments(query);

    // Formater les pistes pour éviter les erreurs de sérialisation
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
      duration: track.duration || 0,
      trendingScore: (track.plays || 0) + (track.likes?.length || 0) * 10 // Calculer un score de tendance
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
    console.error('Erreur API tracks:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des pistes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Créer une nouvelle piste (redirige vers /api/upload)
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Utilisez /api/upload pour créer une piste' },
    { status: 405 }
  );
} 