import { NextRequest, NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { dbAdmin } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_request: NextRequest) {
  try {
    const guard = await getAdminGuard();
    if (!guard.ok) return NextResponse.json({ error: 'Non autorise' }, { status: 403 });

    const testColumn = await dbAdmin.from('playlists').select('is_album').limit(1);
    if (testColumn.error) {
      return NextResponse.json({
        error: 'La colonne is_album est absente ou inaccessible.',
        action: 'Faites valider puis executer ce SQL separement par administrateur PostgreSQL.',
        sql: 'ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS is_album boolean DEFAULT false;',
      }, { status: 422 });
    }

    const { data: playlists, error } = await dbAdmin
      .from('playlists')
      .select('id, name')
      .or('is_album.is.null,is_album.eq.false');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let migrated = 0;
    const albums: string[] = [];
    for (const playlist of playlists || []) {
      const { data: links } = await dbAdmin.from('playlist_tracks').select('track_id').eq('playlist_id', playlist.id);
      if (!links || links.length < 2) continue;
      const { data: tracks } = await dbAdmin.from('tracks').select('album').in('id', links.map((link) => link.track_id));
      if (!tracks?.length) continue;
      const matching = tracks.filter((track) => track.album && track.album === playlist.name).length;
      const albumsPresent = tracks.filter((track) => track.album);
      const allSameAlbum = albumsPresent.length >= 2 && new Set(albumsPresent.map((track) => track.album)).size === 1;
      if (matching < Math.ceil(tracks.length * 0.5) && !allSameAlbum) continue;
      const updated = await dbAdmin.from('playlists').update({ is_album: true }).eq('id', playlist.id);
      if (!updated.error) {
        migrated += 1;
        albums.push(playlist.name);
      }
    }
    return NextResponse.json({ success: true, migrated, albums });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 });
  }
}
