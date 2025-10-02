import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Récupérer les pistes tendance depuis Supabase (basé sur les plays récents)
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
      .order('plays', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Erreur Supabase trending tracks:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des pistes tendance' },
        { status: 500 }
      );
    }

    // Charger boosts actifs pour ces pistes et appliquer un score boosté (plafonné x1.3)
    const trackIds = (tracks || []).map(t => t.id);
    let boostMap = new Map<string, number>();
    if (trackIds.length) {
      const nowIso = new Date().toISOString();
      const { data: boosts } = await supabaseAdmin
        .from('active_track_boosts')
        .select('track_id, multiplier, expires_at')
        .in('track_id', trackIds)
        .gt('expires_at', nowIso);
      (boosts || []).forEach((b: any) => {
        const curr = boostMap.get(b.track_id) || 1;
        boostMap.set(b.track_id, Math.max(curr, Number(b.multiplier) || 1));
      });
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
      rankingScore: (track.plays || 0) * Math.min(boostMap.get(track.id) || 1, 1.3),
      createdAt: track.created_at,
      isFeatured: track.is_featured,
      isVerified: track.profiles?.is_verified || false
    })) || [];

    console.log(`✅ ${formattedTracks.length} pistes tendance récupérées`);
    return NextResponse.json({ tracks: formattedTracks });

  } catch (error) {
    console.error('❌ Erreur serveur trending tracks:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
