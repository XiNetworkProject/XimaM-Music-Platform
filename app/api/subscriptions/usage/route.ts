import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import subscriptionService from '@/lib/subscriptionService';

// S'assurer que tous les modèles sont enregistrés
import '@/models/Subscription';
import '@/models/UserSubscription';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const usageInfo = await subscriptionService.getUsageInfo(session.user.id);
    
    return NextResponse.json(usageInfo);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'utilisation' },
      { status: 500 }
    );
  }
}

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

    await subscriptionService.incrementUsage(session.user.id, action);
    
    // Retourner les informations d'utilisation mises à jour
    const usageInfo = await subscriptionService.getUsageInfo(session.user.id);
    
    return NextResponse.json({
      success: true,
      usage: usageInfo
    });
  } catch (error) {
    console.error('Erreur lors de l\'incrémentation de l\'utilisation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'incrémentation de l\'utilisation' },
      { status: 500 }
    );
  }
} 