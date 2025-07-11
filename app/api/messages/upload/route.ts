import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { v2 as cloudinary } from 'cloudinary';

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Types de fichiers autorisés
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'];

// Limites de taille (en bytes)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

// POST /api/messages/upload
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'image', 'video', 'audio'

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Validation du type de fichier
    let allowedTypes: string[];
    let maxSize: number;
    let resourceType: string;

    switch (type) {
      case 'image':
        allowedTypes = ALLOWED_IMAGE_TYPES;
        maxSize = MAX_IMAGE_SIZE;
        resourceType = 'image';
        break;
      case 'video':
        allowedTypes = ALLOWED_VIDEO_TYPES;
        maxSize = MAX_VIDEO_SIZE;
        resourceType = 'video';
        break;
      case 'audio':
        allowedTypes = ALLOWED_AUDIO_TYPES;
        maxSize = MAX_AUDIO_SIZE;
        resourceType = 'video'; // Cloudinary traite l'audio comme vidéo
        break;
      default:
        return NextResponse.json({ error: 'Type de fichier non supporté' }, { status: 400 });
    }

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: `Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(', ')}` 
      }, { status: 400 });
    }

    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `Fichier trop volumineux. Taille max: ${Math.round(maxSize / (1024 * 1024))}MB` 
      }, { status: 400 });
    }

    // Convertir le fichier en buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload vers Cloudinary
    const uploadOptions: any = {
      resource_type: resourceType,
      folder: `messages/${session.user.id}`,
      public_id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Options spécifiques pour vidéo/audio
    if (type === 'video' || type === 'audio') {
      uploadOptions.duration_limit = 60; // 60 secondes max
      uploadOptions.format = type === 'video' ? 'mp4' : 'mp3';
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(buffer);
    });

    return NextResponse.json({
      success: true,
      url: (result as any).secure_url,
      publicId: (result as any).public_id,
      duration: (result as any).duration,
      format: (result as any).format,
    });

  } catch (error) {
    console.error('Erreur upload message:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de l\'upload du fichier' 
    }, { status: 500 });
  }
} 