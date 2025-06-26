import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect, { isConnected } from '@/lib/db';
import Track from '@/models/Track';
import User from '@/models/User';

// Configuration pour les gros fichiers
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

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
    const { audioUrl, coverUrl, trackData } = body;

    // Validation
    if (!audioUrl) {
      return NextResponse.json(
        { error: 'URL audio requise' },
        { status: 400 }
      );
    }

    if (!trackData) {
      return NextResponse.json(
        { error: 'Données de piste requises' },
        { status: 400 }
      );
    }

    if (!trackData.title || !trackData.title.trim()) {
      return NextResponse.json(
        { error: 'Titre requis' },
        { status: 400 }
      );
    }

    // Créer la piste dans la base de données
    const track = new Track({
      title: trackData.title.trim(),
      description: trackData.description || '',
      genre: trackData.genre || ['Pop'],
      tags: trackData.tags || [],
      audioUrl: audioUrl,
      audioPublicId: trackData.audioPublicId || null,
      coverUrl: coverUrl || '/default-cover.jpg',
      coverPublicId: trackData.coverPublicId || null,
      duration: trackData.duration || 0,
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

    // Mettre à jour les statistiques de l'utilisateur
    await User.findByIdAndUpdate(session.user.id, {
      $inc: { trackCount: 1 },
    });

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
    console.error('Erreur upload:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload' },
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