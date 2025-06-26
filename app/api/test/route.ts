import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';

export async function GET(request: NextRequest) {
  try {
    console.log('Test API - Début du test');
    
    // Test de connexion à la base de données
    console.log('Test API - Connexion à la base de données...');
    await dbConnect();
    console.log('Test API - Connexion réussie');
    
    // Test de récupération d'une piste
    console.log('Test API - Recherche d\'une piste...');
    const track = await Track.findOne();
    
    if (track) {
      console.log('Test API - Piste trouvée:', track.title);
      return NextResponse.json({ 
        success: true, 
        message: 'Connexion et récupération réussies',
        trackId: track._id,
        trackTitle: track.title
      });
    } else {
      console.log('Test API - Aucune piste trouvée');
      return NextResponse.json({ 
        success: true, 
        message: 'Connexion réussie mais aucune piste trouvée'
      });
    }
    
  } catch (error) {
    console.error('Test API - Erreur:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur de test', 
        details: error instanceof Error ? error.message : 'Erreur inconnue' 
      },
      { status: 500 }
    );
  }
} 