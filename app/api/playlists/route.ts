import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Modèle Playlist temporaire (à créer plus tard)
interface Playlist {
  _id: string;
  name: string;
  description?: string;
  tracks: string[];
  user: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    // S'assurer que la connexion est établie
    await dbConnect();
    
    // Vérifier que la connexion est active
    if (!isConnected()) {
      console.warn('⚠️ MongoDB non connecté, tentative de reconnexion...');
      await dbConnect();
    }
    
    const searchParams = request.nextUrl.searchParams;
    const user = searchParams.get('user');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    
    // Pour l'instant, retourner un tableau vide car le modèle Playlist n'existe pas encore
    // TODO: Créer le modèle Playlist et implémenter la logique complète
    
    if (user) {
      // Retourner les playlists de l'utilisateur spécifique
      return NextResponse.json({ playlists: [] });
    } else {
      // Retourner les playlists publiques
      return NextResponse.json({ playlists: [] });
    }
  } catch (error) {
    console.error('Erreur API playlists:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des playlists' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // S'assurer que la connexion est établie
    await dbConnect();
    
    // Vérifier que la connexion est active
    if (!isConnected()) {
      console.warn('⚠️ MongoDB non connecté, tentative de reconnexion...');
      await dbConnect();
    }
    
    const body = await request.json();
    
    // TODO: Créer le modèle Playlist et implémenter la création
    return NextResponse.json(
      { error: 'Fonctionnalité playlists en cours de développement' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Erreur création playlist:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la playlist' },
      { status: 500 }
    );
  }
} 