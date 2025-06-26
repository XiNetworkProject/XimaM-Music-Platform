import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect, { isConnected } from '@/lib/db';
import { uploadAudio, uploadImage } from '@/lib/cloudinary';
import Track from '@/models/Track';
import User from '@/models/User';
import { v2 as cloudinary } from 'cloudinary';

// Configuration des limites
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB pour Vercel
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

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

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const coverFile = formData.get('cover') as File;
    const trackDataString = formData.get('trackData') as string;

    // Validation du fichier audio
    if (!audioFile) {
      return NextResponse.json(
        { error: 'Fichier audio requis' },
        { status: 400 }
      );
    }

    // Vérifier la taille du fichier audio
    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: `Fichier audio trop volumineux (max ${MAX_AUDIO_SIZE / (1024 * 1024)}MB)` },
        { status: 413 }
      );
    }

    // Vérifier le type de fichier audio
    if (!ALLOWED_AUDIO_TYPES.includes(audioFile.type)) {
      return NextResponse.json(
        { error: `Type de fichier audio non supporté. Types autorisés: ${ALLOWED_AUDIO_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validation des données de piste
    if (!trackDataString) {
      return NextResponse.json(
        { error: 'Données de piste requises' },
        { status: 400 }
      );
    }

    // Parser les données de la piste
    let trackData;
    try {
      trackData = JSON.parse(trackDataString);
    } catch (error) {
      return NextResponse.json(
        { error: 'Données de piste invalides' },
        { status: 400 }
      );
    }

    if (!trackData.title || !trackData.title.trim()) {
      return NextResponse.json(
        { error: 'Titre requis' },
        { status: 400 }
      );
    }

    // Validation du fichier de couverture (optionnel)
    if (coverFile && coverFile.size > 0) {
      if (coverFile.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `Image de couverture trop volumineuse (max ${MAX_IMAGE_SIZE / (1024 * 1024)}MB)` },
          { status: 413 }
        );
      }

      if (!ALLOWED_IMAGE_TYPES.includes(coverFile.type)) {
        return NextResponse.json(
          { error: `Type d'image non supporté. Types autorisés: ${ALLOWED_IMAGE_TYPES.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Upload audio
    console.log('🎵 Upload audio en cours...');
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const audioResult = await uploadAudio(audioBuffer, {
      public_id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      resource_type: 'video', // Cloudinary traite l'audio comme une vidéo
    });

    // Upload cover si fourni (optionnel)
    let coverResult = null;
    if (coverFile && coverFile.size > 0) {
      try {
        console.log('🖼️ Upload image de couverture en cours...');
        const coverBuffer = Buffer.from(await coverFile.arrayBuffer());
        coverResult = await uploadImage(coverBuffer, {
          public_id: `cover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          width: 800,
          height: 800,
          crop: 'fill',
        });
      } catch (error) {
        console.error('Erreur upload cover (ignoré):', error);
        // On continue sans l'image de couverture
      }
    }

    // Créer la piste dans la base de données
    console.log('💾 Sauvegarde en base de données...');
    const track = new Track({
      title: trackData.title.trim(),
      description: trackData.description || '',
      genre: trackData.genre || ['Pop'],
      tags: trackData.tags || [],
      audioUrl: audioResult.secure_url,
      audioPublicId: audioResult.public_id,
      coverUrl: coverResult?.secure_url || '/default-cover.jpg', // Image par défaut
      coverPublicId: coverResult?.public_id || null,
      duration: audioResult.duration || 0,
      artist: session.user.id,
      isPublic: trackData.isPublic !== false,
      isExplicit: trackData.isExplicit || false,
      plays: 0,
      likes: [], // Tableau vide d'ObjectId
      comments: [], // Tableau vide d'ObjectId
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
    
    // Gestion spécifique des erreurs de taille
    if (error instanceof Error && error.message.includes('413')) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Taille maximale: 25MB pour l\'audio, 5MB pour l\'image.' },
        { status: 413 }
      );
    }
    
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
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
} 