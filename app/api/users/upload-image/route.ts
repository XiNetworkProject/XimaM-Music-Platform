import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect, { isConnected } from '@/lib/db';
import User from '@/models/User';

export const runtime = 'nodejs';

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

    // Vérifier la taille du fichier (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Le fichier est trop volumineux (max 5MB)' }, { status: 400 });
    }

    // Utiliser des images locales existantes
    let imageUrl: string;
    if (type === 'avatar') {
      imageUrl = '/default-avatar.png';
    } else if (type === 'banner') {
      imageUrl = '/default-cover.jpg';
    } else {
      return NextResponse.json({ error: 'Type d\'image invalide' }, { status: 400 });
    }
    
    // Mettre à jour l'utilisateur
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }
    
    if (type === 'avatar') user.avatar = imageUrl;
    if (type === 'banner') user.banner = imageUrl;
    
    await user.save();
    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error('Erreur upload image:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 500 });
  }
} 