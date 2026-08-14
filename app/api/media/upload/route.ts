import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { storeRequestBody, type LocalMediaKind } from '@/lib/localMediaStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_KINDS = new Set<LocalMediaKind>(['audio', 'cover', 'cover-video']);

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const kindParam = request.nextUrl.searchParams.get('kind') || '';
    if (!ALLOWED_KINDS.has(kindParam as LocalMediaKind)) {
      return NextResponse.json({ error: 'Type de media invalide' }, { status: 400 });
    }

    if (!request.body) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
    }

    const encodedName = request.headers.get('x-file-name') || '';
    let originalName = 'upload.bin';
    try {
      originalName = decodeURIComponent(encodedName) || originalName;
    } catch {
      originalName = encodedName || originalName;
    }

    const contentType = request.headers.get('content-type') || 'application/octet-stream';

    const media = await storeRequestBody({
      kind: kindParam as LocalMediaKind,
      originalName,
      contentType,
      body: request.body,
    });

    return NextResponse.json({
      success: true,
      ...media,
      storage: 'local',
    });
  } catch (error: any) {
    console.error('Erreur upload media local:', error);
    const message = String(error?.message || 'Erreur lors de l upload du fichier');
    const status = message.includes('trop volumineux') ? 413 : message.includes('supporte') || message.includes('doit etre') ? 415 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
