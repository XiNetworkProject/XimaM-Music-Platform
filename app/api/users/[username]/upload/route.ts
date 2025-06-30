import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import User from '@/models/User';
import { uploadImage } from '@/lib/cloudinary';

export async function POST(
  request: NextRequest,
  { params }: { params: { username: string } }
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
    
    const { username } = params;
    
    // Vérifier que l'utilisateur modifie son propre profil
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser || currentUser.username !== username) {
      return NextResponse.json(
        { error: 'Non autorisé à modifier ce profil' },
        { status: 403 }
      );
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as 'avatar' | 'banner';
    
    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }
    
    if (!type || !['avatar', 'banner'].includes(type)) {
      return NextResponse.json(
        { error: 'Type d\'image invalide' },
        { status: 400 }
      );
    }
    
    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Le fichier doit être une image' },
        { status: 400 }
      );
    }
    
    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Le fichier ne peut pas dépasser 5MB' },
        { status: 400 }
      );
    }
    
    // Convertir le fichier en buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Upload vers Cloudinary
    const folder = type === 'avatar' ? 'ximam/avatars' : 'ximam/banners';
    const uploadResult = await uploadImage(buffer, {
      folder,
      width: type === 'avatar' ? 400 : 1200,
      height: type === 'avatar' ? 400 : 400,
      crop: 'fill',
      gravity: 'auto',
      quality: 'auto'
    });
    
    if (!uploadResult.secure_url) {
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload de l\'image' },
        { status: 500 }
      );
    }
    
    // Mettre à jour l'utilisateur avec la nouvelle image
    const updateData: any = {};
    updateData[type] = uploadResult.secure_url;
    
    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      updateData,
      { new: true }
    )
      .populate('followers', 'name username avatar isVerified')
      .populate('following', 'name username avatar isVerified')
      .populate('tracks', 'title coverUrl duration plays likes createdAt')
      .populate('playlists', 'name description coverUrl trackCount likes isPublic createdAt')
      .populate('likes', 'title artist coverUrl duration plays')
      .lean() as any;
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du profil' },
        { status: 500 }
      );
    }
    
    // Calculer les statistiques
    const totalPlays = (updatedUser.tracks || []).reduce((sum: number, track: any) => sum + (track.plays || 0), 0);
    const totalLikes = (updatedUser.tracks || []).reduce((sum: number, track: any) => sum + (track.likes?.length || 0), 0);
    
    // Formater la réponse
    const formattedUser = {
      ...updatedUser,
      _id: updatedUser._id.toString(),
      trackCount: (updatedUser.tracks || []).length,
      playlistCount: (updatedUser.playlists || []).length,
      followerCount: (updatedUser.followers || []).length,
      followingCount: (updatedUser.following || []).length,
      likeCount: (updatedUser.likes || []).length,
      totalPlays,
      totalLikes,
      followers: (updatedUser.followers || []).map((follower: any) => ({
        ...follower,
        _id: follower._id.toString()
      })),
      following: (updatedUser.following || []).map((following: any) => ({
        ...following,
        _id: following._id.toString()
      })),
      tracks: (updatedUser.tracks || []).map((track: any) => ({
        ...track,
        _id: track._id.toString(),
        artist: track.artist ? {
          ...track.artist,
          _id: track.artist._id.toString()
        } : null
      })),
      playlists: (updatedUser.playlists || []).map((playlist: any) => ({
        ...playlist,
        _id: playlist._id.toString(),
        createdBy: playlist.createdBy ? {
          ...playlist.createdBy,
          _id: playlist.createdBy._id.toString()
        } : null
      })),
      likes: (updatedUser.likes || []).map((track: any) => ({
        ...track,
        _id: track._id.toString(),
        artist: track.artist ? {
          ...track.artist,
          _id: track.artist._id.toString()
        } : null
      }))
    };
    
    return NextResponse.json({
      user: formattedUser,
      imageUrl: uploadResult.secure_url,
      message: `${type === 'avatar' ? 'Avatar' : 'Bannière'} mis à jour avec succès`
    });
  } catch (error) {
    console.error('Erreur upload image:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload de l\'image' },
      { status: 500 }
    );
  }
} 