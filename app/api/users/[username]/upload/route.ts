import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { uploadImage, uploadImageDirect, deleteFile } from '@/lib/cloudinary';

export async function POST(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  console.log('=== DEBUT UPLOAD API ===');
  
  try {
    const { username } = params;
    console.log('Username:', username);

    // Vérifier les variables Cloudinary
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    console.log('✅ Variables Cloudinary OK');
    console.log('Cloud Name:', cloudName);
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MANQUANT');
    console.log('API Secret:', apiSecret ? `${apiSecret.substring(0, 10)}...` : 'MANQUANT');

    // Vérifier la session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ Pas de session utilisateur');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    console.log('Session:', session ? '✅ Présente' : '❌ Absente');
    console.log('User email:', session.user.email);

    // Connexion à la base de données
    console.log('🔄 Connexion à la base de données...');
    await dbConnect();
    console.log('✅ Base de données connectée');

    // Vérifier que l'utilisateur existe et a le bon username
    console.log('🔍 Recherche utilisateur:', session.user.email);
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    console.log('Utilisateur trouvé:', user ? '✅' : '❌');
    console.log('Username actuel:', user.username);
    console.log('Username demandé:', username);

    if (user.username !== username) {
      console.log('❌ Username ne correspond pas');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    console.log('✅ Autorisation OK');

    // Lire le FormData
    console.log('📁 Lecture FormData...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      console.log('❌ Aucun fichier fourni');
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    console.log('Type de fichier:', file.type);
    console.log('Taille du fichier:', file.size);
    console.log('Type d\'upload:', type);

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      console.log('❌ Type de fichier invalide');
      return NextResponse.json({ error: 'Type de fichier invalide' }, { status: 400 });
    }

    // Convertir en buffer
    console.log('🔄 Conversion en buffer...');
    const buffer = Buffer.from(await file.arrayBuffer());

    let result;
    if (type === 'avatar') {
      // Supprimer l'ancien avatar Cloudinary si présent
      if (user.avatarPublicId) {
        try {
          console.log('🗑️ Suppression ancien avatar Cloudinary:', user.avatarPublicId);
          await deleteFile(user.avatarPublicId, 'image');
          console.log('✅ Ancien avatar supprimé');
        } catch (err) {
          console.warn('⚠️ Erreur suppression ancien avatar Cloudinary:', err);
        }
      }
      console.log('📤 Upload avatar pour', username + ', taille:', buffer.length, 'bytes');
      console.log('📁 Dossier Cloudinary: ximam/avatars');
      
      // Test avec une approche en 3 étapes
      try {
        console.log('🔄 Début upload Cloudinary (méthode simple)...');
        
        // Utiliser une approche plus basique
        const uploadOptions = {
          folder: 'ximam/avatars',
          resource_type: 'image',
          format: 'auto',
          quality: 'auto'
        };
        
        console.log('Options:', uploadOptions);
        console.log('Taille buffer:', buffer.length);
        
        result = await uploadImage(buffer, uploadOptions);
        console.log('✅ Upload réussi avec méthode simple');
        
      } catch (simpleError) {
        console.log('❌ Échec méthode simple, essai méthode alternative...');
        console.error('Erreur méthode simple:', simpleError);
        
        // Méthode alternative : upload direct sans options
        try {
          console.log('🔄 Essai upload direct sans options...');
          result = await uploadImage(buffer, {});
          console.log('✅ Upload réussi avec méthode alternative');
        } catch (altError) {
          console.log('❌ Échec méthode alternative, essai API REST directe...');
          console.error('Erreur méthode alternative:', altError);
          
          // Dernière chance : API REST directe
          try {
            console.log('🔄 Essai upload via API REST directe...');
            result = await uploadImageDirect(buffer, { folder: 'ximam/avatars' });
            console.log('✅ Upload réussi avec API REST directe');
          } catch (restError) {
            console.error('❌ Échec API REST directe:', restError);
            throw restError;
          }
        }
      }
      
    } else if (type === 'banner') {
      // Supprimer l'ancienne bannière Cloudinary si présente
      if (user.bannerPublicId) {
        try {
          console.log('🗑️ Suppression ancienne bannière Cloudinary:', user.bannerPublicId);
          await deleteFile(user.bannerPublicId, 'image');
          console.log('✅ Ancienne bannière supprimée');
        } catch (err) {
          console.warn('⚠️ Erreur suppression ancienne bannière Cloudinary:', err);
        }
      }
      console.log('📤 Upload banner pour', username);
      // Fallback triple comme pour l'avatar
      try {
        console.log('🔄 Début upload Cloudinary (méthode simple)...');
        const uploadOptions = {
          folder: 'ximam/banners',
          resource_type: 'image',
          format: 'auto',
          quality: 'auto'
        };
        console.log('Options:', uploadOptions);
        result = await uploadImage(buffer, uploadOptions);
        console.log('✅ Upload réussi avec méthode simple');
      } catch (simpleError) {
        console.log('❌ Échec méthode simple, essai méthode alternative...');
        try {
          result = await uploadImage(buffer, {});
          console.log('✅ Upload réussi avec méthode alternative');
        } catch (altError) {
          console.log('❌ Échec méthode alternative, essai API REST directe...');
          try {
            result = await uploadImageDirect(buffer, { folder: 'ximam/banners' });
            console.log('✅ Upload réussi avec API REST directe');
          } catch (restError) {
            console.error('❌ Échec API REST directe:', restError);
            throw restError;
          }
        }
      }
    } else {
      console.log('❌ Type d\'upload non supporté:', type);
      return NextResponse.json({ error: 'Type d\'upload non supporté' }, { status: 400 });
    }

    // Mettre à jour l'utilisateur
    console.log('🔄 Mise à jour utilisateur...');
    const updateData: any = {};
    if (type === 'avatar') {
      updateData.avatar = result.secure_url;
      updateData.avatarPublicId = result.public_id;
    } else if (type === 'banner') {
      updateData.banner = result.secure_url;
      updateData.bannerPublicId = result.public_id;
    }

    await User.findByIdAndUpdate(user._id, updateData);
    console.log('✅ Utilisateur mis à jour');

    console.log('=== FIN UPLOAD API SUCCES ===');
    return NextResponse.json({
      success: true,
      imageUrl: result.secure_url,
      publicId: result.public_id
    });

  } catch (error) {
    console.error('❌ Erreur upload image:', error);
    
    // Logs détaillés pour le diagnostic
    if (error && typeof error === 'object') {
      console.error('Type d\'erreur:', error.constructor.name);
      console.error('Propriétés:', Object.keys(error));
      
      if ('http_code' in error) {
        console.error('Code HTTP Cloudinary:', (error as any).http_code);
      }
      if ('message' in error) {
        console.error('Message d\'erreur:', (error as any).message);
      }
    }
    
    console.log('=== FIN UPLOAD API AVEC ERREUR ===');
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload de l\'image' },
      { status: 500 }
    );
  }
} 