import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { uploadImage, uploadImageDirect } from '@/lib/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || session.user.email !== 'alertempsfrance@gmail.com') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Récupérer les données du formulaire
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: 'Image requise' }, { status: 400 });
    }

    // Vérifier le type de fichier
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 });
    }

    // Vérifier la taille (max 10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'L\'image ne doit pas dépasser 10MB' }, { status: 400 });
    }

    // Convertir le fichier en buffer
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload vers Cloudinary (avec repli en REST si SDK échoue)
    let uploadResult;
    try {
      uploadResult = await uploadImage(buffer, {
        folder: 'meteo-bulletins',
        resource_type: 'image',
        public_id: `bulletin_${Date.now()}`,
        quality: 'auto',
      });
    } catch (e) {
      // Fallback REST signé (souvent plus tolérant en prod)
      uploadResult = await uploadImageDirect(buffer, {
        folder: 'meteo-bulletins',
      });
    }

    const { secure_url, public_id } = uploadResult;

    // Récupérer l'ancien bulletin courant pour le supprimer complètement
    const { data: currentBulletin, error: fetchError } = await supabaseAdmin
      .from('meteo_bulletins')
      .select('id, image_public_id')
      .eq('author_id', session.user.id)
      .eq('is_current', true)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Erreur récupération bulletin courant:', fetchError);
    }

    // Si un bulletin existe, supprimer son image Cloudinary AVANT de le supprimer de la base
    if (currentBulletin?.image_public_id) {
      try {
        console.log('🗑️ Suppression ancienne image Cloudinary:', currentBulletin.image_public_id);
        const { deleteFile } = await import('@/lib/cloudinary');
        await deleteFile(currentBulletin.image_public_id, 'image');
        console.log('✅ Ancienne image supprimée');
      } catch (deleteError) {
        console.error('❌ Erreur suppression ancienne image:', deleteError);
        // On continue même si la suppression échoue
      }

      // Supprimer complètement l'ancien bulletin de la base de données
      const { error: deleteError } = await supabaseAdmin
        .from('meteo_bulletins')
        .delete()
        .eq('id', currentBulletin.id);

      if (deleteError) {
        console.error('❌ Erreur suppression ancien bulletin:', deleteError);
      } else {
        console.log('✅ Ancien bulletin supprimé de la base');
      }
    }

    // Créer le nouveau bulletin
    const { data: newBulletin, error: insertError } = await supabaseAdmin
      .from('meteo_bulletins')
      .insert({
        title: title || null,
        content: content || null,
        image_url: secure_url,
        image_public_id: public_id,
        author_id: session.user.id,
        is_current: true
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ 
        error: 'Erreur lors de la création du bulletin',
        details: insertError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      bulletin: newBulletin,
      message: 'Bulletin publié avec succès'
    });

  } catch (error) {
    console.error('Erreur API bulletin:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || session.user.email !== 'alertempsfrance@gmail.com') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Récupérer le bulletin courant
    const { data: bulletin, error } = await supabaseAdmin
      .from('meteo_bulletins')
      .select('*')
      .eq('author_id', session.user.id)
      .eq('is_current', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ 
        error: 'Erreur lors de la récupération du bulletin',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ bulletin });

  } catch (error) {
    console.error('Erreur API bulletin GET:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}
