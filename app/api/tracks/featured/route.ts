import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    
    // Récupérer l'utilisateur connecté
    const session = await getServerSession(authOptions).catch(() => null);
    const userId = (session?.user as any)?.id || null;

    // Récupérer les pistes en vedette depuis Supabase
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
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Erreur Supabase featured tracks:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des pistes en vedette' },
        { status: 500 }
      );
    }

    // Récupérer les likes de l'utilisateur
    const trackIds = (tracks || []).map(t => t.id);
    let likedTrackIds = new Set<string>();
    if (userId && trackIds.length) {
      const { data: likes } = await supabaseAdmin
        .from('track_likes')
        .select('track_id')
        .eq('user_id', userId)
        .in('track_id', trackIds);
      
      if (likes) {
        likes.forEach((like: any) => likedTrackIds.add(like.track_id));
      }
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
      likes: track.likes || [],
      plays: track.plays || 0,
      createdAt: track.created_at,
      isFeatured: track.is_featured,
      isVerified: track.profiles?.is_verified || false,
      isLiked: likedTrackIds.has(track.id)
    })) || [];

    console.log(`✅ ${formattedTracks.length} pistes en vedette récupérées`);
    return NextResponse.json({ tracks: formattedTracks });

  } catch (error) {
    console.error('❌ Erreur serveur featured tracks:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
