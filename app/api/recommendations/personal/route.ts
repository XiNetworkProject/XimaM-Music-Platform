import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';
import User from '@/models/User';
import { RecommendationEngine } from '@/lib/recommendationEngine';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Utilisateur non connecté' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Récupérer l'utilisateur et ses préférences
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer toutes les pistes pour l'algorithme
    const allTracks = await Track.find()
      .populate('artist', 'name username avatar')
      .lean() as any[];

    // Récupérer les pistes que l'utilisateur a aimées
    const likedTracks = await Track.find({
      likes: user._id
    }).populate('artist', 'name username avatar') as any[];

    // Utiliser le moteur de recommandations amélioré
    const personalRecommendations = RecommendationEngine.getPersonalRecommendations(
      allTracks,
      likedTracks,
      15
    );

    // Diversifier les recommandations
    const diversifiedRecommendations = RecommendationEngine.diversifyRecommendations(
      personalRecommendations,
      3
    );

    // Analyser les préférences utilisateur
    const userPreferences = RecommendationEngine.analyzeUserPreferences(likedTracks);

    // Créer les cartes de recommandations avec des métriques détaillées
    const recommendations = [
      {
        type: 'Basé sur vos goûts',
        title: 'Artistes similaires',
        description: `Découvrez des artistes dans vos genres préférés: ${Object.keys(userPreferences.genres).slice(0, 2).join(', ')}`,
        confidence: '92%',
        color: 'from-purple-500 to-pink-500',
        icon: 'UserPlus',
        tracks: diversifiedRecommendations.slice(0, 3),
        metrics: {
          totalLiked: userPreferences.totalTracks,
          topGenres: Object.keys(userPreferences.genres).slice(0, 3),
          avgPlays: Math.round(userPreferences.avgPlays)
        }
      },
      {
        type: 'Nouveautés populaires',
        title: 'Tendances du moment',
        description: 'Les créations les plus écoutées cette semaine',
        confidence: '88%',
        color: 'from-blue-500 to-cyan-500',
        icon: 'TrendingUp',
        tracks: RecommendationEngine.getTrendingTracks(allTracks, 3),
        metrics: {
          algorithm: 'trending_v2',
          factors: ['récence', 'engagement', 'qualité']
        }
      },
      {
        type: 'Recommandations personnalisées',
        title: 'Pour vous',
        description: 'Basé sur votre historique d\'écoute',
        confidence: '95%',
        color: 'from-green-500 to-emerald-500',
        icon: 'Sparkles',
        tracks: diversifiedRecommendations.slice(3, 6),
        metrics: {
          analyzedTracks: userPreferences.totalTracks,
          favoriteArtist: likedTracks[0]?.artist?.name || 'Aucun',
          avgLikes: Math.round(userPreferences.avgLikes)
        }
      }
    ];

    // Log des recommandations pour debug
    console.log('🎯 Recommandations personnalisées:', {
      user: user.email,
      totalLiked: userPreferences.totalTracks,
      topGenres: Object.keys(userPreferences.genres).slice(0, 3),
      recommendationsCount: diversifiedRecommendations.length,
      algorithm: 'personal_v2'
    });

    return NextResponse.json({ 
      recommendations,
      userPreferences: {
        topGenres: Object.keys(userPreferences.genres).slice(0, 5),
        totalLiked: userPreferences.totalTracks,
        favoriteArtist: likedTracks[0]?.artist?.name || 'Aucun',
        avgPlays: Math.round(userPreferences.avgPlays),
        avgLikes: Math.round(userPreferences.avgLikes),
        analyzedTracks: likedTracks.length
      },
      algorithm: 'personal_v2',
      factors: {
        genreMatch: 'poids 10',
        artistMatch: 'poids 15',
        recency: 'poids 5',
        popularity: 'poids 3',
        engagement: 'poids 4',
        quality: 'poids 2'
      }
    });
  } catch (error) {
    console.error('Erreur recommandations:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des recommandations' },
      { status: 500 }
    );
  }
} 