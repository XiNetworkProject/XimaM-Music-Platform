import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import Playlist from '@/models/Playlist';
import User from '@/models/User';
import Track from '@/models/Track';

// Modèle Playlist temporaire (à créer plus tard)
interface Playlist {
  _id: string;
  name: string;
  description?: string;
  tracks: string[];
  user: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    if (!isConnected()) {
      await dbConnect();
    }
    
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    let query: any = {};
    
    if (user) {
      // Rechercher par username dans createdBy
      const userDoc = await User.findOne({ username: user });
      if (userDoc) {
        query.createdBy = userDoc._id;
      } else {
        // Si l'utilisateur n'existe pas, retourner une liste vide
        return NextResponse.json({
          playlists: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0
          }
        });
      }
    } else {
      query.isPublic = true;
    }
    
    const playlists = await Playlist.find(query)
      .populate('createdBy', 'name username avatar')
      .populate('tracks', 'title artist audioUrl coverUrl duration')
      .populate('likes', 'name username')
      .populate('followers', 'name username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const playlistsWithStats = playlists.map((playlist: any) => {
      const totalDuration = (playlist.tracks || []).reduce((sum: number, track: any) => sum + (track.duration || 0), 0);
      return {
        ...playlist,
        trackCount: (playlist.tracks || []).length,
        duration: totalDuration,
        _id: playlist._id.toString(),
        createdBy: playlist.createdBy ? {
          ...playlist.createdBy,
          _id: playlist.createdBy._id.toString()
        } : null,
        tracks: (playlist.tracks || []).map((track: any) => ({
          ...track,
          _id: track._id.toString(),
          artist: track.artist ? {
            ...track.artist,
            _id: track.artist._id.toString()
          } : null
        })),
        likes: (playlist.likes || []).map((user: any) => ({
          ...user,
          _id: user._id.toString()
        })),
        followers: (playlist.followers || []).map((user: any) => ({
          ...user,
          _id: user._id.toString()
        }))
      };
    });
    
    const total = await Playlist.countDocuments(query);
    
    return NextResponse.json({
      playlists: playlistsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des playlists' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    if (!isConnected()) {
      await dbConnect();
    }
    
    const body = await request.json();
    const { name, description = '', isPublic = true, tracks = [] } = body;
    
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom de la playlist est requis' },
        { status: 400 }
      );
    }
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }
    
    const playlist = new Playlist({
      name: name.trim(),
      description: description.trim(),
      isPublic,
      tracks,
      createdBy: user._id
    });
    
    await playlist.save();
    
    const populatedPlaylist = await Playlist.findById(playlist._id)
      .populate('createdBy', 'name username avatar')
      .populate('tracks', 'title artist audioUrl coverUrl duration')
      .lean() as any;
    
    if (!populatedPlaylist) {
    return NextResponse.json(
        { error: 'Erreur lors de la création de la playlist' },
        { status: 500 }
      );
    }
    
    const totalDuration = (populatedPlaylist.tracks || []).reduce((sum: number, track: any) => sum + (track.duration || 0), 0);
    
    return NextResponse.json({
      ...populatedPlaylist,
      trackCount: (populatedPlaylist.tracks || []).length,
      duration: totalDuration,
      _id: populatedPlaylist._id.toString(),
      createdBy: populatedPlaylist.createdBy ? {
        ...populatedPlaylist.createdBy,
        _id: populatedPlaylist.createdBy._id.toString()
      } : null,
      tracks: (populatedPlaylist.tracks || []).map((track: any) => ({
        ...track,
        _id: track._id.toString(),
        artist: track.artist ? {
          ...track.artist,
          _id: track.artist._id.toString()
        } : null
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la création de la playlist' },
      { status: 500 }
    );
  }
} 