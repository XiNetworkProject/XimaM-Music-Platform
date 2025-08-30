import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured');
    const sort = searchParams.get('sort') || 'trending';
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');

    let query = supabase
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
        duration,
        is_featured,
        is_public
      `)
      .eq('is_public', true);

    // Filtrer par catégorie si spécifiée
    if (category && category !== 'all') {
      query = query.contains('genre', [category]);
    }

    // Filtrer par featured si demandé
    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    // Trier selon le paramètre
    switch (sort) {
      case 'trending':
        query = query.order('plays', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'popular':
        query = query.order('likes', { ascending: false });
        break;
      case 'featured':
        query = query.order('is_featured', { ascending: false }).order('plays', { ascending: false });
        break;
      default:
        query = query.order('plays', { ascending: false });
    }

    // Limiter le nombre de résultats
    query = query.limit(limit);

    const { data: tracks, error } = await query;

    if (error) {
      console.error('Erreur lors de la récupération des tracks:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des tracks' }, { status: 500 });
    }

    // Récupérer les informations des créateurs
    if (tracks && tracks.length > 0) {
      const creatorIds = Array.from(new Set(tracks.map(track => track.creator_id)));
      
      const { data: creators, error: creatorsError } = await supabase
        .from('profiles')
        .select('id, username, name, avatar, is_artist, artist_name')
        .in('id', creatorIds);

      if (!creatorsError && creators) {
        const creatorsMap = new Map(creators.map(creator => [creator.id, creator]));
        
        const formattedTracks = tracks.map(track => {
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
            genre: track.genre || [],
            plays: track.plays || 0,
            likes: track.likes || 0,
            createdAt: track.created_at,
            coverUrl: track.cover_url,
            audioUrl: track.audio_url,
            duration: track.duration || 0,
            isFeatured: track.is_featured || false,
            isNew: false // À calculer selon la date
          };
        });

        return NextResponse.json({
          tracks: formattedTracks,
          total: formattedTracks.length,
          sort,
          category: category || 'all'
        });
      }
    }

    return NextResponse.json({
      tracks: [],
      total: 0,
      sort,
      category: category || 'all'
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des tracks:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
