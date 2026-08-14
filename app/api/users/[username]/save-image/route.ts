import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteLocalMedia, isLocalMediaOwnedBy, isLocalMediaPublicId, isLocalMediaReference } from '@/lib/localMediaStorage';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { username } = params;
    if (!username) {
      return NextResponse.json({ error: 'Nom d\'utilisateur requis' }, { status: 400 });
    }

    // Vérifier que l'utilisateur existe et que c'est bien son profil
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, avatar_public_id, banner_public_id')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Vérifier que l'utilisateur modifie son propre profil
    if (profile.id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { imageUrl, type, publicId } = body;

    if (!imageUrl || !type || !publicId) {
      return NextResponse.json({ error: 'imageUrl, type et publicId requis' }, { status: 400 });
    }

    if (!['avatar', 'banner'].includes(type)) {
      return NextResponse.json({ error: 'Type doit être avatar ou banner' }, { status: 400 });
    }
    if (!isLocalMediaReference(imageUrl, publicId, type) || !isLocalMediaOwnedBy(publicId, session.user.id)) {
      return NextResponse.json({ error: 'Reference media locale invalide' }, { status: 422 });
    }

    const oldPublicIdField = type === 'avatar' ? 'avatar_public_id' : 'banner_public_id';
    const oldPublicId = profile[oldPublicIdField];

    // Mettre à jour le profil avec la nouvelle image et son public_id
    const updateData: any = { 
      [type]: imageUrl,
      [oldPublicIdField]: publicId
    };

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Erreur mise à jour profil:', updateError);
      await deleteLocalMedia(publicId).catch(() => false);
      return NextResponse.json({ error: 'Erreur mise à jour profil' }, { status: 500 });
    }

    if (isLocalMediaPublicId(oldPublicId) && oldPublicId !== publicId) {
      await deleteLocalMedia(oldPublicId).catch(() => false);
    }

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      type,
      publicId,
      oldImageDeleted: isLocalMediaPublicId(oldPublicId)
    });

  } catch (error: any) {
    console.error('Erreur sauvegarde image profil:', error);
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 });
  }
}
