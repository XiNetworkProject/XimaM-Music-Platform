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
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { data: teamMember } = await supabaseAdmin
      .from('meteo_team_members')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!teamMember) {
      return NextResponse.json({ error: 'Acces non autorise' }, { status: 403 });
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

    const existingImageUrl = formData.get('image_url') as string | null;

    if (!imageFile && !existingImageUrl) {
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

    let secure_url: string;
    let public_id: string;

    if (imageFile) {
      if (!imageFile.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Le fichier doit etre une image' }, { status: 400 });
      }
      if (imageFile.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'L\'image ne doit pas depasser 10MB' }, { status: 400 });
      }

      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

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

      secure_url = uploadResult.secure_url;
      public_id = uploadResult.public_id;
    } else {
      secure_url = existingImageUrl!;
      public_id = `duplicated_${Date.now()}`;
    }

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

    // V3 fields
    const category = (formData.get('category') as string | null) || 'prevision';
    const tagsRaw = formData.get('tags') as string | null;
    const tags = tagsRaw ? JSON.parse(tagsRaw) : [];
    const allowComments = formData.get('allow_comments') !== 'false';
    const pinned = formData.get('pinned') === 'true';
    const authorName = (formData.get('author_name') as string | null) || session.user.name || 'Alertemps';

    const insertData: any = {
      title: title || null,
      content: content || null,
      image_url: secure_url,
      image_public_id: public_id,
      author_id: session.user.id,
      category,
      tags,
      allow_comments: allowComments,
      pinned,
      author_name: authorName,
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { data: teamMember } = await supabaseAdmin
      .from('meteo_team_members')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!teamMember) {
      return NextResponse.json({ error: 'Acces non autorise' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('meteo_bulletins')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.eq('is_current', true).eq('status', 'published');
    }

    const { data: bulletins, error } = await query.limit(status ? 50 : 1);

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!status) {
      return NextResponse.json({ bulletin: bulletins?.[0] || null });
    }

    return NextResponse.json({ bulletins: bulletins || [] });

  } catch (error) {
    console.error('Erreur API bulletin GET:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
