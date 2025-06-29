import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import Track from '@/models/Track';

// GET - Récupérer toutes les pistes publiques
export async function GET(request: NextRequest) {
  try {
    // Connexion à la base de données
    await dbConnect();
    
    if (!isConnected()) {
      console.warn('MongoDB non connecté, tentative de reconnexion...');
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

    // Construire la requête de base
    let query: any = { isPublic: true };

    // Filtrer par genre
    if (genre && genre !== 'all') {
      query.genre = { $in: [genre] };
    }

    // Recherche par texte (seulement si l'index text existe)
    if (search) {
      try {
        query.$text = { $search: search };
      } catch (error) {
        // Si l'index text n'existe pas, on fait une recherche simple
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
    }

    // Tri selon les paramètres
    let sortOptions: any = { createdAt: -1 };
    
    if (trending === 'true') {
      sortOptions = { plays: -1 };
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
    const formattedTracks = tracks.map((track: any) => {
      try {
        return {
          ...track,
          _id: track._id?.toString() || '',
          artist: track.artist ? {
            ...track.artist,
            _id: track.artist._id?.toString() || ''
          } : null,
          likes: Array.isArray(track.likes) ? track.likes : [],
          comments: Array.isArray(track.comments) ? track.comments : [],
          genre: Array.isArray(track.genre) ? track.genre : [],
          tags: Array.isArray(track.tags) ? track.tags : [],
          plays: typeof track.plays === 'number' ? track.plays : 0,
          duration: typeof track.duration === 'number' ? track.duration : 0,
          trendingScore: typeof track.trendingScore === 'number' ? track.trendingScore : 0,
          createdAt: track.createdAt || new Date(),
          updatedAt: track.updatedAt || new Date()
        };
      } catch (formatError) {
        console.error('Erreur formatage track:', formatError);
        return {
          _id: track._id?.toString() || '',
          title: track.title || 'Titre inconnu',
          artist: null,
          audioUrl: track.audioUrl || '',
          coverUrl: track.coverUrl || '',
          duration: 0,
          plays: 0,
          likes: [],
          comments: [],
          genre: [],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    });

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
        details: error instanceof Error ? error.message : 'Unknown error',
        tracks: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
        }
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