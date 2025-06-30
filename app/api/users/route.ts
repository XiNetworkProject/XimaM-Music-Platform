import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import User from '@/models/User';
import Track from '@/models/Track';
import Playlist from '@/models/Playlist';

export async function GET(request: NextRequest) {
  try {
    // S'assurer que la connexion est établie
    await dbConnect();
    
    // Vérifier que la connexion est active
    if (!isConnected()) {
      console.warn('⚠️ MongoDB non connecté, tentative de reconnexion...');
      await dbConnect();
    }
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'followers';
    
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    // Déterminer le tri
    let sortOption = {};
    switch (sort) {
      case 'followers':
        sortOption = { followersCount: -1, createdAt: -1 };
        break;
      case 'recent':
        sortOption = { createdAt: -1 };
        break;
      case 'alphabetical':
        sortOption = { name: 1 };
        break;
      default:
        sortOption = { followersCount: -1, createdAt: -1 };
    }
    
    const users = await User.find(query)
      .select('_id email name username avatar banner bio location website followers following followersCount followingCount trackCount likedTracks isVerified role provider providerId socialLinks createdAt updatedAt')
      .limit(limit)
      .sort(sortOption)
      .lean();
    
    // Convertir les _id en chaînes et calculer les statistiques
    const usersWithStats = await Promise.all(users.map(async (user: any) => {
      // Compter les playlists
      const playlistCount = await Playlist.countDocuments({ 'createdBy._id': user._id });
      
      // Calculer les statistiques totales
      const tracks = await Track.find({ 'artist._id': user._id });
      const totalPlays = tracks.reduce((sum, track) => sum + (track.plays || 0), 0);
      const totalLikes = tracks.reduce((sum, track) => sum + (track.likes?.length || 0), 0);
      
      return {
        ...user,
        _id: user._id.toString(),
        followers: user.followers.map((id: any) => id.toString()),
        following: user.following.map((id: any) => id.toString()),
        likedTracks: user.likedTracks.map((id: any) => id.toString()),
        playlistCount,
        totalPlays,
        totalLikes,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      };
    }));
    
    return NextResponse.json({ users: usersWithStats });
  } catch (error) {
    console.error('Erreur API users:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    );
  }
} 