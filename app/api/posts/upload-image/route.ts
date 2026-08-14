import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { storeWebFile } from '@/lib/localMediaStorage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    const stored = await storeWebFile(file, 'post-image', undefined, session.user.id);
    return NextResponse.json({ url: stored.secure_url, publicId: stored.public_id, ...stored, storage: 'local' });
  } catch (error: any) {
    const message = String(error?.message || 'Erreur upload');
    return NextResponse.json({ error: message }, { status: message.includes('trop volumineux') ? 413 : 415 });
  }
}
