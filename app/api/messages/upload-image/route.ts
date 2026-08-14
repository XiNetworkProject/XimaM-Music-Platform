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
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Image requise' }, { status: 400 });
    const stored = await storeWebFile(file, 'message-image', 8 * 1024 * 1024, session.user.id);
    return NextResponse.json({ url: stored.secure_url, publicId: stored.public_id, ...stored, storage: 'local' });
  } catch (error: any) {
    const message = String(error?.message || 'Envoi de l image impossible');
    return NextResponse.json({ error: message }, { status: message.includes('trop volumineux') ? 413 : 415 });
  }
}
