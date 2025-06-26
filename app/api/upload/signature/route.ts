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

    // Préparer les paramètres dans l'ordre alphabétique pour Cloudinary
    const params = {
      folder: resourceType === 'video' ? 'ximam/audio' : 'ximam/images',
      public_id: publicId,
      resource_type: resourceType,
      timestamp: timestamp,
    };

    console.log('Params for signature:', params);

    // Générer la signature pour l'upload direct
    const signature = generateUploadSignature(params);

    console.log('Generated signature:', signature);

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