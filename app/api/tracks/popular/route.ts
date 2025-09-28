import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Récupérer les pistes populaires depuis Supabase (basé sur les likes)
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select(`
        *,
        profiles!tracks_creator_id_fkey (
          id,
          username,
          name,
          avatar,
          is_artist,
          artist_name
        )
      `)
      .order('likes', { ascending: false })
      .order('plays', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Erreur Supabase popular tracks:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des pistes populaires' },
        { status: 500 }
      );
    }

    // Transformer les données pour correspondre au format attendu
    const formattedTracks = tracks?.map(track => ({
      _id: track.id,
      title: track.title,
      artist: {
        _id: track.creator_id,
        username: track.profiles?.username,
        name: track.profiles?.name,
        avatar: track.profiles?.avatar,
        isArtist: track.profiles?.is_artist,
        artistName: track.profiles?.artist_name
      },
      duration: track.duration,
      coverUrl: track.cover_url,
      audioUrl: track.audio_url,
      genre: track.genre,
      lyrics: track.lyrics || null,
      likes: track.likes || [],
      plays: track.plays || 0,
      createdAt: track.created_at,
      isFeatured: track.is_featured,
      isVerified: track.profiles?.is_verified || false
    })) || [];

    console.log(`✅ ${formattedTracks.length} pistes populaires récupérées`);
    return NextResponse.json({ tracks: formattedTracks });

  } catch (error) {
    console.error('❌ Erreur serveur popular tracks:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
