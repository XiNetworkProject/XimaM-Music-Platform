import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import cloudinary from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { audioPublicId, coverPublicId } = await request.json();
    if (!audioPublicId && !coverPublicId) return NextResponse.json({ ok: true });

    try {
      if (audioPublicId) await cloudinary.uploader.destroy(audioPublicId, { resource_type: 'video' });
      if (coverPublicId) await cloudinary.uploader.destroy(coverPublicId, { resource_type: 'image' });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}


