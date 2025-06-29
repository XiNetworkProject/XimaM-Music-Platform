import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import Playlist from '@/models/Playlist';
import User from '@/models/User';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const { id } = params;
    
    // Vérifier que la playlist existe
    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist non trouvée' },
        { status: 404 }
      );
    }
    
    // Vérifier que l'utilisateur est le propriétaire de la playlist
    const user = await User.findOne({ email: session.user.email });
    if (!user || playlist.createdBy.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'Non autorisé à supprimer cette playlist' },
        { status: 403 }
      );
    }
    
    // Supprimer la playlist
    await Playlist.findByIdAndDelete(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la playlist' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const { id } = params;
    const body = await request.json();
    const { name, description, isPublic } = body;
    
    // Vérifier que la playlist existe
    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist non trouvée' },
        { status: 404 }
      );
    }
    
    // Vérifier que l'utilisateur est le propriétaire de la playlist
    const user = await User.findOne({ email: session.user.email });
    if (!user || playlist.createdBy.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'Non autorisé à modifier cette playlist' },
        { status: 403 }
      );
    }
    
    // Mettre à jour la playlist
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate('createdBy', 'name username avatar')
      .populate('tracks', 'title artist audioUrl coverUrl duration')
      .lean() as any;
    
    if (!updatedPlaylist) {
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la playlist' },
        { status: 500 }
      );
    }
    
    const totalDuration = (updatedPlaylist.tracks || []).reduce((sum: number, track: any) => sum + (track.duration || 0), 0);
    
    return NextResponse.json({
      ...updatedPlaylist,
      trackCount: (updatedPlaylist.tracks || []).length,
      duration: totalDuration,
      _id: updatedPlaylist._id.toString(),
      createdBy: updatedPlaylist.createdBy ? {
        ...updatedPlaylist.createdBy,
        _id: updatedPlaylist.createdBy._id.toString()
      } : null,
      tracks: (updatedPlaylist.tracks || []).map((track: any) => ({
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
      { error: 'Erreur lors de la mise à jour de la playlist' },
      { status: 500 }
    );
  }
} 