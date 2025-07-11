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

// Système de verrous pour éviter les doublons d'incrémentation
const playLocks = new Map<string, { timestamp: number; userId: string }>();
const LOCK_DURATION = 5000; // 5 secondes

// POST - Incrémenter le nombre d'écoutes
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
    const userId = session.user.id;

    // Vérifier si la piste existe
    const track = await Track.findById(trackId);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    // Vérifier le verrou pour éviter les doublons
    const lockKey = `${trackId}-${userId}`;
    const existingLock = playLocks.get(lockKey);
    const now = Date.now();
    
    if (existingLock && (now - existingLock.timestamp) < LOCK_DURATION) {
      console.log(`🔒 Verrou actif pour ${trackId} par ${userId}, écoutes non incrémentées`);
      return NextResponse.json({
        success: true,
        plays: track.plays,
        message: 'Écoutes déjà incrémentées récemment'
      });
    }

    // Vérifier les limites d'abonnement pour les écoutes
    const playCheck = await subscriptionService.canPerformAction(userId, 'plays');
    if (!playCheck.allowed) {
      return NextResponse.json(
        { 
          error: playCheck.reason || 'Limite d\'écoutes atteinte',
          usage: playCheck.usage
        },
        { status: 403 }
      );
    }

    // Placer le verrou
    playLocks.set(lockKey, { timestamp: now, userId });

    // Incrémenter le nombre d'écoutes
    const updatedTrack = await Track.findByIdAndUpdate(
      trackId,
      { $inc: { plays: 1 } },
      { new: true }
    ).populate('artist', 'name username avatar');

    // Incrémenter l'utilisation d'écoutes de l'utilisateur
    await subscriptionService.incrementUsage(userId, 'plays');

    console.log(`✅ Écoutes incrémentées pour ${trackId} par ${userId}: ${updatedTrack.plays}`);

    return NextResponse.json({
      success: true,
      plays: updatedTrack.plays,
      track: updatedTrack
    });

  } catch (error) {
    console.error('Erreur incrémentation plays:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'incrémentation des écoutes' },
      { status: 500 }
    );
  }
}

// GET - Récupérer le nombre d'écoutes
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const track = await Track.findById(params.id);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    return NextResponse.json({ 
      plays: track.plays || 0
    });

  } catch (error) {
    console.error('Erreur récupération plays:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des écoutes' },
      { status: 500 }
    );
  }
} 