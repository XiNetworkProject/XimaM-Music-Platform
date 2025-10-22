// app/api/suno/upload-audio/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { v2 as cloudinary } from 'cloudinary';

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }

    // Vérifier la taille (max 8 minutes ~ 8MB en moyenne)
    const maxSize = 50 * 1024 * 1024; // 50MB max
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "Fichier trop volumineux (max 50MB)" 
      }, { status: 400 });
    }

    // Vérifier le type de fichier
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      return NextResponse.json({ 
        error: "Format de fichier non supporté. Utilisez MP3, WAV, OGG ou M4A" 
      }, { status: 400 });
    }

    console.log("📤 Upload audio:", {
      name: file.name,
      type: file.type,
      size: file.size,
      userId: session.user.id
    });

    // Convertir le fichier en buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload vers Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video', // 'video' pour les fichiers audio
          folder: `xinetwork/ai-covers/${session.user.id}`,
          public_id: `cover_${Date.now()}`,
          format: 'mp3',
          transformation: [
            { audio_codec: 'mp3' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(buffer);
    });

    console.log("✅ Audio uploadé:", result.secure_url);

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration || 0,
      format: result.format
    });

  } catch (error: any) {
    console.error("❌ Erreur upload audio:", error);
    return NextResponse.json({ 
      error: error.message || "Erreur lors de l'upload" 
    }, { status: 500 });
  }
}

