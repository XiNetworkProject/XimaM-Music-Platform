import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { generateUploadSignature } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const resourceType = body?.resourceType === 'image' ? 'image' : 'video';
    const timestamp = Math.round(Date.now() / 1000);
    const publicId = String(body?.publicId || `${resourceType}_${Date.now()}`)
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 120);
    const requestedFolder = typeof body?.folder === 'string' ? body.folder.trim() : '';
    const folder = requestedFolder.startsWith('ximam/') && /^[a-zA-Z0-9/_-]+$/.test(requestedFolder)
      ? requestedFolder
      : resourceType === 'video' ? 'ximam/audio' : 'ximam/images';
    const signature = generateUploadSignature({ folder, public_id: publicId, timestamp });

    return NextResponse.json({
      signature,
      timestamp,
      publicId,
      folder,
      resourceType,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (error) {
    console.error('Erreur generation signature:', error);
    return NextResponse.json({ error: 'Erreur lors de la generation de la signature' }, { status: 500 });
  }
}
