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
    // @ts-ignore - FormData type issue in Next.js (false positive)
    const formData = await request.formData();
    // @ts-ignore
    const title = (formData.get('title') as string | null) || '';
    // @ts-ignore
    const content = (formData.get('content') as string | null) || '';
    // @ts-ignore
    const imageFile = formData.get('image') as File | null;
    // @ts-ignore
    const mode = (formData.get('mode') as string | null) || 'publish'; // 'publish', 'draft' ou 'schedule'
    // @ts-ignore
    const scheduledAtStr = formData.get('scheduledAt') as string | null;

    // Validation backend
    if (!imageFile) {
      return NextResponse.json({ 
        error: "Aucune image reçue pour ce bulletin. Veuillez sélectionner une image." 
      }, { status: 400 });
    }

    // Vérifier que le contenu n'est pas vide
    if (!content.trim()) {
      return NextResponse.json({ 
        error: "La description du bulletin est vide. Veuillez ajouter quelques lignes de description." 
      }, { status: 400 });
    }

    // Vérifier que le contenu n'est pas trop court (optionnel mais recommandé)
    if (content.trim().length < 10) {
      return NextResponse.json({ 
        error: "La description est trop courte. Veuillez ajouter plus de détails." 
      }, { status: 400 });
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

    const isPublish = mode === 'publish';
    const isDraft = mode === 'draft';
    const isSchedule = mode === 'schedule';

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
        // On continue quand même pour créer le nouveau bulletin
      }
    }

    // Créer le nouveau bulletin
    const insertData: any = {
      title: title || null,
      content: content || null,
      image_url: secure_url,
      image_public_id: public_id,
      author_id: session.user.id,
    };

    if (isPublish) {
      insertData.status = 'published';
      insertData.is_current = true;
    } else if (isDraft) {
      insertData.status = 'draft';
      insertData.is_current = false;
    } else if (isSchedule) {
      insertData.status = 'scheduled';
      insertData.scheduled_at = scheduledAtStr;
      insertData.is_current = false;
    }

    const { data: newBulletin, error: insertError } = await supabaseAdmin
      .from('meteo_bulletins')
      .insert(insertData)
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
      message: isPublish 
        ? 'Bulletin publié avec succès' 
        : isSchedule
        ? 'Bulletin programmé avec succès'
        : 'Bulletin enregistré en brouillon'
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

    // Récupérer le bulletin courant (uniquement publié)
    const { data: bulletin, error } = await supabaseAdmin
      .from('meteo_bulletins')
      .select('*')
      .eq('author_id', session.user.id)
      .eq('is_current', true)
      .eq('status', 'published')
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
