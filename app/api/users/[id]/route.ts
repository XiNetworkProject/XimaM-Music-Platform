import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect, { isConnected } from '@/lib/db';
import User from '@/models/User';
import Track from '@/models/Track';

// GET - Récupérer un profil utilisateur par ID ou username
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    if (!isConnected()) {
      await dbConnect();
    }

    // Essayer de trouver par ID d'abord, puis par username
    let user = await User.findById(params.id).select('-password -__v');
    
    if (!user) {
      // Si pas trouvé par ID, essayer par username
      user = await User.findOne({ username: params.id }).select('-password -__v');
    }

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Récupérer les statistiques
    const trackCount = await Track.countDocuments({ artist: user._id, isPublic: true });
    const totalPlays = await Track.aggregate([
      { $match: { artist: user._id, isPublic: true } },
      { $group: { _id: null, total: { $sum: '$plays' } } }
    ]);

    const totalLikes = await Track.aggregate([
      { $match: { artist: user._id, isPublic: true } },
      { $group: { _id: null, total: { $sum: { $size: '$likes' } } } }
    ]);

    const profile = {
      ...user.toObject(),
      _id: user._id.toString(),
      stats: {
        trackCount,
        totalPlays: totalPlays[0]?.total || 0,
        totalLikes: totalLikes[0]?.total || 0,
      }
    };

    return NextResponse.json({ user: profile });

  } catch (error) {
    console.error('Erreur récupération profil:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour un profil
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();
    if (!isConnected()) {
      await dbConnect();
    }

    // Vérifier que l'utilisateur modifie son propre profil
    if (params.id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const body = await request.json();
    const { name, bio, location, website, socialLinks, avatar } = body;

    // Vérifier si le username est déjà pris (si modifié)
    if (body.username && body.username !== user.username) {
      const existingUser = await User.findOne({ username: body.username });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Ce nom d\'utilisateur est déjà pris' },
          { status: 400 }
        );
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        name: name || user.name,
        username: body.username || user.username,
        bio: bio !== undefined ? bio : user.bio,
        location: location !== undefined ? location : user.location,
        website: website !== undefined ? website : user.website,
        socialLinks: socialLinks || user.socialLinks,
        avatar: avatar || user.avatar,
      },
      { new: true }
    ).select('-password -__v');

    return NextResponse.json({ 
      user: {
        ...updatedUser.toObject(),
        _id: updatedUser._id.toString()
      }
    });

  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
} 