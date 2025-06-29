import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import Playlist from '@/models/Playlist';
import User from '@/models/User';
import Track from '@/models/Track';

export async function POST(
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
    const { trackId } = body;
    
    if (!trackId) {
      return NextResponse.json(
        { error: 'ID de la piste requis' },
        { status: 400 }
      );
    }
    
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
    
    // Vérifier que la piste existe
    const track = await Track.findById(trackId);
    if (!track) {
      return NextResponse.json(
        { error: 'Piste non trouvée' },
        { status: 404 }
      );
    }
    
    // Ajouter la piste à la playlist
    await playlist.addTrack(trackId);
    
    // Récupérer la playlist mise à jour avec les données populées
    const updatedPlaylist = await Playlist.findById(id)
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
      { error: 'Erreur lors de l\'ajout de la piste à la playlist' },
      { status: 500 }
    );
  }
}

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
    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get('trackId');
    
    if (!trackId) {
      return NextResponse.json(
        { error: 'ID de la piste requis' },
        { status: 400 }
      );
    }
    
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
    
    // Retirer la piste de la playlist
    await playlist.removeTrack(trackId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la piste de la playlist' },
      { status: 500 }
    );
  }
} 