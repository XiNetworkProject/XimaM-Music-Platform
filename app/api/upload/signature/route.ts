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

    const { timestamp, publicId, resourceType = 'video', resource_type = resourceType } = await request.json();

    // Préparer les paramètres pour la signature
    const params = {
      folder: (resource_type || resourceType) === 'video' ? 'ximam/audio' : 'ximam/images',
      public_id: publicId,
      timestamp: timestamp,
      resource_type: resource_type || resourceType,
    };

    console.log('=== DEBUG SIGNATURE ===');
    console.log('Input params:', { timestamp, publicId, resourceType });
    console.log('Params for signature:', params);
    console.log('API Secret length:', process.env.CLOUDINARY_API_SECRET?.length);

    // Générer la signature pour l'upload direct
    const signature = generateUploadSignature(params);

    console.log('Generated signature:', signature);
    console.log('=== END DEBUG ===');

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