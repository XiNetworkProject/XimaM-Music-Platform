import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect, { isConnected } from '@/lib/db';
import User from '@/models/User';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier les variables d'environnement Cloudinary
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: 'Configuration Cloudinary manquante' }, { status: 500 });
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

    // Upload sur Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const uploadRes = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({
        folder: 'xima-users',
        resource_type: 'image',
        public_id: `${session.user.id}_${type}`,
        overwrite: true,
      }, (err, result) => {
        if (err) {
          console.error('Erreur Cloudinary:', err);
          reject(err);
        } else {
          resolve(result);
        }
      }).end(buffer);
    });

    const url = (uploadRes as any).secure_url;
    
    // Mettre à jour l'utilisateur
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }
    
    if (type === 'avatar') user.avatar = url;
    if (type === 'banner') user.banner = url;
    
    await user.save();
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Erreur upload image:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 500 });
  }
} 