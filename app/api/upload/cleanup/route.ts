import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import cloudinary from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { audioPublicId, coverPublicId, coverVideoPublicId } = await request.json();
    if (!audioPublicId && !coverPublicId && !coverVideoPublicId) return NextResponse.json({ ok: true });

    try {
      if (audioPublicId) await cloudinary.uploader.destroy(audioPublicId, { resource_type: 'video' });
      if (coverPublicId) await cloudinary.uploader.destroy(coverPublicId, { resource_type: 'image' });
      if (coverVideoPublicId) await cloudinary.uploader.destroy(coverVideoPublicId, { resource_type: 'video' });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}


