import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'ximam/images';

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Validation du type de fichier
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Type de fichier non supporté. Utilisez JPEG, PNG ou WebP' 
      }, { status: 400 });
    }

    // Validation de la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'Fichier trop volumineux. Taille maximale: 5MB' 
      }, { status: 400 });
    }

    // Utiliser des images locales par défaut (solution temporaire)
    console.log('Upload image - utilisation d\'images locales');
    
    let url = '/default-avatar.svg';
    if (folder.includes('banners')) {
      url = '/default-banner.svg';
    } else if (folder.includes('covers')) {
      url = '/default-cover.svg';
    }
    
    // Simuler un délai d'upload
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return NextResponse.json({
      success: true,
      url,
      publicId: `local-${Date.now()}`,
      width: 400,
      height: 400,
      format: file.type.split('/')[1] || 'jpeg',
      size: file.size
    });

  } catch (error) {
    console.error('Erreur upload image:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'upload' },
      { status: 500 }
    );
  }
} 