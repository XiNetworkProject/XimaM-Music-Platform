import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// GET - Récupérer une playlist spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions).catch(() => null);
    const userId = (session?.user as any)?.id || null;

    const { data: playlist, error } = await supabase
      .from('playlists')
      .select(`
        *,
        tracks:playlist_tracks(
          track_id,
          position,
          tracks(
            id, title, creator_id, created_at, cover_url, audio_url, duration, genre,
            profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name )
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !playlist) {
      return NextResponse.json({ error: 'Playlist non trouvée' }, { status: 404 });
    }

    // Respecter la confidentialité: si privée et non propriétaire
    if (playlist.is_public === false && playlist.creator_id !== userId) {
      return NextResponse.json({ error: 'Playlist privée' }, { status: 403 });
    }

    const toTrack = (t: any) => ({
      _id: t.id,
      title: t.title,
      artist: {
        _id: t.creator_id,
        username: t.profiles?.username,
        name: t.profiles?.name,
        avatar: t.profiles?.avatar,
        isArtist: t.profiles?.is_artist,
        artistName: t.profiles?.artist_name,
      },
      duration: t.duration || 0,
      coverUrl: t.cover_url,
      audioUrl: t.audio_url,
      genre: Array.isArray(t.genre) ? t.genre : [],
      likes: [],
      plays: 0,
      createdAt: t.created_at,
      isLiked: false,
    });

    const rows = Array.isArray(playlist.tracks) ? playlist.tracks.slice() : [];
    rows.sort((a: any, b: any) => (a?.position ?? 0) - (b?.position ?? 0));
    const trackList = rows.map((pt: any) => pt?.tracks).filter(Boolean).map(toTrack);
    const totalDuration = rows.reduce((total: number, pt: any) => total + ((pt?.tracks?.duration) || 0), 0);

    const formattedPlaylist = {
      _id: playlist.id,
      name: playlist.name,
      description: playlist.description || '',
      coverUrl: playlist.cover_url,
      trackCount: trackList.length || 0,
      duration: totalDuration || 0,
      isPublic: playlist.is_public,
      tracks: trackList,
      createdBy: playlist.creator_id,
      createdAt: playlist.created_at,
      updatedAt: playlist.updated_at,
      likes: playlist.likes || [],
      followers: playlist.followers || []
    };

    return NextResponse.json(formattedPlaylist);

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// PUT - Mettre à jour une playlist
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { name, description, isPublic, coverUrl } = await request.json();

    const { data: playlist, error } = await supabase
      .from('playlists')
      .update({
        name: name?.trim(),
        description: description?.trim(),
        is_public: isPublic,
        cover_url: typeof coverUrl === 'string' ? coverUrl : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !playlist) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    const formattedPlaylist = {
      _id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      coverUrl: playlist.cover_url,
      trackCount: 0, // À calculer si nécessaire
      duration: 0, // À calculer si nécessaire
      isPublic: playlist.is_public,
      tracks: [],
      createdBy: playlist.creator_id,
      createdAt: playlist.created_at,
      updatedAt: playlist.updated_at,
      likes: playlist.likes || [],
      followers: playlist.followers || []
    };

    return NextResponse.json(formattedPlaylist);

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// DELETE - Supprimer une playlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Supprimer d'abord les relations playlist_tracks
    const { error: tracksError } = await supabase
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', id);

    if (tracksError) {
      console.error('Erreur suppression tracks:', tracksError);
    }

    // Supprimer la playlist
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Playlist supprimée avec succès' });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
