import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import Track from '@/models/Track';

// GET - Récupérer toutes les pistes publiques
export async function GET(request: NextRequest) {
  try {
    // S'assurer que la connexion est établie
    await dbConnect();
    
    // Vérifier que la connexion est active
    if (!isConnected()) {
      console.warn('⚠️ MongoDB non connecté, tentative de reconnexion...');
      await dbConnect();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const genre = searchParams.get('genre');
    const search = searchParams.get('search');
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

    // Récupérer les pistes avec les informations de l'artiste
    const tracks = await Track.find(query)
      .populate('artist', 'name username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Compter le total
    const total = await Track.countDocuments(query);

    return NextResponse.json({
      tracks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Erreur récupération pistes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des pistes' },
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