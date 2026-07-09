import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { applyPublicTrackFilter } from '@/lib/publicTracks';

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
        playlists: [],
        posts: [],
      });
    }

    const searchQuery = `%${query}%`;
    const startTime = Date.now();

    // OPTIMISATION: Requêtes parallèles au lieu de séquentielles
    const searchPromises = [];

    // Recherche dans les pistes (si nécessaire)
    if (filter === 'all' || filter === 'tracks') {
      searchPromises.push(
        applyPublicTrackFilter(supabase
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
          `))
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
          .eq('is_public', true)
          .or(`name.ilike.${searchQuery},description.ilike.${searchQuery}`)
          .order('created_at', { ascending: false })
          .limit(limit)
      );
    } else {
      searchPromises.push(Promise.resolve({ data: [], error: null }));
    }

    // Recherche dans les posts publics (si nécessaire)
    if (filter === 'all' || filter === 'posts') {
      searchPromises.push(
        supabaseAdmin
          .from('creator_posts')
          .select(`
            id,
            post_type,
            content,
            image_url,
            track_id,
            likes_count,
            comments_count,
            created_at,
            creator_id,
            profiles!creator_posts_creator_id_fkey (
              id,
              username,
              name,
              avatar
            )
          `)
          .eq('is_public', true)
          .ilike('content', `%${query.replace(/[%_]/g, '\\$&')}%`)
          .order('created_at', { ascending: false })
          .limit(limit)
      );
    } else {
      searchPromises.push(Promise.resolve({ data: [], error: null }));
    }

    // Exécuter toutes les requêtes en parallèle
    const [tracksResult, artistsResult, playlistsResult, postsResult] = await Promise.all(searchPromises);
    
    let tracks: any[] = [];
    let artists: any[] = [];
    let playlists: any[] = [];
    let posts: any[] = [];

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

    // Traiter les résultats des posts
    if (postsResult.data && postsResult.data.length > 0) {
      posts = postsResult.data.map((post: any) => {
        const creator = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
        return {
          _id: post.id,
          id: post.id,
          type: post.post_type,
          content: post.content || '',
          excerpt: post.content || '',
          imageUrl: post.image_url || null,
          trackId: post.track_id || null,
          likes: post.likes_count || 0,
          comments: post.comments_count || 0,
          createdAt: post.created_at,
          creator: creator ? {
            _id: creator.id,
            id: creator.id,
            username: creator.username,
            name: creator.name || creator.username,
            avatar: creator.avatar || '',
          } : null,
        };
      });
    }

    const totalTime = Date.now() - startTime;
    console.log(`⚡ Recherche "${query}" optimisée terminée en ${totalTime}ms: ${tracks.length} pistes, ${artists.length} artistes, ${playlists.length} playlists, ${posts.length} posts`);

    return NextResponse.json({
      tracks,
      artists,
      playlists,
      posts,
      query,
      filter,
      totalResults: tracks.length + artists.length + playlists.length + posts.length,
      performance: {
        totalTime,
        queryCount: 4, // Nombre de requêtes principales
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
