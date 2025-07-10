import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';
import subscriptionService from '@/lib/subscriptionService';

// S'assurer que tous les modèles sont enregistrés
import '@/models/Track';
import '@/models/Subscription';
import '@/models/UserSubscription';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();
    const trackId = params.id;

    // Vérifier si la piste existe
    const track = await Track.findById(trackId);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    // Vérifier les limites d'abonnement pour les écoutes
    const playCheck = await subscriptionService.canPerformAction(session.user.id, 'plays');
    if (!playCheck.allowed) {
      return NextResponse.json(
        { 
          error: playCheck.reason || 'Limite d\'écoutes atteinte',
          usage: playCheck.usage
        },
        { status: 403 }
      );
    }

    // Incrémenter les écoutes de la piste
    await Track.findByIdAndUpdate(trackId, {
      $inc: { plays: 1 }
    });

    // Incrémenter l'utilisation d'écoutes de l'utilisateur
    await subscriptionService.incrementUsage(session.user.id, 'plays');

    return NextResponse.json({
      success: true,
      message: 'Écoute incrémentée'
    });

  } catch (error) {
    console.error('Erreur incrémentation écoutes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'incrémentation des écoutes' },
      { status: 500 }
    );
  }
} 