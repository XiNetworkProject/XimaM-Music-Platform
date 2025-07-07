import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import subscriptionService from '@/lib/subscriptionService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { action } = await request.json();
    
    if (!action || !['uploads', 'comments', 'plays', 'playlists'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide' },
        { status: 400 }
      );
    }

    const result = await subscriptionService.canPerformAction(session.user.id, action);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'action:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de l\'action' },
      { status: 500 }
    );
  }
} 