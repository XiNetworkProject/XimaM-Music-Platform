import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Ajouter une track à une playlist
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { trackId } = await request.json();

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID requis' }, { status: 400 });
    }

    // Vérifier que la playlist existe
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id')
      .eq('id', id)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json({ error: 'Playlist non trouvée' }, { status: 404 });
    }

    // Vérifier que la track existe
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
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

    // Ajouter la track à la playlist
    const { data: playlistTrack, error: insertError } = await supabase
      .from('playlist_tracks')
      .insert({
        playlist_id: id,
        track_id: trackId,
        added_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erreur Supabase:', insertError);
      return NextResponse.json({ error: 'Erreur lors de l\'ajout de la track' }, { status: 500 });
    }

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
