import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { getApiSession } from '@/lib/getApiSession';
import { canAddTrackToPlaylist } from '@/lib/publicTracks';

async function requirePlaylistOwner(request: NextRequest, playlistId: string) {
  const session = await getApiSession(request);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  }
  const { data: playlist } = await supabase
    .from('playlists')
    .select('id, creator_id, is_public')
    .eq('id', playlistId)
    .maybeSingle();
  if (!playlist) {
    return { error: NextResponse.json({ error: 'Playlist non trouvée' }, { status: 404 }) };
  }
  if (playlist.creator_id !== session.user.id) {
    return { error: NextResponse.json({ error: 'Interdit' }, { status: 403 }) };
  }
  return { playlist };
}

// POST - Ajouter une track à une playlist
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { trackId } = await request.json();
    const ownership = await requirePlaylistOwner(request, id);
    if (ownership.error) return ownership.error;

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID requis' }, { status: 400 });
    }

    const playlist = ownership.playlist!;

    // Vérifier que la track existe
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, creator_id, is_public, audio_url')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    }

    // Règle de visibilité (voir lib/publicTracks.ts) : une playlist publique ne peut
    // contenir que des morceaux publiquement visibles ; une playlist privée peut en
    // plus contenir les propres brouillons de son propriétaire, jamais ceux d'un
    // autre utilisateur.
    const playlistIsPublic = playlist.is_public !== false;
    const canAddTrack = canAddTrackToPlaylist({
      playlistIsPublic,
      playlistOwnerId: playlist.creator_id,
      track,
    });

    if (!canAddTrack) {
      return NextResponse.json(
        {
          error: playlistIsPublic
            ? 'Ce morceau doit être public pour être ajouté à une playlist publique.'
            : 'Tu ne peux ajouter que tes propres morceaux ou des morceaux publics.',
        },
        { status: 403 },
      );
    }

    // Vérifier que la track n'est pas déjà dans la playlist
    const { data: existingTrack, error: existingError } = await supabase
      .from('playlist_tracks')
      .select('id')
      .eq('playlist_id', id)
      .eq('track_id', trackId)
      .single();

    if (existingTrack) {
      return NextResponse.json({ error: 'Track déjà dans la playlist' }, { status: 409 });
    }

    // Trouver la prochaine position
    let nextPosition = 0;
    try {
      const { data: maxRow } = await supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', id)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();
      nextPosition = (maxRow?.position ?? -1) + 1;
    } catch {}

    // Ajouter la track à la playlist avec position
    const { data: playlistTrack, error: insertError } = await supabase
      .from('playlist_tracks')
      .insert({
        playlist_id: id,
        track_id: trackId,
        position: nextPosition,
        added_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erreur Supabase:', insertError);
      return NextResponse.json({ error: 'Erreur lors de l\'ajout de la track' }, { status: 500 });
    }

    // Log event add_to_playlist (analytics)
    try {
      await fetch(`${new URL(request.url).origin}/api/tracks/${encodeURIComponent(trackId)}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'add_to_playlist', extra: { playlist_id: id } })
      });
    } catch {}

    return NextResponse.json({
      message: 'Track ajoutée à la playlist',
      playlistTrack
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// DELETE - Retirer une track d'une playlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const ownership = await requirePlaylistOwner(request, id);
    if (ownership.error) return ownership.error;
    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get('trackId');

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID requis' }, { status: 400 });
    }

    // Supprimer la track de la playlist
    const { error } = await supabase
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', id)
      .eq('track_id', trackId);

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression de la track' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Track retirée de la playlist' });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
