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
  console.log('=== DEBUT UPLOAD API ===');
  console.log('Username:', params.username);
  
  try {
    // Vérifier les variables d'environnement Cloudinary
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Variables d\'environnement Cloudinary manquantes');
      return NextResponse.json(
        { error: 'Configuration Cloudinary manquante' },
        { status: 500 }
      );
    }
    console.log('✅ Variables Cloudinary OK');

    const session = await getServerSession(authOptions);
    console.log('Session:', session ? '✅ Présente' : '❌ Absente');
    console.log('User email:', session?.user?.email);
    
    if (!session?.user?.email) {
      console.log('❌ Pas de session utilisateur');
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    console.log('🔄 Connexion à la base de données...');
    await dbConnect();
    
    if (!isConnected()) {
      console.error('❌ Impossible de se connecter à la base de données');
      return NextResponse.json(
        { error: 'Erreur de connexion à la base de données' },
        { status: 500 }
      );
    }
    console.log('✅ Base de données connectée');
    
    const { username } = params;
    
    // Vérifier que l'utilisateur modifie son propre profil
    console.log('🔍 Recherche utilisateur:', session.user.email);
    const currentUser = await User.findOne({ email: session.user.email });
    console.log('Utilisateur trouvé:', currentUser ? '✅' : '❌');
    console.log('Username actuel:', currentUser?.username);
    console.log('Username demandé:', username);
    
    if (!currentUser || currentUser.username !== username) {
      console.log('❌ Non autorisé à modifier ce profil');
      return NextResponse.json(
        { error: 'Non autorisé à modifier ce profil' },
        { status: 403 }
      );
    }
    console.log('✅ Autorisation OK');
    
    console.log('📁 Lecture FormData...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as 'avatar' | 'banner';
    
    console.log('Type de fichier:', file?.type);
    console.log('Taille du fichier:', file?.size);
    console.log('Type d\'upload:', type);
    
    if (!file) {
      console.log('❌ Aucun fichier fourni');
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }
    
    if (!type || !['avatar', 'banner'].includes(type)) {
      console.log('❌ Type d\'image invalide:', type);
      return NextResponse.json(
        { error: 'Type d\'image invalide' },
        { status: 400 }
      );
    }
    
    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      console.log('❌ Fichier non-image:', file.type);
      return NextResponse.json(
        { error: 'Le fichier doit être une image' },
        { status: 400 }
      );
    }
    
    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.log('❌ Fichier trop volumineux:', file.size);
      return NextResponse.json(
        { error: 'Le fichier ne peut pas dépasser 5MB' },
        { status: 400 }
      );
    }
    
    // Convertir le fichier en buffer
    console.log('🔄 Conversion en buffer...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    console.log(`📤 Upload ${type} pour ${username}, taille: ${buffer.length} bytes`);
    
    // Upload vers Cloudinary
    const folder = type === 'avatar' ? 'ximam/avatars' : 'ximam/banners';
    console.log('📁 Dossier Cloudinary:', folder);
    
    // Upload simplifié sans options problématiques
    const uploadResult = await uploadImage(buffer, {
      folder
      // Retiré temporairement: width, height, crop, gravity, quality
    });
    
    if (!uploadResult.secure_url) {
      console.error('❌ Upload Cloudinary échoué:', uploadResult);
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload de l\'image' },
        { status: 500 }
      );
    }
    
    console.log(`✅ Upload réussi: ${uploadResult.secure_url}`);
    
    // Mettre à jour l'utilisateur avec la nouvelle image
    console.log('🔄 Mise à jour utilisateur...');
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
      console.error('❌ Échec de la mise à jour de l\'utilisateur');
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du profil' },
        { status: 500 }
      );
    }
    
    console.log('✅ Utilisateur mis à jour');
    
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
    
    console.log('✅ Réponse envoyée avec succès');
    console.log('=== FIN UPLOAD API ===');
    
    return NextResponse.json({
      user: formattedUser,
      imageUrl: uploadResult.secure_url,
      message: `${type === 'avatar' ? 'Avatar' : 'Bannière'} mis à jour avec succès`
    });
  } catch (error) {
    console.error('❌ Erreur upload image:', error);
    console.log('=== FIN UPLOAD API AVEC ERREUR ===');
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload de l\'image' },
      { status: 500 }
    );
  }
} 