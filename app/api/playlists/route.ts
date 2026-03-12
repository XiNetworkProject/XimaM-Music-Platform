import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getEntitlements } from '@/lib/entitlements';

// utilisation du client admin centralisé

// GET - Récupérer les playlists d'un utilisateur
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { data: playlists, error } = await supabase
      .from('playlists')
      .select(`
        *,
        tracks:playlist_tracks(
          track_id,
          position,
          tracks(
            id, title, creator_id, created_at, cover_url, audio_url, duration, genre, album,
            profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name )
          )
        )
      `)
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des playlists' }, { status: 500 });
    }

    // Formater les données
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
      album: t.album || null,
      genre: Array.isArray(t.genre) ? t.genre : [],
      likes: [],
      plays: 0,
      createdAt: t.created_at,
      isLiked: false,
    });

    const formattedPlaylists = playlists?.map((playlist: any) => {
      const rows = Array.isArray(playlist.tracks) ? playlist.tracks.slice() : [];
      rows.sort((a: any, b: any) => (a?.position ?? 0) - (b?.position ?? 0));
      const trackList = rows.map((pt: any) => pt?.tracks).filter(Boolean).map(toTrack);
      const totalDuration = rows.reduce((total: number, pt: any) => total + ((pt?.tracks?.duration) || 0), 0);
      return {
        _id: playlist.id,
        name: playlist.name,
        description: playlist.description || '',
        coverUrl: playlist.cover_url,
        trackCount: trackList.length,
        duration: totalDuration,
        isPublic: playlist.is_public,
        isAlbum: playlist.is_album || false,
        tracks: trackList,
        createdBy: playlist.creator_id,
        createdAt: playlist.created_at,
        updatedAt: playlist.updated_at,
        likes: [],
        followers: []
      };
    }) || [];

    return NextResponse.json({ 
      playlists: formattedPlaylists,
      total: formattedPlaylists.length 
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// POST - Créer une nouvelle playlist
export async function POST(request: NextRequest) {
  try {
    const { name, description, isPublic, coverUrl, is_album } = await request.json();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nom de playlist requis' }, { status: 400 });
    }

    // Appliquer quota playlists
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', session.user.id)
      .maybeSingle();
    const plan = (profile?.plan || 'free') as any;
    const ent = getEntitlements(plan);
    if (ent.uploads.maxPlaylists > -1) {
      const { count } = await supabase
        .from('playlists')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', session.user.id);
      if ((count || 0) >= ent.uploads.maxPlaylists) {
        return NextResponse.json({ error: `Quota playlists atteint: ${ent.uploads.maxPlaylists}` }, { status: 403 });
      }
    }

    const userId = session.user.id;
    
    console.log('🎵 Création de playlist:', { name, description, isPublic, userId });

    console.log('🔍 Tentative d\'insertion dans Supabase...');
    
    const playlistId = randomUUID();

    const insertPayload: Record<string, any> = {
        id: playlistId,
        name: name.trim(),
        description: description?.trim() || '',
        is_public: isPublic !== false,
        creator_id: userId,
        cover_url: coverUrl || null,
    };
    if (is_album) insertPayload.is_album = true;

    let playlist: any = null;
    let error: any = null;

    const result = await supabase.from('playlists').insert(insertPayload).select().single();
    playlist = result.data;
    error = result.error;

    // Fallback if is_album column doesn't exist yet
    if (error && is_album) {
      const { is_album: _drop, ...fallback } = insertPayload;
      const retry = await supabase.from('playlists').insert(fallback).select().single();
      playlist = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('❌ Erreur Supabase:', error);
      return NextResponse.json({ 
        error: 'Erreur lors de la création de la playlist',
        details: error.message 
      }, { status: 500 });
    }
    
    console.log('✅ Playlist créée avec succès:', playlist);

    const formattedPlaylist = {
      _id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      coverUrl: playlist.cover_url,
      trackCount: 0,
      duration: 0,
      isPublic: playlist.is_public,
      isAlbum: playlist.is_album || false,
      tracks: [],
      createdBy: playlist.creator_id,
      createdAt: playlist.created_at,
      updatedAt: playlist.updated_at,
      likes: [],
      followers: []
    };

    return NextResponse.json(formattedPlaylist, { status: 201 });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
