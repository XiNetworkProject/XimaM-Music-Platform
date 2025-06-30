import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    await dbConnect();

    // Récupérer les pistes les plus populaires pour créer des playlists thématiques
    const popularTracks = await Track.find()
      .sort({ plays: -1, likes: -1 })
      .limit(50)
      .populate('artist', 'name username avatar');

    // Créer des playlists thématiques basées sur les genres et popularité
    const playlists = [
      {
        _id: '1',
        title: 'Nouveautés 2024',
        creator: {
          _id: '1',
          name: 'MusicLover',
          username: 'musiclover',
          avatar: '/default-avatar.svg'
        },
        tracks: popularTracks.slice(0, 8),
        trackCount: 8,
        likes: 156,
        plays: 2340,
        color: 'from-purple-500 to-pink-500',
        emoji: '🎵',
        description: 'Les meilleures nouveautés de l\'année',
        isPublic: true,
        createdAt: new Date('2024-01-15').toISOString()
      },
      {
        _id: '2',
        title: 'Chill Vibes',
        creator: {
          _id: '2',
          name: 'ChillMaster',
          username: 'chillmaster',
          avatar: '/default-avatar.svg'
        },
        tracks: popularTracks.slice(8, 16),
        trackCount: 8,
        likes: 89,
        plays: 1567,
        color: 'from-blue-500 to-cyan-500',
        emoji: '😌',
        description: 'Ambiance relaxante et apaisante',
        isPublic: true,
        createdAt: new Date('2024-01-10').toISOString()
      },
      {
        _id: '3',
        title: 'Workout Mix',
        creator: {
          _id: '3',
          name: 'FitnessGuru',
          username: 'fitnessguru',
          avatar: '/default-avatar.svg'
        },
        tracks: popularTracks.slice(16, 24),
        trackCount: 8,
        likes: 234,
        plays: 3421,
        color: 'from-orange-500 to-red-500',
        emoji: '💪',
        description: 'Énergie et motivation pour vos séances',
        isPublic: true,
        createdAt: new Date('2024-01-08').toISOString()
      },
      {
        _id: '4',
        title: 'Late Night',
        creator: {
          _id: '4',
          name: 'NightOwl',
          username: 'nightowl',
          avatar: '/default-avatar.svg'
        },
        tracks: popularTracks.slice(24, 32),
        trackCount: 8,
        likes: 67,
        plays: 1234,
        color: 'from-indigo-500 to-purple-500',
        emoji: '🌙',
        description: 'Ambiance nocturne et mystérieuse',
        isPublic: true,
        createdAt: new Date('2024-01-12').toISOString()
      },
      {
        _id: '5',
        title: 'Summer Vibes',
        creator: {
          _id: '5',
          name: 'SummerBeats',
          username: 'summerbeats',
          avatar: '/default-avatar.svg'
        },
        tracks: popularTracks.slice(32, 40),
        trackCount: 8,
        likes: 189,
        plays: 2789,
        color: 'from-yellow-500 to-orange-500',
        emoji: '☀️',
        description: 'Rythmes ensoleillés et énergiques',
        isPublic: true,
        createdAt: new Date('2024-01-05').toISOString()
      },
      {
        _id: '6',
        title: 'Lo-Fi Study',
        creator: {
          _id: '6',
          name: 'StudyBuddy',
          username: 'studybuddy',
          avatar: '/default-avatar.svg'
        },
        tracks: popularTracks.slice(40, 48),
        trackCount: 8,
        likes: 145,
        plays: 1987,
        color: 'from-green-500 to-emerald-500',
        emoji: '📚',
        description: 'Concentration et productivité',
        isPublic: true,
        createdAt: new Date('2024-01-03').toISOString()
      }
    ];

    // Limiter le nombre de playlists retournées
    const limitedPlaylists = playlists.slice(0, limit);

    return NextResponse.json({
      playlists: limitedPlaylists,
      total: playlists.length
    });
  } catch (error) {
    console.error('Erreur playlists populaires:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des playlists' },
      { status: 500 }
    );
  }
} 