import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { uploadImage, uploadImageDirect } from '@/lib/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || session.user.email !== 'alertempsfrance@gmail.com') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'ID du bulletin requis' }, { status: 400 });
    }

    // Récupérer le bulletin
    const { data: bulletin, error: fetchError } = await supabaseAdmin
      .from('meteo_bulletins')
      .select('*')
      .eq('id', id)
      .eq('author_id', session.user.id)
      .single();

    if (fetchError || !bulletin) {
      return NextResponse.json({ 
        error: 'Bulletin introuvable ou accès non autorisé',
        details: fetchError?.message 
      }, { status: 404 });
    }

    return NextResponse.json({
      id: bulletin.id,
      title: bulletin.title,
      content: bulletin.content,
      image_url: bulletin.image_url,
      image_public_id: bulletin.image_public_id,
      status: bulletin.status,
      created_at: bulletin.created_at,
      updated_at: bulletin.updated_at,
    });

  } catch (error) {
    console.error('Erreur API bulletin GET:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || session.user.email !== 'alertempsfrance@gmail.com') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'ID du bulletin requis' }, { status: 400 });
    }

    // Vérifier que le bulletin existe et appartient à l'utilisateur
    const { data: existingBulletin, error: fetchError } = await supabaseAdmin
      .from('meteo_bulletins')
      .select('*')
      .eq('id', id)
      .eq('author_id', session.user.id)
      .single();

    if (fetchError || !existingBulletin) {
      return NextResponse.json({ 
        error: 'Bulletin introuvable ou accès non autorisé',
        details: fetchError?.message 
      }, { status: 404 });
    }

    // Récupérer les données du formulaire
    // @ts-ignore - FormData type issue in Next.js (false positive)
    const formData = await request.formData();
    // @ts-ignore
    const title = (formData.get('title') as string | null) || '';
    // @ts-ignore
    const content = (formData.get('content') as string | null) || '';
    // @ts-ignore
    const imageFile = formData.get('image') as File | null;
    // @ts-ignore
    const mode = (formData.get('mode') as string | null) || 'draft'; // 'publish', 'draft' ou 'schedule'
    // @ts-ignore
    const scheduledAtStr = formData.get('scheduledAt') as string | null;

    const isPublish = mode === 'publish';
    const isDraft = mode === 'draft';
    const isSchedule = mode === 'schedule';

    // Validation backend
    // Si une nouvelle image n'est pas fournie, on garde l'ancienne (OK pour l'édition)
    // Mais on vérifie que le contenu n'est pas vide
    if (!content.trim()) {
      return NextResponse.json({ 
        error: "La description du bulletin est vide. Veuillez ajouter quelques lignes de description." 
      }, { status: 400 });
    }

    // Vérifier que le contenu n'est pas trop court
    if (content.trim().length < 10) {
      return NextResponse.json({ 
        error: "La description est trop courte. Veuillez ajouter plus de détails." 
      }, { status: 400 });
    }

    // Validation pour le mode schedule
    if (isSchedule) {
      if (!scheduledAtStr) {
        return NextResponse.json({ 
          error: 'Date de programmation requise pour le mode schedule' 
        }, { status: 400 });
      }

      const scheduledAt = new Date(scheduledAtStr);
      const now = new Date();

      // Vérifier que la date est valide
      if (isNaN(scheduledAt.getTime())) {
        return NextResponse.json({ 
          error: 'Date de programmation invalide' 
        }, { status: 400 });
      }

      // Vérifier que la date est dans le futur (au moins 1 minute)
      const minFuture = new Date(now.getTime() + 60000); // 1 minute
      if (scheduledAt < minFuture) {
        return NextResponse.json({ 
          error: 'La date de programmation doit être au moins 1 minute dans le futur' 
        }, { status: 400 });
      }
    }

    let image_url = existingBulletin.image_url;
    let image_public_id = existingBulletin.image_public_id;

    // Si une nouvelle image est fournie, l'uploader
    if (imageFile) {
      // Vérifier le type de fichier
      if (!imageFile.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 });
      }

      // Vérifier la taille (max 10MB)
      if (imageFile.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'L\'image ne doit pas dépasser 10MB' }, { status: 400 });
      }

      // Supprimer l'ancienne image Cloudinary si elle existe
      if (existingBulletin.image_public_id) {
        try {
          const { deleteFile } = await import('@/lib/cloudinary');
          await deleteFile(existingBulletin.image_public_id, 'image');
        } catch (deleteError) {
          console.error('Erreur suppression ancienne image:', deleteError);
          // On continue même si la suppression échoue
        }
      }

      // Convertir le fichier en buffer
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload vers Cloudinary
      let uploadResult;
      try {
        uploadResult = await uploadImage(buffer, {
          folder: 'meteo-bulletins',
          resource_type: 'image',
          public_id: `bulletin_${Date.now()}`,
          quality: 'auto',
        });
      } catch (e) {
        uploadResult = await uploadImageDirect(buffer, {
          folder: 'meteo-bulletins',
        });
      }

      image_url = uploadResult.secure_url;
      image_public_id = uploadResult.public_id;
    }

    // Si mode = 'publish' : mettre tous les bulletins publiés existants à is_current = false
    if (isPublish) {
      const { error: updateError } = await supabaseAdmin
        .from('meteo_bulletins')
        .update({ is_current: false })
        .eq('author_id', session.user.id)
        .eq('is_current', true)
        .eq('status', 'published');

      if (updateError) {
        console.error('Erreur mise à jour bulletins existants:', updateError);
      }
    }

    // Mettre à jour le bulletin
    const updateData: any = {
      title: title || null,
      content: content || null,
      image_url,
      image_public_id,
    };

    if (isPublish) {
      updateData.status = 'published';
      updateData.is_current = true;
      updateData.scheduled_at = null; // Retirer la programmation si on publie maintenant
    } else if (isDraft) {
      updateData.status = 'draft';
      updateData.is_current = false;
      updateData.scheduled_at = null;
    } else if (isSchedule) {
      updateData.status = 'scheduled';
      updateData.scheduled_at = scheduledAtStr;
      updateData.is_current = false;
    }

    const { data: updatedBulletin, error: updateError } = await supabaseAdmin
      .from('meteo_bulletins')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ 
        error: 'Erreur lors de la mise à jour du bulletin',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      bulletin: updatedBulletin,
      message: isPublish 
        ? 'Bulletin modifié et publié avec succès' 
        : isSchedule
        ? 'Bulletin modifié et programmé avec succès'
        : 'Brouillon modifié avec succès'
    });

  } catch (error) {
    console.error('Erreur API bulletin PATCH:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

