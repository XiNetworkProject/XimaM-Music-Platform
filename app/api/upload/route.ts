import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect, { isConnected } from '@/lib/db';
import Track from '@/models/Track';
import User from '@/models/User';
import subscriptionService from '@/lib/subscriptionService';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // S'assurer que la connexion est établie
    await dbConnect();
    
    // Vérifier que la connexion est active
    if (!isConnected()) {
      console.warn('⚠️ MongoDB non connecté, tentative de reconnexion...');
      await dbConnect();
    }

    const body = await request.json();
    const { 
      audioUrl, 
      audioPublicId, 
      coverUrl, 
      coverPublicId, 
      trackData,
      duration = 0 
    } = body;

    // Validation
    if (!audioUrl || !audioPublicId) {
      return NextResponse.json(
        { error: 'URL audio et public ID requis' },
        { status: 400 }
      );
    }

    if (!trackData || !trackData.title || !trackData.title.trim()) {
      return NextResponse.json(
        { error: 'Titre requis' },
        { status: 400 }
      );
    }

    // Vérifier les limites d'abonnement
    const uploadCheck = await subscriptionService.canPerformAction(session.user.id, 'uploads');
    if (!uploadCheck.allowed) {
      return NextResponse.json(
        { 
          error: uploadCheck.reason || 'Limite d\'upload atteinte',
          usage: uploadCheck.usage
        },
        { status: 403 }
      );
    }

    // Créer la piste dans la base de données
    console.log('💾 Sauvegarde en base de données...');
    const track = new Track({
      title: trackData.title.trim(),
      description: trackData.description || '',
      genre: trackData.genre || ['Pop'],
      tags: trackData.tags || [],
      audioUrl: audioUrl,
      audioPublicId: audioPublicId,
      coverUrl: coverUrl || '/default-cover.jpg',
      coverPublicId: coverPublicId || null,
      duration: duration,
      artist: session.user.id,
      isPublic: trackData.isPublic !== false,
      isExplicit: trackData.isExplicit || false,
      plays: 0,
      likes: [],
      comments: [],
      copyright: {
        owner: trackData.copyright?.owner || session.user.name || 'Unknown',
        year: trackData.copyright?.year || new Date().getFullYear(),
        rights: trackData.copyright?.rights || 'All rights reserved',
      },
    });

    await track.save();

    // Ajouter la track au tableau tracks de l'utilisateur
    await User.findByIdAndUpdate(session.user.id, {
      $push: { tracks: track._id },
      $inc: { trackCount: 1 },
    });

    // Incrémenter l'utilisation d'upload
    await subscriptionService.incrementUsage(session.user.id, 'uploads');

    console.log('✅ Upload terminé avec succès');
    return NextResponse.json({
      success: true,
      track: {
        id: track._id,
        title: track.title,
        audioUrl: track.audioUrl,
        coverUrl: track.coverUrl,
        duration: track.duration,
      },
    });

  } catch (error) {
    console.error('❌ Erreur upload:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}

// GET - Récupérer les pistes de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // S'assurer que la connexion est établie
    await dbConnect();
    
    // Vérifier que la connexion est active
    if (!isConnected()) {
      console.warn('⚠️ MongoDB non connecté, tentative de reconnexion...');
      await dbConnect();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const tracks = await Track.find({ artist: session.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('artist', 'name username avatar');

    const total = await Track.countDocuments({ artist: session.user.id });

    return NextResponse.json({
      tracks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Erreur récupération pistes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des pistes' },
      { status: 500 }
    );
  }
} 