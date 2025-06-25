import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Track from '@/models/Track';

// GET - Récupérer les pistes d'un utilisateur
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    await dbConnect();

    const user = await User.findOne({ username: params.username });
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const isOwnProfile = session?.user?.id === user._id.toString();

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Construire la requête
    let query: any = { artist: user._id };
    
    // Si ce n'est pas son propre profil, ne montrer que les pistes publiques
    if (!isOwnProfile) {
      query.isPublic = true;
    }

    const tracks = await Track.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('artist', 'name username avatar');

    const total = await Track.countDocuments(query);

    return NextResponse.json({
      tracks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
      }
    });

  } catch (error) {
    console.error('Erreur récupération pistes utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
} 