import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import User from '@/models/User';
import Track from '@/models/Track';
import Playlist from '@/models/Playlist';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    await dbConnect();
    if (!isConnected()) await dbConnect();
    const { username } = params;
    const user = await User.findOne({ username }).lean() as any;
    if (!user) {
      return NextResponse.json({ activity: [] });
    }
    // Récupérer les 5 derniers morceaux publiés
    const tracks = await Track.find({ 'artist': user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    // Récupérer les 5 dernières playlists créées
    const playlists = await Playlist.find({ createdBy: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    // Récupérer les 5 derniers followers
    const followers = (user.followers || []).slice(-5);
    // Construire le feed d'activité
    const activity = [
      ...tracks.map(t => ({ type: 'track', text: `a publié le morceau "${t.title}"`, date: t.createdAt })),
      ...playlists.map(p => ({ type: 'playlist', text: `a créé la playlist "${p.name}"`, date: p.createdAt })),
      ...followers.map((f: any) => ({ type: 'follower', text: `a gagné un nouvel abonné`, date: new Date() }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
    return NextResponse.json({ activity });
  } catch (error) {
    return NextResponse.json({ activity: [] });
  }
} 