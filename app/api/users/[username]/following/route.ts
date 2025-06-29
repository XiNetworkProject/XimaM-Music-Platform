import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import User from '@/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    await dbConnect();
    if (!isConnected()) await dbConnect();
    const { username } = params;
    const user = await User.findOne({ username }).populate('following', 'name username avatar').lean() as any;
    if (!user) {
      return NextResponse.json({ following: [] });
    }
    return NextResponse.json({ following: user.following || [] });
  } catch (error) {
    return NextResponse.json({ following: [] });
  }
} 