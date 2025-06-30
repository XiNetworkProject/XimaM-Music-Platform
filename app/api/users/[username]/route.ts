import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import User from '@/models/User';
import Track from '@/models/Track';
import Playlist from '@/models/Playlist';

// GET - Récupérer un profil utilisateur
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    await dbConnect();

    if (!isConnected()) {
      await dbConnect();
    }
    
    const { username } = params;
    
    // Récupérer l'utilisateur de base d'abord
    const user = await User.findOne({ username }).lean() as any;

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer les données populées séparément pour éviter les erreurs
    let followers = [];
    let following = [];
    let tracks = [];
    let playlists = [];
    let likes = [];

    try {
      // Populate followers
      const userWithFollowers = await User.findById(user._id)
        .populate('followers', 'name username avatar isVerified')
        .lean() as any;
      followers = userWithFollowers?.followers || [];
    } catch (error) {
      console.error('Erreur populate followers:', error);
      followers = [];
    }

    try {
      // Populate following
      const userWithFollowing = await User.findById(user._id)
        .populate('following', 'name username avatar isVerified')
        .lean() as any;
      following = userWithFollowing?.following || [];
    } catch (error) {
      console.error('Erreur populate following:', error);
      following = [];
    }

    try {
      // Populate tracks
      const userWithTracks = await User.findById(user._id)
        .populate({
          path: 'tracks',
          select: 'title coverUrl duration plays likes createdAt',
          populate: {
            path: 'artist',
            select: 'name username avatar'
          }
        })
        .lean() as any;
      tracks = userWithTracks?.tracks || [];
    } catch (error) {
      console.error('Erreur populate tracks:', error);
      tracks = [];
    }

    try {
      // Populate playlists
      const userWithPlaylists = await User.findById(user._id)
        .populate({
          path: 'playlists',
          select: 'name description coverUrl trackCount likes isPublic createdAt',
          populate: {
            path: 'createdBy',
            select: 'name username avatar'
          }
        })
        .lean() as any;
      playlists = userWithPlaylists?.playlists || [];
    } catch (error) {
      console.error('Erreur populate playlists:', error);
      playlists = [];
    }

    try {
      // Populate likes
      const userWithLikes = await User.findById(user._id)
        .populate({
          path: 'likes',
          select: 'title artist coverUrl duration plays',
          populate: {
            path: 'artist',
            select: 'name username avatar'
          }
        })
        .lean() as any;
      likes = userWithLikes?.likes || [];
    } catch (error) {
      console.error('Erreur populate likes:', error);
      likes = [];
    }

    // Calculer les statistiques
    const totalPlays = tracks.reduce((sum: number, track: any) => sum + (track.plays || 0), 0);
    const totalLikes = tracks.reduce((sum: number, track: any) => sum + (track.likes?.length || 0), 0);
    
    // Formater les données pour la réponse
    const formattedUser = {
      ...user,
      _id: user._id.toString(),
      trackCount: tracks.length,
      playlistCount: playlists.length,
      followerCount: followers.length,
      followingCount: following.length,
      likeCount: likes.length,
      totalPlays,
      totalLikes,
      followers: followers.map((follower: any) => ({
        ...follower,
        _id: follower._id.toString()
      })),
      following: following.map((following: any) => ({
        ...following,
        _id: following._id.toString()
      })),
      tracks: tracks.map((track: any) => ({
        ...track,
        _id: track._id.toString(),
        artist: track.artist ? {
          ...track.artist,
          _id: track.artist._id.toString()
        } : null
      })),
      playlists: playlists.map((playlist: any) => ({
        ...playlist,
        _id: playlist._id.toString(),
        createdBy: playlist.createdBy ? {
          ...playlist.createdBy,
          _id: playlist.createdBy._id.toString()
        } : null
      })),
      likes: likes.map((track: any) => ({
        ...track,
        _id: track._id.toString(),
        artist: track.artist ? {
          ...track.artist,
          _id: track.artist._id.toString()
        } : null
      }))
    };

    return NextResponse.json(formattedUser);
  } catch (error) {
    console.error('Erreur API users/[username]:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du profil' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour un profil
export async function PUT(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    await dbConnect();

    if (!isConnected()) {
      await dbConnect();
    }
    
    const { username } = params;
    const body = await request.json();

    // Vérifier que l'utilisateur modifie son propre profil
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser || currentUser.username !== username) {
      return NextResponse.json(
        { error: 'Non autorisé à modifier ce profil' },
        { status: 403 }
      );
    }

    // Champs autorisés pour la modification
    const allowedFields = [
      'name', 'bio', 'location', 'website', 'socialLinks', 
      'isArtist', 'artistName', 'genre', 'preferences'
    ];
    
    const updateData: any = {};
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });
    
    // Validation spéciale pour les réseaux sociaux
    if (updateData.socialLinks) {
      const socialFields = ['instagram', 'twitter', 'youtube', 'soundcloud', 'spotify'];
      socialFields.forEach(field => {
        if (updateData.socialLinks[field] && !updateData.socialLinks[field].startsWith('http')) {
          updateData.socialLinks[field] = `https://${updateData.socialLinks[field]}`;
        }
      });
    }
    
    // Mettre à jour l'utilisateur
    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('followers', 'name username avatar isVerified')
      .populate('following', 'name username avatar isVerified')
      .populate('tracks', 'title coverUrl duration plays likes createdAt')
      .populate('playlists', 'name description coverUrl trackCount likes isPublic createdAt')
      .populate('likes', 'title artist coverUrl duration plays')
      .lean() as any;
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du profil' },
        { status: 500 }
      );
    }
    
    // Calculer les statistiques
    const totalPlays = (updatedUser.tracks || []).reduce((sum: number, track: any) => sum + (track.plays || 0), 0);
    const totalLikes = (updatedUser.tracks || []).reduce((sum: number, track: any) => sum + (track.likes?.length || 0), 0);
    
    // Formater la réponse
    const formattedUser = {
      ...updatedUser,
      _id: updatedUser._id.toString(),
      trackCount: (updatedUser.tracks || []).length,
      playlistCount: (updatedUser.playlists || []).length,
      followerCount: (updatedUser.followers || []).length,
      followingCount: (updatedUser.following || []).length,
      likeCount: (updatedUser.likes || []).length,
      totalPlays,
      totalLikes,
      followers: (updatedUser.followers || []).map((follower: any) => ({
        ...follower,
        _id: follower._id.toString()
      })),
      following: (updatedUser.following || []).map((following: any) => ({
        ...following,
        _id: following._id.toString()
      })),
      tracks: (updatedUser.tracks || []).map((track: any) => ({
        ...track,
        _id: track._id.toString(),
        artist: track.artist ? {
          ...track.artist,
          _id: track.artist._id.toString()
        } : null
      })),
      playlists: (updatedUser.playlists || []).map((playlist: any) => ({
        ...playlist,
        _id: playlist._id.toString(),
        createdBy: playlist.createdBy ? {
          ...playlist.createdBy,
          _id: playlist.createdBy._id.toString()
        } : null
      })),
      likes: (updatedUser.likes || []).map((track: any) => ({
        ...track,
        _id: track._id.toString(),
        artist: track.artist ? {
          ...track.artist,
          _id: track.artist._id.toString()
        } : null
      }))
    };

    return NextResponse.json(formattedUser);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    );
  }
} 