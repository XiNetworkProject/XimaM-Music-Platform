import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect, { isConnected } from '@/lib/db';
import User from '@/models/User';

// GET - Récupérer un utilisateur par ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    if (!isConnected()) await dbConnect();
    
    const { id } = params;
    const user = await User.findById(id)
      .select('-password')
      .lean() as any;
      
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }
    
    // Formatage des champs pour le front
    return NextResponse.json({
      ...user,
      _id: user._id.toString(),
      followers: user.followers?.map((id: any) => id.toString()) || [],
      following: user.following?.map((id: any) => id.toString()) || [],
      createdAt: user.createdAt,
      lastActive: user.lastActive,
      badges: user.badges || [],
      genres: user.genres || [],
      instruments: user.instruments || [],
      socialLinks: user.socialLinks || {},
      isVerified: user.isVerified || false,
      isArtist: user.isArtist || false,
      avatar: user.avatar || '',
      banner: user.banner || '',
      bio: user.bio || '',
      location: user.location || '',
      website: user.website || '',
      trackCount: user.trackCount || 0,
      playlistCount: user.playlistCount || 0,
      totalPlays: user.totalPlays || 0,
      totalLikes: user.totalLikes || 0
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la récupération du profil' }, { status: 500 });
  }
}

// PUT - Mettre à jour un utilisateur par ID
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
    if (!isConnected()) await dbConnect();
    
    const { id } = params;
    const user = await User.findById(id);
    
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }
    
    if (user._id.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }
    
    const body = await request.json();
    user.name = body.name || user.name;
    user.bio = body.bio || user.bio;
    user.location = body.location || user.location;
    user.website = body.website || user.website;
    user.genres = body.genres || user.genres;
    user.instruments = body.instruments || user.instruments;
    user.socialLinks = body.socialLinks || user.socialLinks;
    
    await user.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la modification du profil' }, { status: 500 });
  }
} 