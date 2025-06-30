import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Track from '@/models/Track';
import Playlist from '@/models/Playlist';

// GET - Récupérer un profil utilisateur
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { username } = params;

    await dbConnect();

    // Récupérer l'utilisateur avec ses statistiques
    const user = await User.findOne({ username }).select('-password -email').lean() as any;
    
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Compter les pistes de l'utilisateur
    const trackCount = await Track.countDocuments({ 'artist._id': user._id });
    
    // Compter les playlists de l'utilisateur
    const playlistCount = await Playlist.countDocuments({ 'createdBy._id': user._id });
    
    // Calculer les statistiques totales
    const tracks = await Track.find({ 'artist._id': user._id }).lean() as any[];
    const totalPlays = tracks.reduce((sum, track) => sum + (track.plays || 0), 0);
    const totalLikes = tracks.reduce((sum, track) => sum + (track.likes?.length || 0), 0);
    
    // Vérifier si l'utilisateur connecté suit cet utilisateur
    let isFollowing = false;
    if (session?.user?.id) {
      const currentUser = await User.findById(session.user.id).lean() as any;
      isFollowing = currentUser?.following?.some((id: any) => id.toString() === user._id.toString()) || false;
    }

    // Préparer la réponse
    const userData = {
      _id: user._id.toString(),
      username: user.username,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      banner: user.banner,
      bio: user.bio,
      location: user.location,
      website: user.website,
      socialLinks: user.socialLinks,
      followers: user.followers ? user.followers.map((id: any) => id.toString()) : [],
      following: user.following ? user.following.map((id: any) => id.toString()) : [],
      trackCount,
      playlistCount,
      totalPlays,
      totalLikes,
      isVerified: user.isVerified || false,
      isFollowing,
      createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
      lastActive: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString()
    };

    return NextResponse.json(userData);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur' },
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
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { username } = params;
    const body = await request.json();

    await dbConnect();

    // Vérifier que l'utilisateur modifie son propre profil
    const user = await User.findOne({ username });
    if (!user || user._id.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Mettre à jour le profil
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        name: body.name,
        bio: body.bio,
        location: body.location,
        website: body.website,
        avatar: body.avatar,
        banner: body.banner,
        socialLinks: body.socialLinks
      },
      { new: true, runValidators: true }
    ).select('-password');

    // Convertir l'_id en chaîne
    const userResponse = {
      ...updatedUser.toObject(),
      _id: updatedUser._id.toString()
    };

    return NextResponse.json(userResponse);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 