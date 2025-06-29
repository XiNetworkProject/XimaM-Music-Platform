import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import User from '@/models/User';
import Track from '@/models/Track';
import Comment from '@/models/Comment';
import Playlist from '@/models/Playlist';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    if (!isConnected()) {
      await dbConnect();
    }

    // Statistiques globales
    const [totalUsers, totalTracks, totalPlays, totalLikes, activeUsers, tracks, users] = await Promise.all([
      User.countDocuments({}),
      Track.countDocuments({}),
      Track.aggregate([{ $group: { _id: null, total: { $sum: '$plays' } } }]),
      Track.aggregate([{ $group: { _id: null, total: { $sum: { $size: '$likes' } } } }]),
      User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) } }), // actifs 7j
      Track.find({}, 'genre').lean(),
      User.find({}, 'name username avatar followers trackCount').lean(),
    ]);

    // Genres tendances
    const genreCount: Record<string, number> = {};
    tracks.forEach((track: any) => {
      (track.genre || []).forEach((g: string) => {
        genreCount[g] = (genreCount[g] || 0) + 1;
      });
    });
    const trendingGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([g]) => g);

    // Top artistes (par nombre de followers)
    const topArtists = [...users]
      .sort((a, b) => ((b.followers?.length || 0) - (a.followers?.length || 0)))
      .slice(0, 5);

    // Activité récente (likes, uploads, follows, commentaires, playlists)
    const recentTracks = await Track.find({}).sort({ createdAt: -1 }).limit(10).lean();
    const recentComments = await Comment.find({}).sort({ createdAt: -1 }).limit(10).populate('author', 'name username').lean();
    const recentFollows = await User.find({}).sort({ updatedAt: -1 }).limit(10).lean();
    const recentPlaylists = await Playlist.find({}).sort({ createdAt: -1 }).limit(5).lean();

    // Format activité
    const recentActivity: any[] = [];
    recentTracks.forEach(track => recentActivity.push({
      type: 'upload',
      user: track.artist,
      target: track.title,
      createdAt: track.createdAt,
      _id: track._id
    }));
    recentComments.forEach(comment => recentActivity.push({
      type: 'comment',
      user: comment.author,
      target: comment.track,
      createdAt: comment.createdAt,
      _id: comment._id
    }));
    recentFollows.forEach(user => recentActivity.push({
      type: 'follow',
      user: { name: user.name, username: user.username },
      target: user.following?.slice(-1)[0],
      createdAt: user.updatedAt,
      _id: user._id
    }));
    recentPlaylists.forEach(pl => recentActivity.push({
      type: 'playlist',
      user: pl.createdBy,
      target: pl.name,
      createdAt: pl.createdAt,
      _id: pl._id
    }));
    recentActivity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      totalUsers,
      totalTracks,
      totalPlays: totalPlays[0]?.total || 0,
      totalLikes: totalLikes[0]?.total || 0,
      activeUsers,
      trendingGenres,
      topArtists,
      recentActivity: recentActivity.slice(0, 15)
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Erreur stats communauté',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 