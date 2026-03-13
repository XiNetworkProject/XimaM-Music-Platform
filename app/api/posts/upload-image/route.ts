import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { uploadImage } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Seules les images sont acceptées' }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Image trop volumineuse (max 5MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const userId = session.user.id;

    const result = await uploadImage(buffer, {
      folder: `ximam/posts/${userId}`,
      quality: 'auto',
      fetch_format: 'auto',
      transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
    });

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
  } catch (e: any) {
    console.error('[posts/upload-image] error:', e);
    return NextResponse.json({ error: e?.message || 'Erreur upload' }, { status: 500 });
  }
}
