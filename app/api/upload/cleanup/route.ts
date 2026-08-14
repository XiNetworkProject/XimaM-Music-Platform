import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { deleteLocalMedia, isLocalMediaOwnedBy } from '@/lib/localMediaStorage';

async function deleteMedia(publicId: string, ownerId: string) {
  if (isLocalMediaOwnedBy(publicId, ownerId)) await deleteLocalMedia(publicId);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { audioPublicId, coverPublicId, coverVideoPublicId, publicIds } = await request.json();
    const requestedIds = [
      audioPublicId,
      coverPublicId,
      coverVideoPublicId,
      ...(Array.isArray(publicIds) ? publicIds : []),
    ].filter((value): value is string => typeof value === 'string' && Boolean(value));
    if (!requestedIds.length) return NextResponse.json({ ok: true });

    try {
      await Promise.all(Array.from(new Set(requestedIds)).map((publicId) => deleteMedia(publicId, session.user.id)));
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
