import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const filter = searchParams.get('filter') || 'all'; // all, tracks, artists, playlists
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query.trim()) {
      return NextResponse.json({ 
        tracks: [], 
        artists: [], 
        playlists: [],
        total: 0 
      });
    }

    const results: any = {
      tracks: [],
      artists: [],
      playlists: [],
      total: 0
    };

    // Recherche dans les tracks
    if (filter === 'all' || filter === 'tracks') {
      const tracks = await Track.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { genre: { $in: [new RegExp(query, 'i')] } }
        ]
      })
      .populate('artist', 'name username avatar')
      .limit(limit)
      .sort({ plays: -1, createdAt: -1 });

      results.tracks = tracks;
    }

    // Recherche dans les artistes
    if (filter === 'all' || filter === 'artists') {
      const artists = await User.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { username: { $regex: query, $options: 'i' } }
        ]
      })
      .select('name username avatar bio')
      .limit(limit)
      .sort({ followers: -1 });

      results.artists = artists;
    }

    // Pour les playlists (mock pour l'instant)
    if (filter === 'all' || filter === 'playlists') {
      const mockPlaylists = [
        {
          _id: '1',
          title: 'Pop Hits 2024',
          creator: { name: 'MusicLover', username: 'musiclover' },
          tracks: 24,
          likes: 156,
          color: 'from-purple-500 to-pink-500',
          emoji: '🎵'
        },
        {
          _id: '2',
          title: 'Chill Vibes',
          creator: { name: 'ChillMaster', username: 'chillmaster' },
          tracks: 18,
          likes: 89,
          color: 'from-blue-500 to-cyan-500',
          emoji: '😌'
        }
      ].filter(playlist => 
        playlist.title.toLowerCase().includes(query.toLowerCase()) ||
        playlist.creator.name.toLowerCase().includes(query.toLowerCase())
      );

      results.playlists = mockPlaylists;
    }

    // Calculer le total
    results.total = results.tracks.length + results.artists.length + results.playlists.length;

    return NextResponse.json(results);
  } catch (error) {
    console.error('Erreur recherche:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recherche' },
      { status: 500 }
    );
  }
} 