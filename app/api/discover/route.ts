import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const sort = searchParams.get('sort') || 'trending';
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log('🔍 API Discover - Paramètres:', { category, sort, limit });

    // Récupérer les tracks avec filtres
    let tracksQuery = supabase
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
        created_at
      `);

    // Filtrer par catégorie
    if (category && category !== 'all') {
      tracksQuery = tracksQuery.contains('genre', [category]);
    }

    // Trier selon l'algorithme
    switch (sort) {
      case 'trending':
        // Tri par score trending (plays + likes + récence)
        tracksQuery = tracksQuery.order('plays', { ascending: false });
        break;
      case 'newest':
        tracksQuery = tracksQuery.order('created_at', { ascending: false });
        break;
      case 'popular':
        tracksQuery = tracksQuery.order('likes', { ascending: false });
        break;
      case 'featured':
        tracksQuery = tracksQuery.order('is_featured', { ascending: false }).order('plays', { ascending: false });
        break;
      default:
        tracksQuery = tracksQuery.order('plays', { ascending: false });
    }

    tracksQuery = tracksQuery.limit(limit);

    const { data: tracks, error: tracksError } = await tracksQuery;

    if (tracksError) {
      console.error('❌ Erreur tracks:', tracksError);
      return NextResponse.json({ error: 'Erreur récupération tracks' }, { status: 500 });
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
      }
    }

    // Algorithme intelligent pour le formatage
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
        genre: track.genre || [],
        plays: track.plays || 0,
        likes: track.likes || 0,
        createdAt: track.created_at,
        coverUrl: track.cover_url,
        audioUrl: track.audio_url,
        duration: track.duration || 0,
        isFeatured: track.is_featured || false,
        isNew: isNew,
        trendingScore: trendingScore
      };
    });

    // Récupérer les artistes depuis l'API artists qui fonctionne
    console.log('🔍 Récupération des artistes...');
    
    try {
      const artistsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/artists?sort=trending&limit=8`);
      let artists = [];
      
      if (artistsResponse.ok) {
        const artistsData = await artistsResponse.json();
        artists = artistsData.artists || [];
        console.log('✅ Artistes récupérés depuis API artists:', artists.length);
      } else {
        console.log('⚠️ Erreur API artists, utilisation de données par défaut');
      }
      
      console.log('✅ API Discover - Données récupérées:', {
        tracks: formattedTracks.length,
        artists: artists.length,
        category,
        sort
      });

      return NextResponse.json({
        tracks: formattedTracks,
        artists: artists,
        total: formattedTracks.length,
        category,
        sort,
        algorithm: {
          newThreshold: 7, // jours
          trendingThreshold: 100, // score
          artistTrendingThreshold: 30 // score simplifié
        }
      }, { headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }});
      
    } catch (artistsError) {
      console.log('⚠️ Erreur lors de la récupération des artistes:', artistsError);
      
      // Retourner les tracks même sans artistes
      return NextResponse.json({
        tracks: formattedTracks,
        artists: [],
        total: formattedTracks.length,
        category,
        sort,
        algorithm: {
          newThreshold: 7,
          trendingThreshold: 100,
          artistTrendingThreshold: 30
        }
      }, { headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }});
    }

  } catch (error) {
    console.error('❌ Erreur API Discover:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
