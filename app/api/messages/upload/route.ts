import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { generateUploadSignature } from '@/lib/cloudinary';

// Types de fichiers autorisés
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'];

// Limites de taille (en bytes)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

// POST /api/messages/upload
export async function POST(request: NextRequest) {
  console.log('=== DEBUT API MESSAGES UPLOAD ===');
  
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    console.log('❌ Pas de session utilisateur');
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  console.log('✅ Session utilisateur OK:', session.user.id);

  try {
    const body = await request.json();
    console.log('📥 Body reçu:', body);
    
    const { timestamp, publicId, type } = body;
    console.log('🔍 Paramètres extraits:', { timestamp, publicId, type });

    if (!timestamp || !publicId || !type) {
      console.log('❌ Paramètres manquants:', { 
        hasTimestamp: !!timestamp, 
        hasPublicId: !!publicId, 
        hasType: !!type 
      });
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    console.log('✅ Tous les paramètres présents');

    // Validation du type de fichier
    let resourceType: string;

    switch (type) {
      case 'image':
        resourceType = 'image';
        break;
      case 'video':
        resourceType = 'video';
        break;
      case 'audio':
        resourceType = 'video'; // Cloudinary traite l'audio comme vidéo
        break;
      default:
        console.log('❌ Type de fichier non supporté:', type);
        return NextResponse.json({ error: 'Type de fichier non supporté' }, { status: 400 });
    }

    console.log('✅ Type de fichier validé:', { type, resourceType });

    // Générer la signature pour l'upload direct
    const params = {
      folder: `messages/${session.user.id}`,
      public_id: publicId,
      timestamp: timestamp,
    };

    console.log('🔐 Paramètres pour signature:', params);
    const signature = generateUploadSignature(params);
    console.log('✅ Signature générée');

    const response = {
      success: true,
      signature,
      timestamp,
      publicId,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      resourceType,
    };

    console.log('📤 Réponse envoyée:', { 
      success: response.success,
      hasSignature: !!response.signature,
      hasApiKey: !!response.apiKey,
      hasCloudName: !!response.cloudName,
      resourceType: response.resourceType
    });

    console.log('=== FIN API MESSAGES UPLOAD SUCCES ===');
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Erreur upload message:', error);
    console.log('=== FIN API MESSAGES UPLOAD AVEC ERREUR ===');
    return NextResponse.json({ 
      error: 'Erreur lors de la génération de la signature d\'upload' 
    }, { status: 500 });
  }
} 