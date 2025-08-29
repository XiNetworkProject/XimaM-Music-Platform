import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Récupérer les playlists populaires depuis Supabase
    const { data: playlists, error } = await supabase
      .from('playlists')
      .select(`
        *,
        profiles!playlists_creator_id_fkey (
          id,
          username,
          name,
          avatar,
          is_artist,
          artist_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Erreur Supabase popular playlists:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des playlists populaires' },
        { status: 500 }
      );
    }

    // Transformer les données pour correspondre au format attendu
    const formattedPlaylists = playlists?.map(playlist => ({
      _id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      coverUrl: playlist.cover_url,
      creator: {
        _id: playlist.creator_id,
        username: 'Unknown',
        name: 'Unknown',
        avatar: null,
        isArtist: false,
        artistName: null
      },
      tracks: playlist.tracks || [],
      likes: [],
      isPublic: playlist.is_public,
      createdAt: playlist.created_at,
      updatedAt: playlist.updated_at,
      isVerified: false
    })) || [];

    console.log(`✅ ${formattedPlaylists.length} playlists populaires récupérées`);
    return NextResponse.json({ playlists: formattedPlaylists });

  } catch (error) {
    console.error('❌ Erreur serveur popular playlists:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
