import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { queryDatabase, withDatabaseTransaction } from '@/lib/postgres';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const playlistId = params?.id?.trim();
    if (!playlistId) {
      return NextResponse.json({ error: 'playlist_id requis' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const orderedTrackIds = Array.from(new Set(
      (Array.isArray(body?.orderedTrackIds) ? body.orderedTrackIds : [])
        .filter((value: unknown): value is string => typeof value === 'string')
        .map((value: string) => value.trim())
        .filter(Boolean),
    )).slice(0, 2_000);
    if (!orderedTrackIds.length) {
      return NextResponse.json({ error: 'orderedTrackIds requis' }, { status: 400 });
    }

    await withDatabaseTransaction(async (client) => {
      const playlist = await queryDatabase<{ creator_id: string }>(
        'SELECT creator_id FROM public.playlists WHERE id = $1 FOR UPDATE',
        [playlistId],
        client,
      );
      if (!playlist.rows[0]) throw Object.assign(new Error('PLAYLIST_NOT_FOUND'), { status: 404 });
      const isAdmin = session.user.role === 'admin';
      if (playlist.rows[0].creator_id !== session.user.id && !isAdmin) {
        throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
      }

      await queryDatabase(
        `UPDATE public.playlist_tracks AS target
            SET position = ordered.position - 1
           FROM unnest($2::text[]) WITH ORDINALITY AS ordered(track_id, position)
          WHERE target.playlist_id = $1
            AND target.track_id::text = ordered.track_id`,
        [playlistId, orderedTrackIds],
        client,
      );
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    if (status === 404) return NextResponse.json({ error: 'Playlist introuvable' }, { status });
    if (status === 403) return NextResponse.json({ error: 'Acces refuse' }, { status });
    console.error('[playlists/reorder] erreur PostgreSQL:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
