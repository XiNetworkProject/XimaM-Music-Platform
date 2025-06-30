import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;
    await dbConnect();

    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Récupérer les utilisateurs suivis avec leurs informations de base
    const following = await User.find({
      _id: { $in: user.following || [] }
    }).select('_id username name avatar bio').lean();

    // Convertir les _id en chaînes de caractères
    const followingWithStringIds = following.map(user => ({
      ...user,
      _id: user._id ? user._id.toString() : Math.random().toString()
    }));

    return NextResponse.json({ following: followingWithStringIds });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 