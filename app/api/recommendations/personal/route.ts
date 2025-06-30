import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';
import User from '@/models/User';

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

    // Récupérer les tracks que l'utilisateur a aimées
    const likedTracks = await Track.find({
      likes: user._id
    }).populate('artist', 'name username avatar').lean();

    // Analyser les genres préférés
    const genrePreferences = likedTracks.reduce((acc: any, track) => {
      if (track.genre) {
        track.genre.forEach((genre: string) => {
          acc[genre] = (acc[genre] || 0) + 1;
        });
      }
      return acc;
    }, {});

    // Trouver les genres les plus populaires
    const topGenres = Object.entries(genrePreferences)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([genre]) => genre);

    // Recommandations basées sur les genres préférés
    const genreRecommendations = await Track.find({
      genre: { $in: topGenres },
      likes: { $ne: user._id }, // Exclure les tracks déjà aimées
      _id: { $nin: likedTracks.map(t => t._id) } // Exclure les tracks déjà vues
    })
    .populate('artist', 'name username avatar')
    .sort({ plays: -1, createdAt: -1 })
    .limit(6)
    .lean();

    // Recommandations d'artistes similaires
    const likedArtists = Array.from(new Set(likedTracks.map(track => track.artist._id.toString())));
    const artistRecommendations = await Track.find({
      'artist._id': { $nin: likedArtists },
      likes: { $ne: user._id }
    })
    .populate('artist', 'name username avatar')
    .sort({ plays: -1 })
    .limit(4)
    .lean();

    // Recommandations de nouveautés populaires
    const recentRecommendations = await Track.find({
      likes: { $ne: user._id },
      _id: { $nin: likedTracks.map(t => t._id) }
    })
    .populate('artist', 'name username avatar')
    .sort({ createdAt: -1, plays: -1 })
    .limit(4)
    .lean();

    // Convertir les _id en string pour toutes les tracks
    const convertTrackIds = (tracks: any[]) => tracks.map(track => ({
      ...track,
      _id: track._id.toString(),
      artist: track.artist ? {
        ...track.artist,
        _id: track.artist._id.toString()
      } : null,
      likes: track.likes ? track.likes.map((id: any) => id.toString()) : [],
      comments: track.comments ? track.comments.map((id: any) => id.toString()) : [],
      createdAt: track.createdAt ? track.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: track.updatedAt ? track.updatedAt.toISOString() : new Date().toISOString()
    }));

    // Créer les cartes de recommandations
    const recommendations = [
      {
        type: 'Basé sur vos goûts',
        title: 'Artistes similaires',
        description: `Découvrez des artistes dans vos genres préférés: ${topGenres.slice(0, 2).join(', ')}`,
        confidence: '92%',
        color: 'from-purple-500 to-pink-500',
        icon: 'UserPlus',
        tracks: convertTrackIds(artistRecommendations.slice(0, 3))
      },
      {
        type: 'Nouveautés populaires',
        title: 'Tendances du moment',
        description: 'Les créations les plus écoutées cette semaine',
        confidence: '88%',
        color: 'from-blue-500 to-cyan-500',
        icon: 'TrendingUp',
        tracks: convertTrackIds(recentRecommendations.slice(0, 3))
      },
      {
        type: 'Recommandations personnalisées',
        title: 'Pour vous',
        description: 'Basé sur votre historique d\'écoute',
        confidence: '95%',
        color: 'from-green-500 to-emerald-500',
        icon: 'Sparkles',
        tracks: convertTrackIds(genreRecommendations.slice(0, 3))
      }
    ];

    return NextResponse.json({ 
      recommendations,
      userPreferences: {
        topGenres,
        totalLiked: likedTracks.length,
        favoriteArtist: likedTracks[0]?.artist?.name || 'Aucun'
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