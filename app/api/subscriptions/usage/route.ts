import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import subscriptionService from '@/lib/subscriptionService';
import dbConnect from '@/lib/db';

// S'assurer que tous les modèles sont enregistrés
import '@/models/Subscription';
import '@/models/UserSubscription';

export async function GET() {
  try {
    // S'assurer que la connexion à la base de données est établie
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('❌ Utilisateur non authentifié pour /api/subscriptions/usage');
      return NextResponse.json(
        { 
          hasSubscription: false,
          subscription: null,
          usage: null,
          error: 'Non autorisé'
        },
        { status: 401 }
      );
    }

    console.log(`📊 Récupération de l'utilisation pour l'utilisateur: ${session.user.id}`);
    
    const usageInfo = await subscriptionService.getUsageInfo(session.user.id);
    
    console.log(`✅ Informations d'utilisation récupérées:`, usageInfo);
    
    return NextResponse.json({
      hasSubscription: true,
      subscription: null, // TODO: Ajouter les détails de l'abonnement
      usage: usageInfo
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'utilisation:', error);
    
    // Retourner une réponse par défaut en cas d'erreur
    return NextResponse.json({
      hasSubscription: false,
      subscription: null,
      usage: {
        current: { uploads: 0, comments: 0, plays: 0, playlists: 0 },
        limits: {
          uploads: 3,
          comments: 10,
          plays: 50,
          playlists: 2,
          quality: '128kbps',
          ads: true,
          analytics: 'none',
          collaborations: false,
          apiAccess: false,
          support: 'community'
        },
        remaining: { uploads: 3, comments: 10, plays: 50, playlists: 2 },
        percentage: { uploads: 0, comments: 0, plays: 0, playlists: 0 }
      },
      error: 'Erreur lors de la récupération de l\'utilisation'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // S'assurer que la connexion à la base de données est établie
    await dbConnect();
    
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
    console.error('❌ Erreur lors de l\'incrémentation de l\'utilisation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'incrémentation de l\'utilisation' },
      { status: 500 }
    );
  }
} 