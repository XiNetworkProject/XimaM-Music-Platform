import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { generateUploadSignature } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { timestamp, publicId, resourceType = 'video' } = await request.json();

    // Générer la signature pour l'upload direct
    const signature = generateUploadSignature({
      timestamp,
      public_id: publicId,
      resource_type: resourceType,
      folder: resourceType === 'video' ? 'ximam/audio' : 'ximam/images',
    });

    return NextResponse.json({
      signature,
      timestamp,
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