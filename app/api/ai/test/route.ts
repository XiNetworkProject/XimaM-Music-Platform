import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(request: NextRequest) {
  try {
    // Test d'authentification
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        status: 'error',
        message: 'Non authentifié',
        session: null 
      }, { status: 401 });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Authentifié avec succès',
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur test auth:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Erreur interne',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}
