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

    // Préparer les données pour Cloudinary
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('upload_preset', 'ximaM_uploads');
    cloudinaryFormData.append('folder', folder);

    // Upload vers Cloudinary
    const cloudinaryResponse = await fetch(
      'https://api.cloudinary.com/v1_1/demo/image/upload',
      {
        method: 'POST',
        body: cloudinaryFormData,
      }
    );

    if (!cloudinaryResponse.ok) {
      const errorData = await cloudinaryResponse.json();
      return NextResponse.json({ 
        error: 'Erreur lors de l\'upload vers Cloudinary',
        details: errorData
      }, { status: 500 });
    }

    const cloudinaryData = await cloudinaryResponse.json();

    return NextResponse.json({
      success: true,
      url: cloudinaryData.secure_url,
      publicId: cloudinaryData.public_id,
      width: cloudinaryData.width,
      height: cloudinaryData.height,
      format: cloudinaryData.format,
      size: cloudinaryData.bytes
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'upload' },
      { status: 500 }
    );
  }
} 