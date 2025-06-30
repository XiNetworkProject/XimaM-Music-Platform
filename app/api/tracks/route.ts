import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import Track from '@/models/Track';

// GET - Récupérer toutes les pistes publiques
export async function GET(request: NextRequest) {
  console.log('=== DEBUT API TRACKS ===');
  
  try {
    // S'assurer que la connexion est établie
    console.log('🔄 Connexion à la base de données...');
    await dbConnect();
    console.log('✅ Base de données connectée');
    
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

    console.log('📊 Paramètres de recherche:', { page, limit, genre, search, skip });

    // Construire la requête de base
    let query: any = { isPublic: true };

    // Filtrer par genre
    if (genre && genre !== 'all') {
      query.genre = { $in: [genre] };
      console.log('🎵 Filtre genre:', genre);
    }

    // Recherche par texte (utiliser regex au lieu de $text pour éviter les problèmes d'index)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
      console.log('🔍 Recherche regex:', search);
    }

    console.log('🔍 Requête finale:', JSON.stringify(query, null, 2));

    // Récupérer les pistes avec les informations de l'artiste
    console.log('📥 Récupération des pistes...');
    const tracks = await Track.find(query)
      .populate('artist', 'name username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`✅ ${tracks.length} pistes récupérées`);

    // Compter le total
    console.log('📊 Comptage total...');
    const total = await Track.countDocuments(query);
    console.log(`📊 Total: ${total} pistes`);

    console.log('=== FIN API TRACKS SUCCES ===');
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
    console.error('❌ Erreur récupération pistes:', error);
    
    if (error && typeof error === 'object') {
      const err = error as any;
      console.error('Type d\'erreur:', err.constructor?.name || 'Unknown');
      console.error('Message:', err.message || 'No message');
      
      if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        console.error('Code erreur MongoDB:', err.code);
      }
    }
    
    console.log('=== FIN API TRACKS AVEC ERREUR ===');
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