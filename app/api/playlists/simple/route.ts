import { NextRequest, NextResponse } from 'next/server';

// Version simplifiée de l'API playlists pour tester
// Utilise un stockage en mémoire temporaire

// Stockage temporaire des playlists (à remplacer par PostgreSQL plus tard)
let tempPlaylists: any[] = [];
let nextId = 1;

// GET - Récupérer les playlists d'un utilisateur
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('📋 Récupération des playlists pour user:', userId);
    console.log('📋 Playlists disponibles:', tempPlaylists);

    // Filtrer les playlists de l'utilisateur
    const userPlaylists = tempPlaylists.filter(p => p.createdBy === userId);

    return NextResponse.json({ 
      playlists: userPlaylists,
      total: userPlaylists.length 
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// POST - Créer une nouvelle playlist
export async function POST(request: NextRequest) {
  try {
    const { name, description, isPublic } = await request.json();
    
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nom de playlist requis' }, { status: 400 });
    }

    const userId = 'default-user-id';
    
    console.log('🎵 Création de playlist simple:', { name, description, isPublic, userId });

    // Créer une playlist temporaire
    const newPlaylist = {
      _id: `temp-${nextId++}`,
      name: name.trim(),
      description: description?.trim() || '',
      coverUrl: null,
      trackCount: 0,
      duration: 0,
      isPublic: isPublic !== false,
      tracks: [],
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: [],
      followers: []
    };

    // Ajouter à la liste temporaire
    tempPlaylists.push(newPlaylist);
    
    console.log('✅ Playlist simple créée:', newPlaylist);
    console.log('📋 Total playlists:', tempPlaylists.length);

    return NextResponse.json(newPlaylist, { status: 201 });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
