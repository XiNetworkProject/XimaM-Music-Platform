import { NextRequest, NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST — Retroactively mark existing playlists as albums.
 * Also creates the is_album column if missing.
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await getAdminGuard();
    if (!guard.ok) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    // Check if is_album column exists
    const testCol = await supabaseAdmin.from('playlists').select('is_album').limit(1);
    if (testCol.error && testCol.error.message?.includes('is_album')) {
      // Column doesn't exist — create it via Supabase SQL API
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

      const sqlQuery = 'ALTER TABLE playlists ADD COLUMN IF NOT EXISTS is_album boolean DEFAULT false;';

      // Try the Supabase SQL endpoint (available on hosted Supabase)
      const sqlRes = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ sql: sqlQuery }),
      }).catch(() => null);

      // If exec_sql RPC doesn't exist, try direct query via the management API
      if (!sqlRes || !sqlRes.ok) {
        // Fallback: try creating via a raw insert with the column to trigger auto-creation
        // This won't work — return instructions to user
        return NextResponse.json({
          error: 'La colonne is_album n\'existe pas encore.',
          action: 'Executez ce SQL dans Supabase Dashboard > SQL Editor, puis relancez la migration :',
          sql: sqlQuery,
        }, { status: 422 });
      }
    }

    // Fetch all playlists that are NOT already flagged as albums
    const { data: playlists, error: plErr } = await supabaseAdmin
      .from('playlists')
      .select('id, name')
      .or('is_album.is.null,is_album.eq.false');

    if (plErr) {
      return NextResponse.json({ error: plErr.message }, { status: 500 });
    }

    let migrated = 0;
    const migratedNames: string[] = [];

    for (const pl of playlists || []) {
      const { data: links } = await supabaseAdmin
        .from('playlist_tracks')
        .select('track_id')
        .eq('playlist_id', pl.id);

      if (!links || links.length < 2) continue;

      const trackIds = links.map(l => l.track_id);
      const { data: tracks } = await supabaseAdmin
        .from('tracks')
        .select('album')
        .in('id', trackIds);

      if (!tracks) continue;

      const matching = tracks.filter(t => t.album && t.album === pl.name).length;
      const withAlbum = tracks.filter(t => t.album).length;
      const allSameAlbum = withAlbum >= 2 && new Set(tracks.filter(t => t.album).map(t => t.album)).size === 1;
      if (matching >= Math.ceil(tracks.length * 0.5) || allSameAlbum) {
        const { error: upErr } = await supabaseAdmin
          .from('playlists')
          .update({ is_album: true })
          .eq('id', pl.id);

        if (!upErr) {
          migrated++;
          migratedNames.push(pl.name);
        }
      }
    }

    return NextResponse.json({
      success: true,
      migrated,
      albums: migratedNames,
      message: migrated > 0
        ? `${migrated} playlist(s) marquee(s) comme album(s)`
        : 'Aucune playlist a migrer trouvee',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
