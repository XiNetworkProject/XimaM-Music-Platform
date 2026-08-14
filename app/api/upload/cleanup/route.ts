import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import cloudinary from '@/lib/cloudinary';
import { deleteLocalMedia, isLocalMediaPublicId } from '@/lib/localMediaStorage';

async function deleteMedia(publicId: string, resourceType: 'image' | 'video') {
  if (isLocalMediaPublicId(publicId)) {
    await deleteLocalMedia(publicId);
    return;
  }
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { audioPublicId, coverPublicId, coverVideoPublicId } = await request.json();
    if (!audioPublicId && !coverPublicId && !coverVideoPublicId) return NextResponse.json({ ok: true });

    try {
      if (audioPublicId) await deleteMedia(audioPublicId, 'video');
      if (coverPublicId) await deleteMedia(coverPublicId, 'image');
      if (coverVideoPublicId) await deleteMedia(coverVideoPublicId, 'video');
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}


