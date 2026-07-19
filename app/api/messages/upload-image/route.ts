import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getApiSession } from '@/lib/getApiSession';

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
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: 'Stockage indisponible' }, { status: 503 });
    }
    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Image requise' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Format image requis' }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Image trop volumineuse (8 Mo max)' }, { status: 413 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `ximam/messages/${session.user.id}`,
      quality: 'auto',
      fetch_format: 'auto',
      transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
    });
    return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
  } catch (error: any) {
    console.error('[messages/upload-image] failed:', error?.message || error);
    return NextResponse.json({ error: 'Envoi de l’image impossible' }, { status: 500 });
  }
}
