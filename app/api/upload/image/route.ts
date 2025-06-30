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

    // Vérifier si Cloudinary est configuré
    const cloudinaryConfig = {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    };

    // Si Cloudinary n'est pas configuré, utiliser des images locales
    if (!cloudinaryConfig.cloudName || !cloudinaryConfig.apiKey || !cloudinaryConfig.apiSecret) {
      console.log('Cloudinary non configuré, utilisation d\'images locales');
      
      let url = '/default-avatar.svg';
      if (folder.includes('banners')) {
        url = '/default-banner.svg';
      } else if (folder.includes('covers')) {
        url = '/default-cover.svg';
      }
      
      return NextResponse.json({
        success: true,
        url,
        publicId: `local-${Date.now()}`,
        width: 400,
        height: 400,
        format: file.type.split('/')[1] || 'jpeg',
        size: file.size
      });
    }

    // Essayer l'upload vers Cloudinary
    try {
      const { uploadImage } = await import('@/lib/cloudinary');
      
      // Convertir File en Buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload vers Cloudinary
      const result = await uploadImage(buffer, {
        folder,
        width: 800,
        height: 800,
        crop: 'fill',
        quality: 'auto'
      });

      return NextResponse.json({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes
      });

    } catch (cloudinaryError) {
      console.error('Erreur Cloudinary:', cloudinaryError);
      
      // Fallback vers images locales en cas d'erreur Cloudinary
      let url = '/default-avatar.svg';
      if (folder.includes('banners')) {
        url = '/default-banner.svg';
      } else if (folder.includes('covers')) {
        url = '/default-cover.svg';
      }
      
      return NextResponse.json({
        success: true,
        url,
        publicId: `local-${Date.now()}`,
        width: 400,
        height: 400,
        format: file.type.split('/')[1] || 'jpeg',
        size: file.size
      });
    }

  } catch (error) {
    console.error('Erreur upload image:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'upload' },
      { status: 500 }
    );
  }
} 