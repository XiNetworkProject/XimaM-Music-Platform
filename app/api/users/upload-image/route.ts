import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect, { isConnected } from '@/lib/db';
import User from '@/models/User';
import { v2 as cloudinary } from 'cloudinary';

// Configuration Cloudinary avec vérification
const isCloudinaryConfigured = () => {
  return process.env.CLOUDINARY_CLOUD_NAME && 
         process.env.CLOUDINARY_API_KEY && 
         process.env.CLOUDINARY_API_SECRET;
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export const runtime = 'nodejs';

// Fonction pour obtenir l'URL de base de l'application
const getBaseUrl = (request: NextRequest) => {
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
  return `${protocol}://${host}`;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();
    if (!isConnected()) await dbConnect();
    
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const type = formData.get('type') as string;
    
    if (!file || !type) {
      return NextResponse.json({ error: 'Fichier ou type manquant' }, { status: 400 });
    }

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 });
    }

    let imageUrl = '';
    let uploadSuccess = false;

    // Essayer Cloudinary d'abord
    if (isCloudinaryConfigured()) {
      try {
        console.log('Tentative d\'upload Cloudinary...');
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const uploadRes = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream({
            folder: 'xima-users',
            resource_type: 'image',
            public_id: `${session.user.id}_${type}`,
            overwrite: true,
            transformation: [
              { width: type === 'avatar' ? 400 : 1200, height: type === 'avatar' ? 400 : 400, crop: 'fill' }
            ]
          }, (err, result) => {
            if (err) {
              console.error('Erreur Cloudinary détaillée:', err);
              reject(err);
            } else {
              console.log('Upload Cloudinary réussi:', result);
              resolve(result);
            }
          });
          
          uploadStream.end(buffer);
        });

        imageUrl = (uploadRes as any).secure_url;
        uploadSuccess = true;
        console.log('URL Cloudinary générée:', imageUrl);
        
      } catch (cloudinaryError) {
        console.error('Erreur Cloudinary complète:', cloudinaryError);
        
        // Vérifier si c'est une erreur de configuration
        const errorMessage = cloudinaryError instanceof Error ? cloudinaryError.message : String(cloudinaryError);
        if (errorMessage.includes('<!DOCTYPE')) {
          console.error('Erreur de configuration Cloudinary - vérifiez les variables d\'environnement');
        }
        
        // Fallback vers une image par défaut avec chemin relatif
        imageUrl = type === 'avatar' ? '/default-avatar.png' : '/default-cover.jpg';
        uploadSuccess = false;
      }
    } else {
      // Si Cloudinary n'est pas configuré, utiliser des images par défaut avec chemin relatif
      console.warn('Cloudinary non configuré, utilisation des images par défaut');
      imageUrl = type === 'avatar' ? '/default-avatar.png' : '/default-cover.jpg';
      uploadSuccess = false;
    }
    
    // Mettre à jour l'utilisateur
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }
    
    if (type === 'avatar') user.avatar = imageUrl;
    if (type === 'banner') user.banner = imageUrl;
    
    await user.save();
    
    return NextResponse.json({ 
      url: imageUrl,
      success: uploadSuccess,
      message: uploadSuccess ? 'Image uploadée avec succès sur Cloudinary' : 'Image par défaut appliquée (Cloudinary non disponible)',
      uploaded: uploadSuccess
    });
  } catch (error) {
    console.error('Erreur générale upload image:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de l\'upload',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
      fallback: true
    }, { status: 500 });
  }
} 