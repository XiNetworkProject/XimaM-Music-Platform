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
    const folder = formData.get('folder') as string || 'general';

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

    // En production, on utilise une solution alternative
    // Pour l'instant, on retourne une URL factice
    // TODO: Implémenter un vrai service d'upload (AWS S3, Cloudinary pro, etc.)
    
    const fakeUrl = `https://via.placeholder.com/400x400/667eea/ffffff?text=${encodeURIComponent(folder)}`;
    
    return NextResponse.json({
      success: true,
      url: fakeUrl,
      publicId: `fake-${Date.now()}`,
      width: 400,
      height: 400,
      format: file.type.split('/')[1],
      size: file.size
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'upload' },
      { status: 500 }
    );
  }
} 