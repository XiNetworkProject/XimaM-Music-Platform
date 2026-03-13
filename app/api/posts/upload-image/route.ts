import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { v2 as cloudinary } from 'cloudinary';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('[upload-image] Cloudinary env vars manquantes');
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Seules les images sont acceptées' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Image trop volumineuse (max 5MB)' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const userId = session.user.id;

    // Upload via data URI — plus fiable en serverless que upload_stream
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `ximam/posts/${userId}`,
      quality: 'auto',
      fetch_format: 'auto',
      transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
    });

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
  } catch (e: any) {
    console.error('[posts/upload-image] error:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Erreur upload' }, { status: 500 });
  }
}
