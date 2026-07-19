import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { generateUploadSignature } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const body = await request.json().catch(() => null);
    const timestamp = Number(body?.timestamp || 0);
    const publicId = typeof body?.publicId === 'string' ? body.publicId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100) : '';
    const type = body?.type;
    if (!timestamp || !publicId || !['image', 'video', 'audio'].includes(type)) {
      return NextResponse.json({ error: 'Parametres invalides' }, { status: 400 });
    }
    if (Math.abs(Math.round(Date.now() / 1000) - timestamp) > 10 * 60) {
      return NextResponse.json({ error: 'Signature expiree' }, { status: 400 });
    }
    const resourceType = type === 'image' ? 'image' : 'video';
    const params: Record<string, string | number> = {
      folder: `ximam/messages/${session.user.id}`,
      public_id: publicId,
      timestamp,
    };
    if (type === 'audio') params.format = 'mp3';
    return NextResponse.json({
      signature: generateUploadSignature(params),
      timestamp,
      publicId,
      folder: params.folder,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      resourceType,
    });
  } catch (error) {
    console.error('[messages/upload] failed:', error);
    return NextResponse.json({ error: 'Signature d’envoi indisponible' }, { status: 500 });
  }
}
