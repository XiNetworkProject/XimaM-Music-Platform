import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/playlists/albums
 * Returns public albums (playlists with is_album = true), sorted by most recent.
 * Query params: limit (default 20), offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || '20'), 50);
    const offset = Number(searchParams.get('offset') || '0');

    const { data: albums, error } = await supabaseAdmin
      .from('playlists')
      .select(`
        id, name, description, cover_url, is_public, created_at,
        creator_id,
        tracks:playlist_tracks(
          track_id,
          tracks(id, duration, genre,
            profiles:profiles!tracks_creator_id_fkey(id, username, name, avatar, artist_name, is_artist)
          )
        ),
        creator:profiles!playlists_creator_id_fkey(id, username, name, avatar, artist_name, is_artist)
      `)
      .eq('is_album', true)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[albums] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (albums || []).map((pl: any) => {
      const rows = Array.isArray(pl.tracks) ? pl.tracks : [];
      const trackCount = rows.length;
      const totalDuration = rows.reduce((s: number, pt: any) => s + (pt?.tracks?.duration || 0), 0);

      // Collect unique genres from tracks
      const genreSet = new Set<string>();
      rows.forEach((pt: any) => {
        const g = pt?.tracks?.genre;
        if (Array.isArray(g)) g.forEach((x: string) => x && genreSet.add(x));
        else if (typeof g === 'string' && g) genreSet.add(g);
      });

      const creator = pl.creator || {};

      return {
        _id: pl.id,
        name: pl.name,
        description: pl.description || '',
        coverUrl: pl.cover_url || null,
        trackCount,
        duration: totalDuration,
        genres: Array.from(genreSet).slice(0, 3),
        createdAt: pl.created_at,
        artist: {
          _id: creator.id || pl.creator_id,
          username: creator.username || '',
          name: creator.artist_name || creator.name || creator.username || 'Artiste',
          avatar: creator.avatar || null,
          isArtist: creator.is_artist || false,
        },
      };
    });

    return NextResponse.json({ albums: formatted, total: formatted.length });
  } catch (err: any) {
    console.error('[albums] Server error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
