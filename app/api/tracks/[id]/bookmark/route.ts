import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import User from '@/models/User';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    await dbConnect();
    if (!isConnected()) {
      await dbConnect();
    }
    const { id } = params;
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }
    if (!user.bookmarkedTracks) user.bookmarkedTracks = [];
    const index = user.bookmarkedTracks.findIndex((tid: any) => tid.toString() === id);
    let action: 'added' | 'removed';
    if (index > -1) {
      user.bookmarkedTracks.splice(index, 1);
      action = 'removed';
    } else {
      user.bookmarkedTracks.push(id);
      action = 'added';
    }
    await user.save();
    return NextResponse.json({ success: true, action });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur bookmark' }, { status: 500 });
  }
} 