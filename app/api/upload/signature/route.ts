import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { v2 as cloudinary } from 'cloudinary';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timestamp = Math.round(new Date().getTime() / 1000);
    const publicId = `track_${session.user.id}_${timestamp}`;

    // Générer la signature pour l'upload audio
    const audioSignature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        public_id: publicId,
        resource_type: 'video', // Cloudinary traite l'audio comme vidéo
      },
      process.env.CLOUDINARY_API_SECRET!
    );

    // Générer la signature pour l'upload image
    const imageSignature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        public_id: `cover_${session.user.id}_${timestamp}`,
        resource_type: 'image',
      },
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
      audioSignature,
      imageSignature,
      timestamp,
      publicId,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });

  } catch (error) {
    console.error('Erreur génération signature:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la signature' },
      { status: 500 }
    );
  }
} 