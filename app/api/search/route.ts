import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const filter = searchParams.get('filter') || 'all';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query.trim()) {
      return NextResponse.json({
        tracks: [],
        artists: [],
        playlists: []
      });
    }

    const searchQuery = `%${query}%`;
    const startTime = Date.now();

    // OPTIMISATION: Requêtes parallèles au lieu de séquentielles
    const searchPromises = [];

    // Recherche dans les pistes (si nécessaire)
    if (filter === 'all' || filter === 'tracks') {
      searchPromises.push(
        supabase
          .from('tracks')
          .select(`
            id,
            title,
            genre,
            plays,
            likes,
            created_at,
            creator_id,
            cover_url,
            audio_url,
            duration
          `)
          .or(`title.ilike.${searchQuery},genre.cs.{${query}}`)
          .order('likes', { ascending: false })
          .limit(limit)
      );
    } else {
      searchPromises.push(Promise.resolve({ data: [], error: null }));
    }

    // Recherche dans les artistes/utilisateurs (si nécessaire)
    if (filter === 'all' || filter === 'artists') {
      searchPromises.push(
        supabase
          .from('profiles')
          .select(`
            id,
            username,
            name,
            avatar,
            is_artist,
            artist_name,
            bio,
            total_plays,
            total_likes
          `)
          .or(`username.ilike.${searchQuery},name.ilike.${searchQuery},artist_name.ilike.${searchQuery}`)
          .order('total_plays', { ascending: false })
          .limit(limit)
      );
    } else {
      searchPromises.push(Promise.resolve({ data: [], error: null }));
    }

    // Recherche dans les playlists (si nécessaire)
    if (filter === 'all' || filter === 'playlists') {
      searchPromises.push(
        supabase
          .from('playlists')
          .select(`
            id,
            name,
            description,
            cover_url,
            created_at,
            creator_id,
            tracks_count
          `)
          .or(`name.ilike.${searchQuery},description.ilike.${searchQuery}`)
          .order('created_at', { ascending: false })
          .limit(limit)
      );
    } else {
      searchPromises.push(Promise.resolve({ data: [], error: null }));
    }

    // Exécuter toutes les requêtes en parallèle
    const [tracksResult, artistsResult, playlistsResult] = await Promise.all(searchPromises);
    
    let tracks: any[] = [];
    let artists: any[] = [];
    let playlists: any[] = [];

    // Traiter les résultats des tracks
    if (tracksResult.data && tracksResult.data.length > 0) {
      // OPTIMISATION: Récupérer tous les créateurs en une seule requête
      const creatorIds = Array.from(new Set(tracksResult.data.map((track: any) => track.creator_id)));
      
      if (creatorIds.length > 0) {
        const { data: creatorsData, error: creatorsError } = await supabase
          .from('profiles')
          .select('id, username, name, avatar, is_artist, artist_name')
          .in('id', creatorIds);

        if (!creatorsError && creatorsData) {
          const creatorsMap = new Map(creatorsData.map(creator => [creator.id, creator]));
          
          tracks = tracksResult.data.map((track: any) => {
            const creator = creatorsMap.get(track.creator_id);
            return {
              _id: track.id,
              title: track.title,
              artist: {
                _id: track.creator_id,
                username: creator?.username || 'Utilisateur inconnu',
                name: creator?.name || creator?.username || 'Utilisateur inconnu',
                avatar: creator?.avatar || '',
                isArtist: creator?.is_artist || false,
                artistName: creator?.artist_name || creator?.name || creator?.username || 'Utilisateur inconnu'
              },
              genre: track.genre,
              plays: track.plays || 0,
              likes: track.likes || 0,
              createdAt: track.created_at,
              coverUrl: track.cover_url,
              audioUrl: track.audio_url,
              duration: track.duration || 0
            };
          });
        }
      }
    }

    // Traiter les résultats des artistes
    if (artistsResult.data && artistsResult.data.length > 0) {
      artists = artistsResult.data.map((profile: any) => ({
        _id: profile.id,
        username: profile.username,
        name: profile.name,
        avatar: profile.avatar,
        isArtist: profile.is_artist,
        artistName: profile.artist_name,
        bio: profile.bio,
        totalPlays: profile.total_plays || 0,
        totalLikes: profile.total_likes || 0,
        listeners: profile.total_plays || 0
      }));
    }

    // Traiter les résultats des playlists
    if (playlistsResult.data && playlistsResult.data.length > 0) {
      // OPTIMISATION: Récupérer les créateurs des playlists en une seule requête
      const playlistCreatorIds = Array.from(new Set(playlistsResult.data.map((playlist: any) => playlist.creator_id)));
      
      if (playlistCreatorIds.length > 0) {
        const { data: playlistCreatorsData, error: playlistCreatorsError } = await supabase
          .from('profiles')
          .select('id, username, name, avatar')
          .in('id', playlistCreatorIds);

        if (!playlistCreatorsError && playlistCreatorsData) {
          const playlistCreatorsMap = new Map(playlistCreatorsData.map(creator => [creator.id, creator]));
          
          playlists = playlistsResult.data.map((playlist: any) => {
            const creator = playlistCreatorsMap.get(playlist.creator_id);
            return {
              _id: playlist.id,
              title: playlist.name,
              name: playlist.name,
              description: playlist.description,
              coverUrl: playlist.cover_url,
              trackCount: playlist.tracks_count || 0,
              creator: {
                _id: playlist.creator_id,
                username: creator?.username || 'Utilisateur',
                name: creator?.name || 'Utilisateur',
                avatar: creator?.avatar || ''
              },
              createdAt: playlist.created_at
            };
          });
        }
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`⚡ Recherche "${query}" optimisée terminée en ${totalTime}ms: ${tracks.length} pistes, ${artists.length} artistes, ${playlists.length} playlists`);

    return NextResponse.json({
      tracks,
      artists,
      playlists,
      query,
      filter,
      totalResults: tracks.length + artists.length + playlists.length,
      performance: {
        totalTime,
        queryCount: 3, // Nombre de requêtes principales
        optimization: 'parallel_queries'
      }
    });

  } catch (error) {
    console.error('❌ Erreur recherche optimisée:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recherche' },
      { status: 500 }
    );
  }
}
