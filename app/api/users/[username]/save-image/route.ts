import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);
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
      .select('id, username')
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
    const { imageUrl, type } = body;

    if (!imageUrl || !type) {
      return NextResponse.json({ error: 'imageUrl et type requis' }, { status: 400 });
    }

    if (!['avatar', 'banner'].includes(type)) {
      return NextResponse.json({ error: 'Type doit être avatar ou banner' }, { status: 400 });
    }

    // Mettre à jour le profil avec la nouvelle image
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ [type]: imageUrl })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Erreur mise à jour profil:', updateError);
      return NextResponse.json({ error: 'Erreur mise à jour profil' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      type 
    });

  } catch (error: any) {
    console.error('Erreur sauvegarde image profil:', error);
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 });
  }
}
