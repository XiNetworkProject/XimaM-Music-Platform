import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Pour l'instant, on retourne juste un message de succès
    // En production, on pourrait invalider le token côté serveur
    return NextResponse.json({
      success: true,
      data: {
        message: 'Déconnexion réussie'
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de la déconnexion mobile:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la déconnexion' },
      { status: 500 }
    );
  }
} 