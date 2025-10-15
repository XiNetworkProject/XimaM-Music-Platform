import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { uploadImage } from '@/lib/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Étape 1: Créer l'album avec la cover
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const formData = await request.formData();
    
    const title = formData.get('title') as string;
    const artist = formData.get('artist') as string;
    const releaseDate = formData.get('releaseDate') as string;
    const genre = JSON.parse(formData.get('genre') as string || '[]');
    const description = formData.get('description') as string;
    const isExplicit = formData.get('isExplicit') === 'true';
    const isPublic = formData.get('isPublic') === 'true';
    const coverFile = formData.get('cover') as File | null;

    if (!title || !artist) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Upload de la cover de l'album si fournie
    let coverUrl = null;
    let coverPublicId = null;
    
    if (coverFile) {
      const bytes = await coverFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Compression automatique si > 9MB
      const uploadResult = await uploadImage(buffer, {
        folder: 'ximam/albums',
        public_id: `album_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        width: buffer.length > 9 * 1024 * 1024 ? 600 : 800,
        height: buffer.length > 9 * 1024 * 1024 ? 600 : 800,
        crop: 'fill',
        quality: buffer.length > 9 * 1024 * 1024 ? 80 : 'auto'
      });
      coverUrl = uploadResult.secure_url;
      coverPublicId = uploadResult.public_id;
    }

    // Créer l'album dans la base de données
    const { data: album, error: albumError } = await supabaseAdmin
      .from('albums')
      .insert({
        title,
        artist,
        creator_id: session.user.id,
        release_date: releaseDate || null,
        genre,
        description: description || null,
        cover_url: coverUrl,
        cover_public_id: coverPublicId,
        is_explicit: isExplicit,
        is_public: isPublic
      })
      .select()
      .single();

    if (albumError) {
      console.error('❌ Erreur création album:', albumError);
      return NextResponse.json({ 
        error: 'Erreur lors de la création de l\'album',
        details: albumError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      album
    });

  } catch (error) {
    console.error('❌ Erreur API create album:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

