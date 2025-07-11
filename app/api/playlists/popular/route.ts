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
      .populate('artist', 'name username avatar')
      .lean();

    // Vérifier que popularTracks existe et n'est pas vide
    if (!popularTracks || popularTracks.length === 0) {
      console.log('Aucune piste trouvée, utilisation de playlists par défaut');
      return NextResponse.json({
        playlists: [],
        total: 0
      });
    }

    // Créer des playlists thématiques basées sur les genres et popularité
    const playlists = [
      {
        _id: '1',
        title: 'Nouveautés 2024',
        creator: {
          _id: '1',
          name: 'MusicLover',
          username: 'musiclover',
          avatar: '/default-avatar.png'
        },
        tracks: popularTracks.slice(0, Math.min(8, popularTracks.length)),
        trackCount: Math.min(8, popularTracks.length),
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
          avatar: '/default-avatar.png'
        },
        tracks: popularTracks.slice(8, Math.min(16, popularTracks.length)),
        trackCount: Math.min(8, Math.max(0, popularTracks.length - 8)),
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
          avatar: '/default-avatar.png'
        },
        tracks: popularTracks.slice(16, Math.min(24, popularTracks.length)),
        trackCount: Math.min(8, Math.max(0, popularTracks.length - 16)),
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
          avatar: '/default-avatar.png'
        },
        tracks: popularTracks.slice(24, Math.min(32, popularTracks.length)),
        trackCount: Math.min(8, Math.max(0, popularTracks.length - 24)),
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
          avatar: '/default-avatar.png'
        },
        tracks: popularTracks.slice(32, Math.min(40, popularTracks.length)),
        trackCount: Math.min(8, Math.max(0, popularTracks.length - 32)),
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
          avatar: '/default-avatar.png'
        },
        tracks: popularTracks.slice(40, Math.min(48, popularTracks.length)),
        trackCount: Math.min(8, Math.max(0, popularTracks.length - 40)),
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
      { 
        error: 'Erreur lors du chargement des playlists',
        playlists: [],
        total: 0
      },
      { status: 500 }
    );
  }
} 