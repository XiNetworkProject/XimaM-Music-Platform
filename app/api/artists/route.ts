import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'trending';
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');

    console.log('🔍 API Artists - Paramètres:', { sort, limit, category });

    // Récupérer les profils avec vraies stats
    console.log('🔍 Récupération des profils avec stats...');
    
    const { data: artists, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        name,
        avatar,
        bio,
        created_at
      `)
      .limit(limit);

    if (error) {
      console.error('❌ Erreur lors de la récupération des artistes:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des artistes' }, { status: 500 });
    }

    console.log('✅ Artistes récupérés:', artists?.length || 0);

    // Récupérer les vraies statistiques pour chaque artiste
    if (artists && artists.length > 0) {
      console.log('✅ Récupération des stats pour chaque artiste...');
      
      const artistsWithStats = await Promise.all(
        artists.map(async (artist) => {
          // Récupérer les tracks de l'artiste
          const { data: tracks, error: tracksError } = await supabase
            .from('tracks')
            .select('plays, likes, is_featured')
            .eq('creator_id', artist.id);

          // Calculer les vraies statistiques
          const totalPlays = tracks?.reduce((sum, track) => sum + (track.plays || 0), 0) || 0;
          const totalLikes = tracks?.reduce((sum, track) => sum + (track.likes || 0), 0) || 0;
          const trackCount = tracks?.length || 0;

          // Récupérer le nombre de followers (à implémenter plus tard)
          const followerCount = 0; // TODO: Implémenter le système de followers

          const now = new Date();
          const artistDate = new Date(artist.created_at);
          const daysSinceCreation = Math.floor((now.getTime() - artistDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Score trending basé sur les vraies stats + récence
          const trendingScore = totalPlays + (totalLikes * 2) + Math.max(0, 60 - daysSinceCreation);
          const isTrending = trendingScore > 100;
          
                     return {
             _id: artist.id,
             username: artist.username,
             name: artist.name || artist.username,
             avatar: artist.avatar || '',
             bio: artist.bio || '',
             genre: [], // TODO: Implémenter les genres d'artiste
             totalPlays: totalPlays,
             totalLikes: totalLikes,
             followerCount: followerCount,
             isVerified: false, // TODO: Implémenter la vérification
             isTrending: isTrending,
             featuredTracks: tracks?.filter(t => t.is_featured)?.length || 0,
             trackCount: trackCount,
             trendingScore: trendingScore,
             createdAt: artist.created_at
           };
        })
      );

      // Trier selon le paramètre
      switch (sort) {
        case 'trending':
          artistsWithStats.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
          break;
        case 'newest':
          // Tri par date de création (plus récent en premier)
          artistsWithStats.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB.getTime() - dateA.getTime();
          });
          break;
        case 'popular':
          artistsWithStats.sort((a, b) => (b.totalLikes || 0) - (a.totalLikes || 0));
          break;
        case 'followers':
          artistsWithStats.sort((a, b) => (b.followerCount || 0) - (a.followerCount || 0));
          break;
      }

      console.log('✅ Artistes avec stats:', artistsWithStats.length);
      console.log('🔍 Premier artiste avec stats:', {
        name: artistsWithStats[0]?.name,
        plays: artistsWithStats[0]?.totalPlays,
        likes: artistsWithStats[0]?.totalLikes,
        tracks: artistsWithStats[0]?.trackCount
      });

      return NextResponse.json({
        artists: artistsWithStats,
        total: artistsWithStats.length,
        sort,
        category: category || 'all'
      });
    }

    console.log('✅ Aucun artiste trouvé, retour d\'un tableau vide');
    return NextResponse.json({
      artists: [],
      total: 0,
      sort,
      category: category || 'all'
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des artistes:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
