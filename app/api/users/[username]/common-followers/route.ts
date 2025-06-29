import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ commonFollowers: [] });
    }
    await dbConnect();
    if (!isConnected()) await dbConnect();
    const { username } = params;
    const user = await User.findOne({ username }).populate('followers', 'name username avatar').lean() as any;
    const currentUser = await User.findById(session.user.id).populate('followers', 'name username avatar').lean() as any;
    if (!user || !currentUser) {
      return NextResponse.json({ commonFollowers: [] });
    }
    // Trouver les followers en commun
    const userFollowers = (user.followers || []).map((f: any) => f._id.toString());
    const currentFollowers = (currentUser.followers || []).map((f: any) => f._id.toString());
    const commonIds = userFollowers.filter((id: string) => currentFollowers.includes(id));
    const commonFollowers = (user.followers || []).filter((f: any) => commonIds.includes(f._id.toString()));
    return NextResponse.json({ commonFollowers });
  } catch (error) {
    return NextResponse.json({ commonFollowers: [] });
  }
} 