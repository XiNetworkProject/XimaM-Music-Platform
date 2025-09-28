import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 API Tracks Simple - Début');
    
    // Récupérer les tracks avec toutes les infos
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select(`
        id,
        title,
        creator_id,
        cover_url,
        audio_url,
        duration,
        plays,
        likes,
        is_featured,
        genre,
        lyrics,
        created_at
      `)
      .limit(20);
    
    if (tracksError) {
      console.error('❌ Erreur Supabase tracks:', tracksError);
      return NextResponse.json({ 
        error: 'Erreur Supabase tracks', 
        details: tracksError.message || tracksError 
      }, { status: 500 });
    }
    
    console.log('✅ Tracks récupérées:', tracks?.length || 0);
    
    // Vérifier la structure des tracks
    if (tracks && tracks.length > 0) {
      console.log('🔍 Structure première track:', {
        id: tracks[0].id,
        title: tracks[0].title,
        creator_id: tracks[0].creator_id,
        genre: tracks[0].genre,
        is_featured: tracks[0].is_featured
      });
    }
    
    // Récupérer les créateurs avec les bonnes colonnes
    const creatorIds = Array.from(new Set(tracks?.map(track => track.creator_id).filter(Boolean) || []));
    let creators: any[] = [];

    if (creatorIds.length > 0) {
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('profiles')
        .select('id, username, name, avatar, bio')
        .in('id', creatorIds);

      if (!creatorsError && creatorsData) {
        creators = creatorsData;
        console.log('✅ Créateurs récupérés:', creators.length);
        console.log('🔍 Premier créateur:', creators[0]);
      }
    }
    
    // Formatage intelligent des tracks avec algorithme
    const formattedTracks = (tracks || []).map(track => {
      const creator = creators.find(c => c.id === track.creator_id);
      const now = new Date();
      const trackDate = new Date(track.created_at);
      const daysSinceCreation = Math.floor((now.getTime() - trackDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Algorithme pour déterminer si c'est nouveau
      const isNew = daysSinceCreation <= 7;
      
      // Algorithme pour trending (combinaison plays + likes + récence)
      const trendingScore = (track.plays || 0) + ((track.likes || 0) * 2) + Math.max(0, 30 - daysSinceCreation);
      const isTrending = trendingScore > 100;
      
      // Vérifier si c'est en vedette
      const isFeatured = track.is_featured === true;
      
      // Vérifier les genres
      const genres = Array.isArray(track.genre) ? track.genre : [];
      console.log(`🔍 Track "${track.title}" - Genres:`, genres);
      
      return {
        _id: track.id,
        title: track.title,
        artist: {
          _id: track.creator_id,
          username: creator?.username || 'Utilisateur inconnu',
          name: creator?.name || creator?.username || 'Utilisateur inconnu',
          avatar: creator?.avatar || '',
          isArtist: false
        },
        genre: genres,
        plays: track.plays || 0,
        likes: track.likes || 0,
        createdAt: track.created_at,
        coverUrl: track.cover_url,
        audioUrl: track.audio_url,
        duration: track.duration || 0,
        lyrics: track.lyrics || null,
        isFeatured: isFeatured,
        isNew: isNew,
        trendingScore: trendingScore
      };
    });
    
    console.log('✅ Tracks formatées:', formattedTracks.length);
    console.log('✅ Exemple track:', {
      title: formattedTracks[0]?.title,
      artist: formattedTracks[0]?.artist?.name,
      genre: formattedTracks[0]?.genre,
      isFeatured: formattedTracks[0]?.isFeatured,
      isNew: formattedTracks[0]?.isNew,
      trendingScore: formattedTracks[0]?.trendingScore
    });

    return NextResponse.json({
      tracks: formattedTracks,
      total: formattedTracks.length,
      message: 'API tracks simplifiée fonctionnelle'
    });

  } catch (error) {
    console.error('❌ Erreur générale tracks:', error);
    return NextResponse.json(
      { error: 'Erreur générale tracks', details: error },
      { status: 500 }
    );
  }
}
