import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      );
    }

    console.log(`🔍 Récupération de l'utilisateur par ID: ${id}`);

    // Récupérer le profil utilisateur depuis Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, username, avatar')
      .eq('id', id)
      .single();

    if (profileError || !profile) {
      console.log(`❌ Utilisateur non trouvé pour ID: ${id}`);
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    console.log(`✅ Utilisateur trouvé: ${profile.username}`);

    return NextResponse.json(profile);

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
