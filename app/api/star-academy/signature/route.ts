import { NextRequest, NextResponse } from 'next/server';
import { generateUploadSignature } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const { timestamp, publicId } = await req.json();

    if (!timestamp || !publicId) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
    }

    const params = {
      folder: 'ximam/star-academy',
      public_id: publicId,
      timestamp,
      resource_type: 'video',
    };

    const signature = generateUploadSignature(params);

    return NextResponse.json({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (error) {
    console.error('[star-academy/signature] Error:', error);
    return NextResponse.json({ error: 'Erreur signature.' }, { status: 500 });
  }
}
